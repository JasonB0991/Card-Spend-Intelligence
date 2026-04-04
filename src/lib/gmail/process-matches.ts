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

  return null;
}

function amountsClose(a: number | null, b: number | null) {
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) <= 1;
}

function buildProductName(order: any): string | null {
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
    const platformCode = getPlatformCodeFromTransaction(txn);

    if (!platformCode) {
      skippedCount++;
      continue;
    }

    const candidates = (platformOrders || []).filter((order: any) => {
      const code = order.supported_platform_types?.code;
      return code === platformCode && amountsClose(Number(txn.amount), Number(order.order_amount));
    });

    if (candidates.length === 0) {
      skippedCount++;
      continue;
    }

    const best = candidates[0];
    const productName = buildProductName(best);

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

    const { error: updateTxnError } = await supabaseAdmin
      .from("transactions")
      .update({
        product_name: productName,
        platform_code: platformCode,
        review_status: "needs_review",
      })
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