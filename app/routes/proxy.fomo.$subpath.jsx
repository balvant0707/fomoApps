// app/routes/proxy.fomo.$subpath.jsx
import { json } from "@remix-run/node";
import prisma from "../db.server";                // <-- default import (IMPORTANT)
import { ensureShopRow } from "../utils/ensureShop.server";

const norm = (s) => (s || "").toLowerCase().replace(/^https?:\/\//, "");
const ok = (d, s = 200) => json(d, { status: s });
const bad = (d, s = 400) => json(d, { status: s });

export const loader = async ({ request, params }) => {
  try {
    const url = new URL(request.url);
    const rawShop = url.searchParams.get("shop");
    const shop = norm(rawShop);
    const subpath = (params.subpath || "").toLowerCase();
    const timestamp = Date.now();

    if (!shop) return bad({ error: "Missing shop" });

    if (subpath === "session") {
      // Self-heal: if shop row missing, try to create from session table
      const shopRecord =
        (await prisma.shop.findUnique({ where: { shop } })) ||
        (await ensureShopRow(shop));

      if (!shopRecord) {
        return ok({
          sessionReady: false,
          shop,
          installed: false,
          error: "Shop not found",
          timestamp,
        });
      }

      const sessionReady = !!shopRecord.installed && !!shopRecord.accessToken;

      return ok({
        sessionReady,
        shop,
        installed: !!shopRecord.installed,
        hasAccessToken: !!shopRecord.accessToken,
        timestamp,
      });
    }

    if (subpath === "popup") {
      // Ensure/require session
      const shopRecord =
        (await prisma.shop.findUnique({ where: { shop } })) ||
        (await ensureShopRow(shop));

      if (!shopRecord || !shopRecord.installed || !shopRecord.accessToken) {
        return ok({
          showPopup: false,
          sessionReady: false,
          error: "Session not ready",
          shop,
          timestamp,
        });
      }

      // Fetch configs (adjust to your schema/table names)
      const configs = await prisma.notificationconfig.findMany({
        where: { shop },
        orderBy: { id: "desc" },
      });

      if (!configs || configs.length === 0) {
        return ok({
          showPopup: false,
          sessionReady: true,
          shop,
          timestamp,
        });
      }

      return ok({
        showPopup: true,
        sessionReady: true,
        records: configs,
        shop,
        timestamp,
      });
    }

    return bad({ error: "Unknown proxy path" }, 404);
  } catch (err) {
    console.error("[FOMO Loader Error]:", err);
    return bad({ error: "Internal Server Error" }, 500);
  }
};
