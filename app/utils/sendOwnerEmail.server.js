// app/utils/sendOwnerEmail.server.js
import nodemailer from "nodemailer";

const port = Number(process.env.SMTP_PORT || 587);
const secureMode = (process.env.SMTP_SECURE || "").toLowerCase();

// SSL logic
let secure = false;
if (port === 465 || secureMode === "ssl") {
  secure = true; // SSL mode
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure, // SSL = true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // for cPanel SSL cert flexibility
  },
  logger: true,
  debug: true,
});

// Verify SMTP connection on startup
transporter
  .verify()
  .then(() => {
    console.log(
      `[SMTP] Connected successfully → SSL=${secure}, PORT=${port}`
    );
  })
  .catch((err) => {
    console.error("[SMTP] Connection failed:", {
      message: err?.message,
      code: err?.code,
    });
  });

export async function sendOwnerEmail({ to, subject, text, html }) {
  try {
    const finalTo = to || process.env.APP_OWNER_FALLBACK_EMAIL;

    if (!finalTo) {
      console.warn("[sendOwnerEmail] No recipient email configured");
      return;
    }

    const fromAddress =
      process.env.SMTP_FROM ||
      `"${process.env.SMTP_FROM_NAME || "Fomoify Sales Popup & Proof"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: finalTo,
      subject,
      text,
      html,
    });

    console.log("[sendOwnerEmail] Email sent:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    return info;
  } catch (err) {
    console.error("[sendOwnerEmail] Failed to send email:", {
      message: err?.message,
      code: err?.code,
      command: err?.command,
      response: err?.response,
    });
    throw err;
  }
}
