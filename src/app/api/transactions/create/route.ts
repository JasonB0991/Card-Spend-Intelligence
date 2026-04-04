import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      amount,
      currency = "INR",
      merchant_raw,
      merchant_normalized,
      direction = "debit",
      ownership_type = "mine",
      is_big_spend = false,
      is_emi = false,
      is_ignored = false,
      note = "",
    } = body;

    if (!amount || !merchant_raw) {
      return NextResponse.json(
        { error: "amount and merchant_raw are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert([
        {
          amount,
          currency,
          merchant_raw,
          merchant_normalized,
          direction,
          ownership_type,
          is_big_spend,
          is_emi,
          is_ignored,
          note,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}