type PlatformOrder = {
  supported_platform_type_code: string;
  order_amount: number | null;
  currency: string;
  order_title: string | null;
  merchant_name: string | null;
  order_reference: string | null;
  order_date: string | null;
  raw_platform: string;
};

type EmailRow = {
  id: string;
  from_email: string | null;
  subject: string | null;
  raw_text: string | null;
  raw_html: string | null;
};

/* =========================
   TEXT CLEANING
========================= */

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function stripHtml(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/td>/gi, " ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function looksLikeHtml(text: string) {
  return /<!doctype|<html|<body|<div|<table|<tr|<td|<span|<p/i.test(text);
}

function getEmailText(email: EmailRow) {
  const subject = email.subject || "";
  const rawText = email.raw_text || "";
  const rawHtml = email.raw_html || "";

  const cleanedRawText =
    rawText && looksLikeHtml(rawText)
      ? stripHtml(rawText)
      : decodeHtmlEntities(rawText);

  const cleanedRawHtml = rawHtml ? stripHtml(rawHtml) : "";

  return [subject, cleanedRawText, cleanedRawHtml]
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   HELPERS
========================= */

function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[,\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function toIsoFromSwiggy(dateText: string): string | null {
  const match = dateText.match(
    /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i
  );
  if (!match) return null;

  const [, mon, day, hh, mm, ampm] = match;
  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  const month = monthMap[mon];
  if (!month) return null;

  let hour = Number(hh);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

  const year = "2026";
  return `${year}-${month}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${mm}:00`;
}

/* =========================
   PARSERS
========================= */

function parseSwiggyInstamart(email: EmailRow): PlatformOrder | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);

  if (!from.includes("no-reply@swiggy.in")) return null;
  if (!/instamart/i.test(text)) return null;
  if (!/order id:\s*\d+/i.test(text)) return null;
  if (!/grand total/i.test(text)) return null;
  if (!/order items/i.test(text)) return null;

  const orderIdMatch =
    text.match(/Instamart order id:\s*(\d+)/i) ||
    text.match(/order id:\s*(\d+)/i);

  const totalMatch = text.match(
    /Grand Total\s*₹\s*([\d,]+(?:\.\d{1,2})?)/i
  );

  const dateMatch = text.match(
    /([A-Za-z]{3}\s+\d{1,2},\s+\d{1,2}:\d{2}\s+[AP]M)/i
  );

  const itemsBlockMatch = text.match(
    /Order Items\s+(.+?)\s+Order Summary/i
  );

  let orderTitle: string | null = null;

  if (itemsBlockMatch?.[1]) {
    const itemsBlock = itemsBlockMatch[1];

    const itemLines = Array.from(
      itemsBlock.matchAll(
        /(\d+\s*x\s+.+?)\s+₹\s*[\d,]+(?:\.\d{1,2})?/gi
      )
    ).map((m) => m[1].trim());

    if (itemLines.length > 0) {
      orderTitle = itemLines.join(", ");
    } else {
      orderTitle = itemsBlock.trim();
    }
  }

  console.log("SWIGGY INSTAMART DEBUG", {
    preview: text.slice(0, 800),
    orderId: orderIdMatch?.[1],
    total: totalMatch?.[1],
    orderTitle,
  });

  return {
    supported_platform_type_code: "swiggy_instamart",
    order_amount: parseMoney(totalMatch?.[1]),
    currency: "INR",
    order_title: orderTitle,
    merchant_name: "Swiggy Instamart",
    order_reference: orderIdMatch?.[1] || null,
    order_date: dateMatch?.[1] ? toIsoFromSwiggy(dateMatch[1]) : null,
    raw_platform: "Swiggy Instamart",
  };
}

function parseSwiggy(email: EmailRow): PlatformOrder | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);

  if (!from.includes("noreply@swiggy.in")) return null;
  if (!/Order ID:/i.test(text)) return null;

  const orderIdMatch = text.match(/Order ID:\s*(\d+)/i);
  const paidMatch = text.match(/Paid Via Credit\/Debit card\s+₹\s*([\d.]+)/i);
  const firstItemMatch = text.match(/BILL DETAILS\s+(.+?)\s+x\d+/i);

  return {
    supported_platform_type_code: "swiggy",
    order_amount: parseMoney(paidMatch?.[1]),
    currency: "INR",
    order_title: firstItemMatch?.[1]?.trim() || null,
    merchant_name: null,
    order_reference: orderIdMatch?.[1] || null,
    order_date: null,
    raw_platform: "Swiggy",
  };
}

function parseZomato(email: EmailRow): PlatformOrder | null {
  const from = (email.from_email || "").toLowerCase();
  const subject = (email.subject || "").toLowerCase();
  const text = getEmailText(email);

  if (!from.includes("noreply@zomato.com")) return null;
  if (!subject.includes("your zomato order")) return null;

  const orderIdMatch = text.match(/ORDER ID:\s*(\d+)/i);
  const totalMatch = text.match(/Total paid\s*-\s*₹\s*([\d.]+)/i);

  const restaurantMatch =
    text.match(/ordering from\s+(.+?)\s+ORDER ID/i) ||
    text.match(/Your Zomato order from\s+(.+?)\s+Chicken/i);

  const itemMatch =
    text.match(/\b\d+\s*X\s+(.+?)\s+Total paid/i) ||
    text.match(/Items\s+(.+?)\s+Is this correct/i) ||
    text.match(/Chicken\s+\d+/i);

  console.log("ZOMATO CLEAN DEBUG", {
    text: text.slice(0, 400),
    restaurant: restaurantMatch?.[1],
    item: itemMatch?.[1] || itemMatch?.[0],
  });

  return {
    supported_platform_type_code: "zomato",
    order_amount: parseMoney(totalMatch?.[1]),
    currency: "INR",
    order_title: (itemMatch?.[1] || itemMatch?.[0] || null)?.trim() || null,
    merchant_name: restaurantMatch?.[1]?.trim() || null,
    order_reference: orderIdMatch?.[1] || null,
    order_date: null,
    raw_platform: "Zomato",
  };
}

function parseAmazon(email: EmailRow): PlatformOrder | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);

  if (!from.includes("auto-confirm@amazon.in")) return null;

  const orderIdMatch = text.match(/Order\s*#\s*([0-9-]+)/i);
  const totalMatch = text.match(/Total\s+₹\s*([\d.]+)/i);
  const titleMatch = text.match(/View or edit order\s+(.+?)\s+Quantity/i);

  return {
    supported_platform_type_code: "amazon",
    order_amount: parseMoney(totalMatch?.[1]),
    currency: "INR",
    order_title: titleMatch?.[1]?.trim() || null,
    merchant_name: "Amazon",
    order_reference: orderIdMatch?.[1] || null,
    order_date: null,
    raw_platform: "Amazon",
  };
}
function parseAgoda(email: EmailRow): PlatformOrder | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);

  if (!from.includes("no-reply@agoda.com")) return null;
  if (!/booking is now confirmed/i.test(text)) return null;
  if (!/booking id/i.test(text)) return null;
  if (!/paid today/i.test(text)) return null;

  const bookingIdMatch =
    text.match(/booking ID is\s*(\d+)/i) ||
    text.match(/Booking ID\s*(\d+)/i);

  const totalMatch =
    text.match(/Paid Today\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    text.match(/Total Charge\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i);

  const roomTypeMatch = text.match(/Room type\s+(.+?)\s+Promotion/i);

  // Stronger property extraction:
  // Capture the line immediately after "Manage my booking"
  let propertyName: string | null = null;

  const manageBookingSplit = text.split(/Manage my booking/i);
  if (manageBookingSplit.length > 1) {
    const afterManage = manageBookingSplit[1].trim();

    const propertyMatch =
      afterManage.match(/^(.+?)\s+\d(?:\.\d)?\s*stars/i) ||
      afterManage.match(/^(.+?)\s+property image/i) ||
      afterManage.match(/^(.+?)\s+Junction\s/i) ||
      afterManage.match(/^(.+?)\s+Check in/i);

    propertyName = propertyMatch?.[1]?.trim() || null;
  }

  const roomType = roomTypeMatch?.[1]?.trim() || null;

  let orderTitle: string | null = null;

  if (propertyName && roomType) {
    orderTitle = `${propertyName} — ${roomType}`;
  } else if (propertyName) {
    orderTitle = propertyName;
  } else if (roomType) {
    orderTitle = roomType;
  }

  return {
    supported_platform_type_code: "agoda",
    order_amount: parseMoney(totalMatch?.[1]),
    currency: "INR",
    order_title: orderTitle,
    merchant_name: propertyName || "Agoda",
    order_reference: bookingIdMatch?.[1] || null,
    order_date: null,
    raw_platform: "Agoda",
  };
}

function parseFlipkart(email: EmailRow): PlatformOrder | null {
  const from = (email.from_email || "").toLowerCase();
  const text = getEmailText(email);

  if (!from.includes("no-reply@rmt.flipkart.com")) return null;

  const orderIdMatch = text.match(/Order ID\s+(OD[0-9]+)/i);
  const totalMatch = text.match(/total\s+₨\.?\s*([\d.]+)/i);

  const titleMatch = text.match(/Govee HDMI.*?(?=Seller)/i);

  return {
    supported_platform_type_code: "flipkart",
    order_amount: parseMoney(totalMatch?.[1]),
    currency: "INR",
    order_title: titleMatch?.[0]?.trim() || null,
    merchant_name: "Flipkart",
    order_reference: orderIdMatch?.[1] || null,
    order_date: null,
    raw_platform: "Flipkart",
  };
}

export function parsePlatformOrderEmail(email: EmailRow): PlatformOrder | null {
  return (
    parseSwiggyInstamart(email) ||
    parseSwiggy(email) ||
    parseZomato(email) ||
    parseAmazon(email) ||
    parseFlipkart(email) ||
    parseAgoda(email) ||
    null
  );
}