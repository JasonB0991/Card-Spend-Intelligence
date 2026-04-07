import { supabaseAdmin } from "@/lib/supabase/server";

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getPlatformCodeFromTransaction(txn: any): string | null {
  const merchant = normalize(txn.merchant_normalized || txn.merchant_raw);

  if (merchant.includes("swiggy")) return "swiggy";
  if (merchant.includes("zomato")) return "zomato";
  if (merchant.includes("amazon")) return "amazon";
  if (merchant.includes("flipkart")) return "flipkart";
  if (merchant.includes("airtel")) return "airtel";
  if (merchant.includes("uber")) return "uber";
  if (merchant.includes("zepto")) return "zepto";
  if (merchant.includes("agoda")) return "agoda";

  return null;
}

function isCompatiblePlatform(txnPlatformCode: string, orderPlatformCode: string) {
  if (txnPlatformCode === orderPlatformCode) return true;

  // Swiggy bank merchant can refer to food or instamart
  if (
    txnPlatformCode === "swiggy" &&
    (orderPlatformCode === "swiggy" || orderPlatformCode === "swiggy_instamart")
  ) {
    return true;
  }

  return false;
}

function amountsClose(a: number | null, b: number | null) {
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) <= 1;
}

function timeDistanceInHours(txnDate: string | null, orderDate: string | null) {
  if (!txnDate || !orderDate) return Number.POSITIVE_INFINITY;

  const txnTs = new Date(txnDate).getTime();
  const orderTs = new Date(orderDate).getTime();

  if (Number.isNaN(txnTs) || Number.isNaN(orderTs)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(txnTs - orderTs) / (1000 * 60 * 60);
}

function buildProductName(order: any): string | null {
  const platformCode = order.supported_platform_types?.code;

  if (platformCode === "agoda") {
    return order.order_title || order.merchant_name || order.raw_platform || null;
  }

  if (order.order_title && order.merchant_name) {
    return `${order.order_title} from ${order.merchant_name}`;
  }
  if (order.order_title) return order.order_title;
  if (order.merchant_name) return order.merchant_name;
  return order.raw_platform || null;
}

export async function processTransactionMatches() {
  const { data: transactions, error: transactionsError } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .order("txn_date", { ascending: false })
    .limit(200);

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }

  const { data: platformOrders, error: ordersError } = await supabaseAdmin
    .from("platform_orders")
    .select(`
      *,
      supported_platform_types (
        code
      )
    `)
    .limit(200);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  let matchedCount = 0;
  let skippedCount = 0;

  for (const txn of transactions || []) {
    const txnPlatformCode = getPlatformCodeFromTransaction(txn);

    if (!txnPlatformCode) {
      skippedCount++;
      continue;
    }

    const candidates = (platformOrders || []).filter((order: any) => {
      const orderPlatformCode = order.supported_platform_types?.code;

      if (!orderPlatformCode) return false;
      if (!isCompatiblePlatform(txnPlatformCode, orderPlatformCode)) return false;
      if (!amountsClose(Number(txn.amount), Number(order.order_amount))) return false;

      return true;
    });

    if (candidates.length === 0) {
      console.log("MATCH DEBUG - no candidates", {
        txnId: txn.id,
        txnAmount: txn.amount,
        txnMerchant: txn.merchant_normalized || txn.merchant_raw,
        txnPlatformCode,
      });

      skippedCount++;
      continue;
    }

    const rankedCandidates = [...candidates].sort((a: any, b: any) => {
      const aDistance = timeDistanceInHours(txn.txn_date, a.order_date);
      const bDistance = timeDistanceInHours(txn.txn_date, b.order_date);

      return aDistance - bDistance;
    });

    const best = rankedCandidates[0];
    const productName = buildProductName(best);

    console.log("MATCH DEBUG - chosen candidate", {
      txnId: txn.id,
      txnAmount: txn.amount,
      txnMerchant: txn.merchant_normalized || txn.merchant_raw,
      txnPlatformCode,
      matchedOrderId: best.id,
      matchedOrderPlatform: best.supported_platform_types?.code,
      matchedOrderAmount: best.order_amount,
      matchedOrderTitle: best.order_title,
    });

    const { data: existingMatch } = await supabaseAdmin
      .from("transaction_order_matches")
      .select("id")
      .eq("transaction_id", txn.id)
      .eq("platform_order_id", best.id)
      .maybeSingle();

    if (!existingMatch) {
      await supabaseAdmin.from("transaction_order_matches").insert({
        transaction_id: txn.id,
        platform_order_id: best.id,
        matched_product_name: productName,
        match_type: "amount_and_platform",
        confidence_score: 90,
        is_confirmed: false,
      });
    } else {
      await supabaseAdmin
        .from("transaction_order_matches")
        .update({
          matched_product_name: productName,
          match_type: "amount_and_platform",
          confidence_score: 90,
        })
        .eq("id", existingMatch.id);
    }

    const updates: Record<string, unknown> = {
      product_name: productName,
      platform_code: txnPlatformCode,
    };

    if (
      txn.review_status === null ||
      txn.review_status === undefined ||
      txn.review_status === ""
    ) {
      updates.review_status = "needs_review";
    }

    const { error: updateTxnError } = await supabaseAdmin
      .from("transactions")
      .update(updates)
      .eq("id", txn.id);

    if (updateTxnError) {
      skippedCount++;
      continue;
    }

    matchedCount++;
  }

  return {
    matchedCount,
    skippedCount,
  };
}