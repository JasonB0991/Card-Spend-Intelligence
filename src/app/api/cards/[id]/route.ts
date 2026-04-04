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
      return NextResponse.json({ error: "Missing card id" }, { status: 400 });
    }

    const allowedFields = [
      "nickname",
      "cardholder_name",
      "card_last4",
      "is_active",
    ];

    const updates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if ("card_last4" in updates) {
      const cleaned = String(updates.card_last4 || "").trim();
      if (!/^\d{4}$/.test(cleaned)) {
        return NextResponse.json(
          { error: "card_last4 must be exactly 4 digits" },
          { status: 400 }
        );
      }
      updates.card_last4 = cleaned;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("cards")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH card error:", error);
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 400 }
    );
  }
}