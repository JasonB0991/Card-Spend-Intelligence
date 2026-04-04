import { NextRequest, NextResponse } from "next/server";
import { syncEmailsFromGmail } from "@/lib/gmail/sync-emails";
import { processBankTransactions } from "@/lib/gmail/process-bank-transactions";
import { processPlatformOrders } from "@/lib/gmail/process-platform-orders";
import { processTransactionMatches } from "@/lib/gmail/process-matches";

function isAuthorized(req: NextRequest) {
  const headerSecret = req.headers.get("x-cron-secret");
  return (
    typeof headerSecret === "string" &&
    typeof process.env.MAILBOX_CRON_SECRET === "string" &&
    headerSecret === process.env.MAILBOX_CRON_SECRET
  );
}

export async function POST(req: NextRequest) {

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const syncResult = await syncEmailsFromGmail();
    const bankResult = await processBankTransactions();
    const platformResult = await processPlatformOrders();
    const matchResult = await processTransactionMatches();

    return NextResponse.json({
      success: true,
      syncResult,
      bankResult,
      platformResult,
      matchResult,
    });
  } catch (error: any) {
    console.error("Process mailbox error:", error);

    return NextResponse.json(
      {
        error: "Failed to process mailbox",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}