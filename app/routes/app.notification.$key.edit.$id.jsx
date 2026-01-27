// app/routes/app.notification.$key.edit.$id.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, Frame, Loading, Layout,
  Modal, IndexTable, Thumbnail, Badge, Pagination, Divider, Icon,
  Tag, Popover, ColorPicker, ButtonGroup, Toast, DropZone
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import {
  useLoaderData,
  useNavigate,
  useFetcher,
  Form,
  useNavigation,
  useLocation,
} from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/* ───────────────── constants ──────────────── */
const TITLES = { recent: "Recent Purchases", flash: "Flash Sale Bars" };
const ALLOWED_KEYS = ["recent", "flash"];
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

/* SVGs (Flash) */
const SVGS = {
  reshot: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 64 64">
  <g id="_06-Flash_sales" data-name="06-Flash sales">
    <path d="M38.719,63a17.825,17.825,0,0,0,7.422-1.5A14.41,14.41,0,0,0,55,48c0-9-2-11-5-17s0-12,0-12a10.819,10.819,0,0,0-6,4C44,2,30,1,30,1a15.091,15.091,0,0,1-2,14c-5,7-10,11-12,19,0,0-4-2-3-6,0,0-4,7-4,18,0,12.062,9.662,15.6,14.418,16.61a18.53,18.53,0,0,0,3.846.39Z" style="fill:#febd55"/>
    <path d="M24.842,63S14.526,59.132,14.526,47.526C14.526,34.632,23.474,30,23.474,30s-2.5,4.632.079,5.921c0,0,4.315-14.053,15.921-17.921,0,0-4.053,4.263-1.474,12s11.316,9.474,11.474,18v1a14.54,14.54,0,0,1-2.2,8.213C45.286,60.31,42.991,63,37.737,63Z" style="fill:#fc9e20"/>
    <path d="M26,63a13.024,13.024,0,0,1-8-12c0-10,5-14,5-14s0,4,2,5c0,0,2-14,11-17,0,0-3,2-1,8s11,8,11,18v.871a12.287,12.287,0,0,1-1.831,6.641A9.274,9.274,0,0,1,36,63Z" style="fill:#e03e3e"/>
  </g>
</svg>
`,
  reshotFlash: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 6.82666 6.82666">
  <defs>
    <style type="text/css"><![CDATA[
      .fil2 {fill:none}
      .fil1 {fill:#283593}
      .fil0 {fill:#3949AB}
      .fil4 {fill:#29B6F6;fill-rule:nonzero}
      .fil3 {fill:#81D4FA;fill-rule:nonzero}
    ]]></style>
    <clipPath id="id0">
      <path d="M3.41333 0c1.88514,0 3.41333,1.52819 3.41333,3.41333 0,1.88514 -1.52819,3.41333 -3.41333,3.41333 -1.88514,0 -3.41333,-1.52819 -3.41333,-3.41333 0,-1.88514 1.52819,-3.41333 3.41333,-3.41333z"/>
    </clipPath>
  </defs>
  <g>
    <path class="fil0" d="M3.41333 0c1.88514,0 3.41333,1.52819 3.41333,3.41333 0,1.88514 -1.52819,3.41333 -3.41333,3.41333 -1.88514,0 -3.41333,-1.52819 -3.41333,-3.41333 0,-1.88514 1.52819,-3.41333 3.41333,-3.41333z"/>
    <g clip-path="url(#id0)">
      <polygon class="fil3" points="2.82094,3.56298 2.48625,3.56343 2.41006,3.56353 2.40948,3.48696 2.3952,1.62404 2.39461,1.54667 2.47197,1.54667 4.05295,1.54667 4.18926,1.54667 4.11889,1.66348 3.58319,2.55274 "/>
      <polygon class="fil4" points="2.8313,3.56296 2.82158,3.56298 2.82094,3.56298 3.58319,2.55274 3.57208,2.57117 3.47211,2.73713 4.2933,2.73713 4.43205,2.73713 4.35833,2.85485 2.98014,5.05561 2.83962,5.28 2.83833,5.01526 "/>
    </g>
    <path class="fil2" d="M3.41333 0c1.88514,0 3.41333,1.52819 3.41333,3.41333 0,1.88514 -1.52819,3.41333 -3.41333,3.41333 -1.88514,0 -3.41333,-1.52819 -3.41333,-3.41333 0,-1.88514 1.52819,-3.41333 3.41333,-3.41333z"/>
  </g>
</svg>
`,
  reshotflashon: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 6.82666 6.82666">
 <defs>
  <style type="text/css"><![CDATA[
    .fil0 {fill:none}
    .fil1 {fill:#212121;fill-rule:nonzero}
    .fil2 {fill:#66BB6A;fill-rule:nonzero}
  ]]></style>
 </defs>
 <g>
  <rect class="fil0" width="6.82666" height="6.82666"/>
  <!-- Keep valid numeric path data here if you use this icon -->
  <path class="fil1" d="M2.278 3.432l0.478 -0.001 0.22 -0.36 0.18 0.36h0.8l-0.62 0.95 0.35 -0.02 -1.408 1.98z"/>
  <path class="fil2" d="M3.397 1.493l-0.152 0.3h0.65l-0.95 1.37h0.69l-1.38 2.2 0.85 -1.35 -0.76 0 0.89 -1.36h-0.57z"/>
 </g>
</svg>
`,
  deadline: `
<svg xmlns="http://www.w3.org/2000/svg" width ="60" height="60" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#40C4FF"/>
  <path d="M32 14v18l12 8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>
`,
};
const SVG_OPTIONS = [
  { label: "Reshot", value: "reshot" },
  { label: "Reshot Flash", value: "reshotFlash" },
  { label: "Reshot Flash On", value: "reshotflashon" },
  { label: "Deadline", value: "deadline" },
];

/* ───────────────── misc helpers ──────────────── */
const parseArr = (s, fb = []) => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : fb; } catch { return fb; } };
const toJson = (a) => JSON.stringify(Array.isArray(a) ? a : []);
const nullIfBlank = (v) => (v == null || String(v).trim() === "" ? null : String(v));
const intOrNull = (v, min = null, max = null) => {
  if (v == null || String(v).trim() === "") return null;
  let n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (min != null) n = Math.max(min, n);
  if (max != null) n = Math.min(max, n);
  return Math.trunc(n);
};
const getAdminQS = () => { try { return typeof window !== "undefined" ? (window.location.search || "") : ""; } catch { return ""; } };
const appendQS = (url) => {
  const qs = getAdminQS();
  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs.slice(1)}` : `${url}${qs}`;
};

/* ───────── HEX helpers (STRICT) ───────── */
const HEX_FULL = /^#[0-9A-F]{6}$/i;
const HEX_PART = /^#?[0-9A-F]{0,6}$/i;
function expandShorthand(hex) {
  const s = String(hex || "").toUpperCase();
  if (/^#[0-9A-F]{3}$/i.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return s;
}
function coerceHexDraft(v, prev = "#111111") {
  if (v == null) return prev;
  let s = String(v).toUpperCase().trim();
  s = s.replace(/[^#0-9A-F]/g, "");
  if (!s.startsWith("#")) s = "#" + s.replace(/^#*/, "");
  if (s.length > 7) s = s.slice(0, 7);
  if (!HEX_PART.test(s)) return prev;
  return s;
}
function normalizeHexOrDefault(v, def = "#111111") {
  const up = expandShorthand(String(v || "").toUpperCase());
  return HEX_FULL.test(up) ? up : def.toUpperCase();
}

/* sanitize any SVGs pasted */
function sanitizeSvg(svg) {
  return String(svg)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "");
}
function extractFirstSvg(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  const m = s.match(/<svg[\s\S]*?<\/svg>/i);
  if (!m) return "";
  return sanitizeSvg(m[0]);
}
function normalizeSvgSize(svg, size = 50) {
  if (!svg) return "";
  let out = svg;
  const hasW = /\swidth="[^"]*"/i.test(out);
  const hasH = /\sheight="[^"]*"/i.test(out);
  if (hasW) out = out.replace(/\swidth="[^"]*"/i, ` width="${size}"`);
  else out = out.replace(/<svg/i, `<svg width="${size}"`);
  if (hasH) out = out.replace(/\sheight="[^"]*"/i, ` height="${size}"`);
  else out = out.replace(/<svg/i, `<svg height="${size}"`);
  return out;
}

/* ───────────────── date & orders helpers (RECENT) ───────── */
const trimIso = (iso) => {
  const i = String(iso || "");
  const [date, time] = i.split("T");
  if (!time) return i;
  const [hms] = time.split(".");
  return `${date}T${(hms || "00:00:00Z").replace(/Z?$/, "Z")}`;
};
function zonedStartOfDay(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const Y = Number(parts.find(p => p.type === "year")?.value || "1970");
  const M = Number(parts.find(p => p.type === "month")?.value || "01");
  const D = Number(parts.find(p => p.type === "day")?.value || "01");
  return new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0));
}
function daysRangeZoned(days, timeZone) {
  const now = new Date();
  const endISO = trimIso(now.toISOString());
  const daysClamped = Math.max(1, Number(days || 1));
  const base = new Date(now.getTime() - (daysClamped - 1) * 24 * 60 * 60 * 1000);
  const start = zonedStartOfDay(base, timeZone || "UTC");
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

/* ───── Orders query with pagination + 100 lineItems ───── */
const Q_ORDERS_FULL = `
  query Orders($first:Int!, $query:String, $after:String) {
    orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          id
          createdAt
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
  const search = `created_at:>=${startISO} created_at:<=${endISO} status:any`;
  const FIRST = 100;
  let after = null;
  let all = [];
  for (let page = 0; page < 20; page++) {
    const resp = await admin.graphql(Q_ORDERS_FULL, { variables: { first: FIRST, query: search, after } });
    const js = await resp.json();
    const block = js?.data?.orders;
    const edges = block?.edges || [];
    all = all.concat(mapEdgesToOrders(edges));
    const hasNext = block?.pageInfo?.hasNextPage;
    after = block?.pageInfo?.endCursor || null;
    if (!hasNext || !after) break;
  }
  return all;
}

/* Buckets (unique for UI convenience only) */
function deriveBucketsFromOrders(orders) {
  const uniqStrings = (arr) => {
    const seen = new Set(); const out = [];
    for (const v of arr) { const k = String(v || "").trim(); if (!k || seen.has(k)) continue; seen.add(k); out.push(k); }
    return out;
  };
  const uniqLocations = (arr) => {
    const seen = new Set(); const out = [];
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
  let productHandles = [], locations = [], customerNames = [];
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

/* ALL handles (duplicates preserved) */
function collectAllProductHandles(orders) {
  const out = [];
  for (const o of orders || []) for (const p of o.products || []) {
    const h = String(p?.handle || "").trim();
    if (h) out.push(h);
  }
  return out;
}

/* Optional persistence of compact rows + per-order-handle map */
function flattenCustomerProductRows(shop, orders) {
  const seen = new Set();
  const rows = [];
  for (const o of orders || []) {
    const created = o?.createdAt ? new Date(o.createdAt) : null;
    const orderId = String(o?.id || "").trim();
    const first = (o?.firstName || "").trim();
    const last  = (o?.lastName  || "").trim();
    const customerName = (first || last) ? `${first} ${last}`.trim() : "Anonymous";
    if (!orderId || !created) continue;
    for (const p of o?.products || []) {
      const handle = String(p?.handle || "").trim();
      if (!handle) continue;
      const key = `${shop}|${orderId}|${handle}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ shop, orderId, productHandle: handle, customerName, orderCreatedAt: created });
    }
  }
  return rows;
}
async function persistCustomerProductHandles(prismaClient, shop, orders) {
  try {
    if (!prismaClient) return { inserted: 0, total: 0 };
    const table = prismaClient.customerproducthandle || prismaClient.customerProductHandle;
    if (!table) return { inserted: 0, total: 0 };
    const rows = flattenCustomerProductRows(shop, orders);
    if (!rows.length) return { inserted: 0, total: 0 };
    const CHUNK = 200;
    let done = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      await prismaClient.$transaction(
        slice.map((row) =>
          table.upsert({
            where: { shop_orderId_productHandle: { shop: row.shop, orderId: row.orderId, productHandle: row.productHandle } },
            create: row,
            update: {},
          })
        ),
        { timeout: 20000 }
      );
      done += slice.length;
    }
    return { inserted: done, total: rows.length };
  } catch {
    return { inserted: 0, total: 0 };
  }
}

/* ───────────────── loader ──────────────── */
export async function loader({ request, params }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  const key = String(params.key || "").toLowerCase();
  if (!ALLOWED_KEYS.includes(key)) {
    return json({ ok: false, message: "Invalid key" }, { status: 400 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return json({ ok: false, message: "Bad ID" }, { status: 400 });
  }

  const where = { id, shop, key };
  const row = await prisma.notificationconfig.findFirst({ where });
  if (!row) return json({ ok: false, message: "Record not found." }, { status: 404 });

  const url = new URL(request.url);
  const urlDays = Number(url.searchParams.get("days"));

  const base = {
    id: row.id,
    key,
    enabled: row.enabled ? ["enabled"] : ["disabled"],
    showType: row.showType ?? "allpage",
    messageTitles: parseArr(row.messageTitlesJson),
    locations: parseArr(row.locationsJson),
    names: parseArr(row.namesJson),
    messageText: row.messageText ?? "",
    fontFamily: row.fontFamily ?? "System",
    position: row.position ?? (key === "flash" ? "top-right" : "bottom-left"),
    animation: row.animation ?? "fade",
    mobileSize: row.mobileSize ?? "compact",
    mobilePosition: (() => {
      try { const v = JSON.parse(row.mobilePositionJson || "null"); if (Array.isArray(v) && v.length) return v; } catch {}
      return ["bottom"];
    })(),
    titleColor: normalizeHexOrDefault(row.titleColor, "#111111"),
    bgColor:    normalizeHexOrDefault(row.bgColor,    "#FFFFFF"),
    msgColor:   normalizeHexOrDefault(row.msgColor,   "#111111"),
    ctaBgColor: normalizeHexOrDefault(row.ctaBgColor || "", "#000000"),
    rounded: row.rounded ?? 14,
    durationSeconds: row.durationSeconds ?? 8,
    alternateSeconds: row.alternateSeconds ?? 10,
    fontWeight: String(row.fontWeight ?? 600),
    iconKey: row.iconKey ?? "reshot",
    iconSvg: row.iconSvg ?? "",
    selectedProducts: key === "recent" ? parseArr(row.selectedProductsJson) : [],
    orderDays: Number.isFinite(Number(row.orderDays)) ? Number(row.orderDays) : 1,
    createOrderTime: row.createOrderTime ?? null,
  };

  let previewProduct = null;
  let strictOrders = [];
  let buckets = { productHandles: [], locations: [], customerNames: [] };
  let newestCreatedAt = null;
  let usedDays = null;
  let allHandles = [];

  if (key === "recent") {
    try {
      const days = (Number.isFinite(urlDays) && urlDays >= 1 && urlDays <= 60) ? urlDays : base.orderDays;
      usedDays = days;
      const shopTZ = await getShopTimezone(admin);
      const { startISO, endISO } = daysRangeZoned(days, shopTZ);

      strictOrders = await fetchOrdersWithinWindow(admin, startISO, endISO);
      allHandles = collectAllProductHandles(strictOrders);

      try { await persistCustomerProductHandles(prisma, shop, strictOrders); } catch {}

      if (strictOrders.length > 0) {
        newestCreatedAt = trimIso(String(strictOrders[0].createdAt || ""));
      } else {
        const r = await admin.graphql(Q_ORDERS_FULL, { variables: { first: 1, query: "status:any" } });
        const j = await r.json();
        strictOrders = mapEdgesToOrders(j?.data?.orders?.edges || []);
        if (strictOrders[0]?.createdAt) newestCreatedAt = trimIso(String(strictOrders[0].createdAt));
      }

      buckets = deriveBucketsFromOrders(strictOrders);

      const first = strictOrders[0]?.products?.[0];
      if (first?.handle) {
        const q = `
          query ProductByHandle($handle: String!) {
            productByHandle(handle: $handle) {
              id title handle status
              featuredImage { url altText }
            }
          }`;
        const resp = await admin.graphql(q, { variables: { handle: first.handle } });
        const js = await resp.json();
        const p = js?.data?.productByHandle;
        if (p) previewProduct = { id: p.id, title: p.title, handle: p.handle, status: p.status, featuredImage: p.featuredImage?.url || null };
      }
    } catch (e) {
      console.error("[Recent loader] orders/buckets failed", e);
    }
  }

  if (key === "recent") base.selectedProducts = allHandles;

  const headline = (key === "recent")
    ? ((Array.isArray(base.messageTitles) && base.messageTitles[0]) ? String(base.messageTitles[0]) : "")
    : "";

  return json({
    ok: true,
    key,
    title: TITLES[key],
    data: { ...base, headline },
    previewProduct,
    orders: strictOrders,
    buckets,
    newestCreatedAt,
    usedDays,
  });
}

/* ───────────────── action (save/update) ──────────────── */
export async function action({ request, params }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  const key = String(params.key || "").toLowerCase();
  if (!ALLOWED_KEYS.includes(key)) return json({ ok: false, message: "Invalid key" }, { status: 400 });

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return json({ ok: false, message: "Bad ID" }, { status: 400 });

  const form = await request.formData();
  const intent = form.get("_action");
  if (intent !== "save") return json({ ok: false, message: "Unknown action" }, { status: 400 });

  const enabled = (form.get("enabled") === "enabled");
  const showType = nullIfBlank(form.get("showType"));
  const messageText = nullIfBlank(form.get("messageText"));
  const fontFamily = nullIfBlank(form.get("fontFamily"));
  const position = nullIfBlank(form.get("position"));
  const animation = nullIfBlank(form.get("animation"));
  const mobileSize = nullIfBlank(form.get("mobileSize"));

  const titleColor = normalizeHexOrDefault(form.get("titleColor"), "#111111");
  const bgColor    = normalizeHexOrDefault(form.get("bgColor"),    "#FFFFFF");
  const msgColor   = normalizeHexOrDefault(form.get("msgColor"),   "#111111");
  const ctaBgColor = normalizeHexOrDefault(form.get("ctaBgColor") || "#000000", "#000000");

  const rounded = intOrNull(form.get("rounded"), 10, 72);
  const durationSeconds = intOrNull(form.get("durationSeconds"), 1, 60);
  const alternateSeconds = intOrNull(form.get("alternateSeconds"), 0, 3600);
  const fontWeight = intOrNull(form.get("fontWeight"), 100, 900);

  const mobilePositionArr = form.getAll("mobilePosition");
  const mobilePositionJson = JSON.stringify(mobilePositionArr.length ? mobilePositionArr : ["bottom"]);

  let messageTitlesArr = [];
  let locationsArr = [];
  let namesArr = [];

  const orderDays = intOrNull(form.get("orderDays"), 1, 60) ?? 1;

  let iconKeyIn = nullIfBlank(form.get("iconKey"));
  const rawSvg = nullIfBlank(form.get("iconSvg"));
  const uploadedSvg = extractFirstSvg(rawSvg || "");
  let finalIconKey = iconKeyIn || "reshot";
  let finalIconSvg = uploadedSvg ? uploadedSvg : (SVGS[finalIconKey] || SVGS["reshot"]);

  if (key === "recent") {
    const headline = (form.get("headline") || "").toString().trim();
    messageTitlesArr = headline ? [headline] : [];
    locationsArr = form.getAll("locations").map(s => String(s).trim()).filter(Boolean);
    namesArr = form.getAll("names").map(s => String(s).trim()).filter(Boolean); // hide keys
  } else {
    messageTitlesArr = form.getAll("messageTitles").map(s => String(s).trim()).filter(Boolean);
    locationsArr = form.getAll("locations").map(s => String(s).trim()).filter(Boolean);
    namesArr = form.getAll("names").map(s => String(s).trim()).filter(Boolean);
  }

  let createOrderTime = null;
  let recentFullNames = [];
  let recentLocationStrings = [];
  let allHandles = [];

  if (key === "recent") {
    try {
      const shopTZ = await getShopTimezone(admin);
      const { startISO, endISO } = daysRangeZoned(orderDays, shopTZ);
      const orders = await fetchOrdersWithinWindow(admin, startISO, endISO);

      try { await persistCustomerProductHandles(prisma, shop, orders); } catch {}

      if (orders?.[0]?.createdAt) createOrderTime = trimIso(String(orders[0].createdAt));

      const namesSet = new Set();
      const locSet = new Set();

      for (const o of orders) {
        const full = [o.firstName, o.lastName].filter(Boolean).join(" ").trim();
        if (full) namesSet.add(full);
        const loc = [o.city, o.state, o.country].filter(Boolean).join(", ").trim();
        if (loc) locSet.add(loc);
      }

      recentFullNames = Array.from(namesSet).slice(0, 100);
      recentLocationStrings = Array.from(locSet).slice(0, 100);

      allHandles = collectAllProductHandles(orders);

      try {
        const compact = orders.map(o => ({
          id: o.id,
          createdAt: o.createdAt,
          name: [o.firstName, o.lastName].filter(Boolean).join(" "),
          city: o.city, state: o.state, country: o.country,
          products: (o.products || []).slice(0, 3).map(p => ({
            title: p.title, handle: p.handle, image: p.image
          }))
        }));
        await prisma.recentordercache?.upsert?.({
          where: { shop_notifId: { shop, notifId: id } },
          create: { shop, notifId: id, startISO, endISO, rowsJson: JSON.stringify(compact) },
          update: { startISO, endISO, rowsJson: JSON.stringify(compact) }
        });
      } catch {}
    } catch (e) {
      console.error("[Recent action] compute window lists failed", e);
    }
  }

  const data = {
    enabled,
    showType,
    messageText,
    fontFamily,
    position,
    animation,
    mobileSize,
    mobilePositionJson,
    titleColor,
    bgColor,
    msgColor,
    ctaBgColor,
    rounded,
    durationSeconds,
    alternateSeconds,
    fontWeight,

    messageTitlesJson: key === "recent"
      ? JSON.stringify(recentFullNames)
      : toJson(messageTitlesArr),

    locationsJson: key === "recent"
      ? JSON.stringify(recentLocationStrings)
      : toJson(locationsArr),

    namesJson: toJson(namesArr),

    selectedProductsJson: key === "recent"
      ? JSON.stringify(allHandles)
      : null,

    ...(key === "flash" ? { iconKey: (finalIconKey || "reshot"), iconSvg: finalIconSvg } : {}),
    ...(key === "recent" ? { orderDays, createOrderTime } : {}),
  };

  await prisma.notificationconfig.update({ where: { id }, data });

  const prev = new URL(request.url);
  const qs = prev.search;
  const dest = `/app/dashboard${qs ? `${qs}&saved=1` : "?saved=1"}`;
  return redirect(dest);
}

/* ───────────────── ColorInput (STRICT) ──────────────── */
function hexToRgb(hex) { const c = hex.replace("#", ""); const n = parseInt(c, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: (n & 255) }; }
function rgbToHsv({ r, g, b }) { r /= 255; g /= 255; b /= 255; const m = Math.max(r, g, b), n = Math.min(r, g, b), d = m - n; let h = 0; if (d) { switch (m) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; default: h = (r - g) / d + 4 } h *= 60 } const s = m ? d / m : 0; return { hue: h, saturation: s, brightness: m } }
function hsvToRgb({ hue: h, saturation: s, brightness: v }) { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let R = 0, G = 0, B = 0; if (0 <= h && h < 60) [R, G, B] = [c, x, 0]; else if (60 <= h && h < 120) [R, G, B] = [x, c, 0]; else if (120 <= h && h < 180) [R, G, B] = [0, c, x]; else if (180 <= h && h < 240) [R, G, B] = [0, x, c]; else [R, G, B] = [x, 0, c]; return { r: Math.round((R + m) * 255), g: Math.round((G + m) * 255), b: Math.round((B + m) * 255) } }
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const hexToHSB = (hex) => rgbToHsv(hexToRgb(hex));
const hsbToHEX = (hsb) => rgbToHex(hsvToRgb(hsb));

function ColorInput({ label, value, onChange, placeholder = "#244E89" }) {
  const initial = HEX_FULL.test(value || "") ? value.toUpperCase()
                 : /^#[0-9A-F]{3}$/i.test(String(value || "")) ? expandShorthand(value)
                 : "#111111";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [hsb, setHsb] = useState(hexToHSB(initial));
  const lastValidRef = useRef(initial);

  useEffect(() => {
    const norm = normalizeHexOrDefault(value, lastValidRef.current);
    setDraft(norm);
    lastValidRef.current = norm;
    setHsb(hexToHSB(norm));
  }, [value]);

  const handleText = (v) => {
    const cleaned = coerceHexDraft(v, lastValidRef.current);
    setDraft(cleaned);
    if (HEX_FULL.test(cleaned)) {
      const up = cleaned.toUpperCase();
      lastValidRef.current = up;
      onChange(up);
      setHsb(hexToHSB(up));
    }
  };

  const handleBlur = () => {
    const expanded = expandShorthand(draft);
    const valid = HEX_FULL.test(expanded) ? expanded : lastValidRef.current;
    const up = valid.toUpperCase();
    setDraft(up);
    if (up !== value) onChange(up);
    setHsb(hexToHSB(up));
  };

  const swatch = (
    <div
      onClick={() => setOpen(true)}
      title="Pick color"
      style={{
        width: 28, height: 28, borderRadius: 10, cursor: "pointer",
        border: "1px solid rgba(0,0,0,0.08)",
        background: HEX_FULL.test(draft) ? draft : "#ffffff"
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
          value={draft}
          onChange={handleText}
          onBlur={handleBlur}
          autoComplete="off"
          placeholder={placeholder}
          suffix={swatch}
          inputMode="text"
        />
      }
    >
      <Box padding="300" minWidth="260px">
        <ColorPicker
          color={hsb}
          onChange={(c) => {
            setHsb(c);
            const hex = hsbToHEX(c).toUpperCase();
            lastValidRef.current = hex;
            setDraft(hex);
            onChange(hex);
          }}
          allowAlpha={false}
        />
      </Box>
    </Popover>
  );
}

/* ───────────────── Token helpers ──────────────── */
function useTokenInput(listKey, form, setForm) {
  const [draft, setDraft] = useState("");
  const add = useCallback((val) => {
    const v = String(val || "").trim(); if (!v) return;
    setForm(f => { const arr = [...(f[listKey] || [])]; if (!arr.includes(v)) arr.push(v); return { ...f, [listKey]: arr }; });
  }, [listKey, setForm]);
  const removeAt = useCallback((idx) => {
    setForm(f => { const arr = [...(f[listKey] || [])]; arr.splice(idx, 1); return { ...f, [listKey]: arr }; });
  }, [listKey, setForm]);
  const onChange = useCallback((v) => setDraft(v), []);
  const commitDraft = useCallback(() => {
    const parts = String(draft).split(/[,|\n]+/g).map(p => p.trim()).filter(Boolean);
    if (parts.length) parts.forEach(add);
    setDraft("");
  }, [draft, add]);
  return { draft, setDraft, add, removeAt, onChange, commitDraft };
}

/* UPDATED TokenField: Enter to add works reliably */
function TokenField({ label, placeholder, tokens, onAdd, onRemove, draft, onDraft, onCommit }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onCommit();
    }
  };

  return (
    <BlockStack gap="150">
      <div onKeyDown={handleKeyDown}>
        <InlineStack gap="200" wrap={false} align="start" blockAlign="center">
          <Box width="100%">
            <TextField
              label={label}
              placeholder={placeholder}
              value={draft}
              onChange={onDraft}
              autoComplete="off"
              onBlur={onCommit}
            />
          </Box>
          {/* <Box width="20%" minWidth="100px">
            <Button onClick={onCommit} size="medium" variant="primary">
              Add
            </Button>
          </Box> */}
        </InlineStack>
      </div>

      <InlineStack gap="150" wrap>
        {(tokens || []).map((t, i) => (
          <Tag key={`${t}-${i}`} onRemove={() => onRemove(i)}>{t}</Tag>
        ))}
      </InlineStack>

      <Text tone="subdued" variant="bodySm">
        Press Enter or click Add to append multiple. Use comma “,” or “|” for many at once.
      </Text>
    </BlockStack>
  );
}

/* ───────────────── Anim + Preview helpers ──────────────── */
const getAnimationStyle = (a) =>
  a === "slide" ? { transform: "translateY(8px)", animation: "notif-slide-in 240ms ease-out" } :
  a === "bounce" ? { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" } :
  a === "zoom" ? { transform: "scale(0.96)", animation: "notif-zoom-in 200ms ease-out forwards" } :
  { opacity: 1, animation: "notif-fade-in 220ms ease-out forwards" };

const posToFlex = (pos) => {
  switch (pos) {
    case "top-left": return { justifyContent: "flex-start", alignItems: "flex-start" };
    case "top-right": return { justifyContent: "flex-end", alignItems: "flex-start" };
    case "bottom-left": return { justifyContent: "flex-start", alignItems: "flex-end" };
    case "bottom-right": return { justifyContent: "flex-end", alignItems: "flex-end" };
    default: return { justifyContent: "flex-start", alignItems: "flex-end" };
  }
};
const mobilePosToFlex = (pos) => ({ justifyContent: "center", alignItems: pos === "top" ? "flex-start" : "flex-end" });
const mobileSizeToWidth = (size) => (size === "compact" ? 300 : size === "large" ? 360 : 330);
const mobileSizeScale = (size) => (size === "compact" ? 0.92 : size === "large" ? 1.06 : 1);

/* ───────────────── Unified bubbles ──────────────── */
function RecentBubble({ form, order, product, isMobile = false }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);
  const hide = new Set(form.hideKeys || []);

  const sizeBase = Number(form.rounded ?? 14) || 14;
  const sized = Math.max(10, Math.min(28, Math.round(sizeBase * (isMobile ? mobileSizeScale(form.mobileSize) : 1))));

  const name = order
    ? [order.firstName, order.lastName].filter(Boolean).join(" ")
    : (form.headline || "Someone");

  const locBits = order ? [
    hide.has("city") ? null : order.city,
    hide.has("state") ? null : order.state,
    hide.has("country") ? null : order.country,
  ].filter(Boolean) : [];
  const loc = locBits.join(", ");

  const firstProd = order?.products?.[0] || null;
  const productTitle = hide.has("productTitle") ? "" : (firstProd?.title || product?.title || "");
  const productImg = hide.has("productImage") ? null : (firstProd?.image || product?.featuredImage || null);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      fontFamily: form.fontFamily === "System" ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" : form.fontFamily,
      background: form.bgColor, color: form.msgColor, borderRadius: 14,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, border: "1px solid rgba(17,24,39,0.06)",
      maxWidth: isMobile ? mobileSizeToWidth(form.mobileSize) : 560, ...animStyle
    }}>
      <div>
        {productImg
          ? <img src={productImg} alt={productTitle || "Product"} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, background: "#f4f4f5" }} loading="lazy" decoding="async" />
          : <div style={{ width: 60, height: 60, borderRadius: 6, background: "#f4f4f5" }} />
        }
      </div>
      <div>
        <p style={{ margin: 0, fontSize: sized }}>
          {!hide.has("name") && (
            <span style={{ color: form.titleColor, fontWeight: Number(form.fontWeight || 600) }}>
              {name || "Customer"}
            </span>
          )}
          {!hide.has("name") && loc ? " from " : ""}
          {loc && (
            <span style={{ color: form.titleColor, fontWeight: Number(form.fontWeight || 600) }}>
              {loc}
            </span>
          )}
          <br />
          <span>
            {productTitle ? `recently bought “${productTitle}”` : "placed an order"}
          </span>
          {!hide.has("time") && (
            <>
              <br />
              <span style={{ opacity: 0.85, fontSize: sized * 0.9 }}>
                <small>{order?.createdAt ? new Date(order.createdAt).toLocaleString() : "just now"}</small>
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function FlashBubble({ form, isMobile = false }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);
  const svgMarkup = useMemo(() => {
    const uploaded = extractFirstSvg(form.iconSvg || "");
    const base = uploaded || SVGS[form.iconKey] || SVGS["reshot"];
    return base ? normalizeSvgSize(base, 50) : "";
  }, [form.iconSvg, form.iconKey]);

  const headline = (form?.messageTitles?.[0] || "Flash Sale");
  const subline = (form?.locations?.[0] || "20% OFF");
  const footnote = (form?.countdowns?.[0] || "Ends soon");

  const base = Number(form.rounded ?? 14) || 14;
  const scale = isMobile ? mobileSizeScale(form?.mobileSize) : 1;
  const sized = Math.max(10, Math.min(28, Math.round(base * scale)));

  return (
    <div style={{
      fontFamily: form.fontFamily === "System" ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" : form.fontFamily,
      background: form.bgColor, color: form.msgColor, borderRadius: 14,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, border: "1px solid rgba(17,24,39,0.06)",
      display: "flex", alignItems: "center", gap: 12,
      maxWidth: isMobile ? mobileSizeToWidth(form?.mobileSize) : 560, ...animStyle
    }}>
      {svgMarkup ? (
        <span aria-hidden="true" style={{ display: "flex", flexShrink: 0, width: 60, height: 60, alignItems: "center" }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      ) : <div style={{ width: 60, height: 60, borderRadius: 6, background: "#f4f4f5" }} />}
      <div style={{ display: "grid", gap: 4 }}>
        <p style={{ margin: 0, color: form.titleColor, fontWeight: Number(form.fontWeight || 600), fontSize: sized }}>{headline}</p>
        <p style={{ margin: 0, fontSize: sized, lineHeight: 1.45 }}>{subline}{form.messageText ? ` — ${form.messageText}` : ""}</p>
        <p style={{ margin: 0, fontSize: sized * 0.9, opacity: 0.85 }}><small></small></p>
      </div>
    </div>
  );
}

/* Desktop frame */
function DesktopPreview({ keyName, form, product, order }) {
  const flex = posToFlex(form?.position);
  return (
    <div
      style={{
        width: "100%", maxWidth: 900, minHeight: 320, height: 400, borderRadius: 12,
        border: "1px solid #e5e7eb", background: "linear-gradient(180deg,#fafafa 0%,#f5f5f5 100%)",
        overflow: "hidden", position: "relative", display: "flex", padding: 18, boxSizing: "border-box", ...flex,
      }}
    >
      {keyName === "recent" ? (
        <RecentBubble form={form} product={product} order={order} isMobile={false} />
      ) : (
        <FlashBubble form={form} isMobile={false} />
      )}
    </div>
  );
}

/* Mobile frame */
function MobilePreview({ keyName, form, product, order }) {
  const pos = (form?.mobilePosition && form.mobilePosition[0]) || "bottom";
  const flex = mobilePosToFlex(pos);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: 380, height: 400, borderRadius: 40, border: "1px solid #e5e7eb",
          background: "linear-gradient(180deg,#fcfcfd 0%,#f5f5f6 100%)", boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
          position: "relative", overflow: "hidden", padding: 14, display: "flex", ...flex,
        }}
      >
        <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 120, height: 18, borderRadius: 10, background: "#0f172a0f" }} />
        <div style={{ padding: 8 }}>
          {keyName === "recent" ? (
            <RecentBubble form={form} product={product} order={order} isMobile />
          ) : (
            <FlashBubble form={form} isMobile />
          )}
        </div>
      </div>
    </div>
  );
}

/* Wrapper */
function LivePreview({ keyName, form, product, order }) {
  const [mode, setMode] = useState("desktop");
  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingMd">Live Preview</Text>
        <ButtonGroup segmented>
          <Button pressed={mode === "desktop"} onClick={() => setMode("desktop")}>Desktop</Button>
          <Button pressed={mode === "mobile"} onClick={() => setMode("mobile")}>Mobile</Button>
          <Button pressed={mode === "both"} onClick={() => setMode("both")}>Both</Button>
        </ButtonGroup>
      </InlineStack>

      {mode === "desktop" && <DesktopPreview keyName={keyName} form={form} product={product} order={order} />}
      {mode === "mobile" && <MobilePreview keyName={keyName} form={form} product={product} order={order} />}
      {mode === "both" && (
        <InlineStack gap="400" align="space-between" wrap>
          <Box width="58%"><DesktopPreview keyName={keyName} form={form} product={product} order={order} /></Box>
          <Box width="40%"><MobilePreview keyName={keyName} form={form} product={product} order={order} /></Box>
        </InlineStack>
      )}

      <Text as="p" variant="bodySm" tone="subdued">
        Recent: Strict order window (shop timezone). Preview shows latest order inside window (fallback to newest).
      </Text>
    </BlockStack>
  );
}

/* ───────────────── Page ──────────────── */
export default function NotificationEditGeneric() {
  const { ok, key, title, data, previewProduct, orders, buckets, newestCreatedAt, usedDays } = useLoaderData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const location = useLocation();
  const busy = navigation.state !== "idle";
  const fetcher = useFetcher();
  const isFlash = key === "flash";
  const isRecent = key === "recent";
  const safeData = data ?? {};
  const safeBuckets = buckets ?? {};
  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);
  const safePreviewProduct = previewProduct ?? null;
  const safeNewestCreatedAt = newestCreatedAt ?? null;
  const safeUsedDays =
    typeof usedDays === "number" && !Number.isNaN(usedDays) ? usedDays : null;

  const [showSaved, setShowSaved] = useState(() => {
    try { return new URLSearchParams(location.search).get("saved") === "1"; } catch { return false; }
  });
  useEffect(() => {
    if (showSaved) {
      const sp = new URLSearchParams(location.search); sp.delete("saved");
      navigate(`${location.pathname}?${sp.toString()}`, { replace: true });
    }
  }, [showSaved, location.pathname, location.search, navigate]);

  const [selectedProducts, setSelectedProducts] = useState(() => (safePreviewProduct ? [safePreviewProduct] : []));
  const [selectedProduct, setSelectedProduct] = useState(() => (safePreviewProduct || null));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const isLoadingList = fetcher.state !== "idle";
  const items = fetcher.data?.items || [];

  useEffect(() => {
    if (!pickerOpen || !isRecent) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(page));
    fetcher.load(`/app/products-picker?${params.toString()}`);
  }, [pickerOpen, search, page, isRecent, fetcher]);

  const locFromBuckets = useMemo(() => {
    if (!isRecent) return Array.isArray(safeData.locations) ? safeData.locations : [];
    const bucketLocations = Array.isArray(safeBuckets.locations) ? safeBuckets.locations : [];
    const arr = bucketLocations
      .map((l) => [l.city, l.state, l.country].filter(Boolean).join(", "))
      .filter(Boolean);
    return Array.from(new Set(arr));
  }, [isRecent, safeBuckets.locations, safeData.locations]);

  const [form, setForm] = useState(() => ({
    enabled: safeData.enabled,
    showType: safeData.showType,

    // RECENT
    headline: isRecent ? String(safeData.headline || "") : "",
    hideKeys: isRecent ? (Array.isArray(safeData.names) ? safeData.names : []) : [],

    // FLASH
    messageTitles: isFlash ? (safeData.messageTitles || []) : [],
    locations: isRecent ? locFromBuckets : (Array.isArray(safeData.locations) ? safeData.locations : []),
    countdowns: isFlash ? (Array.isArray(safeData.names) ? safeData.names : []) : [],

    messageText: String(safeData.messageText || ""),
    fontFamily: safeData.fontFamily,
    position: safeData.position,
    animation: safeData.animation,
    mobileSize: safeData.mobileSize,
    mobilePosition: safeData.mobilePosition,
    titleColor: safeData.titleColor,
    bgColor: safeData.bgColor,
    msgColor: safeData.msgColor,
    ctaBgColor: safeData.ctaBgColor || "#000000",
    rounded: String(safeData.rounded ?? 14),
    durationSeconds: Number(safeData.durationSeconds ?? 8),
    alternateSeconds: Number(safeData.alternateSeconds ?? 10),
    fontWeight: String(safeData.fontWeight ?? 600),
    iconKey: safeData.iconKey || "reshot",
    iconSvg: safeData.iconSvg || "",

    selectedProducts: Array.isArray(safeData.selectedProducts) ? safeData.selectedProducts : [],
    orderDays: Number(isRecent ? (safeUsedDays ?? safeData.orderDays ?? 1) : 1),
    createOrderTime: safeData.createOrderTime || safeNewestCreatedAt || null,
  }));

  useEffect(() => {
    if (!isRecent) return;
    const newest = safeOrders?.[0]?.createdAt ? trimIso(String(safeOrders[0].createdAt)) : null;
    setForm((f) => ({ ...f, createOrderTime: newest || f.createOrderTime }));
  }, [isRecent, safeOrders]);

  const onField = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const onNum = (k, min, max) => (val) => {
    const n = parseInt(String(val || "0"), 10);
    const clamped = isNaN(n) ? (min ?? 0) : Math.max(min ?? n, Math.min(max ?? n, n));
    setForm(f => ({ ...f, [k]: clamped }));
  };

  const titlesInput = useTokenInput("messageTitles", form, setForm);
  const offersInput = useTokenInput("locations", form, setForm);
  const countInput = useTokenInput("countdowns", form, setForm);

  const selectedHandles = useMemo(() => {
    const v = form?.selectedProducts;
    if (Array.isArray(v)) return v;
    try { const j = JSON.parse(v || "[]"); return Array.isArray(j) ? j : []; }
    catch { return []; }
  }, [form?.selectedProducts]);

  const clearSelectedHandle = (handle) => {
    if (!isRecent) return;
    setForm(f => ({ ...f, selectedProducts: selectedHandles.filter(h => h !== handle) }));
    setSelectedProducts(prev => {
      const next = prev.filter(p => p.handle !== handle);
      setSelectedProduct(next[0] || null);
      return next;
    });
  };

  const togglePick = (item) => {
    if (!isRecent) return;
    setSelectedProducts(prev => {
      const exists = prev.some(p => p.id === item.id);
      const next = exists ? prev.filter(p => p.id !== item.id) : [...prev, item];
      const handles = Array.from(new Set(next.map(p => p.handle)));
      setForm(f => ({ ...f, selectedProducts: handles }));
      setSelectedProduct(next[0] || null);
      return next;
    });
  };

  const formRef = useRef(null);
  const doSave = () => formRef.current?.requestSubmit();

  // Upload SVG (Flash)
  const [svgName, setSvgName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const handleSvgDrop = useCallback((_drop, accepted, rejected) => {
    setUploadError("");
    if (rejected?.length) { setUploadError("Only .svg files are allowed."); return; }
    const file = accepted?.[0]; if (!file) return;
    if (file.type !== "image/svg+xml") { setUploadError("File must be an SVG."); return; }
    if (file.size > 200 * 1024) { setUploadError("SVG too large. Keep under 200KB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const svg = extractFirstSvg(raw);
      if (!svg) { setUploadError("Invalid SVG content."); return; }
      setForm(f => ({ ...f, iconSvg: svg, iconKey: "upload_svg" }));
      setSvgName(file.name);
    };
    reader.readAsText(file);
  }, []);
  const clearUploadedSvg = () => { setForm(f => ({ ...f, iconSvg: "", iconKey: "reshot" })); setSvgName(""); setUploadError(""); };
  const iconOptions = useMemo(() => (form.iconSvg ? [{ label: "Custom (uploaded)", value: "upload_svg" }, ...SVG_OPTIONS] : SVG_OPTIONS), [form.iconSvg]);

  const previewOrder = isRecent ? (safeOrders[0] || null) : null;

  useEffect(() => {
    if (!isRecent) return;
    if (typeof safeUsedDays === "number" && !Number.isNaN(safeUsedDays)) {
      setForm((f) => ({ ...f, orderDays: safeUsedDays }));
    }
  }, [isRecent, safeUsedDays]);

  useEffect(() => {
    if (!isRecent) return;
    const bucketLocations = Array.isArray(safeBuckets.locations) ? safeBuckets.locations : [];
    const locStrings = bucketLocations
      .map((l) => [l.city, l.state, l.country].filter(Boolean).join(", "))
      .filter(Boolean);
    const unique = Array.from(new Set(locStrings)).slice(0, 100);
    setForm((f) => ({ ...f, locations: unique }));
  }, [isRecent, safeBuckets.locations]);

  const onChangeDays = (v) => {
    if (!isRecent) return;
    const n = Number(v);
    setForm(f => ({ ...f, orderDays: n }));
    const sp = new URLSearchParams(window.location.search);
    sp.set("days", String(n));
    navigate(`${window.location.pathname}?${sp.toString()}`, { replace: true });
  };

  if (!ok) {
    return (
      <Page title={`Edit – ${TITLES[key] || "Notification"}`}>
        <Card>
          <Box padding="4">
            <BlockStack gap="300">
              <Text tone="critical">Record not found or invalid.</Text>
              <Button onClick={() => navigate(appendQS("/app/dashboard"))}>Back to Dashboard</Button>
            </BlockStack>
          </Box>
        </Card>
      </Page>
    );
  }

  return (
    <Frame>
      {busy && <Loading />}

      <Page
        key={`edit-${data.id}-${key}`}
        title={`Edit – ${title}`}
        backAction={{ content: "Back", onAction: () => navigate(appendQS("/app/dashboard")) }}
        primaryAction={{ content: "Save", onAction: doSave, loading: busy, disabled: busy }}
      >
        <Layout>

          {/* Live Preview */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <LivePreview
                  keyName={key}
                  form={form}
                  product={isRecent ? (selectedProduct || previewProduct) : null}
                  order={previewOrder}
                />
              </Box>
            </Card>
          </Layout.Section>

          {/* Display */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Display</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <ChoiceList
                        title="Enable Notification"
                        choices={[{ label: "Enabled", value: "enabled" }, { label: "Disabled", value: "disabled" }]}
                        selected={form.enabled}
                        onChange={onField("enabled")}
                        alignment="horizontal"
                      />
                    </Box>
                    <Box width="50%">
                      <Select label="Display On Pages" options={PAGES} value={form.showType} onChange={onField("showType")} />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <TextField
                        label="Popup Duration (seconds)"
                        type="number"
                        value={String(form.durationSeconds)}
                        onChange={onNum("durationSeconds", 1, 60)}
                        suffix="S" min={1} max={60} step={1} autoComplete="off"
                      />
                    </Box>
                    <Box width="50%">
                      <TextField
                        label="Interval Between Popups (seconds)"
                        type="number"
                        value={String(form.alternateSeconds)}
                        onChange={onNum("alternateSeconds", 0, 3600)}
                        suffix="S" min={0} max={3600} step={1} autoComplete="off"
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Orders & Fields (RECENT) */}
          {isRecent && (
            <Layout.Section oneHalf>
              <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">Order Source & Fields</Text>

                    <Select
                      label="Show orders from last"
                      options={Array.from({ length: 60 }, (_, i) => ({ label: `${i + 1} day${i ? "s" : ""}`, value: String(i + 1) }))}
                      value={String(form.orderDays)}
                      onChange={onChangeDays}
                      helpText="1 Day = Today (current calendar day in shop timezone), up to 60 days."
                    />

                    <Text as="p" variant="bodySm" tone="subdued">
                      Last newest order time: {form.createOrderTime ? new Date(form.createOrderTime).toLocaleString() : "—"}
                    </Text>

                    <ChoiceList
                      title="Hide Fields"
                      allowMultiple
                      choices={HIDE_CHOICES}
                      selected={form.hideKeys}
                      onChange={onField("hideKeys")}
                    />
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>
          )}

          {/* Message (FLASH) */}
          {isFlash && (
            <Layout.Section oneHalf>
              <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">Message</Text>

                    <TokenField
                      label="Flash Sale Headline / Banner Title (add multiple)"
                      placeholder="Flash Sale, Flash Sale 2 ..."
                      tokens={form.messageTitles}
                      onAdd={(v) => titlesInput?.add(v)}
                      onRemove={(i) => titlesInput?.removeAt(i)}
                      draft={titlesInput?.draft || ""}
                      onDraft={titlesInput?.onChange || (()=>{})}
                      onCommit={titlesInput?.commitDraft || (()=>{})}
                    />

                    <TokenField
                      label="Offer Title / Discount Name (add multiple)"
                      placeholder="Flash Sale 10% OFF, Flash Sale 20% OFF ..."
                      tokens={form.locations}
                      onAdd={(v) => offersInput?.add(v)}
                      onRemove={(i) => offersInput?.removeAt(i)}
                      draft={offersInput?.draft || ""}
                      onDraft={offersInput?.onChange || (()=>{})}
                      onCommit={offersInput?.commitDraft || (()=>{})}
                    />

                    <TokenField
                      label="Countdown Text / Urgency Message (add multiple)"
                      placeholder="ends in 01:15 hours, ends in 02:15 hours ..."
                      tokens={form.countdowns}
                      onAdd={(v) => countInput?.add(v)}
                      onRemove={(i) => countInput?.removeAt(i)}
                      draft={countInput?.draft || ""}
                      onDraft={countInput?.onChange || (()=>{})}
                      onCommit={countInput?.commitDraft || (()=>{})}
                    />
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>
          )}

          {/* Customize */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Customize</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Popup Font Family" options={[
                      { label: "System", value: "System" },
                      { label: "Inter", value: "Inter" },
                      { label: "Roboto", value: "Roboto" },
                      { label: "Montserrat", value: "Montserrat" },
                      { label: "Poppins", value: "Poppins" },
                    ]} value={form.fontFamily} onChange={onField("fontFamily")} /></Box>
                    <Box width="50%"><Select label="Font Weight / Style" options={[
                      { label: "100 - Thin", value: "100" }, { label: "200 - Extra Light", value: "200" },
                      { label: "300 - Light", value: "300" }, { label: "400 - Normal", value: "400" },
                      { label: "500 - Medium", value: "500" }, { label: "600 - Semi Bold", value: "600" },
                      { label: "700 - Bold", value: "700" },
                    ]} value={form.fontWeight} onChange={onField("fontWeight")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Desktop Position" options={[
                      { label: "Top Left", value: "top-left" },
                      { label: "Top Right", value: "top-right" },
                      { label: "Bottom Left", value: "bottom-left" },
                      { label: "Bottom Right", value: "bottom-right" },
                    ]} value={form.position} onChange={onField("position")} /></Box>
                    <Box width="50%"><Select label="Animation" options={[
                      { label: "Fade", value: "fade" },
                      { label: "Slide", value: "slide" },
                      { label: "Bounce", value: "bounce" },
                      { label: "Zoom", value: "zoom" },
                    ]} value={form.animation} onChange={onField("animation")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Mobile Size" options={[
                      { label: "Compact", value: "compact" },
                      { label: "Comfortable", value: "comfortable" },
                      { label: "Large", value: "large" },
                    ]} value={form.mobileSize} onChange={onField("mobileSize")} /></Box>
                    <Box width="50%">
                      <Select
                        label="Mobile Position"
                        options={[{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]}
                        value={(form.mobilePosition && form.mobilePosition[0]) || "bottom"}
                        onChange={(v) => setForm(f => ({ ...f, mobilePosition: [v] }))}
                      />
                    </Box>
                  </InlineStack>

                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><TextField type="number" label="Base Font Size (px)" value={String(form.rounded)} onChange={onField("rounded")} autoComplete="off" /></Box>
                    <Box width="50%"><ColorInput label="Headline Color" value={form.titleColor} onChange={(v) => setForm(f => ({ ...f, titleColor: v }))} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><ColorInput label="Background Color" value={form.bgColor} onChange={(v) => setForm(f => ({ ...f, bgColor: v }))} /></Box>
                    <Box width="50%"><ColorInput label="Text Color" value={form.msgColor} onChange={(v) => setForm(f => ({ ...f, msgColor: v }))} /></Box>
                  </InlineStack>

                  {isFlash && (
                    <BlockStack gap="250">
                      <InlineStack gap="400" wrap={false} align="start">
                        <Box width="50%">
                          <Select
                            label="Notification Icon"
                            options={iconOptions}
                            value={form.iconKey}
                            onChange={onField("iconKey")}
                          />
                        </Box>
                        <Box width="50%">
                          <Text as="h4" variant="headingSm">Custom SVG Icon (optional)</Text>
                          <DropZone accept="image/svg+xml" allowMultiple={false} onDrop={handleSvgDrop}>
                            <DropZone.FileUpload actionHint="Upload a .svg (max 200KB)" />
                          </DropZone>
                          {svgName && (
                            <InlineStack gap="200" blockAlign="center">
                              <Text variant="bodySm">Uploaded: {svgName}</Text>
                              <Button onClick={clearUploadedSvg} tone="critical" variant="plain">Remove</Button>
                            </InlineStack>
                          )}
                          {uploadError && <Text tone="critical" variant="bodySm">{uploadError}</Text>}
                          <Text as="p" tone="subdued" variant="bodySm">
                            (Icon shows on Flash. Recent uses order/product image automatically.)
                          </Text>
                        </Box>
                      </InlineStack>
                    </BlockStack>
                  )}
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Hidden Save form */}
          <Form method="post" id="notif-generic-save" replace ref={formRef}>
            <button type="submit" style={{ display: 'none' }} />
            <input type="hidden" name="_action" value="save" />
            <input type="hidden" name="enabled" value={Array.isArray(form.enabled) && form.enabled.includes("enabled") ? "enabled" : "disabled"} />
            <input type="hidden" name="showType" value={form.showType} />
            <input type="hidden" name="messageText" value={form.messageText || ""} />
            <input type="hidden" name="fontFamily" value={form.fontFamily || ""} />
            <input type="hidden" name="position" value={form.position || ""} />
            <input type="hidden" name="animation" value={form.animation || ""} />
            <input type="hidden" name="mobileSize" value={form.mobileSize || ""} />
            {(Array.isArray(form.mobilePosition) && form.mobilePosition.length ? form.mobilePosition : ["bottom"]).map((v, i) => (
              <input key={`mp-${i}`} type="hidden" name="mobilePosition" value={v} />
            ))}
            <input type="hidden" name="titleColor" value={form.titleColor || "#111111"} />
            <input type="hidden" name="bgColor" value={form.bgColor || "#FFFFFF"} />
            <input type="hidden" name="msgColor" value={form.msgColor || "#111111"} />
            <input type="hidden" name="ctaBgColor" value={form.ctaBgColor || "#000000"} />
            <input type="hidden" name="rounded" value={form.rounded} />
            <input type="hidden" name="durationSeconds" value={form.durationSeconds} />
            <input type="hidden" name="alternateSeconds" value={form.alternateSeconds} />
            <input type="hidden" name="fontWeight" value={form.fontWeight} />

            {isRecent && <input type="hidden" name="headline" value={form.headline || ""} />}
            {isRecent && (form.hideKeys || []).map((v, i) => (<input key={`hk-${i}`} type="hidden" name="names" value={v} />))}

            {isFlash && (form.messageTitles || []).map((v, i) => (<input key={`t-${i}`} type="hidden" name="messageTitles" value={v} />))}
            {isFlash && (form.locations || []).map((v, i) => (<input key={`l-${i}`} type="hidden" name="locations" value={v} />))}
            {isFlash && (form.countdowns || []).map((v, i) => (<input key={`c-${i}`} type="hidden" name="names" value={v} />))}

            {isRecent && (form.locations || []).map((v, i) => (<input key={`rl-${i}`} type="hidden" name="locations" value={v} />))}

            {(selectedHandles || []).map((h, i) => (<input key={`sp-${i}`} type="hidden" name="selectedProducts" value={h} />))}
            {isRecent && <input type="hidden" name="orderDays" value={String(form.orderDays || 1)} />}

            {isFlash && (
              <>
                <input type="hidden" name="iconKey" value={form.iconKey || ""} />
                <input type="hidden" name="iconSvg" value={form.iconSvg || ""} />
              </>
            )}
          </Form>
        </Layout>
      </Page>

      {/* Product picker (RECENT) */}
      {isRecent && (
        <Modal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title="Select products"
          secondaryActions={[{ content: "Close", onAction: () => setPickerOpen(false) }]}
          large
        >
          <Modal.Section>
            <BlockStack gap="300">
              <TextField
                label="Search"
                placeholder="Type to search by product title"
                value={search}
                onChange={setSearch}
                autoComplete="off"
                prefix={<Icon source={SearchIcon} />}
              />
              <Divider />
              <IndexTable
                resourceName={{ singular: "product", plural: "products" }}
                itemCount={items.length}
                selectable={false}
                headings={[{ title: "Action" }, { title: "Product" }, { title: "Status" }]}
                loading={isLoadingList}
              >
                {items.map((item, index) => {
                  const picked = selectedProducts.some(p => p.id === item.id);
                  return (
                    <IndexTable.Row id={item.id} key={item.id} position={index}>
                      {/* <IndexTable.Cell>
                        <Button size="slim" onClick={() => togglePick(item)} variant={picked ? "primary" : undefined}>
                          {picked ? "Remove" : "Add"}
                        </Button>
                      </IndexTable.Cell> */}
                      <IndexTable.Cell>
                        <InlineStack gap="200" blockAlign="center">
                          <Thumbnail source={item.featuredImage || ""} alt={item.title} size="small" />
                          <BlockStack gap="100">
                            <Text as="span" variant="bodyMd">{item.title}</Text>
                            {item.handle ? <Text as="span" variant="bodySm" tone="subdued">@{item.handle}</Text> : null}
                          </BlockStack>
                        </InlineStack>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Badge tone={item.status === "ACTIVE" ? "success" : "attention"}>{item.status?.toLowerCase()}</Badge>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  );
                })}
              </IndexTable>

              {!isLoadingList && items.length === 0 && (
                <Box padding="4"><Text tone="subdued">No products found. Try a different search.</Text></Box>
              )}

              <InlineStack align="center">
                <Pagination hasPrevious={page > 1} onPrevious={() => setPage(p => Math.max(1, p - 1))}
                  hasNext={!!fetcher.data?.hasNextPage} onNext={() => setPage(p => p + 1)} />
              </InlineStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
      {showSaved && <Toast content="Saved successfully" onDismiss={() => setShowSaved(false)} duration={2200} />}
    </Frame>
  );
}
