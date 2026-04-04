import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing transaction id" },
        { status: 400 }
      );
    }

    const allowedFields = [
      "merchant_raw",
      "merchant_normalized",
      "amount",
      "currency",
      "direction",
      "ownership_type",
      "is_big_spend",
      "is_emi",
      "is_ignored",
      "note",
      "card_last4",
      "card_label",
      "card_id",
      "txn_date",
      "product_name",
      "platform_code",
      "review_status",
      "review_note",
    ];

    const updates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH transaction error:", error);

    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 400 }
    );
  }
}