import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/request";
import { processMailboxForUser } from "@/lib/gmail/process-mailbox";
import { GmailReauthRequiredError } from "@/lib/gmail/sync-emails";

export const maxDuration = 60;

export async function POST() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const result = await processMailboxForUser(auth.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof GmailReauthRequiredError) {
      return NextResponse.json(
        { error: error.message, reauth: true },
        { status: 401 }
      );
    }
    console.error("Process mailbox error:", error);
    return NextResponse.json(
      { error: "Failed to process mailbox" },
      { status: 500 }
    );
  }
}
