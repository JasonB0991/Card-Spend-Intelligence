import { supabaseAdmin } from "@/lib/supabase/server";
import { getGmailClient } from "@/lib/gmail/client";

function extractHeader(
  headers: Array<{ name?: string | null; value?: string | null }> = [],
  name: string
) {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    null
  );
}

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getPlainTextFromPayload(payload: any): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    for (const part of payload.parts) {
      const nested = getPlainTextFromPayload(part);
      if (nested) return nested;
    }
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return "";
}

function getHtmlFromPayload(payload: any): string {
  if (!payload) return "";

  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    for (const part of payload.parts) {
      const nested = getHtmlFromPayload(part);
      if (nested) return nested;
    }
  }

  return "";
}

export async function syncEmailsFromGmail() {
  const { data: account, error: accountError } = await supabaseAdmin
    .from("gmail_accounts")
    .select("*")
    .eq("email", "me")
    .single();

  if (accountError || !account) {
    throw new Error("No Gmail account connected");
  }

  const gmail = getGmailClient({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20,
  });

  const messages = listResponse.data.messages || [];
  let saved = 0;

  for (const msg of messages) {
    if (!msg.id) continue;

    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const payload = detail.data.payload;
    const headers = payload?.headers || [];

    const from = extractHeader(headers, "From");
    const subject = extractHeader(headers, "Subject");
    const dateHeader = extractHeader(headers, "Date");

    const rawTextFromPlain = getPlainTextFromPayload(payload);
    const rawHtml = getHtmlFromPayload(payload);
    const rawText = rawTextFromPlain || (rawHtml ? stripHtml(rawHtml) : "");

    const row = {
      gmail_message_id: detail.data.id!,
      thread_id: detail.data.threadId || null,
      from_email: from,
      subject,
      sent_at: dateHeader ? new Date(dateHeader).toISOString() : null,
      parsed_type: "other",
      raw_text: rawText,
      raw_html: rawHtml || null,
    };

    const { error } = await supabaseAdmin
      .from("emails")
      .upsert(row, { onConflict: "gmail_message_id" });

    if (!error) {
      saved++;
    }
  }

  return {
    fetched: messages.length,
    saved,
  };
}