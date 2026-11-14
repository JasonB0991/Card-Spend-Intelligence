import { supabaseAdmin } from "@/lib/supabase/server";
import { parseBankTransactionEmail } from "@/lib/gmail/parser";
import { loadUnprocessedEmails, markEmailsChecked } from "@/lib/gmail/load-emails";
import { BANK_SENDERS } from "@/lib/gmail/sync-emails";

type SupportedCardType = {
  bank_name: string;
  card_name: string;
};

type CardRow = {
  id: string;
  card_last4: string | null;
  nickname: string | null;
  supported_card_types: SupportedCardType | SupportedCardType[] | null;
};

export async function processBankTransactions(userId: string) {
  // Two reads up front instead of several queries per email.
  const [existingRes, cardsRes] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select("email_id")
      .eq("user_id", userId)
      .not("email_id", "is", null),
    supabaseAdmin
      .from("cards")
      .select("id, card_last4, nickname, supported_card_types ( bank_name, card_name )")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  if (existingRes.error) throw new Error(existingRes.error.message);
  if (cardsRes.error) throw new Error(cardsRes.error.message);

  const processed = new Set((existingRes.data || []).map((r) => r.email_id as string));
  const emails = await loadUnprocessedEmails(userId, BANK_SENDERS, processed, 100);
  const cardsByLast4 = new Map<string, CardRow>();
  for (const card of (cardsRes.data || []) as CardRow[]) {
    if (card.card_last4 && !cardsByLast4.has(card.card_last4)) {
      cardsByLast4.set(card.card_last4, card);
    }
  }

  let skippedCount = 0;
  let duplicateCount = 0;
  const inserts: Record<string, unknown>[] = [];
  const unparsedIds: string[] = [];

  for (const email of emails) {
    const parsed = parseBankTransactionEmail(email);

    if (!parsed) {
      unparsedIds.push(email.id);
      skippedCount++;
      continue;
    }

    if (processed.has(email.id)) {
      duplicateCount++;
      continue;
    }

    let cardId: string | null = null;
    let finalCardLabel = parsed.card_label;
    const matchedCard = parsed.card_last4 ? cardsByLast4.get(parsed.card_last4) : undefined;

    if (matchedCard) {
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

    inserts.push({
      user_id: userId,
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
  }

  let parsedCount = 0;
  let failedInsertCount = 0;

  if (inserts.length) {
    const { error } = await supabaseAdmin.from("transactions").insert(inserts);
    if (error) {
      console.error("transactions insert failed", error.message);
      failedInsertCount = inserts.length;
    } else {
      parsedCount = inserts.length;
      await markEmailsChecked(userId, inserts.map((r) => r.email_id as string), "bank_transaction");
    }
  }
  await markEmailsChecked(userId, unparsedIds, "bank_unparsed");

  return {
    parsedCount,
    skippedCount,
    failedInsertCount,
    duplicateCount,
  };
}
