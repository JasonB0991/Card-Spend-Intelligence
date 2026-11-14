import { supabaseAdmin } from "@/lib/supabase/server";
import { parsePlatformOrderEmail } from "@/lib/gmail/platform-parser";
import { loadUnprocessedEmails, markEmailsChecked } from "@/lib/gmail/load-emails";
import { PLATFORM_SENDERS } from "@/lib/gmail/sync-emails";

export async function processPlatformOrders(userId: string) {
  // Two reads up front instead of several queries per email.
  const [existingRes, typesRes] = await Promise.all([
    supabaseAdmin
      .from("platform_orders")
      .select("email_id")
      .eq("user_id", userId)
      .not("email_id", "is", null),
    supabaseAdmin.from("supported_platform_types").select("id, code"),
  ]);

  if (existingRes.error) throw new Error(existingRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);

  const processed = new Set((existingRes.data || []).map((r) => r.email_id as string));
  const emails = await loadUnprocessedEmails(userId, PLATFORM_SENDERS, processed, 200);
  const typeIdByCode = new Map(
    (typesRes.data || []).map((t) => [String(t.code).toLowerCase(), t.id as string])
  );

  let skippedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  const inserts: Record<string, unknown>[] = [];
  const unparsedIds: string[] = [];

  for (const email of emails) {
    const parsed = parsePlatformOrderEmail(email);

    if (!parsed) {
      unparsedIds.push(email.id);
      skippedCount++;
      continue;
    }

    if (processed.has(email.id)) {
      duplicateCount++;
      continue;
    }

    const supportedTypeId = typeIdByCode.get(
      parsed.supported_platform_type_code.toLowerCase()
    );
    if (!supportedTypeId) {
      failedCount++;
      continue;
    }

    inserts.push({
      user_id: userId,
      email_id: email.id,
      supported_platform_type_id: supportedTypeId,
      order_date: parsed.order_date,
      order_amount: parsed.order_amount,
      currency: parsed.currency,
      order_title: parsed.order_title,
      merchant_name: parsed.merchant_name,
      order_reference: parsed.order_reference,
      raw_platform: parsed.raw_platform,
    });
  }

  let parsedCount = 0;

  if (inserts.length) {
    const { error } = await supabaseAdmin.from("platform_orders").insert(inserts);
    if (error) {
      console.error("platform_orders insert failed", error.message);
      failedCount += inserts.length;
    } else {
      parsedCount = inserts.length;
      await markEmailsChecked(userId, inserts.map((r) => r.email_id as string), "platform_order");
    }
  }
  await markEmailsChecked(userId, unparsedIds, "platform_unparsed");

  return {
    parsedCount,
    skippedCount,
    duplicateCount,
    failedCount,
  };
}
