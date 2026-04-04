import { supabaseAdmin } from "@/lib/supabase/server";
import { parseBankTransactionEmail } from "@/lib/gmail/parser";

export async function processBankTransactions() {
  const { data: emails, error: emailsError } = await supabaseAdmin
    .from("emails")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(100);

  if (emailsError) {
    throw new Error(emailsError.message);
  }

  let parsedCount = 0;
  let skippedCount = 0;
  let failedInsertCount = 0;
  let duplicateCount = 0;

  for (const email of emails || []) {
    const parsed = parseBankTransactionEmail(email);

    if (!parsed) {
      skippedCount++;
      continue;
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("email_id", email.id)
      .maybeSingle();

    if (existingError) {
      failedInsertCount++;
      continue;
    }

    if (existing) {
      duplicateCount++;
      continue;
    }

    let cardId: string | null = null;

    if (parsed.supported_card_type_code && parsed.card_last4) {
      const { data: supportedType } = await supabaseAdmin
        .from("supported_card_types")
        .select("id")
        .eq("code", parsed.supported_card_type_code)
        .maybeSingle();

      if (supportedType?.id) {
        const { data: card } = await supabaseAdmin
          .from("cards")
          .select("id")
          .eq("supported_card_type_id", supportedType.id)
          .eq("card_last4", parsed.card_last4)
          .eq("is_active", true)
          .maybeSingle();

        if (card?.id) {
          cardId = card.id;
        }
      }
    }

    const { error } = await supabaseAdmin.from("transactions").insert({
      email_id: email.id,
      amount: parsed.amount,
      currency: parsed.currency,
      merchant_raw: parsed.merchant_raw,
      merchant_normalized: parsed.merchant_normalized,
      direction: parsed.direction,
      ownership_type: parsed.ownership_type,
      note: parsed.note,
      is_big_spend: parsed.is_big_spend,
      is_emi: parsed.is_emi,
      is_ignored: parsed.is_ignored,
      card_last4: parsed.card_last4,
      card_label: parsed.card_label,
      card_id: cardId,
      txn_date: parsed.txn_date,
      review_status: "needs_review",
    });

    if (error) {
      failedInsertCount++;
    } else {
      parsedCount++;
    }
  }

  return {
    parsedCount,
    skippedCount,
    failedInsertCount,
    duplicateCount,
  };
}