// app/routes/webhooks.$.jsx
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { sendOwnerEmail } from "../utils/sendOwnerEmail.server";

const norm = (s) => (s || "").toLowerCase();

export const action = async ({ request }) => {
  // 1) Verify + parse webhook (v3)
  let parsed;
  try {
    parsed = await authenticate.webhook(request);
  } catch (err) {
    console.error("❌ Webhook verify/parse failed:", err);
    // HMAC mismatch → tell Shopify it's unauthorized
    return new Response("Unauthorized", { status: 401 });
  }

  const { topic, shop, payload } = parsed;
  const s = norm(shop);

  try {
    switch (topic) {
      case "APP_UNINSTALLED": {
        await prisma.shop.upsert({
          where: { shop: s },
          update: {
            installed: false,
            accessToken: null,
            uninstalledAt: new Date(),
          },
          create: {
            shop: s,
            installed: false,
            accessToken: null,
            uninstalledAt: new Date(),
          },
        });
        console.log(`[APP_UNINSTALLED] ${s} → installed=false`);

        try {
          await sendOwnerEmail({
            subject: `Store ${s} uninstalled Fomoify Sales Popup & Proof`,
            text: `Store ${s} removed the Fomoify Sales Popup & Proof app.`,
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.4;color:#111">
                <h3>Shopify App Uninstalled</h3>
                <p><strong>${s}</strong> just removed the Fomoify Sales Popup & Proof app.</p>
                <p>Consider following up to understand why or to offer help.</p>
              </div>
            `,
          });
          console.log("[APP_UNINSTALLED] owner notified");
        } catch (err) {
          console.error("[APP_UNINSTALLED] failed to notify owner:", err);
        }

        break;
      }

      case "APP_SCOPES_UPDATE": {
        await prisma.shop.updateMany({
          where: { shop: s },
          data: { updatedAt: new Date() },
        });
        console.log(`[APP_SCOPES_UPDATE] ${s}`);
        break;
      }

      // -------- GDPR required webhooks --------
      case "CUSTOMERS_DATA_REQUEST": {
        // If you store customer data, prepare & deliver it per Shopify’s email.
        console.log("GDPR CUSTOMERS_DATA_REQUEST:", s, payload?.customer?.id);
        break;
      }

      case "CUSTOMERS_REDACT": {
        const customerId = payload?.customer?.id;
        console.log("GDPR CUSTOMERS_REDACT:", s, customerId);
        break;
      }

      case "SHOP_REDACT": {

        await prisma.shop.deleteMany({ where: { shop: s } });
        console.log("GDPR SHOP_REDACT:", s);
        break;
      }

      default: {
        // Unhandled topics: you may return 404 to signal “not handled”.
        // throw new Response("Unhandled topic", { status: 404 });
        console.log("ℹ️ Unhandled webhook topic:", topic, "from", s);
      }
    }
  } catch (err) {
    // Log but still 200 so Shopify doesn’t retry forever (tune if you want retries)
    console.error("❌ Webhook handler error:", topic, err);
  }

  // Must reply fast
  return new Response(null, { status: 200 });
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });
