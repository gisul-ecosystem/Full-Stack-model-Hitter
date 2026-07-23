export const DEFAULT_SUBJECT = "{{test_title}} — assessment instructions";

export const DEFAULT_BODY = `Hi {{name}},

You have been added to: {{test_title}}

Please read the instructions below carefully before starting your assessment.

### VM Lab Access

Use the following credentials to access your assigned virtual lab:

VM Labs URL: https://server.gisul.co.in

Email: {{labsemail}}
Password: {{labspassword}}

### Assessment Instructions

1. Open https://server.gisul.co.in in your browser.
2. Log in using the VM Lab credentials provided above.
3. After logging in, click Console to launch your assigned Windows Virtual Machine (VM).
4. Inside the VM, open Visual Studio Code (VS Code).
5. Complete the assigned Full Stack Development task within the VM environment.
6. Once you have completed the task, compress your entire project folder into a .zip file.
7. From inside the VM itself, open a browser and manually enter the submission URL below.
8. Enter your Name and Email exactly as provided below, then upload your ZIP file.

### Project Submission

Submission URL:
{{submission_url}}

Use the following details while submitting:
- Name: {{name}}
- Email: {{email}}

### Important Notes

- The virtual machine will be available only for the allotted assessment duration.
- Perform all development work inside the provided VM.
- Ensure you submit the entire project folder as a ZIP file before the assessment ends.
- Late submissions or submissions made after the VM access expires may not be considered.

If you experience any technical issues during the assessment, please contact info@aaptor.com immediately.

Best regards,
Aaptor Team`;

export type TemplateVars = {
  name: string;
  email: string;
  submission_url: string;
  test_title: string;
  labsemail: string;
  labspassword: string;
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
  labsEmail?: string;
  labsPassword?: string;
}): TemplateVars {
  return {
    name: options.name,
    email: options.email,
    submission_url: options.submissionUrl,
    test_title: options.testTitle,
    labsemail: options.labsEmail || "",
    labspassword: options.labsPassword || "",
  };
}

export function submissionUrlForToken(token: string, origin?: string) {
  const configured = (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).trim();

  const requestOrigin = (origin || "").trim();
  const looksLocalBind =
    !requestOrigin ||
    /0\.0\.0\.0/i.test(requestOrigin) ||
    /127\.0\.0\.1/i.test(requestOrigin) ||
    /localhost/i.test(requestOrigin);

  const base =
    configured ||
    (!looksLocalBind ? requestOrigin : "") ||
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

function sectionTitle(text: string) {
  return `<p style="margin:24px 0 10px;color:#0f766e;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${text}</p>`;
}

/** Branded HTML invite email with VM lab + submission instructions. */
export function buildCandidateEmailHtml(vars: TemplateVars): string {
  const name = escapeHtml(vars.name);
  const email = escapeHtml(vars.email);
  const title = escapeHtml(vars.test_title);
  const url = escapeHtml(vars.submission_url);
  const labsEmail = escapeHtml(vars.labsemail || "—");
  const labsPassword = escapeHtml(vars.labspassword || "—");
  const year = new Date().getFullYear();
  const labsUrl = "https://server.gisul.co.in";

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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffcf7;border:1px solid #d6d3d1;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e,#115e59);padding:22px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" valign="middle">
                    <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.18);color:#fff;font-weight:700;font-size:16px;line-height:36px;text-align:center;">A</div>
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.02em;">Aaptor</div>
                    <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:2px;">Assessment invite</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 12px;color:#1c1917;font-size:16px;line-height:1.5;">Hi <strong>${name}</strong>,</p>
              <p style="margin:0 0 8px;color:#57534e;font-size:15px;line-height:1.55;">
                You have been added to:
              </p>
              <p style="margin:0 0 16px;color:#0f766e;font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;">
                ${title}
              </p>
              <p style="margin:0 0 8px;color:#57534e;font-size:15px;line-height:1.55;">
                Please read the instructions below carefully before starting your assessment.
              </p>

              ${sectionTitle("VM Lab Access")}
              <p style="margin:0 0 12px;color:#57534e;font-size:14px;line-height:1.55;">
                Use the following credentials to access your assigned virtual lab:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin:0 0 8px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px;color:#1c1917;font-size:14px;line-height:1.5;">
                      <span style="color:#78716c;">VM Labs URL:</span>
                      <a href="${labsUrl}" style="color:#0f766e;font-weight:600;text-decoration:underline;">${labsUrl}</a>
                    </p>
                    <p style="margin:0 0 8px;color:#1c1917;font-size:14px;line-height:1.5;">
                      <span style="color:#78716c;">Email:</span> <strong>${labsEmail}</strong>
                    </p>
                    <p style="margin:0;color:#1c1917;font-size:14px;line-height:1.5;">
                      <span style="color:#78716c;">Password:</span> <strong>${labsPassword}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              ${sectionTitle("Assessment Instructions")}
              <ol style="margin:0 0 8px;padding-left:20px;color:#44403c;font-size:14px;line-height:1.65;">
                <li style="margin-bottom:6px;">Open <a href="${labsUrl}" style="color:#0f766e;">${labsUrl}</a> in your browser.</li>
                <li style="margin-bottom:6px;">Log in using the VM Lab credentials provided above.</li>
                <li style="margin-bottom:6px;">After logging in, click <strong>Console</strong> to launch your assigned <strong>Windows Virtual Machine (VM)</strong>.</li>
                <li style="margin-bottom:6px;">Inside the VM, open <strong>Visual Studio Code (VS Code)</strong>.</li>
                <li style="margin-bottom:6px;">Complete the assigned <strong>Full Stack Development</strong> task within the VM environment.</li>
                <li style="margin-bottom:6px;">Once complete, compress your <strong>entire project folder</strong> into a <strong>.zip</strong> file.</li>
                <li style="margin-bottom:6px;">From <strong>inside the VM itself</strong>, open a browser and go to the submission URL below.</li>
                <li style="margin-bottom:6px;">Enter your <strong>Name</strong> and <strong>Email</strong> exactly as provided, then upload your ZIP file.</li>
              </ol>

              ${sectionTitle("Project Submission")}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
                <tr>
                  <td align="center" bgcolor="#0f766e" style="border-radius:10px;">
                    <a href="${url}"
                       style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;background:#0f766e;">
                      Open submission page
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#78716c;font-size:12px;line-height:1.5;">Or copy this link:</p>
              <p style="margin:0 0 16px;word-break:break-all;">
                <a href="${url}" style="color:#0f766e;font-size:13px;text-decoration:underline;">${url}</a>
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;border:1px solid #e7e5e4;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px;color:#78716c;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                      Use these details while submitting
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

              ${sectionTitle("Important Notes")}
              <ul style="margin:0;padding-left:20px;color:#44403c;font-size:14px;line-height:1.65;">
                <li style="margin-bottom:6px;">The virtual machine will be available <strong>only for the allotted assessment duration</strong>.</li>
                <li style="margin-bottom:6px;">Perform all development work <strong>inside the provided VM</strong>.</li>
                <li style="margin-bottom:6px;">Submit the <strong>entire project folder as a ZIP</strong> before the assessment ends.</li>
                <li style="margin-bottom:6px;">Late submissions or submissions after VM access expires may not be considered.</li>
              </ul>

              <p style="margin:22px 0 0;color:#57534e;font-size:14px;line-height:1.55;">
                If you experience any technical issues, contact
                <a href="mailto:info@aaptor.com" style="color:#0f766e;">info@aaptor.com</a> immediately.
              </p>
              <p style="margin:18px 0 0;color:#57534e;font-size:14px;line-height:1.55;">
                Best regards,<br />
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
