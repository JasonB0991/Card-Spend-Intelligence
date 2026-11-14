import { createSupabaseServerClient } from "@/lib/supabase/request";

// Server-side data loaders for pages. They use the signed-in user's session,
// so row level security returns only that user's rows.

function orThrow<T>(label: string, result: { data: T | null; error: { message: string } | null }) {
  if (result.error) throw new Error(`Failed to load ${label}: ${result.error.message}`);
  return result.data ?? ([] as unknown as T);
}

export async function getTransactions() {
  const supabase = await createSupabaseServerClient();
  return orThrow(
    "transactions",
    await supabase
      .from("transactions")
      .select("*")
      .order("txn_date", { ascending: false, nullsFirst: false })
      .limit(1000)
  );
}

export async function getCards() {
  const supabase = await createSupabaseServerClient();
  return orThrow(
    "cards",
    await supabase
      .from("cards")
      .select(`
        *,
        supported_card_types (
          id,
          code,
          bank_name,
          card_name,
          network,
          parser_key,
          is_active
        )
      `)
      .order("created_at", { ascending: false })
  );
}

export async function getSplits() {
  const supabase = await createSupabaseServerClient();
  return orThrow(
    "splits",
    await supabase.from("splits").select("*").order("person_name", { ascending: true })
  );
}

export async function getEmails() {
  const supabase = await createSupabaseServerClient();
  return orThrow(
    "emails",
    await supabase
      .from("emails")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50)
  );
}
