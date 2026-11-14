import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/request";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const supabase = auth.supabase;

  const { data, error } = await supabase
    .from("splits")
    .select("*")
    .order("person_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const supabase = auth.supabase;

  try {
    const body = await req.json();

    const {
      transaction_id,
      person_name,
      amount_owed,
      status = "pending",
      comment = "",
    } = body;

    if (!transaction_id || !person_name || amount_owed == null) {
      return NextResponse.json(
        { error: "transaction_id, person_name, amount_owed are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("splits")
      .insert([
        {
          transaction_id,
          person_name,
          amount_owed,
          status,
          comment,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST split error:", error);

    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}