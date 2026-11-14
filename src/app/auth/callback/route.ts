import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/request";
import { supabaseAdmin } from "@/lib/supabase/server";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

async function getGrantedScopes(accessToken?: string | null): Promise<string[]> {
  if (!accessToken) return [];
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return [];
    const info = (await res.json()) as { scope?: string };
    return (info.scope || "").split(" ").filter(Boolean);
  } catch {
    return [];
  }
}

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

  // Google lets people untick individual permissions on the consent screen.
  // Without Gmail access the app can't do anything, so send them back.
  const grantedScopes = await getGrantedScopes(session.provider_token);
  if (!grantedScopes.includes(GMAIL_SCOPE)) {
    await supabase.auth.signOut();
    return loginWithError(
      "Gmail access wasn't granted. Please sign in again and tick \"View your email messages and settings\" on Google's screen."
    );
  }

  // Google only returns a refresh token on the consent screen. Keep any
  // existing one rather than overwriting it with null.
  const row: Record<string, unknown> = {
    user_id: user.id,
    email: user.email ?? null,
    access_token: session.provider_token ?? null,
    scope: grantedScopes.join(" "),
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
