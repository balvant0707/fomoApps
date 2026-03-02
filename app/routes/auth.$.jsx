// app/routes/auth.$.jsx
import { redirect } from "@remix-run/node";
import { authenticate, registerWebhooks } from "../shopify.server";
import { ensureShopRow } from "../utils/ensureShop.server";
import { sendOwnerEmail } from "../utils/sendOwnerEmail.server";
import { upsertInstalledShop } from "../utils/upsertShop.server";

const norm = (s) => (s || "").toLowerCase().replace(/^https?:\/\//, "");
const splitOwnerName = (value) => {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: undefined, lastName: undefined };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
};

export const loader = async ({ request }) => {
  // authenticate the admin (install / re-auth)
  const result = await authenticate.admin(request);
  if (result instanceof Response) return result;

  const { admin, session } = result;
  const shop = norm(session.shop);

  const sessionFirstName = String(session?.firstName || "").trim() || null;
  const sessionLastName = String(session?.lastName || "").trim() || null;
  const sessionEmail = String(session?.email || "").trim().toLowerCase() || null;

  // Primary upsert (install/update)
  await upsertInstalledShop({
    shop,
    accessToken: session.accessToken ?? null,
    firstName: sessionFirstName,
    lastName: sessionLastName,
    email: sessionEmail,
    status: "active",
  });

  // Safety net: even if above silently skips, ensure row exists from session table
  await ensureShopRow(shop);

  // Register all webhooks
  await registerWebhooks({ session });

  // 🔔 Send email on every successful auth (install / re-auth)
  try {
    let ownerEmail = sessionEmail;
    let ownerPhone = null;
    let ownerFirstName = sessionFirstName || undefined;
    let ownerLastName = sessionLastName || undefined;
    let shopName = shop;
    let myshopifyDomain = shop;

    try {
      const resp = await admin.graphql(
        `#graphql
        query AppInstallOwnerEmail {
          shop {
            email
            contactEmail
            shopOwnerName
            billingAddress {
              firstName
              lastName
              phone
            }
            myshopifyDomain
            name
          }
        }`
      );
      const js = await resp.json();
      const splitName = splitOwnerName(js?.data?.shop?.shopOwnerName);
      ownerEmail =
        js?.data?.shop?.contactEmail ||
        js?.data?.shop?.email ||
        ownerEmail;
      ownerPhone = String(js?.data?.shop?.billingAddress?.phone || "").trim() || null;
      ownerFirstName =
        String(js?.data?.shop?.billingAddress?.firstName || "").trim() ||
        splitName.firstName ||
        ownerFirstName;
      ownerLastName =
        String(js?.data?.shop?.billingAddress?.lastName || "").trim() ||
        splitName.lastName ||
        ownerLastName;

      shopName = js?.data?.shop?.name || shop;
      myshopifyDomain = js?.data?.shop?.myshopifyDomain || shop;
    } catch (e) {
      console.error("[FOMO][INSTALL EMAIL] failed to fetch shop info:", e);
    }

    await upsertInstalledShop({
      shop,
      accessToken: session.accessToken ?? null,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      email: ownerEmail ?? undefined,
      phone: ownerPhone ?? undefined,
      status: "active",
    });

    const installedAt = new Date().toISOString();

    const textBody = `
Hi there,

Great news! Your store has successfully installed “Fomoify Sales Popup & Proof”.

You're all set to display real-time sales notifications, build trust, and increase conversions automatically.

🛍️ Store: ${shopName}
🔗 Domain: ${myshopifyDomain}
📅 Installed On: ${installedAt}

If you need help customizing the popup design or want advanced setups, feel free to contact our support anytime.

Thank you for choosing Fomoify Sales Popup & Proof!

Best regards,
Fomoify Support Team
support@fomoify.app
    `.trim();

    const htmlBody = `
<html>
  <body style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
    <h2 style="color:#6C63FF;">🎉 Fomoify Sales Popup & Proof Installed!</h2>

    <p>
      Hi there,<br><br>
      Great news! Your store has successfully installed 
      <strong>Fomoify Sales Popup & Proof</strong>.<br>
      You're ready to show real-time sales & activity popups that build trust 
      and boost conversions.
    </p>

    <table style="margin-top:10px;">
      <tr><td>🛍️ <strong>Store:</strong></td><td>${shopName}</td></tr>
      <tr><td>🔗 <strong>Domain:</strong></td><td>${myshopifyDomain}</td></tr>
      <tr><td>📅 <strong>Installed:</strong></td><td>${installedAt}</td></tr>
    </table>

    <p style="margin-top:20px;">
      If you need help with setup or customization, our team is here to support you anytime.
    </p>

    <p>
      Thanks for choosing <strong>Fomoify Sales Popup & Proof</strong>!
    </p>

    <p style="color:#6C63FF; font-weight:bold;">
      — Fomoify Support Team<br>
      support@fomoify.app
    </p>
  </body>
</html>
    `.trim();

    await sendOwnerEmail({
      to: ownerEmail || process.env.APP_OWNER_FALLBACK_EMAIL,
      subject:
        "🎉 Fomoify Sales Popup & Proof Installed Successfully on Your Store!",
      text: textBody,
      html: htmlBody,
    });
  } catch (e) {
    // Do not block install flow because of email failure
    console.error("[FOMO][INSTALL EMAIL] outer error:", e);
  }

  const requestUrl = new URL(request.url);
  const qp = new URLSearchParams();
  if (session?.shop) qp.set("shop", session.shop);
  const host = requestUrl.searchParams.get("host");
  if (host) qp.set("host", host);

  return redirect(qp.toString() ? `/app?${qp.toString()}` : "/app");
};
