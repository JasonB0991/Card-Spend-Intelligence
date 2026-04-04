import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseBankTransactionEmail } from "@/lib/gmail/parser";

export async function POST() {
  try {
    const { data: emails, error: emailsError } = await supabaseAdmin
      .from("emails")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (emailsError) {
      return NextResponse.json({ error: emailsError.message }, { status: 500 });
    }

    let parsedCount = 0;
    let skippedCount = 0;
    let failedInsertCount = 0;
    let duplicateCount = 0;

    const debug: Array<{
      subject: string | null;
      from_email: string | null;
      reason: string;
    }> = [];

    for (const email of emails || []) {
      console.log("EMAIL DEBUG", {
        from: email.from_email,
        subject: email.subject,
        preview: (email.raw_text || email.raw_html || "").slice(0, 400),
      });

      const parsed = parseBankTransactionEmail(email);

      if (parsed) {
        console.log("PARSED OK", parsed);
      }

      if (!parsed) {
        skippedCount++;
        debug.push({
          subject: email.subject,
          from_email: email.from_email,
          reason: "parser_returned_null",
        });
        continue;
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("email_id", email.id)
        .maybeSingle();

      if (existingError) {
        failedInsertCount++;
        debug.push({
          subject: email.subject,
          from_email: email.from_email,
          reason: `existing_check_failed: ${existingError.message}`,
        });
        continue;
      }

      if (existing) {
        duplicateCount++;
        debug.push({
          subject: email.subject,
          from_email: email.from_email,
          reason: "already_exists_for_email_id",
        });
        continue;
      }

      let cardId: string | null = null;

      if (parsed.supported_card_type_code && parsed.card_last4) {
        const { data: supportedType, error: supportedTypeError } = await supabaseAdmin
          .from("supported_card_types")
          .select("id")
          .eq("code", parsed.supported_card_type_code)
          .maybeSingle();

        if (supportedTypeError) {
          console.error("SUPPORTED CARD TYPE LOOKUP FAILED", supportedTypeError);
        }

        if (supportedType?.id) {
          const { data: card, error: cardLookupError } = await supabaseAdmin
            .from("cards")
            .select("id")
            .eq("supported_card_type_id", supportedType.id)
            .eq("card_last4", parsed.card_last4)
            .eq("is_active", true)
            .maybeSingle();

          if (cardLookupError) {
            console.error("CARD LOOKUP FAILED", cardLookupError);
          }

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
        console.error("INSERT FAILED", error);

        debug.push({
          subject: email.subject,
          from_email: email.from_email,
          reason: `insert_failed: ${error.message}`,
        });
      } else {
        parsedCount++;

        if (!cardId) {
          debug.push({
            subject: email.subject,
            from_email: email.from_email,
            reason: "parsed_but_card_not_matched",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      parsedCount,
      skippedCount,
      failedInsertCount,
      duplicateCount,
      debug: debug.slice(0, 20),
    });
  } catch (error: any) {
    console.error("Parse transaction error:", error);

    return NextResponse.json(
      {
        error: "Failed to parse transactions",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}