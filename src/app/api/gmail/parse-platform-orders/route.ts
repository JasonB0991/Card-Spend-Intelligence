import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parsePlatformOrderEmail } from "@/lib/gmail/platform-parser";

export async function POST() {
  try {
    const { data: emails, error: emailsError } = await supabaseAdmin
      .from("emails")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(200);

    if (emailsError) {
      return NextResponse.json({ error: emailsError.message }, { status: 500 });
    }

    let parsedCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    const debug: Array<{
      subject: string | null;
      from_email: string | null;
      reason: string;
    }> = [];

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
        debug.push({
          subject: email.subject,
          from_email: email.from_email,
          reason: `existing_check_failed: ${existingError.message}`,
        });
        continue;
      }

      if (existing) {
        duplicateCount++;
        continue;
      }

      const { data: supportedType, error: supportedTypeError } = await supabaseAdmin
        .from("supported_platform_types")
        .select("id")
        .eq("code", parsed.supported_platform_type_code)
        .maybeSingle();

      if (supportedTypeError || !supportedType) {
        failedCount++;
        debug.push({
          subject: email.subject,
          from_email: email.from_email,
          reason: "supported_platform_type_not_found",
        });
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
        debug.push({
          subject: email.subject,
          from_email: email.from_email,
          reason: `insert_failed: ${error.message}`,
        });
      } else {
        parsedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      parsedCount,
      skippedCount,
      duplicateCount,
      failedCount,
      debug: debug.slice(0, 20),
    });
  } catch (error: any) {
    console.error("Parse platform orders error:", error);

    return NextResponse.json(
      {
        error: "Failed to parse platform orders",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}