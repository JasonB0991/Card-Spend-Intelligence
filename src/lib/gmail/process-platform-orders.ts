import { supabaseAdmin } from "@/lib/supabase/server";
import { parsePlatformOrderEmail } from "@/lib/gmail/platform-parser";

export async function processPlatformOrders() {
  const { data: emails, error: emailsError } = await supabaseAdmin
    .from("emails")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(200);

  if (emailsError) {
    throw new Error(emailsError.message);
  }

  let parsedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  for (const email of emails || []) {
    const parsed = parsePlatformOrderEmail(email);

    if (!parsed) {
      skippedCount++;
      continue;
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("platform_orders")
      .select("id")
      .eq("email_id", email.id)
      .maybeSingle();

    if (existingError) {
      failedCount++;
      continue;
    }

    if (existing) {
      duplicateCount++;
      continue;
    }

    const { data: supportedType, error: supportedTypeError } = await supabaseAdmin
      .from("supported_platform_types")
      .select("id")
      .eq("code", parsed.supported_platform_type_code.toLowerCase())
      .maybeSingle();

    if (supportedTypeError || !supportedType) {
      failedCount++;
      continue;
    }

    const { error } = await supabaseAdmin.from("platform_orders").insert({
      email_id: email.id,
      supported_platform_type_id: supportedType.id,
      order_date: parsed.order_date,
      order_amount: parsed.order_amount,
      currency: parsed.currency,
      order_title: parsed.order_title,
      merchant_name: parsed.merchant_name,
      order_reference: parsed.order_reference,
      raw_platform: parsed.raw_platform,
    });

    if (error) {
      failedCount++;
    } else {
      parsedCount++;
    }
  }

  return {
    parsedCount,
    skippedCount,
    duplicateCount,
    failedCount,
  };
}