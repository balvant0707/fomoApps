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

const TABLE_SELECTS = {
  visitor: {
    id: true,
    enabled: true,
    notiType: true,
    layout: true,
    size: true,
    transparent: true,
    template: true,
    imageAppearance: true,
    bgColor: true,
    bgAlt: true,
    textColor: true,
    timestampColor: true,
    priceTagBg: true,
    priceTagAlt: true,
    priceColor: true,
    starColor: true,
    textSizeContent: true,
    textSizeCompareAt: true,
    textSizePrice: true,
    message: true,
    timestamp: true,
    avgTime: true,
    avgUnit: true,
    productNameMode: true,
    productNameLimit: true,
    directProductPage: true,
    showProductImage: true,
    showPriceTag: true,
    showRating: true,
    ratingSource: true,
    customerInfo: true,
    showHome: true,
    showProduct: true,
    productScope: true,
    showCollectionList: true,
    showCollection: true,
    collectionScope: true,
    showCart: true,
    position: true,
    showClose: true,
    hideOnMobile: true,
    delay: true,
    duration: true,
    interval: true,
    intervalUnit: true,
    randomize: true,
    selectedDataProductsJson: true,
    selectedVisibilityProductsJson: true,
    selectedProductsJson: true,
    selectedCollectionsJson: true,
  },
  lowstock: {
    id: true,
    enabled: true,
    layout: true,
    size: true,
    transparent: true,
    template: true,
    imageAppearance: true,
    bgColor: true,
    bgAlt: true,
    textColor: true,
    numberColor: true,
    priceTagBg: true,
    priceTagAlt: true,
    priceColor: true,
    starColor: true,
    textSizeContent: true,
    textSizeCompareAt: true,
    textSizePrice: true,
    message: true,
    productNameMode: true,
    productNameLimit: true,
    dataSource: true,
    stockUnder: true,
    hideOutOfStock: true,
    directProductPage: true,
    showProductImage: true,
    showPriceTag: true,
    showRating: true,
    showHome: true,
    showProduct: true,
    productScope: true,
    showCollectionList: true,
    showCollection: true,
    collectionScope: true,
    showCart: true,
    position: true,
    showClose: true,
    hideOnMobile: true,
    delay: true,
    duration: true,
    interval: true,
    intervalUnit: true,
    randomize: true,
    selectedDataProductsJson: true,
    selectedVisibilityProductsJson: true,
    selectedProductsJson: true,
    selectedCollectionsJson: true,
  },
  addtocart: {
    id: true,
    enabled: true,
    layout: true,
    size: true,
    transparent: true,
    template: true,
    bgColor: true,
    bgAlt: true,
    textColor: true,
    timestampColor: true,
    priceTagBg: true,
    priceTagAlt: true,
    priceColor: true,
    starColor: true,
    textSizeContent: true,
    textSizeCompareAt: true,
    textSizePrice: true,
    message: true,
    timestamp: true,
    avgTime: true,
    avgUnit: true,
    productNameMode: true,
    productNameLimit: true,
    dataSource: true,
    customerInfo: true,
    stockUnder: true,
    hideOutOfStock: true,
    directProductPage: true,
    showProductImage: true,
    showPriceTag: true,
    showRating: true,
    showHome: true,
    showProduct: true,
    productScope: true,
    showCollectionList: true,
    showCollection: true,
    collectionScope: true,
    showCart: true,
    position: true,
    showClose: true,
    hideOnMobile: true,
    delay: true,
    duration: true,
    interval: true,
    intervalUnit: true,
    randomize: true,
    selectedDataProductsJson: true,
    selectedVisibilityProductsJson: true,
    selectedProductsJson: true,
    selectedCollectionsJson: true,
  },
  review: {
    id: true,
    enabled: true,
    reviewType: true,
    template: true,
    imageAppearance: true,
    bgColor: true,
    bgAlt: true,
    textColor: true,
    timestampColor: true,
    priceTagBg: true,
    priceTagAlt: true,
    priceColor: true,
    starColor: true,
    textSizeContent: true,
    textSizeCompareAt: true,
    textSizePrice: true,
    message: true,
    timestamp: true,
    productNameMode: true,
    productNameLimit: true,
    dataSource: true,
    directProductPage: true,
    showProductImage: true,
    showPriceTag: true,
    showRating: true,
    showHome: true,
    showProduct: true,
    productScope: true,
    showCollectionList: true,
    showCollection: true,
    collectionScope: true,
    showCart: true,
    position: true,
    showClose: true,
    hideOnMobile: true,
    delay: true,
    duration: true,
    interval: true,
    intervalUnit: true,
    randomize: true,
    selectedDataProductsJson: true,
    selectedVisibilityProductsJson: true,
    selectedProductsJson: true,
    selectedCollectionsJson: true,
  },
  recent: {
    id: true,
    enabled: true,
    showType: true,
    messageText: true,
    fontFamily: true,
    position: true,
    animation: true,
    mobileSize: true,
    mobilePositionJson: true,
    template: true,
    layout: true,
    imageAppearance: true,
    bgColor: true,
    bgAlt: true,
    textColor: true,
    numberColor: true,
    priceTagBg: true,
    priceTagAlt: true,
    priceColor: true,
    starColor: true,
    rounded: true,
    firstDelaySeconds: true,
    durationSeconds: true,
    alternateSeconds: true,
    intervalUnit: true,
    fontWeight: true,
    productNameMode: true,
    productNameLimit: true,
    orderDays: true,
    createOrderTime: true,
    messageTitlesJson: true,
    locationsJson: true,
    namesJson: true,
    selectedProductsJson: true,
  },
  flash: {
    id: true,
    enabled: true,
    showType: true,
    messageTitle: true,
    name: true,
    messageText: true,
    fontFamily: true,
    fontWeight: true,
    layout: true,
    imageAppearance: true,
    template: true,
    position: true,
    animation: true,
    mobileSize: true,
    mobilePositionJson: true,
    bgColor: true,
    bgAlt: true,
    textColor: true,
    numberColor: true,
    priceTagBg: true,
    priceTagAlt: true,
    priceColor: true,
    starColor: true,
    rounded: true,
    firstDelaySeconds: true,
    durationSeconds: true,
    alternateSeconds: true,
    intervalUnit: true,
    iconKey: true,
    iconSvg: true,
    messageTitlesJson: true,
    locationsJson: true,
    namesJson: true,
    selectedProductsJson: true,
  },
};

const missingColumnError = (err) => {
  const code = String(err?.code || "").toUpperCase();
  const msg = String(err?.message || "").toLowerCase();
  return (
    code === "P2022" ||
    msg.includes("unknown column") ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
};

const extractColumnName = (err) => {
  const rawMeta = String(err?.meta?.column || "").trim();
  if (rawMeta) {
    const parts = rawMeta.split(".");
    return parts[parts.length - 1] || "";
  }
  const msg = String(err?.message || "");
  const match =
    msg.match(/unknown column ['`"]([^'`"]+)['`"]/i) ||
    msg.match(/column ['`"]([^'`"]+)['`"] does not exist/i);
  if (!match?.[1]) return "";
  const parts = String(match[1]).split(".");
  return parts[parts.length - 1] || "";
};

const removeSelectKey = (select, column) => {
  if (!column) return false;
  if (Object.prototype.hasOwnProperty.call(select, column)) {
    delete select[column];
    return true;
  }
  return false;
};

async function safeFindLatest(model, key, shop) {
  const baseSelect = { ...(TABLE_SELECTS[key] || {}) };
  let select = Object.keys(baseSelect).length ? { ...baseSelect } : null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      if (select && Object.keys(select).length) {
        return await model.findFirst({
          where: { shop },
          orderBy: { id: "desc" },
          select,
        });
      }
      return await model.findFirst({
        where: { shop },
        orderBy: { id: "desc" },
      });
    } catch (e) {
      if (!missingColumnError(e)) throw e;
      if (!select) throw e;

      const column = extractColumnName(e);
      const removed = removeSelectKey(select, column);
      if (!removed) {
        // Fallback to minimal row if parser couldn't isolate a column name.
        select = { id: true, enabled: true };
      }
      console.warn("[FOMO popup] missing column fallback:", {
        key,
        shop,
        removedColumn: column || null,
      });
    }
  }

  return null;
}

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

    if (subpath === "customers") {
      const limitRaw = Number(url.searchParams.get("limit") || "100");
      const limit = Number.isFinite(limitRaw)
        ? Math.max(1, Math.min(250, limitRaw))
        : 100;

      const shopRecord =
        (await prisma.shop.findUnique({ where: { shop } })) ||
        (await ensureShopRow(shop));

      if (!shopRecord || !shopRecord.installed || !shopRecord.accessToken) {
        return ok({
          customers: [],
          sessionReady: false,
          shop,
          error: "Session not ready",
          timestamp,
        });
      }

      const endpoint = `https://${shop}/admin/api/2025-01/customers.json?limit=${limit}&fields=first_name,last_name,default_address`;
      const resp = await fetch(endpoint, {
        headers: {
          "X-Shopify-Access-Token": shopRecord.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        const body = await resp.text();
        console.warn("[FOMO Customers API] non-OK:", resp.status, body);
        return ok({
          customers: [],
          sessionReady: true,
          shop,
          error: `Customers API failed (${resp.status})`,
          timestamp,
        });
      }

      const payload = await resp.json();
      const customers = Array.isArray(payload?.customers)
        ? payload.customers.map((c) => ({
            first_name: c?.first_name || "",
            last_name: c?.last_name || "",
            city: c?.default_address?.city || "",
            state: c?.default_address?.province || "",
            country: c?.default_address?.country || "",
          }))
        : [];

      return ok({
        customers,
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

      // All popup tables
      const keys = ["visitor", "lowstock", "addtocart", "review", "recent", "flash"];
      const fetchTable = async (key) => {
        const model = tableModel(key);
        if (!model) return [];
        try {
          const row = await safeFindLatest(model, key, shop);
          return row ? [row] : [];
        } catch (e) {
          console.warn(`[FOMO popup] table read failed for ${key}:`, e);
          return [];
        }
      };

      if (wantTable) {
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
      const hasAny = tablePairs.some(
        ([, rows]) => Array.isArray(rows) && rows.length > 0
      );

      return ok({
        showPopup: hasAny,
        sessionReady: true,
        records: [],
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
