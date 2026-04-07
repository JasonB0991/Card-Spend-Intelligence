import { NextResponse } from "next/server";
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

export async function POST() {
  try {
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .order("txn_date", { ascending: false })
      .limit(200);

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 500 });
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
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    let matchedCount = 0;
    let skippedCount = 0;
    const debug: Array<{ txn_id: string; reason: string; product_name?: string | null }> = [];

    for (const txn of transactions || []) {
      const platformCode = getPlatformCodeFromTransaction(txn);

      if (!platformCode) {
        skippedCount++;
        debug.push({ txn_id: txn.id, reason: "no_platform_code_from_transaction" });
        continue;
      }

      const candidates = (platformOrders || []).filter((order: any) => {
        const code = order.supported_platform_types?.code;
        return code === platformCode && amountsClose(Number(txn.amount), Number(order.order_amount));
      });

      if (candidates.length === 0) {
        skippedCount++;
        debug.push({ txn_id: txn.id, reason: "no_candidates_found" });
        continue;
      }

      const best = candidates[0];
      const productName = buildProductName(best);

      // ensure / refresh match row
      const { data: existingMatch, error: existingMatchError } = await supabaseAdmin
        .from("transaction_order_matches")
        .select("id")
        .eq("transaction_id", txn.id)
        .eq("platform_order_id", best.id)
        .maybeSingle();

      if (existingMatchError) {
        skippedCount++;
        debug.push({ txn_id: txn.id, reason: `existing_match_check_failed: ${existingMatchError.message}` });
        continue;
      }

      if (!existingMatch) {
        const { error: insertMatchError } = await supabaseAdmin
          .from("transaction_order_matches")
          .insert({
            transaction_id: txn.id,
            platform_order_id: best.id,
            matched_product_name: productName,
            match_type: "amount_and_platform",
            confidence_score: 90,
            is_confirmed: false,
          });

        if (insertMatchError) {
          skippedCount++;
          debug.push({ txn_id: txn.id, reason: `match_insert_failed: ${insertMatchError.message}` });
          continue;
        }
      } else {
        const { error: updateMatchError } = await supabaseAdmin
          .from("transaction_order_matches")
          .update({
            matched_product_name: productName,
            match_type: "amount_and_platform",
            confidence_score: 90,
          })
          .eq("id", existingMatch.id);

        if (updateMatchError) {
          skippedCount++;
          debug.push({ txn_id: txn.id, reason: `match_update_failed: ${updateMatchError.message}` });
          continue;
        }
      }

      // always refresh transaction-facing fields
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
        debug.push({ txn_id: txn.id, reason: `txn_update_failed: ${updateTxnError.message}` });
        continue;
      }

      matchedCount++;
      debug.push({ txn_id: txn.id, reason: "matched", product_name: productName });
    }

    return NextResponse.json({
      success: true,
      matchedCount,
      skippedCount,
      debug: debug.slice(0, 30),
    });
  } catch (error: any) {
    console.error("Match transactions error:", error);

    return NextResponse.json(
      {
        error: "Failed to match transactions",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}