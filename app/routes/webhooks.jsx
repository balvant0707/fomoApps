// app/routes/webhooks.jsx
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

const norm = (s) => (s || "").toLowerCase();

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request); // ✅ v3 way
  const s = norm(shop);

  if (topic === "APP_UNINSTALLED" && s) {
    await prisma.shop.upsert({
      where: { shop: s },
      update: { installed: false, accessToken: null, uninstalledAt: new Date() },
      create: { shop: s, installed: false, accessToken: null, uninstalledAt: new Date() },
    });
    console.log(`[APP_UNINSTALLED] ${s} → installed=false`);
  } else {
    // unhandled topics -> optional: throw 404
    // throw new Response("Unhandled", { status: 404 });
  }

  return new Response(null, { status: 200 });
};

export const loader = () => new Response("Method Not Allowed", { status: 405 });
