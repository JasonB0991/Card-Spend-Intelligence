import { syncEmailsFromGmail } from "@/lib/gmail/sync-emails";
import { processBankTransactions } from "@/lib/gmail/process-bank-transactions";
import { processPlatformOrders } from "@/lib/gmail/process-platform-orders";
import { processTransactionMatches } from "@/lib/gmail/process-matches";

/** Full pipeline for one user: fetch mail → parse transactions/orders → match. */
export async function processMailboxForUser(userId: string) {
  const syncResult = await syncEmailsFromGmail(userId);
  const bankResult = await processBankTransactions(userId);
  const platformResult = await processPlatformOrders(userId);
  const matchResult = await processTransactionMatches(userId);

  return { syncResult, bankResult, platformResult, matchResult };
}
