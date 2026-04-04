import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("splits")
    .select("*")
    .order("person_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
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

    const { data, error } = await supabaseAdmin
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