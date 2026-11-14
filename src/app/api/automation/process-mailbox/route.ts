import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { processMailboxForUser } from "@/lib/gmail/process-mailbox";

export const maxDuration = 60;

function isAuthorized(req: NextRequest) {
  const expected = process.env.MAILBOX_CRON_SECRET;
  const given = req.headers.get("x-cron-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by Supabase pg_cron: processes every connected mailbox. */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: accounts, error } = await supabaseAdmin
    .from("gmail_accounts")
    .select("user_id")
    .not("refresh_token", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Record<string, unknown> = {};
  for (const { user_id } of accounts || []) {
    try {
      const r = await processMailboxForUser(user_id);
      results[user_id] = { ok: true, saved: r.syncResult.saved };
    } catch (err) {
      results[user_id] = { ok: false, error: (err as Error).message };
    }
  }

  return NextResponse.json({ success: true, users: results });
}
