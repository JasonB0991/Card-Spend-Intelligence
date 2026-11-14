import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Loads full email rows that still need processing: from one of `senders`,
 * among the user's latest `scanLimit` emails, and not in `processedIds`.
 *
 * Email bodies are large, so the candidate list is built from a lightweight
 * query first and only the needed bodies are downloaded.
 */
export async function loadUnprocessedEmails(
  userId: string,
  senders: string[],
  processedIds: Set<string>,
  scanLimit: number
) {
  const { data: candidates, error } = await supabaseAdmin
    .from("emails")
    .select("id, from_email")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(scanLimit);

  if (error) throw new Error(error.message);

  const wanted = (candidates || [])
    .filter((e) => !processedIds.has(e.id))
    .filter((e) => {
      const from = (e.from_email || "").toLowerCase();
      return senders.some((s) => from.includes(s));
    })
    .map((e) => e.id as string);

  if (!wanted.length) return [];

  const { data, error: bodyError } = await supabaseAdmin
    .from("emails")
    .select("id, from_email, subject, sent_at, raw_text, raw_html")
    .eq("user_id", userId)
    .in("id", wanted)
    .order("sent_at", { ascending: false });

  if (bodyError) throw new Error(bodyError.message);
  return data || [];
}
