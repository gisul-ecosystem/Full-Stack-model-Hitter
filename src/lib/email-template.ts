export const DEFAULT_SUBJECT = "{{test_title}} — submit your project";

export const DEFAULT_BODY = `Hi {{name}},

You have been added to: {{test_title}}

Submit your completed project ZIP here:
{{submission_url}}

Use the same name and email when uploading:
- Name: {{name}}
- Email: {{email}}

Thanks,
Aaptor Team`;

export type TemplateVars = {
  name: string;
  email: string;
  submission_url: string;
  test_title: string;
};

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key: string) => {
    const normalized = key.toLowerCase() as keyof TemplateVars;
    return vars[normalized] ?? "";
  });
}

export function testCandidateToVars(options: {
  name: string;
  email: string;
  submissionUrl: string;
  testTitle: string;
}): TemplateVars {
  return {
    name: options.name,
    email: options.email,
    submission_url: options.submissionUrl,
    test_title: options.testTitle,
  };
}

export function submissionUrlForToken(token: string, origin?: string) {
  const base =
    origin ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/submit/${token}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Branded HTML invite email (table layout for email clients). */
export function buildCandidateEmailHtml(vars: TemplateVars): string {
  const name = escapeHtml(vars.name);
  const email = escapeHtml(vars.email);
  const title = escapeHtml(vars.test_title);
  const url = escapeHtml(vars.submission_url);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3efe6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffcf7;border:1px solid #d6d3d1;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e,#115e59);padding:22px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" valign="middle">
                    <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.18);color:#fff;font-weight:700;font-size:16px;line-height:36px;text-align:center;">A</div>
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.02em;">Aaptor</div>
                    <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:2px;">Project submission</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 12px;color:#1c1917;font-size:16px;line-height:1.5;">Hi <strong>${name}</strong>,</p>
              <p style="margin:0 0 8px;color:#57534e;font-size:15px;line-height:1.55;">
                You have been added to:
              </p>
              <p style="margin:0 0 22px;color:#0f766e;font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;">
                ${title}
              </p>
              <p style="margin:0 0 18px;color:#57534e;font-size:15px;line-height:1.55;">
                Submit your completed project as a ZIP using the button below.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" bgcolor="#0f766e" style="border-radius:10px;">
                    <a href="${url}"
                       style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;background:#0f766e;">
                      Submit your project
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#78716c;font-size:12px;line-height:1.5;">
                Or copy this link:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${url}" style="color:#0f766e;font-size:13px;text-decoration:underline;">${url}</a>
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;border:1px solid #e7e5e4;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px;color:#78716c;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                      Use these details when uploading
                    </p>
                    <p style="margin:0 0 6px;color:#1c1917;font-size:14px;line-height:1.5;">
                      <span style="color:#78716c;">Name:</span> <strong>${name}</strong>
                    </p>
                    <p style="margin:0;color:#1c1917;font-size:14px;line-height:1.5;">
                      <span style="color:#78716c;">Email:</span> <strong>${email}</strong>
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#57534e;font-size:14px;line-height:1.55;">
                Thanks,<br />
                <strong style="color:#1c1917;">Aaptor Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 22px;border-top:1px solid #e7e5e4;">
              <p style="margin:0;color:#a8a29e;font-size:12px;line-height:1.45;text-align:center;">
                © ${year} Aaptor · This invite is for ${email}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
