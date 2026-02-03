// app/routes/app.notification.recent.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Page,
  Card,
  Button,
  TextField,
  Select,
  ChoiceList,
  Box,
  BlockStack,
  InlineStack,
  Text,
  Frame,
  Toast,
  Loading,
  Layout,
  ColorPicker,
  Popover,
  ButtonGroup,
  Banner,
} from "@shopify/polaris";
import {
  useLoaderData,
  useNavigate,
  useRouteError,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/* ───────────────── constants ──────────────── */
const KEY = "recent";
const PAGES = [
  { label: "All Pages", value: "allpage" },
  { label: "Home Page", value: "home" },
  { label: "Product Page", value: "product" },
  { label: "Collection Page", value: "collection" },
  { label: "Pages", value: "pages" },
  { label: "Cart Page", value: "cart" },
];
const HIDE_CHOICES = [
  { label: "Customer Name", value: "name" },
  { label: "City", value: "city" },
  { label: "State", value: "state" },
  { label: "Country", value: "country" },
  { label: "Product Name", value: "productTitle" },
  { label: "Product Image", value: "productImage" },
  { label: "Order Time", value: "time" },
];

const clampDaysParam = (value, fallback = 1) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 60 ? n : fallback;
};

const DEFAULT_PREVIEW = {
  firstName: "Customer",
  lastName: "Name",
  city: "Sample City",
  state: "",
  country: "Sample Country",
  createdAt: new Date().toISOString(),
  productTitle: "Your product will show here",
  productImage: null,
  products: [
    {
      title: "Your product will show here",
      image: null,
      handle: "",
    },
  ],
};

const DEFAULT_SAVED = {
  enabled: true,
  showType: "allpage",
  fontFamily: "System",
  position: "bottom-left",
  animation: "fade",
  mobileSize: "compact",
  mobilePositionJson: '["bottom"]',
  titleColor: "#6E62FF",
  bgColor: "#FFFFFF",
  msgColor: "#111111",
  ctaBgColor: null,
  rounded: "14",
  durationSeconds: 8,
  alternateSeconds: 10,
  fontWeight: "600",
  namesJson: [],
  selectedProductsJson: [],
  locationsJson: [],
  messageTitlesJson: [],
  orderDays: 1,
  createOrderTime: null,
  orderDate: null,
};

/* ───────────────── date helpers ──────────────── */
const trimIso = (iso) => {
  const i = String(iso || "");
  const [date, time] = i.split("T");
  if (!time) return i;
  const [hms] = time.split(".");
  return `${date}T${(hms || "00:00:00Z").replace(/Z?$/, "Z")}`;
};

function zonedStartOfDay(date, timeZone) {
  const tz = timeZone || "UTC";
  const ymdFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = ymdFmt.formatToParts(date);
  const Y = Number(parts.find((p) => p.type === "year")?.value || "1970");
  const M = Number(parts.find((p) => p.type === "month")?.value || "01");
  const D = Number(parts.find((p) => p.type === "day")?.value || "01");
  const utcGuess = new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0));

  // Robust timezone offset derivation (does not rely on shortOffset support).
  const fullFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const g = fullFmt.formatToParts(utcGuess);
  const gY = Number(g.find((p) => p.type === "year")?.value || "1970");
  const gM = Number(g.find((p) => p.type === "month")?.value || "01");
  const gD = Number(g.find((p) => p.type === "day")?.value || "01");
  const gH = Number(g.find((p) => p.type === "hour")?.value || "00");
  const gMin = Number(g.find((p) => p.type === "minute")?.value || "00");
  const gS = Number(g.find((p) => p.type === "second")?.value || "00");

  const asUTC = Date.UTC(gY, gM - 1, gD, gH, gMin, gS, 0);
  const offsetMs = asUTC - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offsetMs);
}

function daysRangeZoned(days, timeZone) {
  const tz = timeZone || "UTC";
  const now = new Date();
  const endISO = trimIso(now.toISOString());
  const daysClamped = Math.max(1, Number(days || 1));

  // Calendar-day based window in shop timezone:
  // 1 day => today (shop TZ), N days => today + previous N-1 days.
  const ymdFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const p = ymdFmt.formatToParts(now);
  const Y = Number(p.find((x) => x.type === "year")?.value || "1970");
  const M = Number(p.find((x) => x.type === "month")?.value || "01");
  const D = Number(p.find((x) => x.type === "day")?.value || "01");

  // Use noon anchor to avoid DST edge ambiguity, then jump calendar days.
  const localDayAnchorUtc = new Date(Date.UTC(Y, M - 1, D, 12, 0, 0, 0));
  localDayAnchorUtc.setUTCDate(
    localDayAnchorUtc.getUTCDate() - (daysClamped - 1)
  );

  const start = zonedStartOfDay(localDayAnchorUtc, tz);
  return { startISO: trimIso(start.toISOString()), endISO };
}

async function getShopTimezone(admin) {
  try {
    const q = `query{ shop { ianaTimezone } }`;
    const r = await admin.graphql(q);
    const js = await r.json();
    return js?.data?.shop?.ianaTimezone || "UTC";
  } catch {
    return "UTC";
  }
}

/* ───────────────── Orders query + mapping (with pagination) ──────────────── */
const Q_ORDERS_FULL = `
  query Orders($first:Int!, $query:String, $after:String) {
    orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          id
          createdAt
          processedAt
          customer { firstName lastName }
          shippingAddress { city province provinceCode country }
          billingAddress  { city province provinceCode country }
          lineItems(first: 100) {
            edges {
              node {
                title
                product { handle title featuredImage { url } }
              }
            }
          }
        }
      }
    }
  }`;

function mapEdgesToOrders(edges) {
  return (edges || []).map((e) => {
    const o = e?.node || {};
    const addr = o.shippingAddress || o.billingAddress || {};
    const lines = o.lineItems?.edges || [];
    const products = lines.map((li) => ({
      title: li?.node?.product?.title || li?.node?.title || "",
      image: li?.node?.product?.featuredImage?.url || null,
      handle: li?.node?.product?.handle || "",
    }));
    return {
      id: o.id,
      createdAt: o.createdAt,
      processedAt: o.processedAt || null,
      firstName: o.customer?.firstName || "",
      lastName: o.customer?.lastName || "",
      city: addr?.city || "",
      state: addr?.province || addr?.provinceCode || "",
      country: addr?.country || "",
      products,
    };
  });
}

async function fetchOrdersWithinWindow(admin, startISO, endISO) {
  const buildWindowSearchQueries = () => {
    const startDate = String(startISO || "").slice(0, 10);
    const endDate = String(endISO || "").slice(0, 10);
    return [
      `created_at:>=${startISO} created_at:<=${endISO} status:any`,
      `created_at:>='${startISO}' created_at:<='${endISO}' status:any`,
      `created_at:>=${startDate} created_at:<=${endDate} status:any`,
      `created_at:>='${startDate}' created_at:<='${endDate}' status:any`,
    ];
  };

  async function fetchOrdersBySearch(search, { filterWindow = false } = {}) {
    const startMs = Date.parse(startISO);
    const endMs = Date.parse(endISO);
    const FIRST = 100;
    let after = null;
    let all = [];
    let stopPaging = false;

    for (let page = 0; page < 20; page++) {
      let resp;
      try {
        resp = await admin.graphql(Q_ORDERS_FULL, {
          variables: { first: FIRST, query: search, after },
        });
      } catch (e) {
        console.error("[Fomoify] admin.graphql failed (window):", e);
        break;
      }
      let js;
      try {
        js = await resp.json();
      } catch (e) {
        console.error("[Fomoify] admin.graphql JSON parse failed (window):", e);
        break;
      }
      if (Array.isArray(js?.errors) && js.errors.length) {
        console.error(
          "[Fomoify] Orders query GraphQL errors (window):",
          js.errors
        );
        break;
      }
      const block = js?.data?.orders;
      if (!block) break;

      const edges = block?.edges || [];
      const mapped = mapEdgesToOrders(edges);
      if (!filterWindow) {
        all = all.concat(mapped);
      } else {
        for (const o of mapped) {
          const orderTime = o?.processedAt || o?.createdAt || "";
          const ms = Date.parse(orderTime);
          const createdMs = Date.parse(o?.createdAt || "");
          if (!Number.isFinite(ms)) continue;
          if (ms >= startMs && ms <= endMs) all.push(o);
          if (Number.isFinite(createdMs) && createdMs < startMs) {
            // orders are sorted by createdAt desc, so next pages will be older
            stopPaging = true;
          }
        }
      }

      const hasNext = block?.pageInfo?.hasNextPage;
      after = block?.pageInfo?.endCursor || null;
      if (stopPaging || !hasNext || !after) break;
    }
    return all;
  }

  let all = [];
  let selectedSearch = null;
  for (const search of buildWindowSearchQueries()) {
    all = await fetchOrdersBySearch(search, { filterWindow: true });
    if (all.length) {
      selectedSearch = search;
      break;
    }
  }
  console.log("[Fomoify][OrdersAPI] day-wise search", {
    startISO,
    endISO,
    search: selectedSearch,
    count: all.length,
  });

  // If API-level day filter returns empty on some shops, fallback to JS window filter.
  if (!all.length) {
    all = await fetchOrdersBySearch("status:any", { filterWindow: true });
    console.log("[Fomoify][OrdersAPI] fallback JS day-filter", {
      startISO,
      endISO,
      count: all.length,
    });
  }

  all.sort((a, b) => {
    const am = Date.parse(a?.processedAt || a?.createdAt || "");
    const bm = Date.parse(b?.processedAt || b?.createdAt || "");
    return (Number.isFinite(bm) ? bm : 0) - (Number.isFinite(am) ? am : 0);
  });
  return all;
}

async function fetchLatestOrderAnyTime(admin) {
  try {
    const resp = await admin.graphql(Q_ORDERS_FULL, {
      variables: { first: 1, query: "status:any" },
    });
    const js = await resp.json();
    const edges = js?.data?.orders?.edges || [];
    const fb = mapEdgesToOrders(edges);
    return fb[0] || null;
  } catch (e) {
    console.error("[Fomoify] Fallback latest order fetch failed:", e);
    return null;
  }
}

/* ───────────────── helpers ──────────────── */
function collectAllProductHandles(orders) {
  const out = [];
  for (const o of orders || []) {
    for (const p of o.products || []) {
      const h = String(p?.handle || "").trim();
      if (h) out.push(h);
    }
  }
  return out;
}

function deriveBucketsFromOrders(orders) {
  const uniqStrings = (arr) => {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      const k = String(v || "").trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  };
  const uniqLocations = (arr) => {
    const seen = new Set();
    const out = [];
    for (const loc of arr) {
      const c = String(loc.city || "").trim();
      const s = String(loc.state || "").trim();
      const y = String(loc.country || "").trim();
      if (!c && !s && !y) continue;
      const key = `${c}|${s}|${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ city: c, state: s, country: y });
    }
    return out;
  };

  let productHandles = [];
  let locations = [];
  let customerNames = [];

  for (const o of orders || []) {
    const full = [o.firstName, o.lastName].filter(Boolean).join(" ").trim();
    if (full) customerNames.push(full);
    const l = { city: o.city, state: o.state, country: o.country };
    if (l.city || l.state || l.country) locations.push(l);
    for (const p of o.products || []) if (p.handle) productHandles.push(p.handle);
  }

  return {
    productHandles: uniqStrings(productHandles),
    locations: uniqLocations(locations),
    customerNames: uniqStrings(customerNames),
  };
}

/* ───────────────── persist (analytics) ──────────────── */
function flattenCustomerProductRows(shop, orders) {
  const seen = new Set();
  const rows = [];
  for (const o of orders || []) {
    const created = o?.createdAt ? new Date(o.createdAt) : null;
    const orderId = String(o?.id || "").trim();
    const first = (o?.firstName || "").trim();
    const last = (o?.lastName || "").trim();
    const customerName = first || last ? `${first} ${last}`.trim() : "Anonymous";
    if (!orderId || !created) continue;
    for (const p of o?.products || []) {
      const handle = String(p?.handle || "").trim();
      if (!handle) continue;
      const key = `${shop}|${orderId}|${handle}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        shop,
        orderId,
        productHandle: handle,
        customerName,
        orderCreatedAt: created,
      });
    }
  }
  return rows;
}

async function persistCustomerProductHandles(prismaClient, shop, orders) {
  try {
    if (!prismaClient) throw new Error("Prisma not available");
    const table =
      prismaClient.customerproducthandle || prismaClient.customerProductHandle;
    if (!table) throw new Error("Prisma model missing: customerProductHandle");
    const rows = flattenCustomerProductRows(shop, orders);
    if (!rows.length) return { inserted: 0, total: 0 };
    const CHUNK = 200;
    let done = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      await prismaClient.$transaction(
        slice.map((row) =>
          table.upsert({
            where: {
              shop_orderId_productHandle: {
                shop: row.shop,
                orderId: row.orderId,
                productHandle: row.productHandle,
              },
            },
            create: row,
            update: {},
          })
        ),
        { timeout: 20000 }
      );
      done += slice.length;
    }
    return { inserted: done, total: rows.length };
  } catch (e) {
    console.error("[persistCustomerProductHandles] failed:", e);
    return { inserted: 0, total: 0, error: String(e?.message || e) };
  }
}

/* ───────────────── loader ──────────────── */
export async function loader({ request }) {
  let admin;
  let session;
  let shop;

  // SUPER defensive around authenticate.admin
  try {
    ({ admin, session } = await authenticate.admin(request));
    shop = session?.shop;
  } catch (e) {
    console.error("[Fomoify] authenticate.admin failed in recent loader:", e);
    return json(
      {
        key: KEY,
        title: "Recent Purchases",
        saved: DEFAULT_SAVED,
        newestCreatedAt: null,
        preview: DEFAULT_PREVIEW,
        orders: [],
        usedDays: 1,
        hasUsableOrders: false,
        loaderError: `auth-failed: ${String(e?.message || e)}`,
      },
      { status: 200 }
    );
  }

  if (!shop) {
    return json(
      {
        key: KEY,
        title: "Recent Purchases",
        saved: DEFAULT_SAVED,
        newestCreatedAt: null,
        preview: DEFAULT_PREVIEW,
        orders: [],
        usedDays: 1,
        hasUsableOrders: false,
        loaderError: "Unauthorized – missing shop in session",
      },
      { status: 200 }
    );
  }

  try {
    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");

    let last = null;
    try {
      if (prisma?.notificationconfig?.findFirst) {
        last = await prisma.notificationconfig.findFirst({
          where: { shop, key: KEY },
          orderBy: { id: "desc" },
        });
      }
    } catch (e) {
      console.error("[Fomoify] prisma.findFirst failed (loader).", e);
    }

    const parseArr = (s) => {
      try {
        const a = JSON.parse(s || "[]");
        return Array.isArray(a) ? a : [];
      } catch {
        return [];
      }
    };
    const db_namesJson = parseArr(last?.namesJson);
    const db_locationsJson = parseArr(last?.locationsJson);
    const db_messageTitlesJson = parseArr(last?.messageTitlesJson);

    const savedOrderDays = Number.isFinite(Number(last?.orderDays))
      ? Number(last.orderDays)
      : 1;
    const urlDays = clampDaysParam(daysParam, null);
    const orderDays = urlDays ?? savedOrderDays;

    const shopTZ = await getShopTimezone(admin);
    const { startISO, endISO } = daysRangeZoned(orderDays, shopTZ);

    let strictOrders = [];
    let preview = null;
    let buckets = { productHandles: [], locations: [], customerNames: [] };
    let newestCreatedAt = null;

    try {
      strictOrders = await fetchOrdersWithinWindow(admin, startISO, endISO);

      if (strictOrders.length > 0) {
        // newest order in selected window
        newestCreatedAt = trimIso(
          String(strictOrders[0].processedAt || strictOrders[0].createdAt || "")
        );
        const p0 = strictOrders[0]?.products?.[0] || {};
        preview = {
          ...strictOrders[0],
          productTitle: p0.title,
          productImage: p0.image,
        };
      } else {
        const latestAnyTime = await fetchLatestOrderAnyTime(admin);
        if (latestAnyTime) {
          const p0 = latestAnyTime.products?.[0] || {};
          preview = {
            ...latestAnyTime,
            productTitle: p0.title,
            productImage: p0.image,
          };
        }
      }

      buckets = deriveBucketsFromOrders(strictOrders);
    } catch (e) {
      console.error("[Fomoify] Orders fetch (loader) failed:", e);
    }

    // usable orders = current window + at least one product handle
    const allHandlesWindow = collectAllProductHandles(strictOrders);
    const hasUsableOrders = allHandlesWindow.length > 0;

    const saved_selectedProductsJson = allHandlesWindow; // duplicates kept
    const saved_locationsJson =
      db_locationsJson.length ? db_locationsJson : buckets.locations;
    const saved_messageTitlesJson = db_messageTitlesJson.length
      ? db_messageTitlesJson
      : buckets.customerNames;

    // If preview is still null, provide a dummy preview so LivePreview never breaks
    if (!preview) {
      preview = DEFAULT_PREVIEW;
    }

    return json({
      key: KEY,
      title: "Recent Purchases",
      saved: {
        enabled: last?.enabled ?? true,
        showType: last?.showType ?? "allpage",
        fontFamily: last?.fontFamily ?? "System",
        position: last?.position ?? "bottom-left",
        animation: last?.animation ?? "fade",
        mobileSize: last?.mobileSize ?? "compact",
        mobilePositionJson: last?.mobilePositionJson ?? '["bottom"]',
        titleColor: last?.titleColor ?? "#6E62FF",
        bgColor: last?.bgColor ?? "#FFFFFF",
        msgColor: last?.msgColor ?? "#111111",
        ctaBgColor: last?.ctaBgColor ?? null,
        rounded: String(last?.rounded ?? 14),
        durationSeconds: Number(last?.durationSeconds ?? 1),
        alternateSeconds: Number(last?.alternateSeconds ?? 10),
        fontWeight: String(last?.fontWeight ?? 600),

        namesJson: db_namesJson,
        selectedProductsJson: saved_selectedProductsJson,
        locationsJson: saved_locationsJson,
        messageTitlesJson: saved_messageTitlesJson,

        orderDays: orderDays,
        createOrderTime: last?.createOrderTime ?? newestCreatedAt ?? null,
        orderDate: last?.orderDate ?? newestCreatedAt ?? null,
      },
      newestCreatedAt,
      preview,
      orders: strictOrders,
      usedDays: orderDays,
      hasUsableOrders,
      loaderError: null,
    });
  } catch (e) {
    console.error("[Fomoify] loader fatal error:", e);
    return json(
      {
        key: KEY,
        title: "Recent Purchases",
        saved: DEFAULT_SAVED,
        newestCreatedAt: null,
        preview: DEFAULT_PREVIEW,
        orders: [],
        usedDays: 1,
        hasUsableOrders: false,
        loaderError: String(e?.message || e),
      },
      { status: 200 }
    );
  }
}

/* ───────────────── action ──────────────── */
export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const { form } = body || {};

  const nullIfBlank = (v) =>
    v === undefined || v === null || String(v).trim() === ""
      ? null
      : String(v);
  const intOrNull = (v, min = null, max = null) => {
    if (v === undefined || v === null || String(v).trim() === "") return null;
    let n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return Math.trunc(n);
  };

  const url = new URL(request.url);
  const urlDays = Number(url.searchParams.get("days"));
  const fetchDays =
    intOrNull(form?.orderDays, 1, 60) ??
    (Number.isFinite(urlDays) && urlDays >= 1 && urlDays <= 60 ? urlDays : 1);

  const shopTZ = await getShopTimezone(admin);
  const { startISO, endISO } = daysRangeZoned(fetchDays, shopTZ);

  // 1) Fetch window orders
  let orders = [];
  try {
    orders = await fetchOrdersWithinWindow(admin, startISO, endISO);
  } catch (e) {
    console.error("[Fomoify] Orders fetch (action) failed:", e);
  }

  // 2) Strong validation: require at least one product handle
  const allHandlesWindow = collectAllProductHandles(orders);
  if (!orders || orders.length === 0 || allHandlesWindow.length === 0) {
    // No usable orders ⇒ 422 validation (not 500)
    return json(
      {
        success: false,
        error:
          "No usable orders found in the selected window. Try selecting fewer days or wait until you have some orders with products.",
        validation: "NO_USABLE_ORDERS",
      },
      { status: 422 }
    );
  }

  // 3) Persist only after validation
  try {
    const persistRes = await persistCustomerProductHandles(prisma, shop, orders);
    if (persistRes?.error)
      console.warn("[action] persist warning:", persistRes.error);
  } catch (e) {
    console.error("[action] persist failed:", e);
  }

  // 4) Build save payload
  const { locations, customerNames } = deriveBucketsFromOrders(orders);
  const newestOrderCreatedAtISO =
    orders.length > 0 && (orders[0]?.processedAt || orders[0]?.createdAt)
      ? trimIso(String(orders[0].processedAt || orders[0].createdAt))
      : null;

  const selectedProductsJson = JSON.stringify(allHandlesWindow);
  const locationsJson = JSON.stringify(locations || []);
  const messageTitlesJson = JSON.stringify(customerNames || []);
  const namesJson = JSON.stringify(
    Array.isArray(form?.namesJson) ? form.namesJson : []
  );
  const mobilePositionJson = JSON.stringify(
    Array.isArray(form?.mobilePosition)
      ? form.mobilePosition
      : [form?.mobilePosition || "bottom"]
  );

  const data = {
    shop,
    key: KEY,

    enabled: !!(form?.enabled?.includes?.("enabled")),
    showType: nullIfBlank(form?.showType),
    messageText: nullIfBlank(form?.messageText),
    fontFamily: nullIfBlank(form?.fontFamily),
    position: nullIfBlank(form?.position),
    animation: nullIfBlank(form?.animation),
    mobileSize: nullIfBlank(form?.mobileSize),
    mobilePositionJson,
    titleColor: nullIfBlank(form?.titleColor),
    bgColor: nullIfBlank(form?.bgColor),
    msgColor: nullIfBlank(form?.msgColor),
    ctaBgColor: nullIfBlank(form?.ctaBgColor),
    rounded: intOrNull(form?.rounded, 10, 72),
    durationSeconds: intOrNull(form?.durationSeconds, 1, 60),
    alternateSeconds: intOrNull(form?.alternateSeconds, 0, 3600),
    fontWeight: intOrNull(form?.fontWeight, 100, 900),

    namesJson,
    selectedProductsJson,
    locationsJson,
    messageTitlesJson,

    orderDays: Number(fetchDays),
    createOrderTime: newestOrderCreatedAtISO ?? null,
    orderDate: newestOrderCreatedAtISO ?? null,
  };

  Object.keys(data).forEach((k) => {
    if (data[k] === undefined) delete data[k];
  });

  try {
    if (!prisma?.notificationconfig)
      throw new Error("Prisma model missing: notificationconfig");

    const existing = await prisma.notificationconfig.findFirst({
      where: { shop, key: KEY },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    let saved;
    if (existing?.id) {
      saved = await prisma.notificationconfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      saved = await prisma.notificationconfig.create({ data });
    }

    return json({
      success: true,
      id: saved.id,
      savedDays: data.orderDays,
      savedCreateOrderTime: data.createOrderTime,
      counts: {
        products: allHandlesWindow.length,
        locations: (locations || []).length,
        names: (customerNames || []).length,
      },
      window: { startISO, endISO },
    });
  } catch (e) {
    console.error("[NotificationConfig save failed]", e?.code, e?.meta, e);
    return json(
      {
        success: false,
        error: String(e?.message || e),
        code: e?.code || null,
        cause: e?.meta?.cause || null,
        hint:
          "If create() fails, check the DB for any legacy NOT NULL columns that are not in the Prisma model.",
      },
      { status: 500 }
    );
  }
}

/* ───────────────── color helpers ──────────────── */
const hex6 = (v) => /^#[0-9A-F]{6}$/i.test(String(v || ""));
function hexToRgb(hex) {
  const c = hex.replace("#", "");
  const n = parseInt(c, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHsv({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const m = Math.max(r, g, b),
    n = Math.min(r, g, b),
    d = m - n;
  let h = 0;
  if (d) {
    switch (m) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  const s = m ? d / m : 0;
  return { hue: h, saturation: s, brightness: m };
}
function hsvToRgb({ hue: h, saturation: s, brightness: v }) {
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  let R = 0,
    G = 0,
    B = 0;
  if (0 <= h && h < 60) [R, G, B] = [c, x, 0];
  else if (60 <= h && h < 120) [R, G, B] = [x, c, 0];
  else if (120 <= h && h < 180) [R, G, B] = [0, c, x];
  else if (180 <= h && h < 240) [R, G, B] = [0, x, c];
  else [R, G, B] = [x, 0, c];
  return {
    r: Math.round((R + m) * 255),
    g: Math.round((G + m) * 255),
    b: Math.round((B + m) * 255),
  };
}
const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
const hexToHSB = (hex) => rgbToHsv(hexToRgb(hex));
const hsbToHEX = (hsb) => rgbToHex(hsvToRgb(hsb));

function ColorInput({ label, value, onChange, placeholder = "#244E89" }) {
  const [open, setOpen] = useState(false);
  const [hsb, setHsb] = useState(
    hex6(value)
      ? hexToHSB(value)
      : { hue: 212, saturation: 0.7, brightness: 0.55 }
  );
  useEffect(() => {
    if (hex6(value)) setHsb(hexToHSB(value));
  }, [value]);
  const swatch = (
    <div
      onClick={() => setOpen(true)}
      style={{
        width: 28,
        height: 28,
        borderRadius: 10,
        cursor: "pointer",
        border: "1px solid rgba(0,0,0,0.08)",
        background: hex6(value) ? value : "#ffffff",
      }}
    />
  );
  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      preferredAlignment="right"
      activator={
        <TextField
          label={label}
          value={value}
          onChange={(v) => {
            const next = String(v).toUpperCase();
            onChange(next);
            if (hex6(next)) setHsb(hexToHSB(next));
          }}
          autoComplete="off"
          placeholder={placeholder}
          suffix={swatch}
          onFocus={() => setOpen(true)}
        />
      }
    >
      <Box padding="300" minWidth="260px">
        <ColorPicker
          color={hsb}
          onChange={(c) => {
            setHsb(c);
            onChange(hsbToHEX(c));
          }}
          allowAlpha={false}
        />
      </Box>
    </Popover>
  );
}

/* ───────────────── preview components ──────────────── */
const getAnimationStyle = (a) =>
  a === "slide"
    ? {
        transform: "translateY(8px)",
        animation: "notif-slide-in 240ms ease-out",
      }
    : a === "bounce"
    ? { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" }
    : a === "zoom"
    ? {
        transform: "scale(0.96)",
        animation: "notif-zoom-in 200ms ease-out forwards",
      }
    : { opacity: 1, animation: "notif-fade-in 220ms ease-out forwards" };

const posToFlex = (pos) => {
  switch (pos) {
    case "top-left":
      return { justifyContent: "flex-start", alignItems: "flex-start" };
    case "top-right":
      return { justifyContent: "flex-end", alignItems: "flex-start" };
    case "bottom-left":
      return { justifyContent: "flex-start", alignItems: "flex-end" };
    case "bottom-right":
      return { justifyContent: "flex-end", alignItems: "flex-end" };
    default:
      return { justifyContent: "flex-start", alignItems: "flex-end" };
  }
};
const mobilePosToFlex = (pos) => ({
  justifyContent: "center",
  alignItems: pos === "top" ? "flex-start" : "flex-end",
});
const mobileSizeToWidth = (size) =>
  size === "compact" ? 300 : size === "large" ? 360 : 330;
const mobileSizeScale = (size) => (size === "compact" ? 0.92 : 1.06);

function formatOrderAge(createdAt) {
  if (!createdAt) return "Timing";
  const orderDate = new Date(createdAt);
  if (Number.isNaN(orderDate.getTime())) return "Timing";

  const now = new Date();
  const sameDay = orderDate.toDateString() === now.toDateString();

  if (sameDay) {
    const diffMs = Math.max(0, now - orderDate);
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const shown = Math.max(1, hours);
    return `${shown} hour${shown === 1 ? "" : "s"} ago`;
  }

  const startOrder = new Date(
    orderDate.getFullYear(),
    orderDate.getMonth(),
    orderDate.getDate()
  );
  const startNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const diffDays = Math.max(
    1,
    Math.round((startNow - startOrder) / (24 * 60 * 60 * 1000))
  );
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function Bubble({ form, order, isMobile = false, hydrated = false }) {
  const animStyle = useMemo(
    () => getAnimationStyle(form.animation),
    [form.animation]
  );
  const sizeBase = Number(form.rounded ?? 14) || 14;
  const sized = Math.max(
    10,
    Math.min(
      28,
      Math.round(sizeBase * (isMobile ? mobileSizeScale(form.mobileSize) : 1))
    )
  );
  const hide = new Set(form.namesJson || []);

  const name = [order?.firstName, order?.lastName].filter(Boolean).join(" ");
  const locBits = [
    hide.has("city") ? null : order?.city,
    hide.has("state") ? null : order?.state,
    hide.has("country") ? null : order?.country,
  ].filter(Boolean);
  const loc = locBits.join(", ");

  const products = Array.isArray(order?.products) ? order.products : [];
  const first = products[0] || null;
  const productTitle = hide.has("productTitle")
    ? ""
    : first?.title || order?.productTitle || "";
  const productImg = hide.has("productImage")
    ? null
    : first?.image || order?.productImage || null;
  const moreCount = Math.max(0, products.length - 1);

  const showTime = !hide.has("time");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily:
          form.fontFamily === "System"
            ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto"
            : form.fontFamily,
        background: form.bgColor,
        color: form.msgColor,
        borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: 12,
        border: "1px solid rgba(17,24,39,0.06)",
        maxWidth: isMobile ? mobileSizeToWidth(form.mobileSize) : 560,
        ...animStyle,
      }}
    >
      <div>
        {productImg ? (
          <img
            src={productImg}
            alt={productTitle || "Product"}
            style={{
              width: 60,
              height: 60,
              objectFit: "cover",
              borderRadius: 6,
              background: "#f4f4f5",
            }}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 6,
              background: "#f4f4f5",
            }}
          />
        )}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: sized }}>
          {!hide.has("name") && (
            <span
              style={{
                color: form.titleColor,
                fontWeight: Number(form.fontWeight || 600),
              }}
            >
              {name || "Customer Name from Location"}
            </span>
          )}
          {!hide.has("name") && loc ? " from " : ""}
          {loc && (
            <span
              style={{
                color: form.titleColor,
                fontWeight: Number(form.fontWeight || 600),
              }}
            >
              {loc}
            </span>
          )}
          <br />
          <span>
            {productTitle ? `bought “${productTitle}”` : "placed an order"}
            {moreCount > 0 && !hide.has("productTitle")
              ? ` +${moreCount} more`
              : ""}
          </span>
          {showTime && (
            <>
              <br />
              <span style={{ opacity: 0.85, fontSize: sized * 0.9 }}>
                <small>
                  {hydrated
                    ? formatOrderAge(order?.processedAt || order?.createdAt)
                    : "Timing"}
                </small>
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function DesktopPreview({ form, order, hydrated = false }) {
  const flex = posToFlex(form.position);
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        minHeight: 320,
        height: 400,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "linear-gradient(180deg,#fafafa 0%,#f5f5f5 100%)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        padding: 18,
        boxSizing: "border-box",
        ...flex,
      }}
    >
      <Bubble form={form} order={order} hydrated={hydrated} />
    </div>
  );
}
function MobilePreview({ form, order, hydrated = false }) {
  const posArr = Array.isArray(form.mobilePosition)
    ? form.mobilePosition
    : [form.mobilePosition || "bottom"];
  const flex = mobilePosToFlex(posArr[0]);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: 380,
          height: 400,
          borderRadius: 40,
          border: "1px solid #e5e7eb",
          background: "linear-gradient(180deg,#fcfcfd 0%,#f5f5f6 100%)",
          boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
          position: "relative",
          overflow: "hidden",
          padding: 14,
          display: "flex",
          ...flex,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 18,
            borderRadius: 10,
            background: "#0f172a0f",
          }}
        />
        <div style={{ padding: 8 }}>
          <Bubble form={form} order={order} isMobile hydrated={hydrated} />
        </div>
      </div>
    </div>
  );
}
function LivePreview({ form, order, hydrated = false }) {
  const [mode, setMode] = useState("desktop");
  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingMd">
          Live Preview
        </Text>
        <ButtonGroup segmented>
          <Button
            pressed={mode === "desktop"}
            onClick={() => setMode("desktop")}
          >
            Desktop
          </Button>
          <Button
            pressed={mode === "mobile"}
            onClick={() => setMode("mobile")}
          >
            Mobile
          </Button>
          <Button
            pressed={mode === "both"}
            onClick={() => setMode("both")}
          >
            Both
          </Button>
        </ButtonGroup>
      </InlineStack>
      {mode === "desktop" && (
        <DesktopPreview form={form} order={order} hydrated={hydrated} />
      )}
      {mode === "mobile" && (
        <MobilePreview form={form} order={order} hydrated={hydrated} />
      )}
      {mode === "both" && (
        <InlineStack gap="400" align="space-between" wrap>
          <Box width="58%">
            <DesktopPreview form={form} order={order} hydrated={hydrated} />
          </Box>
          <Box width="40%">
            <MobilePreview form={form} order={order} hydrated={hydrated} />
          </Box>
        </InlineStack>
      )}
      <Text as="p" variant="bodySm" tone="subdued">
        Orders are pulled strictly by the selected window (shop timezone).
        Preview may show the latest order only for visual reference.
      </Text>
    </BlockStack>
  );
}

/* ───────────────── page ──────────────── */
export default function RecentOrdersPopupPage() {
  const {
    title,
    saved,
    preview,
    orders,
    usedDays,
    hasUsableOrders,
    newestCreatedAt,
    loaderError,
  } = useLoaderData();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    console.log(
      `[Fomoify] STRICT ${usedDays}-day window orders:`,
      orders
    );
    console.log("[Fomoify] Preview:", preview);
    if (loaderError) {
      console.warn("[Fomoify] Loader reported error:", loaderError);
    }
  }, [orders, usedDays, preview, loaderError]);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    on: false,
    error: false,
    msg: "",
  });

  const [form, setForm] = useState(() => ({
    enabled: saved.enabled ? ["enabled"] : ["disabled"],
    showType: saved.showType,
    messageText: "bought this product recently",
    fontFamily: saved.fontFamily,
    position: saved.position,
    animation: saved.animation,
    mobileSize: saved.mobileSize,
    mobilePosition: (() => {
      try {
        const j = JSON.parse(saved.mobilePositionJson || "[]");
        return Array.isArray(j) && j.length ? j : ["bottom"];
      } catch {
        return ["bottom"];
      }
    })(),
    titleColor: saved.titleColor,
    bgColor: saved.bgColor,
    msgColor: saved.msgColor,
    ctaBgColor: saved.ctaBgColor,
    rounded: saved.rounded,
    durationSeconds: saved.durationSeconds,
    alternateSeconds: saved.alternateSeconds,
    fontWeight: saved.fontWeight,

    namesJson: saved.namesJson || [],
    selectedProductsJson: saved.selectedProductsJson || [],
    locationsJson: saved.locationsJson || [],
    messageTitlesJson: saved.messageTitlesJson || [],

    orderDays: Number(saved.orderDays ?? usedDays ?? 1),
    createOrderTime: saved.createOrderTime ?? newestCreatedAt ?? null,
    orderDate: saved.orderDate ?? newestCreatedAt ?? null,
  }));

  useEffect(() => {
    const newest = orders?.[0]?.processedAt || orders?.[0]?.createdAt
      ? trimIso(String(orders[0].processedAt || orders[0].createdAt))
      : null;
    setForm((f) => ({ ...f, createOrderTime: newest, orderDate: newest }));
  }, [orders]);

  const onField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const onNumClamp = (k, lo, hi) => (val) => {
    const n = parseInt(String(val ?? ""), 10);
    const clamped = isNaN(n) ? lo : Math.max(lo, Math.min(hi, n));
    setForm((f) => ({ ...f, [k]: clamped }));
  };

  const save = async () => {
    try {
      setSaving(true);
      const loc = new URL(window.location.href);
      const endpoint = `${loc.pathname}${loc.search || ""}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ form }),
      });

      const isJSON = res.headers
        .get("content-type")
        ?.includes("application/json");
      const payload = isJSON
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) {
        const msg =
          payload?.error ||
          "Save failed. Try selecting a different day window or try again later.";
        setToast({ on: true, error: true, msg });
        return;
      }

      navigate("/app/dashboard?saved=1");
    } catch (e) {
      setToast({
        on: true,
        error: true,
        msg: String(e.message || "Error"),
      });
    } finally {
      setSaving(false);
    }
  };

  const fontOptions = [
    { label: "System", value: "System" },
    { label: "Inter", value: "Inter" },
    { label: "Roboto", value: "Roboto" },
    { label: "Montserrat", value: "Montserrat" },
    { label: "Poppins", value: "Poppins" },
  ];
  const daysOptions = Array.from({ length: 60 }, (_, i) => ({
    label: `${i + 1} day${i ? "s" : ""}`,
    value: String(i + 1),
  }));

  const unusable = !hasUsableOrders;

  return (
    <Frame>
      {saving && <Loading />}
      <Page
        title={`Configuration – ${title}`}
        backAction={{
          content: "Back",
          onAction: () => navigate("/app/notification"),
        }}
        primaryAction={{
          content: "Save",
          onAction: save,
          loading: saving,
          disabled: saving || unusable,
        }}
      >
        <Layout>
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <LivePreview form={form} order={preview} hydrated={hydrated} />
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Order Source & Fields
                  </Text>

                  {unusable && (
                    <Banner
                      status="critical"
                      title="You have no usable orders."
                    >
                      <p>
                        No orders with products were found in the selected
                        window. Try selecting fewer days or wait until you have
                        some orders.
                      </p>
                    </Banner>
                  )}

                  <Select
                    label="Show orders from last"
                    options={daysOptions}
                    value={String(form.orderDays ?? usedDays)}
                    onChange={(v) => {
                      const fallback = Number(form.orderDays ?? usedDays ?? 1);
                      const n = clampDaysParam(v, fallback);
                      setForm((f) => ({ ...f, orderDays: n }));
                      const sp = new URLSearchParams(window.location.search);
                      sp.set("days", String(n));
                      navigate(
                        `${window.location.pathname}?${sp.toString()}`,
                        { replace: true }
                      );
                    }}
                    helpText="1 Day = Today (shop timezone), up to 60 days"
                  />

                  <Text as="p" variant="bodySm" tone="subdued">
                    Last newest order time (static):{" "}
                    {form.createOrderTime
                      ? hydrated
                        ? new Date(form.createOrderTime).toLocaleString()
                        : trimIso(String(form.createOrderTime))
                      : "—"}
                  </Text>

                  <ChoiceList
                    title="Hide Fields (toggle visibility)"
                    allowMultiple
                    choices={HIDE_CHOICES}
                    selected={form.namesJson}
                    onChange={onField("namesJson")}
                  />
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Display & Customize */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Display
                  </Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <ChoiceList
                        title="Enable Sales Notification Popup"
                        choices={[
                          { label: "Enabled", value: "enabled" },
                          { label: "Disabled", value: "disabled" },
                        ]}
                        selected={form.enabled}
                        onChange={onField("enabled")}
                        alignment="horizontal"
                      />
                    </Box>
                    <Box width="50%">
                      <Select
                        label="Display On Pages"
                        options={PAGES}
                        value={form.showType}
                        onChange={onField("showType")}
                      />
                    </Box>
                  </InlineStack>

                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <TextField
                        label="Popup Display Duration (seconds)"
                        type="number"
                        min={1}
                        max={120}
                        step={1}
                        value={String(form.durationSeconds)}
                        onChange={onNumClamp("durationSeconds", 1, 120)}
                        suffix="S"
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="50%">
                      <TextField
                        label="Interval Between Popups (seconds)"
                        type="number"
                        min={0}
                        max={3600}
                        step={1}
                        value={String(form.alternateSeconds)}
                        onChange={onNumClamp("alternateSeconds", 0, 3600)}
                        suffix="S"
                        autoComplete="off"
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Customize
                  </Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <Select
                        label="Popup Font Family"
                        options={fontOptions}
                        value={form.fontFamily}
                        onChange={onField("fontFamily")}
                      />
                    </Box>
                    <Box width="50%">
                      <Select
                        label="Font Weight / Style"
                        options={[
                          { label: "100 - Thin", value: "100" },
                          { label: "200 - Extra Light", value: "200" },
                          { label: "300 - Light", value: "300" },
                          { label: "400 - Normal", value: "400" },
                          { label: "500 - Medium", value: "500" },
                          { label: "600 - Semi Bold", value: "600" },
                          { label: "700 - Bold", value: "700" },
                        ]}
                        value={form.fontWeight}
                        onChange={onField("fontWeight")}
                      />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <Select
                        label="Desktop Popup Position"
                        options={[
                          "top-left",
                          "top-right",
                          "bottom-left",
                          "bottom-right",
                        ].map((v) => ({
                          label: v
                            .replace("-", " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase()),
                          value: v,
                        }))}
                        value={form.position}
                        onChange={onField("position")}
                      />
                    </Box>
                    <Box width="50%">
                      <Select
                        label="Notification Animation Style"
                        options={[
                          { label: "Fade", value: "fade" },
                          { label: "Slide", value: "slide" },
                          { label: "Bounce", value: "bounce" },
                          { label: "Zoom", value: "zoom" },
                        ]}
                        value={form.animation}
                        onChange={onField("animation")}
                      />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <Select
                        label="Mobile Popup Size"
                        options={[
                          { label: "Compact", value: "compact" },
                          { label: "Comfortable", value: "comfortable" },
                          { label: "Large", value: "large" },
                        ]}
                        value={form.mobileSize}
                        onChange={onField("mobileSize")}
                      />
                    </Box>
                    <Box width="50%">
                      <Select
                        label="Mobile Popup Position"
                        options={["top", "bottom"].map((v) => ({
                          label: v[0].toUpperCase() + v.slice(1),
                          value: v,
                        }))}
                        value={
                          Array.isArray(form.mobilePosition)
                            ? form.mobilePosition[0]
                            : "bottom"
                        }
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            mobilePosition: [v],
                          }))
                        }
                      />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <TextField
                        type="number"
                        label="Font Size (px)"
                        value={String(form.rounded)}
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            rounded: String(v),
                          }))
                        }
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="50%">
                      <ColorInput
                        label="Headline Text Color"
                        value={form.titleColor}
                        onChange={(v) =>
                          setForm((f) => ({ ...f, titleColor: v }))
                        }
                      />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <ColorInput
                        label="Popup Background Color"
                        value={form.bgColor}
                        onChange={(v) =>
                          setForm((f) => ({ ...f, bgColor: v }))
                        }
                      />
                    </Box>
                    <Box width="50%">
                      <ColorInput
                        label="Message Text Color"
                        value={form.msgColor}
                        onChange={(v) =>
                          setForm((f) => ({ ...f, msgColor: v }))
                        }
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>

      {toast.on && (
        <Toast
          content={toast.msg}
          error={toast.error}
          onDismiss={() => setToast((s) => ({ ...s, on: false }))}
          duration={5200}
        />
      )}
    </Frame>
  );
}

/* ───────────────── ErrorBoundary ──────────────── */
export function ErrorBoundary() {
  const error = useRouteError();
  console.error("[Fomoify] RecentOrdersPopupPage route error:", error);

  let message =
    "Something went wrong while loading Recent Purchases.";
  if (error && typeof error === "object" && "status" in error) {
    if (error.status === 500) {
      message =
        "The server returned an internal error. Please refresh the page.";
    }
  }

  return (
    <Frame>
      <Page title="Recent Purchases">
        <Layout>
          <Layout.Section>
            <Banner status="critical" title="Unable to load Recent Purchases">
              <p>{message}</p>
              <p>
                Try reloading the page or reopening the app from the Apps list.
              </p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
