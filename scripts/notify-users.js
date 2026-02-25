#!/usr/bin/env node
// scripts/notify-users.js
//
// Sends a feature announcement email to all installed shop owners.
//
// Usage:
//   node scripts/notify-users.js
//
// Required .env vars:
//   SMTP_HOST   - e.g. smtp.gmail.com
//   SMTP_PORT   - e.g. 587 (TLS) or 465 (SSL)
//   SMTP_USER   - your email address / SMTP username
//   SMTP_PASS   - your email password or app password
//   EMAIL_FROM  - (optional) display address, defaults to SMTP_USER
//
// ── Edit the email content below before running ───────────────────────────────

// Author email for testing. Set to null to send to all installed users.
const AUTHOR_TEST_EMAIL = "cisase6754@fentaoba.com";

const EMAIL_SUBJECT = "New feature available in FomoApp!";

const EMAIL_HTML_BODY = /* html */ `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
  <h2 style="color:#5c6ac4">What's new in FomoApp 🎉</h2>

  <p>Hi there,</p>

  <p>We've just launched a new feature — <strong>[Feature Name]</strong>.</p>

  <p>[Describe the feature briefly. What does it do? Why is it useful?]</p>

  <p>
    <a href="https://apps.shopify.com/YOUR_APP" style="background:#5c6ac4;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">
      Try it now →
    </a>
  </p>

  <p style="margin-top:32px;font-size:13px;color:#888">
    You're receiving this because you installed FomoApp on your Shopify store.<br>
    To uninstall and stop receiving emails, remove FomoApp from your Shopify admin.
  </p>
</div>
`;

// ─────────────────────────────────────────────────────────────────────────────
// Delay between individual sends (ms) — keep ≥ 200ms to respect SMTP limits.
const SEND_DELAY_MS = 300;

// ── Script logic (no edits needed below) ─────────────────────────────────────

import "dotenv/config";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME } = process.env;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const EMAIL_FROM = SMTP_FROM_NAME
  ? `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL ?? SMTP_USER}>`
  : (SMTP_FROM_EMAIL ?? SMTP_USER);

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error(
    "Missing SMTP config. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS to your .env file."
  );
  process.exit(1);
}

const prisma = new PrismaClient();

/** Returns installed shop owners that have a recorded email address. */
async function getRecipients() {
  // Offline sessions (id = "offline_<shop>") hold the permanent app credential
  // and include the account owner's email when the merchant installed via OAuth.
  const sessions = await prisma.session.findMany({
    where: {
      id: { startsWith: "offline_" },
      accountOwner: true,
      email: { not: null },
    },
    select: { shop: true, email: true, firstName: true, lastName: true },
  });

  // Only email shops that are still installed.
  const installedShops = await prisma.shop.findMany({
    where: { installed: true },
    select: { shop: true },
  });
  const installedSet = new Set(installedShops.map((s) => s.shop));

  return sessions
    .filter((s) => installedSet.has(s.shop))
    .map((s) => ({
      shop: s.shop,
      email: s.email,
      name: [s.firstName, s.lastName].filter(Boolean).join(" ") || null,
    }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.verify();
  console.log("SMTP connection verified.\n");

  const recipients = AUTHOR_TEST_EMAIL
    ? [{ shop: "test", email: AUTHOR_TEST_EMAIL, name: null }]
    : await getRecipients();

  if (recipients.length === 0) {
    console.log("No recipients found. Make sure shops are marked installed=true in the DB.");
    await prisma.$disconnect();
    return;
  }

  if (AUTHOR_TEST_EMAIL) {
    console.log(`TEST MODE — sending only to ${AUTHOR_TEST_EMAIL}\n`);
  } else {
    console.log(`Sending to ${recipients.length} shop owner(s)...\n`);
  }

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      await new Promise((resolve, reject) =>
        transporter.sendMail(
          { from: EMAIL_FROM, to: r.email, subject: EMAIL_SUBJECT, html: EMAIL_HTML_BODY },
          (err, info) => (err ? reject(err) : resolve(info))
        )
      );
      console.log(`  ✓  ${r.email}  (${r.shop})`);
      sent++;
    } catch (err) {
      console.error(`  ✗  ${r.email}  (${r.shop}) — ${err.message}`);
      failed++;
    }
    await sleep(SEND_DELAY_MS);
  }

  console.log(`\nFinished. Sent: ${sent}  Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
