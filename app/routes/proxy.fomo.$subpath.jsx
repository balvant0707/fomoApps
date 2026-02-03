// app/routes/proxy.fomo.$subpath.jsx
import { json } from "@remix-run/node";
import prisma from "../db.server";                // <-- default import (IMPORTANT)
import { ensureShopRow } from "../utils/ensureShop.server";

const norm = (s) => (s || "").toLowerCase().replace(/^https?:\/\//, "");
const ok = (d, s = 200) => json(d, { status: s });
const bad = (d, s = 400) => json(d, { status: s });
const EVENTS = new Set(["view", "click", "order"]);
const POPUPS = new Set(["recent", "flash", "orders"]);
const analyticsModel = () =>
  prisma.popupanalyticsevent || prisma.popupAnalyticsEvent || null;

const clean = (v, max = 255) => {
  const s = String(v || "").trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
};

async function saveTrackEvent({ shop, body }) {
  const model = analyticsModel();
  if (!model) return { ok: false, skipped: "model_missing" };

  const eventType = String(body?.eventType || "").toLowerCase();
  const popupType = String(body?.popupType || "").toLowerCase();
  if (!EVENTS.has(eventType) || !POPUPS.has(popupType)) {
    return { ok: false, skipped: "invalid_event" };
  }

  await model.create({
    data: {
      shop,
      popupType,
      eventType,
      visitorId: clean(body?.visitorId, 128),
      productHandle: clean(body?.productHandle, 128),
      pagePath: clean(body?.pagePath, 255),
      sourceUrl: clean(body?.sourceUrl, 500),
    },
  });
  return { ok: true };
}

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

export const action = async ({ request, params }) => {
  try {
    const url = new URL(request.url);
    const shop = norm(url.searchParams.get("shop"));
    const subpath = (params.subpath || "").toLowerCase();

    if (!shop) return bad({ error: "Missing shop" });
    if (subpath !== "track") return bad({ error: "Unknown proxy path" }, 404);
    if (request.method !== "POST") {
      return bad({ error: "Method not allowed" }, 405);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return bad({ error: "Invalid JSON" });
    }

    const res = await saveTrackEvent({ shop, body });
    if (!res.ok) return ok({ tracked: false, ...res });

    return ok({ tracked: true });
  } catch (err) {
    console.error("[FOMO Track Action Error]:", err);
    return bad({ error: "Internal Server Error" }, 500);
  }
};
