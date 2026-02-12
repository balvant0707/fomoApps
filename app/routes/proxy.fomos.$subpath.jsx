// app/routes/proxy.fomo.$subpath.jsx
import { json } from "@remix-run/node";
import prisma from "../db.server";                // <-- default import (IMPORTANT)
import { ensureShopRow } from "../utils/ensureShop.server";

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();
const ok = (d, s = 200) => json(d, { status: s });
const bad = (d, s = 400) => json(d, { status: s });
const EVENTS = new Set(["view", "click", "order"]);
const POPUPS = new Set([
  "recent",
  "flash",
  "orders",
  "visitor",
  "lowstock",
  "addtocart",
  "review",
]);
const analyticsModel = () =>
  prisma.popupanalyticsevent || prisma.popupAnalyticsEvent || null;
const configModel = () =>
  prisma.notificationconfig || prisma.notificationConfig || null;
const tableModel = (key) => {
  switch (key) {
    case "visitor":
      return prisma.visitorpopupconfig || prisma.visitorPopupConfig || null;
    case "lowstock":
      return prisma.lowstockpopupconfig || prisma.lowStockPopupConfig || null;
    case "addtocart":
      return prisma.addtocartpopupconfig || prisma.addToCartPopupConfig || null;
    case "review":
      return prisma.reviewpopupconfig || prisma.reviewPopupConfig || null;
    case "recent":
      return prisma.recentpopupconfig || prisma.recentPopupConfig || null;
    case "flash":
      return prisma.flashpopupconfig || prisma.flashPopupConfig || null;
    default:
      return null;
  }
};

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

      const sessionReady = !!shopRecord.installed;

      return ok({
        sessionReady,
        shop,
        installed: !!shopRecord.installed,
        hasAccessToken: !!shopRecord.accessToken,
        timestamp,
      });
    }

    if (subpath === "orders") {
      const daysRaw = Number(url.searchParams.get("days") || "7");
      const limitRaw = Number(url.searchParams.get("limit") || "30");
      const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(60, daysRaw)) : 7;
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 30;

      const shopRecord =
        (await prisma.shop.findUnique({ where: { shop } })) ||
        (await ensureShopRow(shop));

      if (!shopRecord || !shopRecord.installed || !shopRecord.accessToken) {
        return ok({
          orders: [],
          sessionReady: false,
          shop,
          error: "Session not ready",
          timestamp,
        });
      }

      const createdAtMin = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const endpoint = `https://${shop}/admin/api/2025-01/orders.json?status=any&limit=${limit}&created_at_min=${encodeURIComponent(createdAtMin)}&fields=id,created_at,processed_at,customer,shipping_address,billing_address,line_items`;

      const resp = await fetch(endpoint, {
        headers: {
          "X-Shopify-Access-Token": shopRecord.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        const body = await resp.text();
        console.warn("[FOMO Orders API] non-OK:", resp.status, body);
        return ok({
          orders: [],
          sessionReady: true,
          shop,
          error: `Orders API failed (${resp.status})`,
          timestamp,
        });
      }

      const payload = await resp.json();
      return ok({
        orders: Array.isArray(payload?.orders) ? payload.orders : [],
        sessionReady: true,
        shop,
        timestamp,
      });
    }

    if (subpath === "popup") {
      // Ensure/require session
      const shopRecord =
        (await prisma.shop.findUnique({ where: { shop } })) ||
        (await ensureShopRow(shop));

      if (!shopRecord || !shopRecord.installed) {
        return ok({
          showPopup: false,
          sessionReady: false,
          error: "Session not ready",
          shop,
          timestamp,
        });
      }

      const wantTable = (url.searchParams.get("table") || "").toLowerCase();

      // Base configs (legacy)
      const legacyModel = configModel();
      const legacyRecords = legacyModel
        ? await legacyModel.findMany({
            where: { shop },
            orderBy: { id: "desc" },
          })
        : [];

      // All popup tables
      const keys = ["visitor", "lowstock", "addtocart", "review", "recent", "flash"];
      const fetchTable = async (key) => {
        const model = tableModel(key);
        if (!model) return [];
        return model.findMany({ where: { shop }, orderBy: { id: "desc" } });
      };

      if (wantTable) {
        if (wantTable === "notification" || wantTable === "legacy") {
          return ok({
            showPopup: legacyRecords.length > 0,
            sessionReady: true,
            table: "notification",
            records: legacyRecords,
            shop,
            timestamp,
          });
        }
        if (!keys.includes(wantTable)) {
          return bad({ error: "Unknown table" }, 404);
        }
        const rows = await fetchTable(wantTable);
        return ok({
          showPopup: rows.length > 0,
          sessionReady: true,
          table: wantTable,
          records: rows,
          shop,
          timestamp,
        });
      }

      const tablePairs = await Promise.all(
        keys.map(async (k) => [k, await fetchTable(k)])
      );
      const tables = Object.fromEntries(tablePairs);
      const hasAny =
        legacyRecords.length > 0 ||
        tablePairs.some(([, rows]) => Array.isArray(rows) && rows.length > 0);

      return ok({
        showPopup: hasAny,
        sessionReady: true,
        records: legacyRecords,
        tables,
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
