// app/routes/app.notification.$key.edit.$id.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, Frame, Loading, Layout,
  Modal, IndexTable, Thumbnail, Badge, Pagination, Divider, Icon,
  Tag, Popover, ColorPicker, ButtonGroup, Toast
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
import { prisma } from "../db.server";

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

/* SVG icon set */
const SVGS = {
  reshot: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 64 64">
  <g id="_06-Flash_sales" data-name="06-Flash sales">
    <path d="M38.719,63a17.825,17.825,0,0,0,7.422-1.5A14.41,14.41,0,0,0,55,48c0-9-2-11-5-17s0-12,0-12a10.819,10.819,0,0,0-6,4C44,2,30,1,30,1a15.091,15.091,0,0,1-2,14c-5,7-10,11-12,19,0,0-4-2-3-6,0,0-4,7-4,18,0,12.062,9.662,15.6,14.418,16.61a18.53,18.53,0,0,0,3.846.39Z" style="fill:#febd55"/>
    <path d="M24.842,63S14.526,59.132,14.526,47.526C14.526,34.632,23.474,30,23.474,30s-2.5,4.632.079,5.921c0,0,4.315-14.053,15.921-17.921,0,0-4.053,4.263-1.474,12s11.316,9.474,11.474,18v1a14.54,14.54,0,0,1-2.2,8.213C45.286,60.31,42.991,63,37.737,63Z" style="fill:#fc9e20"/>
    <path d="M26,63a13.024,13.024,0,0,1-8-12c0-10,5-14,5-14s0,4,2,5c0,0,2-14,11-17,0,0-3,2-1,8s11,8,11,18v.871a12.287,12.287,0,0,1-1.831,6.641A9.274,9.274,0,0,1,36,63Z" style="fill:#e03e3e"/>
    <path d="M10.174,42.088l-1.992-.177c-.059.663-.106,1.344-.137,2.045l2,.087C10.072,43.375,10.117,42.722,10.174,42.088Z"/>
    <path d="M12.44,31.768A7.317,7.317,0,0,0,15.553,34.9a1,1,0,0,0,1.417-.652c1.385-5.541,4.3-9.125,7.665-13.276,1.356-1.67,2.759-3.4,4.178-5.386A16.069,16.069,0,0,0,31.45,2.293c2.8.77,8.637,3.489,10.761,12.927l1.951-.44C41.048.944,30.181.01,30.071,0a1,1,0,0,0-.991,1.39,13.975,13.975,0,0,1-1.893,13.027c-1.385,1.938-2.768,3.641-4.105,5.288-3.241,3.992-6.076,7.483-7.67,12.675a4.04,4.04,0,0,1-1.442-4.139,1,1,0,0,0-1.838-.739,36.649,36.649,0,0,0-3.72,12.362l1.983.268A40.112,40.112,0,0,1,12.44,31.768Z"/>
    <path d="M52.276,33.212c-.431-.812-.893-1.682-1.381-2.659-2.731-5.461-.027-11.052,0-11.106a1,1,0,0,0-1.137-1.417,11.826,11.826,0,0,0-4.824,2.511c-.071-1.284-.2-2.52-.38-3.694l-1.977.306A38.39,38.39,0,0,1,43,23a1,1,0,0,0,1.83.558,9.836,9.836,0,0,1,3.483-2.874,14.847,14.847,0,0,0,.792,10.763c.5.993.966,1.878,1.405,2.7C52.687,38.251,54,40.727,54,48a13.458,13.458,0,0,1-8.275,12.59,14.922,14.922,0,0,1-2.838.938,11.536,11.536,0,0,0,2.124-2.476A13.259,13.259,0,0,0,47,51.871V51H45v.871a11.262,11.262,0,0,1-1.673,6.1A8.25,8.25,0,0,1,36,62H27.264c-.409,0-.8-.034-1.2-.06A11.861,11.861,0,0,1,19,51c0-6.017,1.9-9.755,3.269-11.661A5.025,5.025,0,0,0,24.553,42.9a1,1,0,0,0,1.437-.753c.017-.117,1.556-10.322,7.511-14.717a11,11,0,0,0,.551,5.891c.862,2.588,2.807,4.409,4.868,6.337a21,21,0,0,1,4.845,5.8l1.791-.89a22.864,22.864,0,0,0-5.27-6.366c-1.869-1.75-3.636-3.4-4.338-5.509-1.7-5.11.526-6.793.607-6.852a1,1,0,0,0-.871-1.781C28.353,26.5,25.429,35.457,24.441,39.666A9.122,9.122,0,0,1,24,37a1,1,0,0,0-1.625-.78C22.156,36.4,17,40.639,17,51a13.4,13.4,0,0,0,4.232,9.988C16.241,59.379,10,55.478,10,46H8C8,58.958,18.637,62.616,23.21,63.587a18.919,18.919,0,0,0,2.39.33l.048.02.007-.017c.531.041,1.064.08,1.609.08H38.719a18.737,18.737,0,0,0,7.838-1.59A15.389,15.389,0,0,0,56,48C56,40.229,54.519,37.438,52.276,33.212Z"/>
    <rect x="23.515" y="50" width="16.971" height="2" transform="translate(-26.69 37.565) rotate(-45)"/>
    <path d="M32,56a3,3,0,1,0,3-3A3,3,0,0,0,32,56Zm4,0a1,1,0,1,1-1-1A1,1,0,0,1,36,56Z"/>
    <path d="M32,46a3,3,0,1,0-3,3A3,3,0,0,0,32,46Zm-4,0a1,1,0,1,1,1,1A1,1,0,0,1,28,46Z"/>
    <path d="M46.862,48.868a13.991,13.991,0,0,0-.459-2.157l-1.916.57a12.126,12.126,0,0,1,.393,1.851Z"/>
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
  deadline: `
<svg xmlns="http://www.w3.org/2000/svg" width ="60" height="60" viewBox="0 0 64 64">
<style type="text/css">
	.st0{fill:#40C4FF;}
	.st1{fill:#263238;}
	.st2{fill:#FFD740;}
	.st3{fill:#FF5252;}
	.st4{fill:#4DB6AC;}
	.st5{fill:#FFFFFF;}
	.st6{fill:#4FC3F7;}
	.st7{fill:#37474F;}
</style>
<g>
	<g><path class="st1" d="M18,53.5c-0.276,0-0.5-0.224-0.5-0.5v-8.511c0-3.609,1.818-6.921,4.863-8.858L28.069,32l-5.706-3.631c-3.045-1.938-4.863-5.249-4.863-8.858V11c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v8.511c0,3.266,1.645,6.262,4.4,8.015l6.369,4.053C29.413,31.67,29.5,31.829,29.5,32s-0.087,0.33-0.231,0.422L22.9,36.475c-2.755,1.753-4.4,4.749-4.4,8.015V53C18.5,53.276,18.276,53.5,18,53.5z"/></g>
	<g><path class="st1" d="M46,53.5c-0.276,0-0.5-0.224-0.5-0.5v-8.511c0-3.265-1.645-6.261-4.399-8.015l-6.369-4.053C34.587,32.33,34.5,32.171,34.5,32s0.087-0.33,0.231-0.422l6.369-4.053c2.755-1.753,4.399-4.75,4.399-8.015V11c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v8.511c0,3.609-1.817,6.92-4.862,8.858L35.932,32l5.706,3.631c3.045,1.938,4.862,5.25,4.862,8.858V53C46.5,53.276,46.276,53.5,46,53.5z"/></g>
	<g><path class="st0" d="M47,5H17c-1.105,0-2,0.895-2,2c0,1.105,0.895,2,2,2h30c1.105,0,2-0.895,2-2C49,5.895,48.105,5,47,5z"/></g>
	<g><path class="st0" d="M17,59h30c1.105,0,2-0.895,2-2v0c0-1.105-0.895-2-2-2H17c-1.105,0-2,0.895-2,2v0C15,58.105,15.895,59,17,59z"/></g>
	<g><path class="st2" d="M21,53l6.968-9.502c1.998-2.724,6.066-2.724,8.064,0L43,53"/></g>
	<g><path class="st1" d="M32,30.388c-0.561,0-1.121-0.156-1.61-0.467l-7.342-4.672c-1.595-1.016-2.547-2.75-2.547-4.64v-1.275c0-0.276,0.224-0.5,0.5-0.5h22c0.276,0,0.5,0.224,0.5,0.5v1.275c0,1.891-0.952,3.625-2.547,4.64l-7.343,4.672l-0.269-0.422l0.269,0.422C33.121,30.232,32.561,30.388,32,30.388z"/></g>
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
  <path class="fil1" d="M2.2782 3.43181l0.477831 -0.000645669 0.10574 -0.000145669 0.000511811 0.10598 0.00847638 1.74953 1.61087 -2.5723 -1.13312 0 -0.188642 0 0.0973898 -0.161669 0.895118 -1.48589 -1.8923 0 0.018126 2.36515zm0.372091 0.212l-0.477531 0.000645669 -0.105437 0.000141732 -0.000814961 -0.105976 -0.0197559 -2.57821 -0.000818898 -0.107087 0.107071 0 2.18801 0 0.188642 3.93701e-006 -0.0973898 0.161665 -0.895118 1.48589 1.1365 0 0.192024 0 -0.102024 0.162921 -1.90737 3.04577 -0.194476 0.310547 -0.00177559 -0.366382 -0.00974016 -2.00993z"/>
  <path class="fil2" d="M3.39739 1.49333l-0.151972 0 -0.555811 0 0.00803937 1.04871 0 0.525819 -0.011252 0.0186772 -0.194606 0.323055 -0.00289764 -0.377638 -0.0126063 -1.64488 -0.000818898 -0.107087 0.107071 0 1.0035 0 0.188642 0 -0.0973898 0.161669 -0.031126 0.0516693 -0.248768 0zm-0.110917 1.61484l7.87402e-006 0.000326772 -7.87402e-006 -0.000448819 0 0.000122047zm-0.212488 0.00449213l-7.87402e-006 0 -0.00173228 -0.0763622 -0.00246457 -0.108752 0.108717 0 0.725177 0 0.192024 0 -0.102024 0.162921 -0.718264 1.14696 -0.194472 0.310547 -0.00177953 -0.366382 -0.000192913 -0.0399173 0.210921 -0.327594 0 0.000295276 0.00684252 -0.0109252 0.113465 -0.176232c0.00487402,-0.00756693 0.00875984,-0.0154961 0.0117008,-0.0236378l0.289752 -0.462693 -0.330972 0c-0.00176378,-7.87402e-005 -0.00353543,-0.000125984 -0.0053189,-0.000125984l-0.301236 0 -0.000133858 -0.0280984z"/>
 </g>
</svg>
`,
};
const SVG_OPTIONS = [
  { label: "Reshot", value: "reshot" },
  { label: "Reshot Flash", value: "reshotFlash" },
  { label: "Reshot Flash On", value: "reshotflashon" },
  { label: "Deadline", value: "deadline" },
];

/* ───────────────── helpers ──────────────── */
const parseArr = (s, fallback = []) => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : fallback; } catch { return fallback; } };
const toJson = (a) => JSON.stringify(Array.isArray(a) ? a : []);
const nullIfBlank = (v) => (v == null || String(v).trim() === "" ? null : String(v));
const intOrNull = (v, min = null, max = null) => {
  if (v == null || String(v).trim() === "") return null;
  let n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (min != null) n = Math.max(min, n);
  if (max != null) n = Math.min(max, n);
  return n;
};
const getAdminQS = () => { try { return typeof window !== "undefined" ? (window.location.search || "") : ""; } catch { return ""; } };
const appendQS = (url) => {
  const qs = getAdminQS();
  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs.slice(1)}` : `${url}${qs}`;
};

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
  const row = await prisma.notificationConfig.findFirst({ where });

  if (!row) {
    return json({ ok: false, message: "Record not found." }, { status: 404 });
  }

  // Common data shape
  const data = {
    id: row.id,
    key,
    enabled: row.enabled ? ["enabled"] : ["disabled"],
    showType: row.showType ?? "allpage",
    messageTitles: parseArr(row.messageTitlesJson),
    locations: parseArr(row.locationsJson),
    names: parseArr(row.namesJson),
    messageText: key === "recent" ? (row.messageText ?? "bought this product recently") : null,
    fontFamily: row.fontFamily ?? "System",
    position: row.position ?? (key === "flash" ? "top-right" : "bottom-left"),
    animation: row.animation ?? (key === "flash" ? "slide" : "fade"),
    mobileSize: row.mobileSize ?? "compact",
    mobilePosition: (() => {
      try { const v = JSON.parse(row.mobilePositionJson || "null"); if (Array.isArray(v) && v.length) return v; } catch { }
      return ["bottom"];
    })(),
    titleColor: row.titleColor ?? (key === "flash" ? "#111111" : "#6E62FF"),
    bgColor: row.bgColor ?? (key === "flash" ? "#FFF8E1" : "#FFFFFF"),
    msgColor: row.msgColor ?? "#111111",
    ctaBgColor: row.ctaBgColor ?? null,
    rounded: row.rounded ?? 14,
    durationSeconds: row.durationSeconds ?? (key === "flash" ? 10 : 8),
    alternateSeconds: row.alternateSeconds ?? (key === "flash" ? 5 : 10),
    fontWeight: String(row.fontWeight ?? 600),
    iconKey: row.iconKey ?? (key === "flash" ? "reshot" : ""),
    iconSvg: row.iconSvg ?? "",
    // recent-only
    selectedProducts: key === "recent" ? parseArr(row.selectedProductsJson) : [],
  };

  // recent: preview first product by handle (server-side)
  let previewProduct = null;
  if (key === "recent" && Array.isArray(data.selectedProducts) && data.selectedProducts.length) {
    const firstHandle = data.selectedProducts[0];
    try {
      const q = `
        query ProductByHandle($handle: String!) {
          productByHandle(handle: $handle) {
            id title handle status
            featuredImage { url altText }
          }
        }`;
      const resp = await admin.graphql(q, { variables: { handle: firstHandle } });
      const js = await resp.json();
      const p = js?.data?.productByHandle;
      if (p) {
        previewProduct = {
          id: p.id, title: p.title, handle: p.handle,
          status: p.status, featuredImage: p.featuredImage?.url || null
        };
      }
    } catch { /* ignore preview errors */ }
  }

  return json({ ok: true, key, title: TITLES[key], data, previewProduct });
}

/* ───────────────── action (save/update) ──────────────── */
export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
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
  const titleColor = nullIfBlank(form.get("titleColor"));
  const bgColor = nullIfBlank(form.get("bgColor"));
  const msgColor = nullIfBlank(form.get("msgColor"));
  const ctaBgColor = nullIfBlank(form.get("ctaBgColor"));

  const rounded = intOrNull(form.get("rounded"), 10, 72);
  const durationSeconds = intOrNull(form.get("durationSeconds"), 1, 60);
  const alternateSeconds = intOrNull(form.get("alternateSeconds"), 0, 3600);
  const fontWeight = intOrNull(form.get("fontWeight"), 100, 900);

  const mobilePosition = form.getAll("mobilePosition");
  const mobilePositionJson = JSON.stringify(mobilePosition.length ? mobilePosition : ["bottom"]);

  // arrays
  const messageTitles = form.getAll("messageTitles").map(s => String(s).trim()).filter(Boolean);
  const locations = form.getAll("locations").map(s => String(s).trim()).filter(Boolean);
  const names = form.getAll("names").map(s => String(s).trim()).filter(Boolean);

  // key-specific
  let selectedProducts = [];
  let iconKey = nullIfBlank(form.get("iconKey"));
  let iconSvg = nullIfBlank(form.get("iconSvg"));

  if (key === "recent") {
    selectedProducts = form.getAll("selectedProducts").map(s => String(s).trim()).filter(Boolean); // HANDLES
    if (!messageTitles.length || !locations.length || !names.length || !selectedProducts.length) {
      return json({ ok: false, message: "Please add at least 1 Title, 1 Location, 1 Time and select 1 Product." }, { status: 400 });
    }
    if (!(messageTitles.length === locations.length && locations.length === names.length && names.length === selectedProducts.length)) {
      return json({ ok: false, message: `Counts must match. Now ${messageTitles.length}/${locations.length}/${names.length}/${selectedProducts.length}` }, { status: 400 });
    }
  } else {
    if (!(messageTitles.length && messageTitles.length === locations.length && locations.length === names.length)) {
      return json({ ok: false, message: `Counts must match. Now ${messageTitles.length}/${locations.length}/${names.length}` }, { status: 400 });
    }
    if (iconKey && !iconSvg && SVGS[iconKey]) iconSvg = SVGS[iconKey];
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
    // json arrays
    messageTitlesJson: toJson(messageTitles),
    locationsJson: toJson(locations),
    namesJson: toJson(names),
    // key-specific fields
    selectedProductsJson: key === "recent" ? (selectedProducts.length ? JSON.stringify(selectedProducts) : null) : null,
    iconKey: key === "flash" ? iconKey : nullIfBlank(form.get("iconKey")),
    iconSvg: key === "flash" ? iconSvg : nullIfBlank(form.get("iconSvg")),
  };

  await prisma.notificationConfig.update({ where: { id }, data });

  // ✅ Redirect to dashboard with Toast flag & preserve admin QS
  const prev = new URL(request.url);
  const qs = prev.search; // keep admin/embedded params
  const dest = `/app/dashboard${qs ? `${qs}&saved=1` : "?saved=1"}`;
  return redirect(dest);
}

/* ───────────────── ColorInput ──────────────── */
const hex6 = (v) => /^#[0-9A-F]{6}$/i.test(String(v || ""));
function hexToRgb(hex) { const c = hex.replace("#", ""); const n = parseInt(c, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: (n & 255) }; }
function rgbToHsv({ r, g, b }) { r /= 255; g /= 255; b /= 255; const m = Math.max(r, g, b), n = Math.min(r, g, b), d = m - n; let h = 0; if (d) { switch (m) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; default: h = (r - g) / d + 4 } h *= 60 } const s = m ? d / m : 0; return { hue: h, saturation: s, brightness: m } }
function hsvToRgb({ hue: h, saturation: s, brightness: v }) { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let R = 0, G = 0, B = 0; if (0 <= h && h < 60) [R, G, B] = [c, x, 0]; else if (60 <= h && h < 120) [R, G, B] = [x, c, 0]; else if (120 <= h && h < 180) [R, G, B] = [0, c, x]; else if (180 <= h && h < 240) [R, G, B] = [0, x, c]; else[R, G, B] = [x, 0, c]; return { r: Math.round((R + m) * 255), g: Math.round((G + m) * 255), b: Math.round((B + m) * 255) } }
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const hexToHSB = (hex) => rgbToHsv(hexToRgb(hex)); const hsbToHEX = (hsb) => rgbToHex(hsvToRgb(hsb));

function ColorInput({ label, value, onChange, placeholder = "#244E89" }) {
  const [open, setOpen] = useState(false);
  const [hsb, setHsb] = useState(hex6(value) ? hexToHSB(value) : { hue: 212, saturation: 0.7, brightness: 0.55 });
  useEffect(() => { if (hex6(value)) setHsb(hexToHSB(value)); }, [value]);

  const swatch = (<div onClick={() => setOpen(true)} style={{ width: 28, height: 28, borderRadius: 10, cursor: "pointer", border: "1px solid rgba(0,0,0,0.08)", background: hex6(value) ? value : "#ffffff" }} />);

  return (
    <Popover active={open} onClose={() => setOpen(false)} preferredAlignment="right"
      activator={
        <TextField label={label} value={value} onChange={(v) => { const next = String(v).toUpperCase(); onChange(next); if (hex6(next)) setHsb(hexToHSB(next)); }}
          autoComplete="off" placeholder={placeholder} suffix={swatch} onFocus={() => setOpen(true)} />
      }>
      <Box padding="300" minWidth="260px">
        <ColorPicker color={hsb} onChange={(c) => { setHsb(c); onChange(hsbToHEX(c)); }} allowAlpha={false} />
      </Box>
    </Popover>
  );
}

/* ───────────────── Token Input Helper ──────────────── */
function useTokenInput(listKey, form, setForm) {
  const [draft, setDraft] = useState("");
  const add = useCallback((val) => {
    const v = String(val || "").trim(); if (!v) return;
    setForm(f => { const arr = [...(f[listKey] || [])]; arr.push(v); return { ...f, [listKey]: arr }; });
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

/* ───────────────── Anim + Preview helpers ──────────────── */
const getAnimationStyle = (a) =>
  a === "slide" ? { transform: "translateY(8px)", animation: "notif-slide-in 240ms ease-out" } :
    a === "bounce" ? { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" } :
      a === "zoom" ? { transform: "scale(0.96)", animation: "notif-zoom-in 200ms ease-out forwards" } :
        { opacity: 0, animation: "notif-fade-in 220ms ease-out forwards" };

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

/* ───────────────── Notification bubbles ──────────────── */
function RecentBubble({ form, product, isMobile = false, drafts = {} }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);

  const firstTitle = (drafts.title || "").trim() || form?.messageTitles?.[0] || "Someone";
  const firstLoc = (drafts.location || "").trim() || form?.locations?.[0] || "Ahmedabad";
  const firstName = (drafts.name || "").trim() || form?.names?.[0] || "2 hours ago";

  const baseFont = Number(form?.rounded ?? 14) || 14;
  const scale = isMobile ? mobileSizeScale(form?.mobileSize) : 1;
  const sized = Math.max(10, Math.min(28, Math.round(baseFont * scale)));

  const bubbleStyle = {
    display: "flex", alignItems: "center", gap: 12,
    fontFamily: form?.fontFamily === "System" ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" : form?.fontFamily,
    background: form?.bgColor, color: form?.msgColor, borderRadius: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, border: "1px solid rgba(17,24,39,0.06)",
    maxWidth: isMobile ? mobileSizeToWidth(form?.mobileSize) : 560, ...animStyle
  };

  return (
    <div style={bubbleStyle}>
      <div>
        {product?.featuredImage ? (
          <img src={product.featuredImage} alt={product.title || "Product"} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, background: "#f4f4f5" }} />
        ) : (
          <div style={{ width: 60, height: 60, borderRadius: 6, background: "#f4f4f5" }} />
        )}
      </div>
      <div>
        <p style={{ margin: 0 }}>
          <span style={{ color: form.titleColor, fontWeight: Number(form.fontWeight || 600), fontSize: sized }}>{firstTitle}</span>
          <span style={{ fontSize: sized }}>{" "}from</span>
          <span style={{ color: form.titleColor, fontWeight: Number(form.fontWeight || 600), fontSize: sized }}>{" "}{firstLoc}</span><br />
          <span style={{ margin: 0, fontSize: sized }}>{form?.messageText || "bought this product recently"}</span><br />
          <span style={{ fontSize: sized, opacity: 0.9, display: 'block', textAlign: 'end' }}>
            <small>{firstName}</small>
          </span>
        </p>
      </div>
    </div>
  );
}

function FlashBubble({ form, isMobile = false, drafts = {} }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);
  const svgMarkup = useMemo(() => SVGS[form.iconKey] || "", [form.iconKey]);

  const firstTitle = (drafts.title || "").trim() || form?.messageTitles?.[0] || "Flash Sale";
  const firstName = (drafts.location || "").trim() || form?.locations?.[0] || "Flash Sale 20% OFF";
  const firstText = (drafts.name || "").trim() || form?.names?.[0] || "ends in 02:15 hours";

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
        <span aria-hidden="true" style={{ display: "block", flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: svgMarkup.replace('width="60"', 'width="50"').replace('height="60"', 'height="50"') }} />
      ) : null}
      <div style={{ display: "grid", gap: 4 }}>
        <p style={{ margin: 0, color: form.titleColor, fontWeight: Number(form.fontWeight || 600), fontSize: sized }}>{firstTitle}</p>
        <p style={{ margin: 0, fontSize: sized, lineHeight: 1.5 }}>
          <small>{firstName} — {form?.messageText || firstText}</small>
        </p>
      </div>
    </div>
  );
}

/* Desktop frame */
function DesktopPreview({ keyName, form, product, drafts }) {
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
        <RecentBubble form={form} product={product} isMobile={false} drafts={drafts} />
      ) : (
        <FlashBubble form={form} isMobile={false} drafts={drafts} />
      )}
    </div>
  );
}

/* Mobile frame */
function MobilePreview({ keyName, form, product, drafts }) {
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
            <RecentBubble form={form} product={product} isMobile drafts={drafts} />
          ) : (
            <FlashBubble form={form} isMobile drafts={drafts} />
          )}
        </div>
      </div>
    </div>
  );
}

/* Wrapper */
function LivePreview({ keyName, form, product, drafts }) {
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

      {mode === "desktop" && <DesktopPreview keyName={keyName} form={form} product={product} drafts={drafts} />}
      {mode === "mobile" && <MobilePreview keyName={keyName} form={form} product={product} drafts={drafts} />}
      {mode === "both" && (
        <InlineStack gap="400" align="space-between" wrap>
          <Box width="58%"><DesktopPreview keyName={keyName} form={form} product={product} drafts={drafts} /></Box>
          <Box width="40%"><MobilePreview keyName={keyName} form={form} product={product} drafts={drafts} /></Box>
        </InlineStack>
      )}

      <Text as="p" variant="bodySm" tone="subdued">
        Desktop preview follows Desktop position. Mobile preview follows Mobile Position and Mobile size.
      </Text>
    </BlockStack>
  );
}

/* ───────────────── Page ──────────────── */
export default function NotificationEditGeneric() {
  const { ok, key, title, data, previewProduct } = useLoaderData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const location = useLocation();
  const busy = navigation.state !== "idle";
  const fetcher = useFetcher();
  const isFlash = key === "flash";
  const isRecent = key === "recent";

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

  // ⚠️ URLમાંથી id-hide કરતું history.replace દૂર કર્યું — refresh પર 404 આવતું હતું.

  const [showSaved, setShowSaved] = useState(() => {
    try { return new URLSearchParams(location.search).get("saved") === "1"; } catch { return false; }
  });
  useEffect(() => {
    if (showSaved) {
      const sp = new URLSearchParams(location.search); sp.delete("saved");
      navigate(`${location.pathname}?${sp.toString()}`, { replace: true });
    }
  }, [showSaved, location.pathname, location.search, navigate]);

  // selectedProducts objects for preview/pills (recent only)
  const [selectedProducts, setSelectedProducts] = useState(() => (previewProduct ? [previewProduct] : []));
  const [selectedProduct, setSelectedProduct] = useState(() => (previewProduct || null));

  // product picker (recent only)
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

  const [form, setForm] = useState(() => ({
    enabled: data.enabled,
    showType: data.showType,
    messageTitles: data.messageTitles,
    locations: data.locations,
    names: data.names,
    messageText: key === "recent" ? String(data.messageText || "") : "",
    fontFamily: data.fontFamily,
    position: data.position,
    animation: data.animation,
    mobileSize: data.mobileSize,
    mobilePosition: data.mobilePosition,
    titleColor: data.titleColor,
    bgColor: data.bgColor,
    msgColor: data.msgColor,
    ctaBgColor: data.ctaBgColor || "",
    rounded: String(data.rounded ?? 14),
    durationSeconds: Number(data.durationSeconds ?? 8),
    alternateSeconds: Number(data.alternateSeconds ?? 10),
    fontWeight: String(data.fontWeight ?? 600),
    iconKey: data.iconKey || "",
    iconSvg: data.iconSvg || "",
    selectedProducts: Array.isArray(data.selectedProducts) ? data.selectedProducts : [],
  }));

  const onField = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const onNum = (k, min, max) => (val) => {
    const n = parseInt(String(val || "0"), 10);
    const clamped = isNaN(n) ? (min ?? 0) : Math.max(min ?? n, Math.min(max ?? n, n));
    setForm(f => ({ ...f, [k]: clamped }));
  };

  const titlesInput = useTokenInput("messageTitles", form, setForm);
  const locationsInput = useTokenInput("locations", form, setForm);
  const namesInput = useTokenInput("names", form, setForm);

  // handles array from form
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

  const countsOk = useMemo(() => {
    const t = form.messageTitles?.length || 0;
    const l = form.locations?.length || 0;
    const n = form.names?.length || 0;
    if (isRecent) {
      const p = selectedHandles.length;
      return t && t === l && l === n && n === p;
    }
    return t && t === l && l === n;
  }, [form, selectedHandles, isRecent]);

  const formRef = useRef(null);
  const doSave = () => formRef.current?.requestSubmit();

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

          {/* Record summary */}
          <Layout.Section>
            <Card>
              <Box padding="4">
                <InlineStack align="space-between" wrap>
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingSm">Record</Text>
                    <Text tone="subdued">Key: {key}</Text>
                  </BlockStack>
                  <InlineStack gap="300">
                    <Badge tone={(Array.isArray(form.enabled) && form.enabled.includes("enabled")) ? "success" : "critical"}>
                      {(Array.isArray(form.enabled) && form.enabled.includes("enabled")) ? "Enabled" : "Disabled"}
                    </Badge>
                    <Badge>{form.showType}</Badge>
                    <Badge>
                      {isRecent
                        ? `${form.messageTitles?.length || 0}/${form.locations?.length || 0}/${form.names?.length || 0}/${selectedHandles.length}`
                        : `${form.messageTitles?.length || 0}/${form.locations?.length || 0}/${form.names?.length || 0}`
                      }
                    </Badge>
                  </InlineStack>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Live Preview */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <LivePreview
                  keyName={key}
                  form={form}
                  product={isRecent ? (selectedProduct || previewProduct) : null}
                  drafts={{
                    title: titlesInput.draft,
                    location: locationsInput.draft,
                    name: namesInput.draft,
                  }}
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
                        title="Enable Sales Notification Popup"
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
                        label="Popup Display Duration (seconds)"
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

          {/* Message */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Message</Text>

                  {!countsOk && (
                    <Box paddingBlockStart="200">
                      <div role="alert" style={{ border: '1px solid #E0B3B2', background: '#FFF6F6', borderRadius: 8, padding: 12 }}>
                        <Text tone="critical">
                          {isRecent
                            ? `Counts must match (Names/Locations/Times/Products). Now ${form.messageTitles?.length || 0}/${form.locations?.length || 0}/${form.names?.length || 0}/${selectedHandles.length}`
                            : `Counts must match (Banner Title/Notification Name/Banner Text). Now ${form.messageTitles?.length || 0}/${form.locations?.length || 0}/${form.names?.length || 0}`
                          }
                        </Text>
                      </div>
                    </Box>
                  )}

                  {/* Names */}
                  <div onKeyDownCapture={(e) => { if (e.key === "Enter") { e.preventDefault(); titlesInput.commitDraft(); } }}>
                    <TextField
                      label={isFlash ? "Flash Sale Headline / Banner Title (add multiple)" : "Buyer Name / Shopper Identity (add multiple)"}
                      value={titlesInput.draft}
                      onChange={titlesInput.onChange}
                      onBlur={titlesInput.commitDraft}
                      autoComplete="off"
                      placeholder={isFlash ? "Flash Sale, Flash Sale 2 …" : "Name1, Name2 … then press Enter"}
                    />
                  </div>
                  <InlineStack gap="150" wrap>
                    {(form.messageTitles || []).map((t, i) => (
                      <Tag key={`t-${i}`} onRemove={() => titlesInput.removeAt(i)}>{t}</Tag>
                    ))}
                  </InlineStack>

                  {/* Body */}
                  {!isFlash && (
                    <TextField
                      label="Purchase Message / Action Text"
                      value={form.messageText}
                      onChange={onField("messageText")}
                      multiline={1}
                      autoComplete="off"
                    />
                  )}
                  {/* Locations */}
                  <div onKeyDownCapture={(e) => { if (e.key === "Enter") { e.preventDefault(); locationsInput.commitDraft(); } }}>
                    <TextField
                      label={isFlash ? "Offer Title / Discount Name (add multiple)" : "Customer Location / City (add multiple)"}
                      value={locationsInput.draft}
                      onChange={locationsInput.onChange}
                      onBlur={locationsInput.commitDraft}
                      autoComplete="off"
                      placeholder={isFlash ? "Flash Sale 20% OFF …" : "Ahmedabad, Surat … then press Enter"}
                    />
                  </div>
                  <InlineStack gap="150" wrap>
                    {(form.locations || []).map((t, i) => (
                      <Tag key={`l-${i}`} onRemove={() => locationsInput.removeAt(i)}>{t}</Tag>
                    ))}
                  </InlineStack>

                  {/* Times */}
                  <div onKeyDownCapture={(e) => { if (e.key === "Enter") { e.preventDefault(); namesInput.commitDraft(); } }}>
                    <TextField
                      label={isFlash ? "Countdown Text / Urgency Message (add multiple)" : "Purchase Time / Activity Timestamp (add multiple)"}
                      value={namesInput.draft}
                      onChange={namesInput.onChange}
                      onBlur={namesInput.commitDraft}
                      autoComplete="off"
                      placeholder={isFlash ? "ends in 01:15 hours …" : "12 hours ago, 2 hours ago … then press Enter"}
                    />
                  </div>
                  <InlineStack gap="150" wrap>
                    {(form.names || []).map((t, i) => (
                      <Tag key={`n-${i}`} onRemove={() => namesInput.removeAt(i)}>{t}</Tag>
                    ))}
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Products (recent only) */}
          {isRecent && (
            <Layout.Section oneHalf>
              <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">Select Product(s) for Notification</Text>
                    {!(selectedHandles.length) && <Text tone="critical">Please select at least one product.</Text>}
                    <InlineStack gap="200">
                      <Button onClick={() => { setPickerOpen(true); setPage(1); fetcher.load(`/app/products-picker?page=1`); }}>
                        Pick products
                      </Button>
                      {!!selectedHandles.length && (
                        <Text variant="bodySm" tone="subdued">{selectedHandles.length} selected</Text>
                      )}
                    </InlineStack>
                    {!!selectedHandles.length && (
                      <InlineStack gap="150" wrap>
                        {selectedHandles.map((handle) => (
                          <Tag key={handle} onRemove={() => clearSelectedHandle(handle)}>
                            @{handle}
                          </Tag>
                        ))}
                      </InlineStack>
                    )}
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
                    <Box width="50%"><Select label="Popup Font Weight / Style" options={[
                      { label: "100 - Thin", value: "100" }, { label: "200 - Extra Light", value: "200" },
                      { label: "300 - Light", value: "300" }, { label: "400 - Normal", value: "400" },
                      { label: "500 - Medium", value: "500" }, { label: "600 - Semi Bold", value: "600" },
                      { label: "700 - Bold", value: "700" },
                    ]} value={form.fontWeight} onChange={onField("fontWeight")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Desktop Popup Position" options={[
                      { label: "Top Left", value: "top-left" },
                      { label: "Top Right", value: "top-right" },
                      { label: "Bottom Left", value: "bottom-left" },
                      { label: "Bottom Right", value: "bottom-right" },
                    ]} value={form.position} onChange={onField("position")} /></Box>
                    <Box width="50%"><Select label="Notification Animation Style" options={[
                      { label: "Fade", value: "fade" },
                      { label: "Slide", value: "slide" },
                      { label: "Bounce", value: "bounce" },
                      { label: "Zoom", value: "zoom" },
                    ]} value={form.animation} onChange={onField("animation")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Mobile Popup Size" options={[
                      { label: "Compact", value: "compact" },
                      { label: "Comfortable", value: "comfortable" },
                      { label: "Large", value: "large" },
                    ]} value={form.mobileSize} onChange={onField("mobileSize")} /></Box>
                    <Box width="50%">
                      <Select
                        label="Mobile Popup Position"
                        options={[{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]}
                        value={(form.mobilePosition && form.mobilePosition[0]) || "bottom"}
                        onChange={(v) => setForm(f => ({ ...f, mobilePosition: [v] }))}
                      />
                    </Box>
                  </InlineStack>

                  {/* Size + colors */}
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><TextField type="number" label="Font Size (px)" value={String(form.rounded)} onChange={onField("rounded")} autoComplete="off" /></Box>
                    <Box width="50%"><ColorInput label="Headline Text Color" value={form.titleColor} onChange={(v) => setForm(f => ({ ...f, titleColor: v }))} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><ColorInput label="Popup Background Color" value={form.bgColor} onChange={(v) => setForm(f => ({ ...f, bgColor: v }))} /></Box>
                    <Box width="50%"><ColorInput label="Message Text Color" value={form.msgColor} onChange={(v) => setForm(f => ({ ...f, msgColor: v }))} /></Box>
                  </InlineStack>

                  {/* Icon (flash only) */}
                  {isFlash && (
                    <InlineStack gap="400" wrap={false}>
                      <Box width="50%"><Select label="Notification Icon" options={SVG_OPTIONS} value={form.iconKey} onChange={onField("iconKey")} /></Box>
                    </InlineStack>
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
            <input type="hidden" name="titleColor" value={form.titleColor || ""} />
            <input type="hidden" name="bgColor" value={form.bgColor || ""} />
            <input type="hidden" name="msgColor" value={form.msgColor || ""} />
            <input type="hidden" name="ctaBgColor" value={form.ctaBgColor || ""} />
            <input type="hidden" name="rounded" value={form.rounded} />
            <input type="hidden" name="durationSeconds" value={form.durationSeconds} />
            <input type="hidden" name="alternateSeconds" value={form.alternateSeconds} />
            <input type="hidden" name="fontWeight" value={form.fontWeight} />
            {/* icon fields: harmless for recent */}
            <input type="hidden" name="iconKey" value={form.iconKey || ""} />
            <input type="hidden" name="iconSvg" value={form.iconSvg || ""} />
            {(form.messageTitles || []).map((v, i) => (<input key={`t-h-${i}`} type="hidden" name="messageTitles" value={v} />))}
            {(form.locations || []).map((v, i) => (<input key={`l-h-${i}`} type="hidden" name="locations" value={v} />))}
            {(form.names || []).map((v, i) => (<input key={`n-h-${i}`} type="hidden" name="names" value={v} />))}
            {(selectedHandles || []).map((h, i) => (<input key={`sp-${i}`} type="hidden" name="selectedProducts" value={h} />))}
          </Form>
        </Layout>
      </Page>

      {/* Product picker (recent only) */}
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
                      <IndexTable.Cell>
                        <Button size="slim" onClick={() => togglePick(item)} variant={picked ? "primary" : undefined}>
                          {picked ? "Remove" : "Add"}
                        </Button>
                      </IndexTable.Cell>
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
