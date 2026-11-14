import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/request";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const supabase = auth.supabase;

  try {
    const { id } = await context.params;

    const { error } = await supabase
      .from("transaction_order_matches")
      .delete()
      .eq("transaction_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear match error:", error);
    return NextResponse.json(
      { error: "Failed to clear match" },
      { status: 500 }
    );
  }
}