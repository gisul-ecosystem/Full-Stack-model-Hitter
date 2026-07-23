type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  toName?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string) {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1c1917;white-space:pre-wrap">${escapeHtml(text)}</div>`;
}

function getZeptoConfig() {
  const apiKey = process.env.ZEPTOMAIL_API_KEY?.trim();
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL?.trim();
  const fromName = process.env.ZEPTOMAIL_FROM_NAME?.trim() || "Aaptor";
  const apiUrl =
    process.env.ZEPTOMAIL_API_URL?.trim() || "https://api.zeptomail.in/v1.1/email";

  if (!apiKey) {
    throw new Error("ZEPTOMAIL_API_KEY is not configured");
  }
  if (!fromEmail) {
    throw new Error("ZEPTOMAIL_FROM_EMAIL is not configured");
  }

  const authorization = apiKey.toLowerCase().startsWith("zoho-enczapikey")
    ? apiKey
    : `Zoho-enczapikey ${apiKey}`;

  return { apiKey: authorization, fromEmail, fromName, apiUrl };
}

export async function sendCandidateEmail(options: SendMailOptions) {
  const { apiKey, fromEmail, fromName, apiUrl } = getZeptoConfig();

  const payload = {
    from: {
      address: fromEmail,
      name: fromName,
    },
    to: [
      {
        email_address: {
          address: options.to,
          name: options.toName || options.to,
        },
      },
    ],
    subject: options.subject,
    textbody: options.text,
    htmlbody: options.html || textToHtml(options.text),
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      (typeof data?.error?.message === "string" && data.error.message) ||
      (typeof data?.message === "string" && data.message) ||
      JSON.stringify(data);
    throw new Error(`ZeptoMail send failed (${res.status}): ${detail}`);
  }

  return data;
}
