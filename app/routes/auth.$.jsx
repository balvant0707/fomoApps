// app/routes/auth.$.jsx
import { redirect } from "@remix-run/node";
import { authenticate, registerWebhooks } from "../shopify.server";
import prisma from "../db.server";
import { ensureShopRow } from "../utils/ensureShop.server";

const norm = (s) => (s || "").toLowerCase().replace(/^https?:\/\//, "");

export const loader = async ({ request }) => {
  const result = await authenticate.admin(request);
  if (result instanceof Response) return result;

  const { session } = result;
  const shop = norm(session.shop);

  // Primary upsert (install/update)
  await prisma.shop.upsert({
    where: { shop },
    update: {
      accessToken: session.accessToken ?? null,
      installed: true,
      uninstalledAt: null,
      updatedAt: new Date(),
    },
    create: {
      shop,
      accessToken: session.accessToken ?? null,
      installed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Safety net: even if above silently skips, ensure row exists from session table
  await ensureShopRow(shop);

  await registerWebhooks({ session });
  return redirect("/app");
};
