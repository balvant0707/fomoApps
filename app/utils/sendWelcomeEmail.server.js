// app/utils/sendWelcomeEmail.server.js
//
// Sends a welcome email to a newly installed shop owner.
// If WELCOME_TEST_EMAIL is set in .env, all welcome emails are redirected
// to that address instead of the real shop email (for testing).

import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildFrom() {
  const name = process.env.SMTP_FROM_NAME;
  const email = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER;
  return name ? `"${name}" <${email}>` : email;
}

function buildHtml(shopName, shopDomain) {
  return /* html */ `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
  <h2 style="color:#5c6ac4">Welcome to Fomoify! 🎉</h2>

  <p>Hi${shopName ? ` ${shopName}` : ""},</p>

  <p>
    Thank you for installing <strong>Fomoify Sales Popup &amp; Social Proof</strong>
    on your Shopify store <em>${shopDomain}</em>.
  </p>

  <p>
    You can now create recent-purchase popups, flash sale bars, and visitor
    activity alerts to boost conversions — all from your Shopify admin.
  </p>

  <p>
    <a href="https://apps.shopify.com/YOUR_APP"
       style="background:#5c6ac4;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">
      Open the app →
    </a>
  </p>

  <p>If you have any questions, just reply to this email — we're happy to help.</p>

  <p style="margin-top:32px;font-size:13px;color:#888">
    You're receiving this because you installed Fomoify on <em>${shopDomain}</em>.
  </p>
</div>
`;
}

/**
 * Sends a welcome email for a newly installed shop.
 *
 * @param {object} params
 * @param {string|null} params.shopEmail  - Store contact email from Shopify (shop.email)
 * @param {string|null} params.shopName   - Store name from Shopify (shop.name)
 * @param {string}      params.shopDomain - e.g. "example.myshopify.com"
 */
export async function sendWelcomeEmail({ shopEmail, shopName, shopDomain }) {
  const toEmail = process.env.WELCOME_TEST_EMAIL ?? shopEmail;

  if (!toEmail) {
    console.warn(`[welcome email] No email for ${shopDomain} — skipping.`);
    return;
  }

  const isTest = Boolean(process.env.WELCOME_TEST_EMAIL);
  if (isTest) {
    console.log(`[welcome email] TEST MODE — redirecting to ${toEmail} (real: ${shopEmail ?? "unknown"})`);
  }

  const transporter = createTransporter();

  await new Promise((resolve, reject) =>
    transporter.sendMail(
      {
        from: buildFrom(),
        to: toEmail,
        subject: "Welcome to Fomoify — you're all set!",
        html: buildHtml(shopName, shopDomain),
      },
      (err, info) => (err ? reject(err) : resolve(info))
    )
  );

  console.log(`[welcome email] Sent to ${toEmail} for shop ${shopDomain}`);
}
