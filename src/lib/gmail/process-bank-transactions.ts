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
    let finalCardLabel = parsed.card_label;

    if (parsed.card_last4) {
      const { data: matchedCard } = await supabaseAdmin
        .from("cards")
        .select(`
          id,
          card_last4,
          nickname,
          supported_card_types (
            id,
            code,
            bank_name,
            card_name,
            network,
            parser_key,
            is_active
          )
        `)
        .eq("card_last4", parsed.card_last4)
        .eq("is_active", true)
        .maybeSingle();

      if (matchedCard?.id) {
  cardId = matchedCard.id;

    const supportedType = Array.isArray(matchedCard.supported_card_types)
      ? matchedCard.supported_card_types[0]
      : matchedCard.supported_card_types;

    finalCardLabel =
      matchedCard.nickname ||
      (supportedType
        ? `${supportedType.bank_name} ${supportedType.card_name}`
        : parsed.card_label);
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
      card_label: finalCardLabel,
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