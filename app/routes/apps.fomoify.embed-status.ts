import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { normalizeShopDomain } from "../utils/shopDomain.server";

const getEmbedPingModel = () =>
  (prisma as any).embedPing || (prisma as any).embedping || null;

async function upsertEmbedPing(request: Request) {
  try {
    const appProxyContext = await authenticate.public.appProxy(request);
    const shopFromSession =
      appProxyContext && "session" in appProxyContext
        ? appProxyContext.session?.shop
        : undefined;
    const shopFromQuery = new URL(request.url).searchParams.get("shop");
    const shop = normalizeShopDomain(shopFromSession || shopFromQuery);

    if (!shop) {
      return json(
        { ok: false, error: "Missing or invalid shop domain" },
        { status: 400 }
      );
    }

    const model = getEmbedPingModel();
    if (!model?.upsert) {
      return json(
        { ok: false, error: "EmbedPing model is not available in Prisma client" },
        { status: 500 }
      );
    }

    const now = new Date();
    await model.upsert({
      where: { shop },
      create: { shop, lastPingAt: now },
      update: { lastPingAt: now },
    });

    return json(
      {
        ok: true,
        shop,
        lastPingAt: now.toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[embed-status] proxy upsert failed:", error);
    return json({ ok: false, error: "Embed status update failed" }, { status: 500 });
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) =>
  upsertEmbedPing(request);

export const action = async ({ request }: ActionFunctionArgs) =>
  upsertEmbedPing(request);
