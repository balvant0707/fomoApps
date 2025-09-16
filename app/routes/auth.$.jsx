import { redirect } from "@remix-run/node";
import { authenticate, registerWebhooks } from "../shopify.server";
import prisma from "../db.server";

const norm = (s) => (s || "").toLowerCase();

export const loader = async ({ request }) => {
  const result = await authenticate.admin(request);
  if (result instanceof Response) return result;

  const { session } = result;
  const shop = norm(session.shop);

  await prisma.shop.upsert({
    where: { shop },
    update: { accessToken: session.accessToken ?? null, installed: true, uninstalledAt: null },
    create: { shop, accessToken: session.accessToken ?? null, installed: true },
  });

  await registerWebhooks({ session });
  return redirect("/app");
};
