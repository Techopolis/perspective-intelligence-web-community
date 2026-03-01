function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function h(val: string | null | undefined): string {
  return val ? escapeHtml(val) : "";
}

const currentYear = new Date().getFullYear().toString();

const perspectiveLogoSVG = `<svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="60" height="60" rx="14" fill="url(#grad)"/>
  <text x="30" y="42" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="36" font-weight="700" fill="white">P</text>
</svg>`;

function base(content: string, preheader?: string): string {
  const preheaderBlock = preheader
    ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Perspective</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #1a1a1a; background-color: #f5f5f7; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .email-content { background-color: #ffffff; border-radius: 16px; padding: 40px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo-icon { width: 60px; height: 60px; margin: 0 auto 12px; }
    .logo-text { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: #1a1a1a; }
    h1 { font-size: 24px; font-weight: 600; margin: 0 0 20px; color: #1a1a1a; }
    p { margin: 0 0 16px; color: #4a4a4a; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; text-decoration: none; border-radius: 980px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .info-box { background-color: #f5f5f7; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-box p { margin: 0; color: #4a4a4a; }
    .info-box strong { color: #1a1a1a; }
    .divider { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
    .footer { text-align: center; padding-top: 30px; border-top: 1px solid #e5e5e5; margin-top: 30px; }
    .footer p { color: #9ca3af; font-size: 13px; margin: 0 0 8px; }
    .techopolis-mark { font-size: 12px; color: #9ca3af; margin-top: 16px; }
    .techopolis-mark a { color: #9ca3af; text-decoration: none; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #000000 !important; color: #f5f5f7 !important; }
      .email-content { background-color: #1c1c1e !important; }
      .logo-text { color: #f5f5f7 !important; }
      h1 { color: #f5f5f7 !important; }
      p { color: #d1d5db !important; }
      .info-box { background-color: #2c2c2e !important; }
      .info-box p { color: #d1d5db !important; }
      .info-box strong { color: #f5f5f7 !important; }
      .footer { border-top-color: #38383a !important; }
    }
  </style>
</head>
<body>
  ${preheaderBlock}
  <div class="email-container">
    <div class="email-content">
      <div class="logo">
        <div class="logo-icon">${perspectiveLogoSVG}</div>
        <div class="logo-text">Perspective</div>
      </div>
      ${content}
      <div class="footer">
        <p>This email was sent by Perspective.</p>
        <div class="techopolis-mark">
          <a href="https://techopolis.app">&copy; ${currentYear} Techopolis LLC</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail(displayName: string | null): EmailContent {
  const name = displayName || "there";

  const content = `<h1>Welcome to Perspective</h1>
<p>Hey ${h(name)},</p>
<p>Thanks for joining Perspective, your private AI assistant powered by Apple Foundation Models. We are glad to have you.</p>
<p>Here is what you can do:</p>
<div class="info-box">
  <p><strong>Chat with AI</strong> — have natural conversations with an intelligent assistant that keeps your data private.</p>
</div>
<div class="info-box">
  <p><strong>Document OCR</strong> — extract and format text from documents with intelligent structure recognition.</p>
</div>
<p>Get started by signing in and starting your first conversation.</p>`;

  const text = `Welcome to Perspective

Hey ${name},

Thanks for joining Perspective, your private AI assistant powered by Apple Foundation Models. We are glad to have you.

Here is what you can do:

- Chat with AI: have natural conversations with an intelligent assistant that keeps your data private.
- Document OCR: extract and format text from documents with intelligent structure recognition.

Get started by signing in and starting your first conversation.

---
This email was sent by Perspective.
(c) ${currentYear} Techopolis LLC`;

  return {
    subject: "Welcome to Perspective",
    html: base(content, "Welcome to Perspective"),
    text,
  };
}

export function passwordResetEmail(
  displayName: string | null,
  resetLink: string
): EmailContent {
  const name = displayName || "there";

  const content = `<h1>Reset Your Password</h1>
<p>Hey ${h(name)},</p>
<p>We received a request to reset the password for your Perspective account. Click the button below to choose a new password.</p>
<p style="text-align: center;">
  <a href="${escapeHtml(resetLink)}" class="button">Reset Password</a>
</p>
<p>If the button does not work, copy and paste this link into your browser:</p>
<p style="word-break: break-all; color: #6b7280; font-size: 14px;">${escapeHtml(resetLink)}</p>
<hr class="divider">
<p style="font-size: 14px; color: #9ca3af;">If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>`;

  const text = `Reset Your Password

Hey ${name},

We received a request to reset the password for your Perspective account.

Click the link below to choose a new password:
${resetLink}

If you did not request a password reset, you can safely ignore this email. Your password will not be changed.

---
This email was sent by Perspective.
(c) ${currentYear} Techopolis LLC`;

  return {
    subject: "Reset your password - Perspective",
    html: base(content, "Reset your password"),
    text,
  };
}
