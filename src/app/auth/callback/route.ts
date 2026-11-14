import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/request";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  const loginWithError = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  if (oauthError) return loginWithError(oauthError);
  if (!code) return loginWithError("Missing sign-in code");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("auth callback: exchange failed", error?.message);
    return loginWithError("Sign-in failed, please try again");
  }

  const { session } = data;
  const user = session.user;

  // Google only returns a refresh token on the consent screen. Keep any
  // existing one rather than overwriting it with null.
  const row: Record<string, unknown> = {
    user_id: user.id,
    email: user.email ?? null,
    access_token: session.provider_token ?? null,
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    token_type: "Bearer",
    // Google access tokens last one hour.
    expiry_date: session.provider_token ? Date.now() + 55 * 60 * 1000 : null,
    consented_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (session.provider_refresh_token) {
    row.refresh_token = session.provider_refresh_token;
  }

  const { error: saveError } = await supabaseAdmin
    .from("gmail_accounts")
    .upsert(row, { onConflict: "user_id" });

  if (saveError) {
    console.error("auth callback: saving Gmail tokens failed", saveError.message);
    return loginWithError("Could not save Gmail access, please try again");
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
