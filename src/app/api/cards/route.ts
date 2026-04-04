import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseAdmin
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
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      supported_card_type_id,
      nickname,
      card_last4,
      cardholder_name,
    } = body;

    if (!supported_card_type_id || !card_last4) {
      return NextResponse.json(
        { error: "supported_card_type_id and card_last4 are required" },
        { status: 400 }
      );
    }

    const cleanedLast4 = String(card_last4).trim();

    if (!/^\d{4}$/.test(cleanedLast4)) {
      return NextResponse.json(
        { error: "card_last4 must be exactly 4 digits" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("cards")
      .insert({
        supported_card_type_id,
        nickname: nickname || null,
        card_last4: cleanedLast4,
        cardholder_name: cardholder_name || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Create card error:", error);

    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 400 }
    );
  }
}