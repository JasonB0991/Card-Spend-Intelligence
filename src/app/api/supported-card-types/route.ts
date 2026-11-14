import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/request";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const supabase = auth.supabase;

  const { data, error } = await supabase
    .from("supported_card_types")
    .select("*")
    .eq("is_active", true)
    .order("bank_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}