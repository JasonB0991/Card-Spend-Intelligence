import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/request";
import { getRequestOrigin } from "@/lib/request-origin";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${getRequestOrigin(req)}/login`, { status: 303 });
}
