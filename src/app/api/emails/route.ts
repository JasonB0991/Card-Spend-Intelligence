import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/request";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const supabase = auth.supabase;

  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}