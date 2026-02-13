document.addEventListener("DOMContentLoaded", async function () {
  if (window.__fomoOneFile) return;
  window.__fomoOneFile = true;

  const SHOP = (window.Shopify && window.Shopify.shop) || "";
  const PROXY_BASES = ["/apps/fomo-v2"];
  const PROXY_STORE_KEY = "__fomo_proxy_base__";
  const readSavedProxyBase = () => {
    try {
      const v = window.localStorage.getItem(PROXY_STORE_KEY);
      return PROXY_BASES.includes(v) ? v : null;
    } catch {
      return null;
    }
  };
  let ACTIVE_PROXY_BASE = readSavedProxyBase() || PROXY_BASES[0];
  const setActiveProxyBase = (base) => {
    if (!PROXY_BASES.includes(base)) return;
    ACTIVE_PROXY_BASE = base;
    try {
      window.localStorage.setItem(PROXY_STORE_KEY, base);
    } catch {}
  };
  const proxyCandidates = (url) => {
    const matchedBase = PROXY_BASES.find((b) => url.startsWith(b));
    if (!matchedBase) return [url];
    const suffix = url.slice(matchedBase.length);
    const orderedBases = [
      ACTIVE_PROXY_BASE,
      ...PROXY_BASES.filter((b) => b !== ACTIVE_PROXY_BASE),
    ];
    return orderedBases.map((b) => `${b}${suffix}`);
  };
  const fetchWithProxyFallback = async (url, options) => {
    const candidates = proxyCandidates(url);
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        const res = await fetch(candidate, options);
        const isLast = i === candidates.length - 1;
        const contentType = res.headers?.get("content-type") || "";
        const isProxyApi = /\/(session|popup|orders|customers|track)(\?|$)/.test(candidate);

        if (!res.ok && !isLast) continue;
        if (res.ok && isProxyApi && !contentType.includes("application/json") && !isLast) {
          continue;
        }

        const matchedBase = PROXY_BASES.find((b) => candidate.startsWith(b));
        if (matchedBase && res.ok) setActiveProxyBase(matchedBase);
        return res;
      } catch {
        if (i === candidates.length - 1) return null;
      }
    }
    return null;
  };

  const PROXY_BASE = ACTIVE_PROXY_BASE;
  const ENDPOINT = `${PROXY_BASE}/popup?shop=${SHOP}`;
  const SESSION_ENDPOINT = `${PROXY_BASE}/session?shop=${SHOP}`;
  const ORDERS_ENDPOINT_BASE = `${PROXY_BASE}/orders`; // expects ?shop=&days=&limit=
  const CUSTOMERS_ENDPOINT_BASE = `${PROXY_BASE}/customers`; // expects ?shop=&limit=
  const TRACK_ENDPOINT = `${PROXY_BASE}/track?shop=${SHOP}`;
  const ROOT = document.getElementById("fomo-embed-root");
  if (!ROOT) return;

  /* ========== helpers ========== */
  const safe = (v, fb = "") =>
    v === undefined || v === null ? fb : String(v);
  const toBool = (raw) => {
    if (raw === true || raw === false) return raw;
    const normalized = String(raw || "")
      .trim()
      .toLowerCase();
    return ["true", "1", "yes", "on"].includes(normalized);
  };

  // Normalize Shopify page type so Admin “Pages” works
  const pageType = () => {
    const raw = (window.meta && window.meta.page?.pageType) || "";
    const t = String(raw).toLowerCase();
    if (t === "index" || t === "frontpage" || t === "home") return "home";
    if (t === "page") return "pages";
    return t || "allpage";
  };
  const currHandle = () =>
    (window.meta && window.meta.product?.handle) || "";

  const BREAKPOINT = 750,
    isMobile = () => window.innerWidth <= BREAKPOINT;

  const mobileTokens = (s) => {
    s = (s || "comfortable").toLowerCase();
    if (s === "compact")
      return { w: "min(92vw,340px)", pad: 10, img: 46, rad: 16, fs: 13 };
    if (s === "large")
      return { w: "min(92vw,420px)", pad: 14, img: 60, rad: 18, fs: 15 };
    return { w: "min(92vw,390px)", pad: 12, img: 54, rad: 16, fs: 14 };
  };
  const normMB = (v, fb = "bottom") => {
    v = String(v || "").trim().toLowerCase();
    return v === "top" || v === "bottom" ? v : fb;
  };
  const toNum = (v, fb = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };
  const unitToSeconds = (value, unit) => {
    const n = Math.max(0, toNum(value, 0));
    const u = String(unit || "seconds").toLowerCase();
    if (u.startsWith("hour")) return Math.round(n * 3600);
    if (u.startsWith("min")) return Math.round(n * 60);
    return Math.round(n);
  };
  const formatProductName = (name, mode, limit) => {
    const raw = String(name || "").trim();
    if (!raw) return "";
    if (String(mode || "").toLowerCase() !== "half") return raw;
    const lim = Math.max(1, Math.min(60, parseInt(limit || "15", 10) || 15));
    if (raw.length <= lim) return raw;
    return `${raw.slice(0, lim).trimEnd()}...`;
  };
  const applyTokens = (tpl, tokens) =>
    String(tpl || "").replace(/\{(\w+)\}/g, (m, k) =>
      tokens[k] !== undefined && tokens[k] !== null ? String(tokens[k]) : m
    );
  const gapSeconds = (cfg) => {
    const base = Math.max(0, Number(cfg?.alternateSeconds ?? 0));
    if (!base) return 0;
    if (cfg?.randomize === true || String(cfg?.randomize) === "true") {
      const jitter = 0.5 + Math.random(); // 0.5x .. 1.5x
      return Math.max(1, Math.round(base * jitter));
    }
    return base;
  };
  const currCollectionHandle = () => {
    const raw =
      (window.meta && window.meta.collection && window.meta.collection.handle) ||
      "";
    if (raw) return raw;
    const m = window.location.pathname.match(/\/collections\/([^/?#]+)/i);
    return m?.[1] ? decodeURIComponent(m[1]) : "";
  };
  const mobilePosFromDesktop = (pos) =>
    String(pos || "").toLowerCase().includes("top") ? "top" : "bottom";
  const matchesVisibility = (cfg, page) => {
    const showHome = toBool(cfg?.showHome, false);
    const showProduct = toBool(cfg?.showProduct, false);
    const showCollectionList = toBool(cfg?.showCollectionList, false);
    const showCollection = toBool(cfg?.showCollection, false);
    const showCart = toBool(cfg?.showCart, false);
    const any =
      showHome || showProduct || showCollectionList || showCollection || showCart;
    if (!any) return true;
    if (page === "home") return showHome;
    if (page === "product") return showProduct;
    if (page === "collection")
      return showCollection || showCollectionList;
    if (page === "cart") return showCart;
    return true;
  };

  const parseList = (raw) => {
    if (Array.isArray(raw)) return raw;
    try {
      const v = JSON.parse(raw ?? "[]");
      return Array.isArray(v) ? v : v ? [v] : [];
    } catch {
      return raw ? [raw] : [];
    }
  };
  const parseProductList = (raw) => {
    const arr = parseList(raw);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  };
  const parseProductBuckets = (rawOrRow) => {
    // New schema: dedicated columns for data and visibility selections.
    if (
      rawOrRow &&
      typeof rawOrRow === "object" &&
      !Array.isArray(rawOrRow) &&
      ("selectedDataProductsJson" in rawOrRow ||
        "selectedVisibilityProductsJson" in rawOrRow ||
        "selectedProductsJson" in rawOrRow)
    ) {
      const dataProducts = parseProductList(
        rawOrRow.selectedDataProductsJson ?? rawOrRow.selectedProductsJson
      );
      const visibilityProducts = parseProductList(
        rawOrRow.selectedVisibilityProductsJson ?? rawOrRow.selectedProductsJson
      );
      return {
        dataProducts,
        visibilityProducts: visibilityProducts.length
          ? visibilityProducts
          : dataProducts,
      };
    }

    let decoded = rawOrRow;
    if (typeof rawOrRow === "string") {
      try {
        decoded = JSON.parse(rawOrRow);
      } catch {
        decoded = rawOrRow;
      }
    }

    if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
      const dataProducts = parseProductList(
        decoded.dataProducts ?? decoded.products ?? decoded.selectedProducts
      );
      const visibilityProducts = parseProductList(
        decoded.visibilityProducts ?? decoded.visibility ?? decoded.showOnProducts
      );
      return {
        dataProducts,
        visibilityProducts: visibilityProducts.length
          ? visibilityProducts
          : dataProducts,
      };
    }

    const list = parseProductList(decoded);
    return { dataProducts: list, visibilityProducts: list };
  };
  const formatMoney = (cents) => {
    const n = Number(cents);
    if (!Number.isFinite(n)) return String(cents || "");
    if (window.Shopify && typeof window.Shopify.formatMoney === "function") {
      const fmt = window.Shopify.money_format || "${{amount}}";
      return window.Shopify.formatMoney(n, fmt);
    }
    return (n / 100).toFixed(2);
  };

  const cacheKey = (k) =>
    `fomo:v1:${SHOP || window.location.hostname}:${k}`;
  const cache = {
    get(key) {
      try {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (parsed.exp && Date.now() > parsed.exp) {
          window.sessionStorage.removeItem(key);
          return null;
        }
        return parsed.v;
      } catch {
        return null;
      }
    },
    set(key, v, ttlMs) {
      try {
        const exp = ttlMs ? Date.now() + ttlMs : 0;
        window.sessionStorage.setItem(key, JSON.stringify({ v, exp }));
      } catch { }
    },
  };

  const idle = () =>
    new Promise((r) => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => r(), { timeout: 1200 });
      } else {
        setTimeout(r, 350);
      }
    });

  const VISITOR_ID_KEY = cacheKey("visitor-id");
  function ensureVisitorId() {
    const mk = () =>
      `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const existing = window.localStorage.getItem(VISITOR_ID_KEY);
      if (existing) return existing;
      const fresh = mk();
      window.localStorage.setItem(VISITOR_ID_KEY, fresh);
      return fresh;
    } catch {
      return mk();
    }
  }

  function productHandleFromUrl(raw) {
    const value = safe(raw, "");
    if (!value) return "";
    try {
      const u = new URL(value, window.location.origin);
      const m = u.pathname.match(/\/products\/([^/?#]+)/i);
      return m?.[1] ? decodeURIComponent(m[1]) : "";
    } catch {
      const m = String(value).match(/\/products\/([^/?#]+)/i);
      return m?.[1] ? decodeURIComponent(m[1]) : "";
    }
  }

  function sendTrack(payload) {
    if (!SHOP || !payload || !payload.eventType || !payload.popupType) return;
    if (toBool(window.Shopify?.designMode)) return;

    const body = JSON.stringify({
      ...payload,
      shop: SHOP,
      visitorId: ensureVisitorId(),
      pagePath: safe(window.location.pathname, "/"),
      sourceUrl: safe(window.location.href, ""),
      productHandle: payload.productHandle || productHandleFromUrl(payload.productUrl),
      ts: new Date().toISOString(),
    });

    fetchWithProxyFallback(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => { });
  }

  async function fetchJson(url, key, ttlMs) {
    const k = key ? cacheKey(key) : null;
    if (k) {
      const cached = cache.get(k);
      if (cached) return cached;
    }
    try {
      const r = await fetchWithProxyFallback(url, {
        headers: { "Content-Type": "application/json" },
      });
      if (!r) return null;
      if (!r.ok) return null;
      const data = await r.json();
      if (k) cache.set(k, data, ttlMs);
      return data;
    } catch {
      return null;
    }
  }

  // Animation durations (ms)
  function getAnimDur(cfg) {
    const sp = String(cfg?.animationSpeed || "normal").toLowerCase();
    const custom = Number(cfg?.animationMs || 0);
    if (custom > 0) return { in: custom, out: Math.round(custom * 0.75) };

    if (sp === "slow") return { in: 600, out: 420 };
    if (sp === "fast") return { in: 260, out: 200 };
    return { in: 480, out: 320 };
  }

  // ── HIDE-FLAGS from namesJson ─────────────────────────────
  function normHideKey(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\s_\-]+/g, "")
      .replace(/[^a-z]/g, "");
  }
  function flagsFromNamesJson(raw) {
    const arr = Array.isArray(raw)
      ? raw
      : (() => {
        try {
          const v = JSON.parse(raw ?? "[]");
          return Array.isArray(v) ? v : v ? [v] : [];
        } catch {
          return raw ? [raw] : [];
        }
      })();
    const set = new Set(arr.map(normHideKey));
    const has = (...keys) => keys.some((k) => set.has(k));
    return {
      hideName: has("customername", "name"),
      hideCity: has("city"),
      hideState: has("state", "province"),
      hideCountry: has("country"),
      hideProductTitle: has("productname", "producttitle"),
      hideProductImage: has("productimage", "image"),
      hideTime: has("ordertime", "time"),
    };
  }

  // ── Parse location parts (string | object | JSON) ─────────
  function normalizeLocationField(raw) {
    if (raw === undefined || raw === null) return "";
    if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      const s = String(raw).trim();
      if (!s || s === "[object Object]") return "";
      return s;
    }
    if (Array.isArray(raw)) {
      return raw.map(normalizeLocationField).filter(Boolean).join(" ");
    }
    if (typeof raw === "object") {
      for (const key of ["value", "name", "label", "text", "title"]) {
        const candidate = raw?.[key];
        if (
          typeof candidate === "string" &&
          candidate.trim() &&
          candidate !== "[object Object]"
        ) {
          return candidate.trim();
        }
      }
      for (const candidate of Object.values(raw)) {
        if (
          typeof candidate === "string" &&
          candidate.trim() &&
          candidate !== "[object Object]"
        ) {
          return candidate.trim();
        }
      }
    }
    return "";
  }

  function parseLocationParts(entry) {
    if (!entry) return { city: "", state: "", country: "" };
    if (typeof entry === "object") {
      return {
        city: normalizeLocationField(entry.city),
        state: normalizeLocationField(entry.state ?? entry.province),
        country: normalizeLocationField(entry.country),
      };
    }
    try {
      const o = JSON.parse(String(entry));
      if (o && typeof o === "object") return parseLocationParts(o);
    } catch { }
    const s = String(entry);
    if (!s || s === "[object Object]")
      return { city: "", state: "", country: "" };
    const parts = s
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { city: parts[0] || "", state: parts[1] || "", country: parts[2] || "" };
  }
  const formatLocationEntry = (entry) => {
    const { city, state, country } = parseLocationParts(entry);
    return [city, state, country].filter(Boolean).join(", ");
  };

  function normalizeCustomer(entry) {
    if (!entry || typeof entry !== "object") return null;
    const first = safe(entry.first_name || entry.firstName, "").trim();
    const last = safe(entry.last_name || entry.lastName, "").trim();
    const full = first || last ? `${first} ${last}`.trim() : "";
    const addr =
      entry.default_address || entry.defaultAddress || entry.address || {};
    const city = safe(addr.city, "").trim();
    const state = safe(addr.province || addr.state, "").trim();
    const country = safe(addr.country, "").trim();
    if (!full && !city && !country) return null;
    return { first_name: first, last_name: last, full_name: full, city, state, country };
  }

  function pickCustomer(pool, i) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    if (pool.length === 1) return pool[0];
    const idx = typeof i === "number" ? i % pool.length : 0;
    return pool[idx] || pool[Math.floor(Math.random() * pool.length)];
  }

  // 🔹 central helper to derive city/state/country from multiple sources
  function deriveLocationParts(cfg) {
    // 1) Direct fields on cfg
    let city = normalizeLocationField(cfg.city);
    let state = normalizeLocationField(cfg.state);
    let country = normalizeLocationField(cfg.country);

    if (city || state || country) {
      return { city, state, country };
    }

    // 2) From cfg.location (string/object/JSON)
    if (cfg.location) {
      const fromLoc = parseLocationParts(cfg.location);
      if (fromLoc.city || fromLoc.state || fromLoc.country) {
        return fromLoc;
      }
    }

    // 3) From rawLocations JSON coming from DB
    if (cfg.rawLocations) {
      const list = parseList(cfg.rawLocations);
      if (Array.isArray(list) && list.length) {
        const fromRaw = parseLocationParts(list[0]);
        if (fromRaw.city || fromRaw.state || fromRaw.country) {
          return fromRaw;
        }
      }
    }

    return { city: "", state: "", country: "" };
  }

  // ---- randomize helpers ----
  const randInt = (n) => Math.floor(Math.random() * n);
  const shuffled = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  function pickSmart(list, i, fb = "") {
    if (!Array.isArray(list) || list.length === 0) return fb;
    if (list.length === 1) return safe(list[0], fb);
    if (typeof i === "number") {
      const v = list[i % list.length];
      if (v !== undefined && v !== null && String(v).trim() !== "")
        return safe(v, fb);
    }
    let tries = 0,
      v = "";
    while (tries < 7 && (!v || String(v).trim() === "")) {
      v = list[Math.floor(Math.random() * list.length)];
      tries++;
    }
    return safe(v, fb);
  }
  function pickRaw(list, i, fb = "") {
    if (!Array.isArray(list) || list.length === 0) return fb;
    if (typeof i !== "number") i = 0;
    const idx = ((i % list.length) + list.length) % list.length;
    const v = list[idx];
    return v === undefined || v === null ? fb : v;
  }

  // ---- SVG helpers ----
  function svgToDataUrl(svgRaw) {
    if (!svgRaw || typeof svgRaw !== "string") return "";
    const cleaned = svgRaw.replace(/^\uFEFF/, "").trim();
    if (!/^<svg[\s\S]*<\/svg>$/i.test(cleaned)) return "";
    return "data:image/svg+xml;utf8," + encodeURIComponent(cleaned);
  }
  function tryAnySvg(s) {
    if (!s) return "";
    if (/^<svg/i.test(s)) return svgToDataUrl(s);
    if (String(s).startsWith("data:image/svg+xml")) return s;
    try {
      const dec = atob(String(s));
      if (/^<svg/i.test(dec)) return svgToDataUrl(dec);
    } catch { }
    return "";
  }
  function resolveIconForIndex(it, i = 0) {
    const iconsArr = parseList(it.iconsJson);
    if (iconsArr.length) {
      const pick = pickSmart(iconsArr, i, "");
      const svg = tryAnySvg(pick);
      if (svg) return svg;
      if (pick) return pick;
    }
    const svg1 = tryAnySvg(it.iconSvg);
    if (svg1) return svg1;
    if (it.iconUrl) return it.iconUrl;
    if (it.imageUrl) return it.imageUrl;
    return "";
  }

  const FLAME_SVG =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="%23ffb02e" d="M31 4c5 8-3 13 3 19s11-5 11-5c6 15 3 19-1 23-4 4-8 6-13 6s-12-3-14-9c-2-6 1-12 7-17c4-3 6-7 7-17z"/><path fill="%23ef4545" d="M39 33c1 6-4 9-8 9s-10-3-9-9c1-6 7-8 9-14c3 6 7 8 8 14z"/><circle cx="32" cy="44" r="3" fill="%23000"/></svg>';

  // ======= date + time helpers =======
  const toDate = (v) => {
    try {
      return new Date(v);
    } catch {
      return null;
    }
  };
  const withinDays = (iso, days) => {
    const d = toDate(iso);
    if (!d) return false;
    const now = Date.now();
    const ms = days * 24 * 60 * 60 * 1000;
    return now - d.getTime() <= ms && d.getTime() <= now;
  };
  const relTime = (iso) => {
    const d = toDate(iso);
    if (!d) return "";
    const diff = Math.max(0, Date.now() - d.getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const dd = Math.floor(h / 24);
    if (dd < 7) return `${dd}d ago`;
    const wk = Math.floor(dd / 7);
    if (wk < 4) return `${wk}w ago`;
    const mo = Math.floor(dd / 30);
    return mo < 12 ? `${mo}mo ago` : `${Math.floor(dd / 365)}y ago`;
  };
  const relDaysAgo = (iso) => {
    const d = toDate(iso);
    if (!d || Number.isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    if (diff <= 0) return "Just Now";

    const mins = Math.floor(diff / (60 * 1000));
    if (mins < 60) {
      const m = Math.max(1, mins);
      return `${m} Minute${m === 1 ? "" : "s"} Ago`;
    }

    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 24) {
      return `${hours} Hour${hours === 1 ? "" : "s"} Ago`;
    }

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} Day${days === 1 ? "" : "s"} Ago`;
  };
  const pad2 = (n) => String(n).padStart(2, "0");
  const formatAbs = (isoOrDate) => {
    const d = isoOrDate instanceof Date ? isoOrDate : toDate(isoOrDate);
    if (!d) return "";
    return `${pad2(d.getDate())}/${pad2(
      d.getMonth() + 1
    )}/${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(
      d.getMinutes()
    )}:${pad2(d.getSeconds())}`;
  };

  // keyframes (once) — includes direction-aware slides
  if (!document.getElementById("kf-fomo-onefile")) {
    const st = document.createElement("style");
    st.id = "kf-fomo-onefile";
    st.textContent = `
      /* Fade */
      @keyframes fFadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes fFadeOut { from{opacity:1} to{opacity:0; transform:translateY(6px) scale(.98)} }

      /* Bounce */
      @keyframes fBounceIn {
        0%{opacity:0; transform:translateY(18px) scale(.98)}
        60%{opacity:1; transform:translateY(-6px) scale(1.02)}
        100%{transform:translateY(0) scale(1)}
      }
      @keyframes fBounceOut { to{opacity:0; transform:translateY(8px) scale(.98)} }

      /* Zoom */
      @keyframes fZoomIn  { from{opacity:0; transform:scale(.94)} to{opacity:1; transform:scale(1)} }
      @keyframes fZoomOut { to{opacity:0; transform:scale(.96)} }

      /* SLIDE — desktop (horizontal) */
      @keyframes fSlideInFromLeft   { from{opacity:0; transform:translateX(-110%)} to{opacity:1; transform:translateX(0)} }
      @keyframes fSlideOutToLeft    { to{opacity:0; transform:translateX(-110%)} }
      @keyframes fSlideInFromRight  { from{opacity:0; transform:translateX(110%)}  to{opacity:1; transform:translateX(0)} }
      @keyframes fSlideOutToRight   { to{opacity:0; transform:translateX(110%)} }

      /* SLIDE — mobile (vertical) */
      @keyframes fSlideInFromTop    { from{opacity:0; transform:translateY(-110%)} to{opacity:1; transform:translateY(0)} }
      @keyframes fSlideOutToTop     { to{opacity:0; transform:translateY(-110%)} }
      @keyframes fSlideInFromBottom { from{opacity:0; transform:translateY(110%)}  to{opacity:1; transform:translateY(0)} }
      @keyframes fSlideOutToBottom  { to{opacity:0; transform:translateY(110%)} }

      /* Progress bar */
      @keyframes fomoProgress { from{width:100%} to{width:0%} }
    `;
    document.head.appendChild(st);
  }

  /* ========== positions & animation selection ========== */
  function deskSide(cfg) {
    const p = String(cfg.positionDesktop || cfg.position || "bottom-left").toLowerCase();
    return p.includes("right") ? "right" : "left";
  }
  function getAnimPair(cfg, mode) {
    const a = String(cfg?.animation || "").toLowerCase();
    if (a === "slide") {
      if (mode === "desktop") {
        if (deskSide(cfg) === "right")
          return { inAnim: "fSlideInFromRight", outAnim: "fSlideOutToRight" };
        return { inAnim: "fSlideInFromLeft", outAnim: "fSlideOutToLeft" };
      }
      const mp = normMB(cfg.mobilePosition || cfg.positionMobile || "bottom");
      if (mp === "top")
        return { inAnim: "fSlideInFromTop", outAnim: "fSlideOutToTop" };
      return {
        inAnim: "fSlideInFromBottom",
        outAnim: "fSlideOutToBottom",
      };
    }
    if (a === "bounce") return { inAnim: "fBounceIn", outAnim: "fBounceOut" };
    if (a === "zoom") return { inAnim: "fZoomIn", outAnim: "fZoomOut" };
    return { inAnim: "fFadeIn", outAnim: "fFadeOut" }; // default
  }
  function posDesktop(el, cfg) {
    el.style.top = el.style.right = el.style.bottom = el.style.left = "";
    const p = (cfg.positionDesktop || cfg.position || "bottom-left").toLowerCase();
    if (p === "bottom-right") {
      el.style.bottom = "20px";
      el.style.right = "20px";
    } else if (p === "top-left") {
      el.style.top = "20px";
      el.style.left = "20px";
    } else if (p === "top-right") {
      el.style.top = "20px";
      el.style.right = "20px";
    } else {
      el.style.bottom = "20px";
      el.style.left = "20px";
    }
  }
  function posMobile(el, cfg) {
    el.style.top = el.style.right = el.style.bottom = el.style.left = "";
    const p = normMB(cfg.mobilePosition || cfg.positionMobile || "bottom");
    if (p === "top")
      el.style.top = "calc(16px + env(safe-area-inset-top,0px))";
    else el.style.bottom = "calc(16px + env(safe-area-inset-bottom,0px))";
    el.style.left = "0";
    el.style.right = "0";
    el.style.margin = "0 auto";
  }

  /* ========== FLASH renderer ========== */
  function renderFlash(cfg, mode, onDone) {
    const mt = mobileTokens(cfg.mobileSize);
    const visibleSec =
      Number(cfg.durationSeconds ?? cfg.visibleSeconds ?? 6) || 6;
    const visibleMs = Math.max(1, visibleSec) * 1000;
    const { inAnim, outAnim } = getAnimPair(cfg, mode);
    const DUR = getAnimDur(cfg);
    const bgFlash =
      String(cfg.template || "solid").toLowerCase() === "gradient"
        ? `linear-gradient(135deg, ${cfg.bgColor || "#111"} 0%, ${cfg.bgAlt || cfg.bgColor || "#111"} 100%)`
        : cfg.bgColor || "#111";

    const wrap = document.createElement("div");
    wrap.className = "fomo-flash";
    wrap.style.cssText = `
      position:fixed; z-index:9999; box-sizing:border-box;
      width:${mode === "mobile" ? mt.w : ""}; overflow:${imageOverflow ? "visible" : "hidden"}; cursor:pointer;
      border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
      background:${bgFlash}; color:${cfg.fontColor || "#fff"};
      box-shadow:0 10px 30px rgba(0,0,0,.12);
      font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
      animation:${inAnim} ${DUR.in}ms ease-out both;
    `;
    (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

    const card = document.createElement("div");
    card.className = "fomo-card";
    card.style.cssText = `
      display:flex; gap:12px; align-items:center; position:relative;
      padding:${mode === "mobile" ? mt.pad : 12}px 44px ${mode === "mobile" ? mt.pad : 12
      }px 14px;
      font-size:${Number(cfg.baseFontSize) || (mode === "mobile" ? mt.fs : 14)
      }px; line-height:1.35;
    `;

    const img = document.createElement("img");
    img.className = "fomo-icon";
    img.alt = "Flash";
    img.src = cfg.uploadedImage || cfg.image || FLAME_SVG;
    const iSize = mode === "mobile" ? mt.img : 58,
      iRad = mode === "mobile" ? Math.round(mt.img * 0.17) : 12;
    img.style.cssText = `width:${iSize}px;height:${iSize}px;object-fit:${cfg.imageAppearance || "cover"};border-radius:${iRad}px;background:transparent;flex:0 0 ${iSize}px;pointer-events:none;`;
    img.onerror = () => {
      img.src = FLAME_SVG;
    };

    const body = document.createElement("div");
    body.className = "fomo-body";
    body.style.cssText = `flex:1;min-width:0;pointer-events:none;`;

    const ttl = document.createElement("div");
    ttl.className = "fomo-title";
    ttl.textContent = safe(cfg.title, "");
    ttl.style.cssText = `font-weight:${safe(
      cfg.fontWeight,
      "700"
    )}; color:${cfg.titleColor || "inherit"}; margin-bottom:4px;`;
    body.appendChild(ttl); // ✅ fixed typo

    const locLine = document.createElement("div");
    locLine.className = "fomo-locline";
    locLine.style.cssText =
      "opacity:.95;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;";

    const loc = document.createElement("span");
    loc.className = "fomo-location";
    loc.textContent = safe(cfg.location, "");
    locLine.appendChild(loc);

    const tmtVal = safe(cfg.timeText, "");
    if (tmtVal) {
      const sep = document.createElement("span");
      sep.textContent = "—";
      sep.style.opacity = ".6";
      sep.setAttribute("aria-hidden", "true");
      const tmt = document.createElement("span");
      tmt.className = "fomo-time";
      tmt.textContent = tmtVal;
      tmt.style.cssText = `font-size:${Math.max(
        10,
        (Number(cfg.baseFontSize) || 14) - 1
      )}px; opacity:.8;`;
      locLine.appendChild(sep);
      locLine.appendChild(tmt);
    }
    body.appendChild(locLine);

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";
    close.className = "fomo-close";
    close.style.cssText = `position:absolute;top:6px;right:10px;border:0;background:transparent;color:inherit;font-size:18px;line-height:1;padding:4px;cursor:pointer;opacity:.55;transition:.15s;z-index:1;`;
    close.onmouseenter = () => (close.style.opacity = "1");
    close.onmouseleave = () => (close.style.opacity = ".8");

    card.appendChild(imgWrap);
    card.appendChild(body);
    card.appendChild(close);
    wrap.appendChild(card);

    const barWrap = document.createElement("div");
    barWrap.className = "fomo-progress-wrap";
    barWrap.style.cssText = `height:4px;width:100%;background:transparent`;
    const bar = document.createElement("div");
    bar.className = "fomo-progress";
    const progCol =
      cfg.progressColor || cfg.titleColor || cfg.fontColor || "#22c55e";
    bar.style.cssText = `height:100%;width:100%;background:${progCol};animation:fomoProgress ${visibleMs}ms linear forwards;transform-origin:left;`;
    barWrap.appendChild(bar);
    wrap.appendChild(barWrap);

    wrap.addEventListener("click", (e) => {
      if (e.target === close) return;
      sendTrack({
        eventType: "click",
        popupType: "flash",
        productUrl: cfg.productUrl,
      });
      if (cfg.productUrl) window.location.href = cfg.productUrl;
    });

    let tid = setTimeout(autoClose, visibleMs);
    function autoClose() {
      wrap.style.animation = `${outAnim} ${DUR.out}ms ease-in forwards`;
      setTimeout(() => {
        wrap.remove();
        onDone && onDone("auto");
      }, DUR.out + 20);
    }
    close.onclick = (e) => {
      e.stopPropagation();
      clearTimeout(tid);
      autoClose();
      onDone && onDone("closed");
    };

    document.body.appendChild(wrap);
    sendTrack({
      eventType: "view",
      popupType: "flash",
      productUrl: cfg.productUrl,
    });
    return wrap;
  }


  /* ========== RECENT renderer (granular hide) ========== */
  function renderRecent(cfg, mode, onDone) {
    const mt = mobileTokens(cfg.mobileSize);
    const visibleSec =
      Number(cfg.durationSeconds ?? cfg.visibleSeconds ?? 6) || 6;
    const visibleMs = Math.max(1, visibleSec) * 1000;
    const theAnim = getAnimPair(cfg, mode);
    const { inAnim, outAnim } = theAnim;
    const DUR = getAnimDur(cfg);
    const ACCENT = cfg.accentColor || cfg.titleColor || "#6C63FF";
    const bgRecent =
      String(cfg.template || "solid").toLowerCase() === "gradient"
        ? `linear-gradient(135deg, ${cfg.bgColor || "#ffffff"} 0%, ${cfg.bgAlt || cfg.bgColor || "#ffffff"} 100%)`
        : cfg.bgColor || "#ffffff";

    // Product title helper (legacy 2-word fallback)
    function shortProductTitle(title, wordCount = 2) {
      const t = String(title || "").trim().replace(/\s+/g, " ");
      if (!t) return "";
      const parts = t.split(" ");
      if (parts.length <= wordCount) return t;
      return parts.slice(0, wordCount).join(" ") + "...";
    }

    const isPortrait =
      String(cfg.layout || "landscape").toLowerCase() === "portrait";
    const imageFit =
      String(cfg.imageAppearance || "cover").toLowerCase() === "contain"
        ? "contain"
        : "cover";
    const showImage = !cfg.hideProductImage;
    const imageOverflow = imageFit === "cover" && !isPortrait && showImage;
    const pad = mode === "mobile" ? mt.pad : 12;
    const rightPad = 44;
    const iSize = mode === "mobile" ? mt.img : 50;
    const iRad = Math.round(iSize * 0.18);
    const iOffset = Math.round(iSize * 0.45);
    const leftPad = imageOverflow ? pad + iOffset : pad;

    const wrap = document.createElement("div");
    wrap.style.cssText = `
    position:fixed; z-index:9999; box-sizing:border-box;
    width:${mode === "mobile" ? mt.w : ""}; overflow:${imageOverflow ? "visible" : "hidden"}; cursor:pointer;
    border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
    background:${bgRecent}; color:${cfg.fontColor || "#111"};
    box-shadow:0 10px 30px rgba(0,0,0,.12);
    font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
    animation:${inAnim} ${DUR.in}ms ease-out both;
  `;
    (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

    const card = document.createElement("div");
    card.style.cssText = `
    display:flex; gap:12px; align-items:flex-start; position:relative;
    padding:${pad}px ${rightPad}px ${pad}px ${leftPad}px;
    font-size:${Number(cfg.baseFontSize) || (mode === "mobile" ? mt.fs : 14)}px; line-height:1.35;
  `;

    const img = document.createElement("img");
    img.src = cfg.uploadedImage || cfg.image || "";
    img.alt = safe(cfg.productTitle, "Product");
    img.style.cssText = `width:100%;height:100%;object-fit:${imageFit};`;
    img.onerror = () => {
      imgWrap.style.display = "none";
    };

    const imgWrap = document.createElement("div");
    if (imageOverflow) {
      imgWrap.style.cssText = `
        position:absolute;
        left:${pad}px;
        top:50%;
        transform:translate(-50%, -50%);
        width:${iSize}px;height:${iSize}px;
        border-radius:${iRad}px;overflow:hidden;background:#f3f4f6;
        box-shadow:0 8px 18px rgba(0,0,0,0.18);
        border:2px solid rgba(255,255,255,0.75);
        display:${showImage ? "grid" : "none"};
        place-items:center;pointer-events:none;
      `;
    } else {
      imgWrap.style.cssText = `
        width:${iSize}px;height:${iSize}px;
        border-radius:${iRad}px;overflow:hidden;background:#f3f4f6;
        flex:0 0 ${iSize}px;display:${showImage ? "grid" : "none"};
        place-items:center;pointer-events:none;
        box-shadow:0 6px 14px rgba(0,0,0,0.12);
        border:1px solid rgba(15,23,42,0.08);
      `;
    }
    imgWrap.appendChild(img);

    const body = document.createElement("div");
    body.style.cssText = `flex:1;min-width:0;pointer-events:none;`;

    // Name + granular location
    const line1 = document.createElement("div");
    line1.style.cssText = `margin:0 0 2px 0;`;
    const fw = safe(cfg.fontWeight, "700");
    const nameText = cfg.hideName ? "" : safe(cfg.name, "Someone");

    // derived location
    const derived = deriveLocationParts(cfg);
    let cityText = derived.city;
    let stateText = derived.state;
    let countryText = derived.country;

    const locParts = [];
    if (!cfg.hideCity && cityText) locParts.push(cityText);
    if (!cfg.hideState && stateText) locParts.push(stateText);
    if (!cfg.hideCountry && countryText) locParts.push(countryText);

    let locFinal = locParts.join(", ");
    const anyLocHide = cfg.hideCity || cfg.hideState || cfg.hideCountry;

    if (!locFinal && !anyLocHide && cfg.location) {
      const fromLocation = formatLocationEntry(cfg.location);
      if (fromLocation && fromLocation !== "[object Object]") {
        locFinal = fromLocation;
      }
    }

    if (nameText || locFinal) {
      const nameHtml = nameText
        ? `<span style="font-weight:${fw};color:${ACCENT};">${nameText}</span>`
        : "";
      const locHtml = locFinal
        ? `<span style="font-weight:${fw};color:${ACCENT};">${locFinal}</span>`
        : "";
      const spacer = nameText && locFinal ? " from " : "";
      line1.innerHTML = `${nameHtml}${spacer}${locHtml}`;
      body.appendChild(line1);
    }

    // Product line
    const line2 = document.createElement("div");
    const msgTxt = safe(cfg.message, "recently bought");

    // ✅ Use only first 2 words of productTitle
    const rawTitle = safe(cfg.productTitle, "");
    const shortTitle =
      cfg.productNameMode || cfg.productNameLimit
        ? formatProductName(rawTitle, cfg.productNameMode, cfg.productNameLimit)
        : shortProductTitle(rawTitle, 2);

    const boughtTxt = cfg.hideProductTitle
      ? "placed an order"
      : `${msgTxt} ${shortTitle
        ? `&ldquo;${safe(shortTitle, "")}&rdquo;`
        : "this product"
      }`;

    line2.innerHTML = boughtTxt;
    line2.style.cssText = `opacity:.95;margin:0 0 6px 0;`;
    body.appendChild(line2);

    // Time
    if (!cfg.hideTime) {
      const line3 = document.createElement("div");
      const orderDaysText = relDaysAgo(cfg.createOrderTime);
      line3.textContent =
        orderDaysText ||
        safe(cfg.createOrderTime, "") ||
        safe(cfg.timeAbsolute, "") ||
        safe(cfg.timeText, "");
      line3.style.cssText = `font-size:${Math.max(
        10,
        (Number(cfg.baseFontSize) || 14) - 1
      )}px;opacity:.7;`;
      body.appendChild(line3);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";
    close.style.cssText = `position:absolute;top:6px;right:10px;border:0;background:transparent;color:inherit;font-size:18px;line-height:1;padding:4px;cursor:pointer;opacity:.55;transition:.15s;z-index:1;`;
    close.onmouseenter = () => (close.style.opacity = "1");
    close.onmouseleave = () => (close.style.opacity = ".8");

    card.appendChild(imgWrap);
    card.appendChild(body);
    card.appendChild(close);
    wrap.appendChild(card);

    const barWrap = document.createElement("div");
    barWrap.style.cssText = `height:4px;width:100%;background:transparent`;
    const bar = document.createElement("div");
    bar.style.cssText = `height:100%;width:100%;background:${cfg.progressColor || ACCENT
      };animation:fomoProgress ${visibleMs}ms linear forwards;transform-origin:left;`;
    barWrap.appendChild(bar);
    wrap.appendChild(barWrap);

    wrap.addEventListener("click", (e) => {
      if (e.target === close) return;
      sendTrack({
        eventType: "click",
        popupType: "recent",
        productUrl: cfg.productUrl,
      });
      if (cfg.productUrl) window.location.href = cfg.productUrl;
    });

    let tid = setTimeout(autoClose, visibleMs);
    function autoClose() {
      wrap.style.animation = `${outAnim} ${DUR.out}ms ease-in forwards`;
      setTimeout(() => {
        wrap.remove();
        onDone && onDone("auto");
      }, DUR.out + 20);
    }
    close.onclick = (e) => {
      e.stopPropagation();
      clearTimeout(tid);
      autoClose();
      onDone && onDone("closed");
    };

    document.body.appendChild(wrap);
    sendTrack({
      eventType: "view",
      popupType: "recent",
      productUrl: cfg.productUrl,
    });
    return wrap;
  }

  /* ========== GENERIC product popup renderer (visitor/lowstock/addtocart/review) ========== */
  function renderProductPopup(cfg, mode, onDone) {
    const visibleSec =
      Number(cfg.durationSeconds ?? cfg.visibleSeconds ?? 6) || 6;
    const visibleMs = Math.max(1, visibleSec) * 1000;
    const { inAnim, outAnim } = getAnimPair(cfg, mode);
    const DUR = getAnimDur(cfg);

    const hasSize = cfg.size !== undefined && cfg.size !== null && cfg.size !== "";
    const hasTransparency =
      cfg.transparent !== undefined && cfg.transparent !== null && cfg.transparent !== "";
    const sizeScale = hasSize
      ? 0.8 + (Math.max(0, Math.min(100, Number(cfg.size))) / 100) * 0.4
      : 1;
    const opacity = hasTransparency
      ? 1 -
        (Math.max(0, Math.min(100, Number(cfg.transparent))) / 100) * 0.7
      : 1;
    const isPortrait =
      String(cfg.layout || "landscape").toLowerCase() === "portrait";

    const bg =
      String(cfg.template || "solid").toLowerCase() === "gradient"
        ? `linear-gradient(135deg, ${cfg.bgColor || "#ffffff"} 0%, ${cfg.bgAlt || cfg.bgColor || "#ffffff"} 100%)`
        : cfg.bgColor || "#ffffff";

    const baseFont = Number(cfg.textSizeContent) || (mode === "mobile" ? 13 : 14);
    const fontSize = Math.max(11, Math.round(baseFont));
    const imageFit =
      String(cfg.imageAppearance || "cover").toLowerCase() === "contain"
        ? "contain"
        : "cover";
    const imageOverflow =
      imageFit === "cover" && !isPortrait && cfg.showProductImage !== false;
    const pad = Math.round(
      imageOverflow
        ? mode === "mobile"
          ? 14
          : 16
        : mode === "mobile"
          ? 12
          : 14
    );
    const gap = Math.round(mode === "mobile" ? 10 : 12);
    const imgSize = Math.round((mode === "mobile" ? 56 : 64));
    const imgOffset = Math.round(imgSize * 0.45);
    const inlineSize = isPortrait ? 56 : imgSize;

    const posKey = String(cfg.positionDesktop || cfg.position || "bottom-left").toLowerCase();
    const originX = posKey.includes("right") ? "right" : "left";
    const originY = posKey.includes("top") ? "top" : "bottom";
    const transformOrigin = `${originY} ${originX}`;

    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position:fixed; z-index:9999; box-sizing:border-box;
      width:${mode === "mobile" ? "min(92vw,420px)" : ""};
      overflow:visible; cursor:pointer;
      font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
      animation:${inAnim} ${DUR.in}ms ease-out both;
      transform-origin:${transformOrigin};
    `;
    (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

    const inner = document.createElement("div");
    inner.style.cssText = `
      overflow:${imageOverflow ? "visible" : "hidden"}; opacity:${opacity};
      border-radius:${Math.round(18 * sizeScale)}px;
      background:${bg}; color:${cfg.textColor || "#111"};
      box-shadow:0 10px 30px rgba(0,0,0,.12);
      border:1px solid rgba(0,0,0,0.06);
      transform:scale(${sizeScale});
      transform-origin:${transformOrigin};
      max-width:${isPortrait ? 320 : 460}px;
    `;

    const card = document.createElement("div");
    const leftPad = imageOverflow ? pad + imgOffset : pad;
    const alignItems = isPortrait ? "flex-start" : imageOverflow ? "flex-start" : "center";
    card.style.cssText = `
      display:flex; gap:${gap}px; align-items:${alignItems};
      flex-direction:${isPortrait ? "column" : "row"};
      position:relative; padding:${pad}px;
      font-size:${fontSize}px; line-height:1.35;
      padding-left:${leftPad}px;
    `;

    let imgWrap = null;
    if (imageOverflow) {
      imgWrap = document.createElement("div");
      imgWrap.style.cssText = `
        position:absolute;
        left:${pad}px;
        top:${isPortrait ? 28 : "50%"};
        transform:${isPortrait ? "translate(-50%, 0)" : "translate(-50%, -50%)"};
        width:${imgSize}px;height:${imgSize}px;
        border-radius:${Math.round(imgSize * 0.22)}px;
        overflow:hidden;background:#f3f4f6;
        box-shadow:0 8px 18px rgba(0,0,0,0.18);
        border:2px solid rgba(255,255,255,0.75);
        display:${cfg.showProductImage === false ? "none" : "grid"};
        place-items:center;
        pointer-events:none;
      `;
    } else {
      imgWrap = document.createElement("div");
      imgWrap.style.cssText = `
        width:${inlineSize}px;height:${inlineSize}px;
        border-radius:${Math.round(inlineSize * 0.22)}px;
        overflow:hidden;background:#f3f4f6;
        flex-shrink:0;display:${cfg.showProductImage === false ? "none" : "grid"};
        place-items:center;pointer-events:none;
        box-shadow:0 6px 14px rgba(0,0,0,0.12);
        border:1px solid rgba(15,23,42,0.08);
      `;
    }

    const img = document.createElement("img");
    img.src = cfg.productImage || cfg.image || "";
    img.alt = safe(cfg.productTitle, "Product");
    img.style.cssText = `
      width:100%;height:100%;object-fit:${imageFit};
    `;
    img.onerror = () => {
      imgWrap.style.display = "none";
    };
    imgWrap.appendChild(img);

    const body = document.createElement("div");
    body.style.cssText = `flex:1;min-width:0;pointer-events:none;display:grid;gap:6px;`;

    if (cfg.showRating) {
      const rating = Math.max(
        1,
        Math.min(5, Number(cfg.rating || 4))
      );
      const stars = Array.from({ length: 5 })
        .map((_, i) => (i < rating ? "&#9733;" : "&#9734;"))
        .join("");
      const rate = document.createElement("div");
      rate.innerHTML = stars;
      rate.style.cssText = `color:${cfg.starColor || "#f5a623"};font-size:${Math.max(
        10,
        fontSize - 2
      )}px;letter-spacing:1px;`;
      body.appendChild(rate);
    }

    if (cfg.message) {
      const msg = document.createElement("div");
      msg.style.cssText = `color:${cfg.textColor || "#111"};`;
      const messageText = String(cfg.message || "");
      const productName = String(cfg.productTitle || "").trim();
      const countValue = cfg.stockCountValue ? String(cfg.stockCountValue) : "";
      let templ = messageText;
      if (productName) templ = templ.replace(productName, "__FOMO_PROD__");
      if (countValue) templ = templ.replace(countValue, "__FOMO_COUNT__");
      const parts = templ.split(/(__FOMO_PROD__|__FOMO_COUNT__)/);
      parts.forEach((part) => {
        if (part === "__FOMO_PROD__") {
          const span = document.createElement("span");
          span.textContent = productName;
          if (cfg.productHighlightStyle === "upper") {
            span.style.cssText = "font-weight:700;text-transform:uppercase;";
          } else {
            span.style.cssText = "font-weight:600;text-decoration:underline;";
          }
          msg.appendChild(span);
          return;
        }
        if (part === "__FOMO_COUNT__") {
          const span = document.createElement("span");
          span.textContent = countValue;
          span.style.cssText = `font-weight:700;color:${
            cfg.stockCountColor || cfg.textColor || "#111"
          };`;
          msg.appendChild(span);
          return;
        }
        msg.appendChild(document.createTextNode(part));
      });
      body.appendChild(msg);
    }

    if (cfg.showPriceTag && (cfg.price || cfg.compareAt)) {
      const line = document.createElement("div");
      line.style.cssText = `display:flex;gap:8px;align-items:center;flex-wrap:wrap;`;
      if (cfg.price) {
        const p = document.createElement("span");
        p.textContent = cfg.price;
        p.style.cssText = `
          background:${cfg.priceTagBg || "#111"};
          color:${cfg.priceColor || "#fff"};
          font-size:${Math.max(10, Math.round((Number(cfg.textSizePrice) || fontSize - 2) * sizeScale))}px;
          padding:2px 8px;border-radius:6px;font-weight:600;
        `;
        line.appendChild(p);
      }
      if (cfg.compareAt) {
        const c = document.createElement("span");
        c.textContent = cfg.compareAt;
        c.style.cssText = `
          color:${cfg.priceTagAlt || "#666"};
          font-size:${Math.max(10, Math.round((Number(cfg.textSizeCompareAt) || fontSize - 3) * sizeScale))}px;
          text-decoration:line-through;
        `;
        line.appendChild(c);
      }
      body.appendChild(line);
    }

    if (cfg.timestamp) {
      const ts = document.createElement("div");
      ts.textContent = cfg.timestamp;
      ts.style.cssText = `font-size:${Math.max(10, fontSize - 2)}px;color:${cfg.timestampColor || "rgba(0,0,0,0.6)"};`;
      body.appendChild(ts);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";
    close.style.cssText = `position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:50%;border:1px solid #e5e7eb;background:#ffffff;color:#111827;font-size:16px;line-height:1;padding:0;cursor:pointer;opacity:.9;transition:.15s;z-index:1;`;
    close.onmouseenter = () => (close.style.opacity = "1");
    close.onmouseleave = () => (close.style.opacity = ".8");
    if (cfg.showClose === false) close.style.display = "none";

    card.appendChild(imgWrap);
    card.appendChild(body);
    card.appendChild(close);
    inner.appendChild(card);

    const barWrap = document.createElement("div");
    barWrap.style.cssText = `height:4px;width:100%;background:transparent`;
    const bar = document.createElement("div");
    bar.style.cssText = `height:100%;width:100%;background:${cfg.progressColor || cfg.textColor || "#22c55e"};animation:fomoProgress ${visibleMs}ms linear forwards;transform-origin:left;`;
    barWrap.appendChild(bar);
    inner.appendChild(barWrap);
    wrap.appendChild(inner);

    wrap.addEventListener("click", (e) => {
      if (e.target === close) return;
      sendTrack({
        eventType: "click",
        popupType: cfg.popupType || "recent",
        productUrl: cfg.productUrl,
      });
      if (cfg.productUrl && cfg.directProductPage !== false) {
        window.location.href = cfg.productUrl;
      }
    });

    let tid = setTimeout(autoClose, visibleMs);
    function autoClose() {
      wrap.style.animation = `${outAnim} ${DUR.out}ms ease-in forwards`;
      setTimeout(() => {
        wrap.remove();
        onDone && onDone("auto");
      }, DUR.out + 20);
    }
    close.onclick = (e) => {
      e.stopPropagation();
      clearTimeout(tid);
      autoClose();
      onDone && onDone("closed");
    };

    document.body.appendChild(wrap);
    sendTrack({
      eventType: "view",
      popupType: cfg.popupType || "recent",
      productUrl: cfg.productUrl,
    });
    return wrap;
  }


  /* ========== stream factory ========== */
  function rendererForType(type) {
    switch (type) {
      case "flash":
        return renderFlash;
      case "recent":
        return renderRecent;
      case "visitor":
      case "lowstock":
      case "addtocart":
      case "review":
        return renderProductPopup;
      default:
        return renderRecent;
    }
  }
  function createStream(name, renderer) {
    return {
      name,
      renderer,
      mode: isMobile() ? "mobile" : "desktop",
      seqDesktop: [],
      seqMobile: [],
      t: null,
      idx: 0,
      el: null,
      start(immediate = false) {
        const seq = this.mode === "mobile" ? this.seqMobile : this.seqDesktop;
        if (!seq.length) return;

        const showNext = (delaySec) => {
          this.t = setTimeout(() => {
            const s = this.mode === "mobile" ? this.seqMobile : this.seqDesktop;
            if (!s.length) return;
            const cfg = s[this.idx % s.length];
            this.el = this.renderer(cfg, this.mode, () => {
              const gap = gapSeconds(cfg);
              this.idx = (this.idx + 1) % s.length;
              showNext(gap);
            });
          }, Math.max(0, delaySec) * 1000);
        };

        const firstDelay = immediate
          ? 0
          : Math.max(0, Number(seq[0]?.firstDelaySeconds ?? 0));
        showNext(firstDelay);
      },
      stop() {
        if (this.t) clearTimeout(this.t);
        this.t = null;
        try {
          this.el && this.el.remove();
        } catch { }
      },
      resize() {
        const nm = isMobile() ? "mobile" : "desktop";
        if (nm !== this.mode) {
          this.stop();
          this.mode = nm;
          this.start(true);
        }
      },
    };
  }

  // Combined playlist — alternates items one-by-one
  function createCombinedStream() {
    return {
      mode: "mobile",
      seq: [],
      t: null,
      idx: 0,
      el: null,
      start(immediate = false) {
        if (!this.seq.length) return;

        const showNext = (delaySec) => {
          this.t = setTimeout(() => {
            if (!this.seq.length) return;
            const item = this.seq[this.idx % this.seq.length]; // {type, cfg}
            const renderer = rendererForType(item.type);
            this.el = renderer(item.cfg, "mobile", () => {
              const gap = gapSeconds(item.cfg);
              this.idx = (this.idx + 1) % this.seq.length;
              showNext(gap);
            });
          }, Math.max(0, delaySec) * 1000);
        };

        const firstDelay = immediate
          ? 0
          : Math.max(0, Number(this.seq[0]?.cfg?.firstDelaySeconds ?? 0));
        showNext(firstDelay);
      },
      stop() {
        if (this.t) clearTimeout(this.t);
        this.t = null;
        try {
          this.el && this.el.remove();
        } catch { }
      },
    };
  }

  const Flash = createStream("flash", renderFlash);
  const Recent = createStream("recent", renderRecent);
  const Visitor = createStream("visitor", renderProductPopup);
  const LowStock = createStream("lowstock", renderProductPopup);
  const AddToCart = createStream("addtocart", renderProductPopup);
  const Review = createStream("review", renderProductPopup);
  const Combined = createCombinedStream();

  // ===== THEME EDITOR PREVIEW =====
  const previewEnabled =
    ROOT?.dataset.previewEnabled !== undefined
      ? toBool(ROOT.dataset.previewEnabled)
      : true;
  const designMode =
    toBool(ROOT?.dataset.designMode) || toBool(window.Shopify?.designMode);
  const IN_EDITOR = previewEnabled && designMode;

  if (IN_EDITOR) {
    // No dummy sample data – just keep preview infra safe.
    Flash.seqDesktop = Flash.seqMobile = [];
    Recent.seqDesktop = Recent.seqMobile = [];
    Visitor.seqDesktop = Visitor.seqMobile = [];
    LowStock.seqDesktop = LowStock.seqMobile = [];
    AddToCart.seqDesktop = AddToCart.seqMobile = [];
    Review.seqDesktop = Review.seqMobile = [];

    function place(el, side, baseBottom = 24) {
      if (!el) return;
      const s = el.style;
      s.position = "fixed";
      s.zIndex = "2147483000";
      s.margin = "0";
      s.bottom = baseBottom + "px";
      s.left = "";
      s.right = "";
      s.maxWidth = "calc(100vw - 32px)";
      if (side === "left") s.left = "16px";
      else s.right = "16px";
    }

    function applyPositions() {
      requestAnimationFrame(() => {
        if (Combined.el) return place(Combined.el, "right", 24);
        if (Flash.el) place(Flash.el, "left", 24);
        if (Recent.el) place(Recent.el, "right", 24);
      });
    }

    window.FOMOIFY = window.FOMOIFY || {};
    window.FOMOIFY.preview = function () {
      try {
        Flash.el?.remove();
      } catch { }
      try {
        Recent.el?.remove();
      } catch { }
      try {
        Visitor.el?.remove();
      } catch { }
      try {
        LowStock.el?.remove();
      } catch { }
      try {
        AddToCart.el?.remove();
      } catch { }
      try {
        Review.el?.remove();
      } catch { }
      try {
        Combined.el?.remove();
      } catch { }

      applyPositions();
    };

    document.addEventListener("shopify:section:load", () =>
      window.FOMOIFY.preview()
    );
    document.addEventListener("shopify:block:select", () =>
      window.FOMOIFY.preview()
    );
    document.addEventListener("shopify:inspector:activate", () =>
      window.FOMOIFY.preview()
    );

    applyPositions();
    window.addEventListener("resize", () => window.FOMOIFY.preview());
    window.addEventListener("orientationchange", () =>
      setTimeout(() => window.FOMOIFY.preview(), 0)
    );

    return;
  }

  /* ========== session check & fetch ========== */
  try {
    let sessionReady = false,
      retries = 0,
      maxRetries = 3,
      retryDelay = 2000;
    const sessionCacheKey = cacheKey("session");
    const cachedSession = cache.get(sessionCacheKey);
    if (cachedSession === true) sessionReady = true;
    if (!sessionReady) await idle();
    while (!sessionReady && retries < maxRetries) {
      try {
        const sessionData = await fetchJson(SESSION_ENDPOINT, null, 0);
        if (sessionData) {
          sessionReady = !!sessionData.sessionReady;
          if (!sessionReady) {
            await new Promise((r) => setTimeout(r, retryDelay));
            retries++;
          }
        } else {
          retries++;
          if (retries < maxRetries)
            await new Promise((r) => setTimeout(r, retryDelay));
        }
      } catch {
        retries++;
        if (retries < maxRetries)
          await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
    if (!sessionReady) return;
    cache.set(sessionCacheKey, true, 120000);

    // App config
    let data = { records: [] };
    const cachedConfig = await fetchJson(ENDPOINT, "config", 60000);
    if (cachedConfig) data = cachedConfig;
    window.FOMOIFY = window.FOMOIFY || {};
    window.FOMOIFY.popupTables = data?.tables || {};
    window.FOMOIFY.notificationRecords = data?.records || [];

    const recs = Array.isArray(data?.records) ? data.records : [];
    const tables = data?.tables || {};
    const tableFlash = Array.isArray(tables.flash) ? tables.flash : [];
    const tableRecent = Array.isArray(tables.recent) ? tables.recent : [];
    const tableVisitor = Array.isArray(tables.visitor) ? tables.visitor : [];
    const tableLowStock = Array.isArray(tables.lowstock) ? tables.lowstock : [];
    const tableAddToCart = Array.isArray(tables.addtocart) ? tables.addtocart : [];
    const tableReview = Array.isArray(tables.review) ? tables.review : [];
    const useFlashLegacy = tableFlash.length === 0;
    // Recent popup must always come from recentpopupconfig (tables.recent).
    const useRecentLegacy = false;

    const pt = pageType(),
      ch = currHandle(),
      colHandle = currCollectionHandle(),
      isPd = pt === "product";

    let currentProduct = null;
    if (isPd && ch) {
      currentProduct = await fetchJson(`/products/${ch}.js`, `prod:${ch}`, 600000);
    }

    let customerPool = [];
    if (tableVisitor.length) {
      try {
        const limit = 100;
        const payload = await fetchJson(
          `${CUSTOMERS_ENDPOINT_BASE}?shop=${encodeURIComponent(SHOP)}&limit=${limit}`,
          `customers:${limit}`,
          600000
        );
        const customers = Array.isArray(payload?.customers) ? payload.customers : [];
        customerPool = customers.map(normalizeCustomer).filter(Boolean);
      } catch { }
    }

    const flashConfigs = [],
      recentConfigs = [],
      visitorConfigs = [],
      lowStockConfigs = [],
      addToCartConfigs = [],
      reviewConfigs = [];

    // ======= MAIN LOOP over DB configs =======
    for (const it of recs) {
      if (!useFlashLegacy && it?.key === "flash") continue;
      if (
        !useRecentLegacy &&
        (it?.key === "recent" ||
          it?.key === "orders" ||
          it?.useOrders === true ||
          String(it?.useOrders) === "1")
      ) {
        continue;
      }
      if (!(it?.enabled == 1 || it?.enabled === "1" || it?.enabled === true))
        continue;
      if (!["flash", "recent", "orders"].includes(it.key)) continue;

      const showType = String(it.showType || "allpage").toLowerCase();
      const match =
        showType === "all" || showType === "allpage" || showType === pt;
      if (!match) continue;

      const titlesArr = parseList(it.messageTitlesJson);
      const timesArr = parseList(it.namesJson);

      const locsArrRaw = parseList(it.locationsJson);
      const locsArr = Array.isArray(locsArrRaw)
        ? locsArrRaw.map(formatLocationEntry).filter(Boolean)
        : [];

      let handlesArr = parseList(it.selectedProductsJson);
      const mbPosArr = parseList(it.mobilePositionJson);
      if (handlesArr.length > 1) handlesArr = shuffled(handlesArr);

      const defaultMB = normMB(
        it.mobilePosition || it.positionMobile || (mbPosArr[0] || "bottom")
      );

      const COMMON = {
        positionDesktop: it.positionDesktop || it.position,
        mobileSize: it.mobileSize,
        animation: it.animation,
        animationSpeed: it.animationSpeed,
        animationMs: it.animationMs,
        fontFamily: it.fontFamily,
        fontWeight: it.fontWeight,
        baseFontSize: Number(it.fontSize ?? it.rounded ?? 0) || null,
        cornerRadius: Number(it.cornerRadius ?? 16),
        visibleSeconds: Number(it.durationSeconds ?? it.visibleSeconds ?? 6),
        alternateSeconds: Number(it.alternateSeconds || 4),
        firstDelaySeconds: Number(it.firstDelaySeconds ?? it.delaySeconds ?? 0),
        progressColor: it.progressColor,
        bgColor: it.bgColor,
        fontColor: it.msgColor,
        titleColor: it.titleColor,
        accentColor: it.titleColor,
      };

      /* ---------- FLASH ---------- */
      if (it.key === "flash") {
        const n = Math.max(
          titlesArr.length || 0,
          locsArr.length || 0,
          timesArr.length || 0,
          mbPosArr.length || 0,
          1
        );
        for (let i = 0; i < n; i++) {
          const title = pickSmart(
            titlesArr,
            i,
            safe(it.messageText, "Flash Sale")
          );
          const location = pickSmart(locsArr, i, "Limited time");
          const timeText = pickSmart(
            timesArr,
            i,
            safe(it.relativeTimeText, "Just now")
          );
          const mbPos = pickSmart(mbPosArr, i, defaultMB);
          const iconSrc = resolveIconForIndex(it, i) || "";
          flashConfigs.push({
            title,
            location,
            timeText,
            uploadedImage: iconSrc,
            productUrl: safe(it.ctaUrl, "#"),
            mobilePosition: normMB(mbPos, defaultMB),
            durationSeconds: Number(it.durationSeconds || 0),
            ...COMMON,
          });
        }
        continue;
      }

      /* ---------- STRICT ORDERS MODE ---------- */
      const wantsOrders =
        it.key === "orders" ||
        it.useOrders === true ||
        String(it.useOrders) === "1";
      if (wantsOrders) {
        const daysWindowRaw =
          it.orderDays ?? it.daysWindow ?? it.recentDays ?? 7;
        const daysWindow = Math.max(0, Number(daysWindowRaw) || 0);
        const limit = Math.max(1, Number(it.orderLimit || 30) || 30);

        if (daysWindow === 0) {
          continue;
        }

        try {
          const url = `${ORDERS_ENDPOINT_BASE}?shop=${encodeURIComponent(
            SHOP
          )}&days=${daysWindow}&limit=${limit}`;
          const payload = await fetchJson(
            url,
            `orders:${daysWindow}:${limit}`,
            60000
          );
          if (!payload) continue;
          const orders = Array.isArray(payload?.orders) ? payload.orders : [];

          const hide = flagsFromNamesJson(it.namesJson);

          for (const o of orders) {
            const when = o.processed_at || o.created_at;
            if (!when || !withinDays(when, daysWindow)) continue;

            const fn = safe(o?.customer?.first_name, "").trim();
            const ln = safe(o?.customer?.last_name, "").trim();
            const name = fn ? (ln ? `${fn} ${ln[0].toUpperCase()}.` : fn) : "Someone";

            const s = o?.shipping_address || {};
            const b = o?.billing_address || {};
            const city = safe(s.city || b.city, "").trim();
            const state = safe(s.province || b.province, "").trim();
            const country = safe(s.country || b.country, "").trim();
            const locJoin =
              city || country || state
                ? [city, state, country].filter(Boolean).join(", ")
                : pickSmart(locsArr, 0, "");

            const line =
              (Array.isArray(o?.line_items) && o.line_items[0]) || null;
            const pHandle = safe(line?.product_handle, "");
            const pTitle = safe(line?.title, "Product");
            const pImg = safe(line?.image, "");
            const productUrl = pHandle ? `/products/${pHandle}` : "#";
            const iconSrc = resolveIconForIndex(it, 0);

            const cfg = {
              productTitle: pTitle,
              name,
              city,
              state,
              country,
              location: locJoin || "—",
              message: "recently bought",
              image: pImg,
              productUrl,
              uploadedImage: iconSrc,
              createOrderTime: safe(o?.createOrderTime || it?.createOrderTime, ""),
              timeText: relTime(when),
              timeAbsolute: formatAbs(when),
              mobilePosition: normMB(
                pickSmart(mbPosArr, 0, defaultMB),
                defaultMB
              ),
              durationSeconds: Number(it.durationSeconds || 0),

              // raw locations JSON so renderer can still use it if needed
              rawLocations: it.locationsJson,

              // HIDE FLAGS
              hideName: hide.hideName,
              hideCity: hide.hideCity,
              hideState: hide.hideState,
              hideCountry: hide.hideCountry,
              hideProductTitle: hide.hideProductTitle,
              hideProductImage: hide.hideProductImage,
              hideTime: hide.hideTime,

              // styling
              bgColor: it.bgColor || "#ffffff",
              fontColor: it.msgColor || "#111",
              titleColor: it.titleColor || "#6C63FF",
              accentColor: it.titleColor || "#6C63FF",
              progressColor:
                it.progressColor || it.titleColor || "#6C63FF",
              positionDesktop: it.positionDesktop || it.position,
              mobileSize: it.mobileSize,
              animation: it.animation,
              animationSpeed: it.animationSpeed,
              animationMs: it.animationMs,
              fontFamily: it.fontFamily,
              fontWeight: it.fontWeight,
              baseFontSize:
                Number(it.fontSize ?? it.rounded ?? 0) || null,
              cornerRadius: Number(it.cornerRadius ?? 16),
              visibleSeconds:
                Number(it.durationSeconds ?? it.visibleSeconds ?? 6),
              alternateSeconds: Number(it.alternateSeconds || 4),
              firstDelaySeconds: Number(it.firstDelaySeconds ?? it.delaySeconds ?? 0),
            };
            recentConfigs.push(cfg);
          }
        } catch (e) {
          console.warn("[FOMO][orders] fetch failed", e);
        }
        continue;
      }

      /* ---------- NON-ORDERS (manual + optional current) ---------- */
      const COMMON_RECENT = {
        bgColor: it.bgColor || "#ffffff",
        fontColor: it.msgColor || "#111",
        titleColor: it.titleColor || "#6C63FF",
        accentColor: it.titleColor || "#6C63FF",
        progressColor: it.progressColor || it.titleColor || "#6C63FF",
        positionDesktop: it.positionDesktop || it.position,
        mobileSize: it.mobileSize,
        animation: it.animation,
        animationSpeed: it.animationSpeed,
        animationMs: it.animationMs,
        fontFamily: it.fontFamily,
        fontWeight: it.fontWeight,
        baseFontSize: Number(it.fontSize ?? it.rounded ?? 0) || null,
        cornerRadius: Number(it.cornerRadius ?? 16),
        visibleSeconds:
          Number(it.durationSeconds ?? it.visibleSeconds ?? 6),
        alternateSeconds: Number(it.alternateSeconds || 4),
        firstDelaySeconds: Number(it.firstDelaySeconds ?? it.delaySeconds ?? 0),
      };
      const includeCurrent = it.includeCurrentProduct !== false;
      const hideFlags = flagsFromNamesJson(it.namesJson);

      if (isPd && includeCurrent && ch) {
        try {
          const p = await fetchJson(
            `/products/${ch}.js`,
            `prod:${ch}`,
            600000
          );
          if (p) {
            const iconSrc0 = resolveIconForIndex(it, 0);
            const nowAbs = formatAbs(new Date());
            const locParts0 = parseLocationParts(
              pickRaw(locsArrRaw, 0, "")
            );
            recentConfigs.push({
              productTitle: p?.title || ch,
              name: pickSmart(titlesArr, 0, "Someone"),
              city: locParts0.city,
              state: locParts0.state,
              country: locParts0.country,
              location: formatLocationEntry(locParts0),
              message: "bought this product recently",
              image: (p?.images && p.images[0]) || "",
              productUrl: p?.url || `/products/${ch}`,
              uploadedImage: iconSrc0,
              createOrderTime: safe(it.createOrderTime, ""),
              timeText: pickSmart(
                timesArr,
                0,
                safe(it.relativeTimeText, "")
              ),
              timeAbsolute: nowAbs,
              mobilePosition: normMB(
                pickSmart(mbPosArr, 0, defaultMB),
                defaultMB
              ),
              durationSeconds: Number(
                it.currentFirstDelaySeconds ?? it.durationSeconds ?? 0
              ),

              // raw locations for fallback
              rawLocations: it.locationsJson,

              // hide flags
              ...hideFlags,

              ...COMMON_RECENT,
            });
          }
        } catch (e) {
          console.warn("[FOMO] current product fetch failed", e);
        }
      }

      const n = Math.max(
        handlesArr.length || 0,
        titlesArr.length || 0,
        locsArrRaw.length || 0,
        timesArr.length || 0,
        mbPosArr.length || 0,
        1
      );
      for (let i = 0; i < n; i++) {
        const handle =
          handlesArr.length ? handlesArr[i % handlesArr.length] : "";
        try {
          let p = null;
          if (handle) {
            p = await fetchJson(
              `/products/${handle}.js`,
              `prod:${handle}`,
              600000
            );
          }
          const iconSrc = resolveIconForIndex(it, i);
          const nowAbs = formatAbs(new Date());
          const locPartsI = parseLocationParts(
            pickRaw(locsArrRaw, i, "")
          );
          recentConfigs.push({
            productTitle: p?.title || handle || "Product",
            name: pickSmart(titlesArr, i, "Someone"),
            city: locPartsI.city,
            state: locPartsI.state,
            country: locPartsI.country,
            location: formatLocationEntry(locPartsI),
            message: "recently bought",
            image: (p?.images && p.images[0]) || "",
            productUrl:
              p?.url ||
              (handle
                ? `/products/${handle}`
                : includeCurrent && ch
                  ? `/products/${ch}`
                  : "#"),
            uploadedImage: iconSrc,
            createOrderTime: safe(it.createOrderTime, ""),
            timeText: pickSmart(
              timesArr,
              i,
              safe(it.relativeTimeText, "")
            ),
            timeAbsolute: nowAbs,
            mobilePosition: normMB(
              pickSmart(mbPosArr, i, defaultMB),
              defaultMB
            ),
            durationSeconds: Number(it.durationSeconds || 0),

            // raw locations for fallback
            rawLocations: it.locationsJson,

            // hide flags
            ...hideFlags,

            ...COMMON_RECENT,
          });
        } catch (e) {
          console.warn("[FOMO] product fetch failed", handle, e);
        }
      }
    }

    // ==== TABLE CONFIGS (new popup tables) ====
    const matchesShowType = (showType) => {
      const st = String(showType || "allpage").toLowerCase();
      return st === "all" || st === "allpage" || st === pt;
    };
    const normalizeImage = (img) => {
      if (!img) return "";
      if (typeof img === "string") return img;
      if (typeof img === "object") {
        return img.url || img.src || img.originalSrc || "";
      }
      return "";
    };
    const normalizePrice = (v) => {
      if (v === undefined || v === null || v === "") return "";
      if (typeof v === "string" && /[^\d.]/.test(v)) return v;
      const n = Number(v?.amount ?? v);
      if (!Number.isFinite(n)) return String(v);
      if (Number.isInteger(n)) return formatMoney(n);
      return String(n);
    };
    const normalizeInventory = (p) => {
      if (!p || typeof p !== "object") return null;
      const direct = [
        p.inventoryQty,
        p.totalInventory,
        p.total_inventory,
        p.inventory_quantity,
        p.stockCount,
      ];
      for (const raw of direct) {
        const n = Number(raw);
        if (Number.isFinite(n)) return Math.round(n);
      }
      const variants = Array.isArray(p.variants) ? p.variants : [];
      if (!variants.length) return null;
      let sum = 0;
      let hasAny = false;
      for (const variant of variants) {
        const n = Number(variant?.inventory_quantity);
        if (!Number.isFinite(n)) continue;
        sum += n;
        hasAny = true;
      }
      return hasAny ? Math.round(sum) : null;
    };
    const normalizeProduct = (p) => {
      if (!p) return null;
      const idNum = Number(p.id ?? p.product_id ?? 0);
      const title = p.title || p.productTitle || p.name || "";
      const handle = p.handle || p.productHandle || "";
      const image =
        normalizeImage(p.image) ||
        normalizeImage(p.featuredImage) ||
        normalizeImage(p.featured_image) ||
        (Array.isArray(p.images) ? p.images[0] : "") ||
        p.productImage ||
        "";
      const url =
        p.url ||
        (handle ? `/products/${handle}` : "") ||
        p.productUrl ||
        "";
      const price =
        p.price ||
        p.price_min ||
        p.priceMax ||
        p.priceRange?.minVariantPrice?.amount ||
        "";
      const compareAt =
        p.compareAt ||
        p.compare_at_price ||
        p.compareAtPrice ||
        p.compareAt ||
        "";
      const inventoryQty = normalizeInventory(p);
      return {
        id: Number.isFinite(idNum) && idNum > 0 ? Math.round(idNum) : null,
        title,
        handle,
        image,
        url,
        price: normalizePrice(price),
        compareAt: normalizePrice(compareAt),
        rating: p.rating,
        inventoryQty,
      };
    };
    const productHandleFromEntry = (entry) => {
      if (!entry) return "";
      if (typeof entry === "string") return entry;
      if (typeof entry === "object") return entry.handle || entry.productHandle || "";
      return "";
    };
    const productTitleFromEntry = (entry) => {
      if (!entry) return "";
      if (typeof entry === "object") return entry.title || entry.productTitle || "";
      return "";
    };
    const matchesScope = (row) => {
      const pScope = String(row?.productScope || "").toLowerCase();
      if (pt === "product" && pScope === "specific") {
        const { visibilityProducts: list } = parseProductBuckets(row);
        if (!list.length || !ch) return false;
        const hit = list.some((entry) => {
          const h = productHandleFromEntry(entry);
          if (h && String(h).toLowerCase() === String(ch).toLowerCase()) return true;
          const t = productTitleFromEntry(entry);
          if (
            t &&
            currentProduct?.title &&
            String(t).toLowerCase() === String(currentProduct.title).toLowerCase()
          )
            return true;
          return false;
        });
        if (!hit) return false;
      }
      const cScope = String(row?.collectionScope || "").toLowerCase();
      if (pt === "collection" && cScope === "specific") {
        const list = parseList(row?.selectedCollectionsJson);
        if (!list.length || !colHandle) return false;
        const hit = list.some((entry) => {
          const h =
            (entry && typeof entry === "object" && entry.handle) ||
            (typeof entry === "string" ? entry : "");
          return (
            h &&
            String(h).toLowerCase() === String(colHandle).toLowerCase()
          );
        });
        if (!hit) return false;
      }
      return true;
    };

    const productCache = new Map();
    const judgeMeReviewCountCache = new Map();
    let storeProductsCache = null;
    const dedupeProducts = (list) => {
      const out = [];
      const seen = new Set();
      for (const prod of Array.isArray(list) ? list : []) {
        if (!prod) continue;
        const key = String(
          prod.handle || prod.url || prod.title || Math.random()
        ).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(prod);
      }
      return out;
    };
    const parseJudgeMeCount = (raw) => {
      const text = String(raw || "");
      if (!text) return 0;

      const attrMatch = text.match(/data-number-of-reviews=["'](\d+)["']/i);
      if (attrMatch?.[1]) return Math.max(0, Number(attrMatch[1]) || 0);

      const badgeMatch = text.match(/(\d+)\s+review/i);
      if (badgeMatch?.[1]) return Math.max(0, Number(badgeMatch[1]) || 0);

      const quotedCount = text.match(/"number_of_reviews"\s*:\s*(\d+)/i);
      if (quotedCount?.[1]) return Math.max(0, Number(quotedCount[1]) || 0);

      return 0;
    };
    const judgeMeCountFromDom = () => {
      try {
        const withAttr = document.querySelectorAll(
          ".jdgm-prev-badge[data-number-of-reviews], [data-number-of-reviews]"
        );
        for (const el of withAttr) {
          const count = Number(el.getAttribute("data-number-of-reviews"));
          if (Number.isFinite(count) && count > 0) return Math.round(count);
        }

        const badgeTextEls = document.querySelectorAll(
          ".jdgm-prev-badge__text, .jdgm-rev-widg__summary-text"
        );
        for (const el of badgeTextEls) {
          const count = parseJudgeMeCount(el?.textContent || "");
          if (count > 0) return count;
        }
      } catch {}
      return 0;
    };
    const productHandleOf = (prod) => {
      const direct = String(prod?.handle || "").trim();
      if (direct) return direct.toLowerCase();
      const fromUrl = productHandleFromUrl(prod?.url);
      return String(fromUrl || "")
        .trim()
        .toLowerCase();
    };
    const fetchJudgeMeCountByHandle = async (handle) => {
      const h = String(handle || "")
        .trim()
        .toLowerCase();
      if (!h) return 0;
      if (judgeMeReviewCountCache.has(h)) {
        return judgeMeReviewCountCache.get(h) || 0;
      }

      // On product page, prefer already-rendered Judge.me badge count.
      if (isPd && String(ch || "").toLowerCase() === h) {
        const domCount = judgeMeCountFromDom();
        judgeMeReviewCountCache.set(h, domCount);
        return domCount;
      }

      try {
        const res = await fetchWithProxyFallback(`/products/${encodeURIComponent(h)}`, {
          headers: { "Content-Type": "text/html" },
        });
        if (!res || !res.ok) {
          judgeMeReviewCountCache.set(h, 0);
          return 0;
        }
        const html = await res.text();
        const count = parseJudgeMeCount(html);
        judgeMeReviewCountCache.set(h, count);
        return count;
      } catch {
        judgeMeReviewCountCache.set(h, 0);
        return 0;
      }
    };
    const hasJudgeMeReview = async (prod) => {
      const directCountCandidates = [
        prod?.reviewCount,
        prod?.reviewsCount,
        prod?.reviews_count,
        prod?.ratingCount,
        prod?.rating_count,
        prod?.numberOfReviews,
      ];
      for (const value of directCountCandidates) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) return true;
      }

      const handle = productHandleOf(prod);
      if (!handle) {
        if (isPd) return judgeMeCountFromDom() > 0;
        return false;
      }

      const count = await fetchJudgeMeCountByHandle(handle);
      return count > 0;
    };
    const fetchProductByHandle = async (handle) => {
      const h = String(handle || "").trim();
      if (!h || h.startsWith("gid://")) return null;
      if (productCache.has(h)) return productCache.get(h);
      const p = await fetchJson(`/products/${h}.js`, `prod:${h}`, 600000);
      const normalized = normalizeProduct(p) || {
        title: h,
        handle: h,
        url: `/products/${h}`,
      };
      productCache.set(h, normalized);
      return normalized;
    };
    const fetchStoreProductsForLowStock = async () => {
      if (storeProductsCache) return storeProductsCache;
      const payload = await fetchJson(
        "/products.json?limit=250",
        "products:all:250",
        600000
      );
      const rows = Array.isArray(payload?.products) ? payload.products : [];
      storeProductsCache = dedupeProducts(
        rows.map((row) => normalizeProduct(row)).filter(Boolean)
      );
      return storeProductsCache;
    };
    const findStoreProductForOrderLine = async (line) => {
      const products = await fetchStoreProductsForLowStock();
      if (!Array.isArray(products) || !products.length) return null;

      const lineProductId = Number(line?.product_id ?? 0);
      if (Number.isFinite(lineProductId) && lineProductId > 0) {
        const byId = products.find((p) => Number(p?.id) === lineProductId);
        if (byId) return byId;
      }

      const lineTitle = safe(line?.title, "").trim().toLowerCase();
      if (lineTitle) {
        const byExactTitle = products.find(
          (p) => String(p?.title || "").trim().toLowerCase() === lineTitle
        );
        if (byExactTitle) return byExactTitle;

        const byContainsTitle = products.find((p) =>
          String(p?.title || "").toLowerCase().includes(lineTitle)
        );
        if (byContainsTitle) return byContainsTitle;
      }

      return null;
    };
    const resolveProduct = async (entry) => {
      if (!entry) return null;
      if (typeof entry === "string") return fetchProductByHandle(entry);
      if (typeof entry === "object") {
        const local = normalizeProduct(entry);
        const handle = entry.handle || entry.productHandle;
        const hasInventory = Number.isFinite(Number(local?.inventoryQty));
        if (handle && (!local?.title || !local?.image || !hasInventory)) {
          const fetched = await fetchProductByHandle(handle);
          if (fetched) {
            return {
              ...fetched,
              ...(local || {}),
              title: local?.title || fetched.title,
              image: local?.image || fetched.image,
              url: local?.url || fetched.url,
              price: local?.price || fetched.price,
              compareAt: local?.compareAt || fetched.compareAt,
              inventoryQty: hasInventory ? local.inventoryQty : fetched.inventoryQty,
            };
          }
        }
        return local;
      }
      return null;
    };
    const collectProducts = async (row, options = {}) => {
      const includeCurrent = options.includeCurrent !== false;
      const { dataProducts: list } = parseProductBuckets(row);
      const out = [];
      for (const entry of list) {
        const p = await resolveProduct(entry);
        if (p) out.push(p);
      }
      const collectionList = parseList(row?.selectedCollectionsJson);
      if (Array.isArray(collectionList)) {
        for (const entry of collectionList) {
          if (entry && typeof entry === "object" && entry.sampleProduct) {
            const sp = await resolveProduct(entry.sampleProduct);
            if (sp) out.push(sp);
          }
        }
      }
      if (!out.length && includeCurrent && currentProduct) {
        const p = normalizeProduct(currentProduct);
        if (p) out.push(p);
      }
      return dedupeProducts(out);
    };

    const baseTokens = {
      full_name: "Jenna Doe",
      first_name: "Jenna",
      last_name: "Doe",
      country: "United States",
      city: "New York",
      reviewer_name: "Jane B.",
      review_title: "Beautiful and elegant",
      review_body: "Absolutely stunning and elegant.",
      reviewer_country: "United States",
      reviewer_city: "New York",
    };

    if (tableFlash.length) {
      for (const it of tableFlash) {
        if (!(it?.enabled == 1 || it?.enabled === "1" || it?.enabled === true))
          continue;
        if (!matchesShowType(it.showType)) continue;

        const titlesArr = parseList(it.messageTitlesJson);
        const locsArrRaw = parseList(it.locationsJson);
        const timesArr = parseList(it.namesJson);
        const mbPosArr = parseList(it.mobilePositionJson);

        const defaultTitle = safe(it.messageTitle || it.messageText, "Flash Sale");
        const defaultLocation = safe(it.name, "Limited time");
        const defaultTime = safe(it.messageText, "Just now");
        const defaultMB = normMB(mobilePosFromDesktop(it.position || "bottom-right"));
        const iconSrc = tryAnySvg(it.iconSvg) || FLAME_SVG;

        const n = Math.max(
          titlesArr.length || 0,
          locsArrRaw.length || 0,
          timesArr.length || 0,
          mbPosArr.length || 0,
          1
        );

        for (let i = 0; i < n; i++) {
          const mbPos = pickSmart(mbPosArr, i, defaultMB);
          flashConfigs.push({
            title: pickSmart(titlesArr, i, defaultTitle),
            location: pickSmart(locsArrRaw, i, defaultLocation),
            timeText: pickSmart(timesArr, i, defaultTime),
            uploadedImage: iconSrc,
            productUrl: safe(it.ctaUrl, "#"),
            mobilePosition: normMB(mbPos, defaultMB),
            durationSeconds: Number(it.durationSeconds || 0),

            positionDesktop: it.position,
            mobileSize: it.mobileSize,
            animation: it.animation,
            fontFamily: it.fontFamily,
            fontWeight: it.fontWeight,
            template: it.template,
            bgColor: it.bgColor,
            bgAlt: it.bgAlt,
            fontColor: it.textColor,
            titleColor: it.numberColor,
            progressColor: it.numberColor || it.textColor,
            imageAppearance: it.imageAppearance,
            cornerRadius: Number(it.rounded ?? 16),
            firstDelaySeconds: Number(it.firstDelaySeconds ?? 0),
            alternateSeconds: Number(it.alternateSeconds || 0),
          });
        }
      }
    }

    if (tableRecent.length) {
      for (const it of tableRecent) {
        if (!(it?.enabled == 1 || it?.enabled === "1" || it?.enabled === true))
          continue;
        if (!matchesShowType(it.showType)) continue;

        const titlesArr = parseList(it.messageTitlesJson);
        const locsArrRaw = parseList(it.locationsJson);
        let handlesArr = parseList(it.selectedProductsJson);
        const mbPosArr = parseList(it.mobilePositionJson);
        if (handlesArr.length > 1) handlesArr = shuffled(handlesArr);

        const defaultMB = normMB(
          it.mobilePosition || it.positionMobile || (mbPosArr[0] || "bottom")
        );
        const hideFlags = flagsFromNamesJson(it.namesJson);
        const msgTxt = safe(it.messageText, "recently bought");

        const COMMON_RECENT = {
          bgColor: it.bgColor || "#ffffff",
          bgAlt: it.bgAlt || "#ffffff",
          template: it.template || "solid",
          fontColor: it.textColor || "#111",
          titleColor: it.numberColor || "#6C63FF",
          accentColor: it.numberColor || "#6C63FF",
          progressColor: it.numberColor || "#6C63FF",
          positionDesktop: it.position,
          mobileSize: it.mobileSize,
          animation: it.animation,
          animationSpeed: it.animationSpeed,
          animationMs: it.animationMs,
          fontFamily: it.fontFamily,
          fontWeight: it.fontWeight,
          baseFontSize: Number(it.fontSize ?? it.rounded ?? 0) || null,
          cornerRadius: Number(it.rounded ?? 16),
          visibleSeconds:
            Number(it.durationSeconds ?? it.visibleSeconds ?? 6),
          alternateSeconds: Number(it.alternateSeconds || 4),
          firstDelaySeconds: Number(it.firstDelaySeconds ?? 0),
          imageAppearance: it.imageAppearance,
          productNameMode: it.productNameMode,
          productNameLimit: it.productNameLimit,
        };

        const daysWindow = Math.max(0, Number(it.orderDays || 0));
        const wantsOrders = daysWindow > 0;
        const limit = Math.max(1, Number(it.orderLimit || 30) || 30);
        let addedFromOrders = 0;

        if (wantsOrders) {
          try {
            const url = `${ORDERS_ENDPOINT_BASE}?shop=${encodeURIComponent(
              SHOP
            )}&days=${daysWindow}&limit=${limit}`;
            const payload = await fetchJson(
              url,
              `orders:${daysWindow}:${limit}`,
              60000
            );
            const orders = Array.isArray(payload?.orders) ? payload.orders : [];

            const locsArr = Array.isArray(locsArrRaw)
              ? locsArrRaw.map(formatLocationEntry).filter(Boolean)
              : [];

            for (const o of orders) {
              const when = o.processed_at || o.created_at;
              if (!when || !withinDays(when, daysWindow)) continue;

              const fn = safe(o?.customer?.first_name, "").trim();
              const ln = safe(o?.customer?.last_name, "").trim();
              const name = fn ? (ln ? `${fn} ${ln[0].toUpperCase()}.` : fn) : "Someone";

              const s = o?.shipping_address || {};
              const b = o?.billing_address || {};
              const city = safe(s.city || b.city, "").trim();
              const state = safe(s.province || b.province, "").trim();
              const country = safe(s.country || b.country, "").trim();
              const locJoin =
                city || country || state
                  ? [city, state, country].filter(Boolean).join(", ")
                  : pickSmart(locsArr, 0, "");

              const line =
                (Array.isArray(o?.line_items) && o.line_items[0]) || null;
              let pHandle = safe(
                line?.product_handle || line?.handle || line?.product?.handle,
                ""
              );
              const lineImage =
                normalizeImage(line?.image) ||
                normalizeImage(line?.featured_image) ||
                normalizeImage(line?.product?.image) ||
                "";

              let resolvedProduct = null;
              if (pHandle) {
                try {
                  resolvedProduct = await fetchProductByHandle(pHandle);
                } catch {}
              }

              if (!resolvedProduct) {
                try {
                  resolvedProduct = await findStoreProductForOrderLine(line);
                } catch {}
              }

              if (!pHandle) {
                pHandle = safe(resolvedProduct?.handle, "");
              }
              const pTitle = safe(
                line?.title || resolvedProduct?.title,
                "Product"
              );
              const pImg = safe(
                lineImage || resolvedProduct?.image,
                ""
              );
              const productUrl = safe(
                pHandle
                  ? `/products/${pHandle}`
                  : resolvedProduct?.url || line?.product_url,
                "#"
              );
              const iconSrc = resolveIconForIndex(it, 0);

              const cfg = {
                productTitle: pTitle,
                name,
                city,
                state,
                country,
                location: locJoin || "—",
                message: msgTxt,
                image: pImg,
                productUrl,
                uploadedImage: iconSrc,
                createOrderTime: safe(o?.createOrderTime || it?.createOrderTime, ""),
                timeText: relTime(when),
                timeAbsolute: formatAbs(when),
                mobilePosition: normMB(
                  pickSmart(mbPosArr, 0, defaultMB),
                  defaultMB
                ),
                durationSeconds: Number(it.durationSeconds || 0),

                rawLocations: it.locationsJson,
                ...hideFlags,
                ...COMMON_RECENT,
              };
              recentConfigs.push(cfg);
              addedFromOrders += 1;
            }
          } catch (e) {
            console.warn("[FOMO][orders] fetch failed", e);
          }
          // If no order data is available, fallback to selected/static product records.
          if (addedFromOrders > 0) continue;
        }

        const n = Math.max(
          handlesArr.length || 0,
          titlesArr.length || 0,
          locsArrRaw.length || 0,
          mbPosArr.length || 0,
          1
        );
        for (let i = 0; i < n; i++) {
          const handle =
            handlesArr.length ? handlesArr[i % handlesArr.length] : "";
          try {
            let p = null;
            if (handle) {
              p = await fetchJson(
                `/products/${handle}.js`,
                `prod:${handle}`,
                600000
              );
            }
            const iconSrc = resolveIconForIndex(it, i);
            const nowAbs = formatAbs(new Date());
            const locPartsI = parseLocationParts(
              pickRaw(locsArrRaw, i, "")
            );
            recentConfigs.push({
              productTitle: p?.title || handle || "Product",
              name: pickSmart(titlesArr, i, "Someone"),
              city: locPartsI.city,
              state: locPartsI.state,
              country: locPartsI.country,
              location: formatLocationEntry(locPartsI),
              message: msgTxt,
              image: (p?.images && p.images[0]) || "",
              productUrl: p?.url || (handle ? `/products/${handle}` : "#"),
              uploadedImage: iconSrc,
              createOrderTime: safe(it.createOrderTime, ""),
              timeText: relTime(new Date().toISOString()),
              timeAbsolute: nowAbs,
              mobilePosition: normMB(
                pickSmart(mbPosArr, i, defaultMB),
                defaultMB
              ),
              durationSeconds: Number(it.durationSeconds || 0),

              rawLocations: it.locationsJson,
              ...hideFlags,
              ...COMMON_RECENT,
            });
          } catch (e) {
            console.warn("[FOMO] product fetch failed", handle, e);
          }
        }
      }
    }

    const targetByType = {
      visitor: visitorConfigs,
      lowstock: lowStockConfigs,
      addtocart: addToCartConfigs,
      review: reviewConfigs,
    };
    const buildGenericPopups = async (rows, type, defaults) => {
      const target = targetByType[type];
      if (!target) return;
      for (const row of rows) {
        if (!(row?.enabled == 1 || row?.enabled === "1" || row?.enabled === true))
          continue;
        if (!matchesVisibility(row, pt)) continue;
        if (!matchesScope(row)) continue;
        if (isMobile() && toBool(row?.hideOnMobile, false)) continue;

        const lowStockSource = String(row?.dataSource || "shopify").toLowerCase();
        const hideOutOfStock =
          row?.hideOutOfStock === undefined || row?.hideOutOfStock === null
            ? true
            : toBool(row?.hideOutOfStock);
        const stockUnder = Math.max(1, toNum(row.stockUnder, 10));

        let products = [];
        if (type === "lowstock" && lowStockSource === "manual") {
          const { dataProducts: manualProducts } = parseProductBuckets(row);
          if (!manualProducts.length) continue;
          for (const entry of manualProducts) {
            const product = await resolveProduct(entry);
            if (product) products.push(product);
          }
          products = dedupeProducts(products);
        } else {
          products = await collectProducts(row);
        }
        if (type === "lowstock" && lowStockSource === "shopify") {
          const storeProducts = await fetchStoreProductsForLowStock();
          products = dedupeProducts([...(products || []), ...storeProducts]);
        }
        let pool = products.length
          ? products
          : [{ title: "Product", image: "", price: "", compareAt: "" }];

        if (type === "lowstock") {
          pool = pool.filter((prod) => {
            const qty = Number(prod?.inventoryQty);
            if (!Number.isFinite(qty)) return false;
            if (hideOutOfStock && qty <= 0) return false;
            return qty < stockUnder;
          });
          if (!pool.length) continue;
        }
        if (
          type === "review" &&
          String(row?.dataSource || "judge_me").toLowerCase() === "judge_me"
        ) {
          const reviewedPool = [];
          for (const prod of pool) {
            if (await hasJudgeMeReview(prod)) reviewedPool.push(prod);
          }
          pool = reviewedPool;
          if (!pool.length) continue;
        }

        const imageStyle = type === "addtocart" ? "offset" : "inline";
        const highlightStyle = type === "review" ? "upper" : "underline";

        const baseCfg = {
          popupType: type,
          positionDesktop: row.position,
          position: row.position,
          mobilePosition: normMB(
            row.mobilePosition || mobilePosFromDesktop(row.position),
            "bottom"
          ),
          layout: row.layout,
          template: row.template,
          imageAppearance: row.imageAppearance,
          bgColor: row.bgColor,
          bgAlt: row.bgAlt,
          textColor: row.textColor,
          timestampColor: row.timestampColor,
          priceTagBg: row.priceTagBg,
          priceTagAlt: row.priceTagAlt,
          priceColor: row.priceColor,
          starColor: row.starColor,
          textSizeContent: row.textSizeContent,
          textSizeCompareAt: row.textSizeCompareAt,
          textSizePrice: row.textSizePrice,
          size: row.size,
          transparent: row.transparent,
          fontFamily: row.fontFamily,
          showProductImage: toBool(row.showProductImage, true),
          showPriceTag: toBool(row.showPriceTag, true),
          showRating: toBool(row.showRating, false),
          showClose: toBool(row.showClose, true),
          directProductPage: toBool(row.directProductPage, true),
          durationSeconds: toNum(row.duration, 6),
          firstDelaySeconds: toNum(row.delay, 0),
          alternateSeconds: unitToSeconds(row.interval, row.intervalUnit),
          randomize: toBool(row.randomize, false),
          imageStyle,
          productHighlightStyle: highlightStyle,
          stockCountColor: row.numberColor,
        };

        for (let i = 0; i < pool.length; i++) {
          const prod = pool[i] || {};
          const productTitle = formatProductName(
            prod.title || "Product",
            row.productNameMode,
            row.productNameLimit
          );
          const price = normalizePrice(prod.price);
          const compareAt = normalizePrice(prod.compareAt);

          const stockCount =
            type === "lowstock"
              ? Math.max(0, Math.round(toNum(prod?.inventoryQty, stockUnder)))
              : stockUnder > 1
                ? Math.max(1, stockUnder - randInt(Math.min(3, stockUnder - 1)))
                : stockUnder;

          const useShopifyCustomerData =
            type !== "addtocart" ||
            String(row.customerInfo || "shopify").toLowerCase() !== "manual";
          const customer = useShopifyCustomerData
            ? pickCustomer(customerPool, i)
            : null;
          const customerTokens = customer
            ? {
              full_name: customer.full_name || baseTokens.full_name,
              first_name: customer.first_name || baseTokens.first_name,
              last_name: customer.last_name || baseTokens.last_name,
              city: customer.city || baseTokens.city,
              country: customer.country || baseTokens.country,
            }
            : null;

          const tokens = {
            ...baseTokens,
            ...(customerTokens || {}),
            product_name: productTitle,
            product_price: price,
            price,
            time: row.avgTime || "2",
            unit: row.avgUnit || "mins",
            stock_count: stockCount,
            visitor_count: Math.max(3, Math.round(8 + Math.random() * 20)),
            reviewer_country: baseTokens.reviewer_country,
            reviewer_city: baseTokens.reviewer_city,
            review_date: relDaysAgo(new Date().toISOString()) || "Just now",
          };

          const visitorCounter =
            type === "visitor" &&
            String(row.notiType || "").toLowerCase() === "visitor_counter";
          const msgTpl =
            row.message ||
            (visitorCounter
              ? "{visitor_count} people are viewing {product_name} right now"
              : defaults.message);
          const tsTpl = row.timestamp || defaults.timestamp || "";
          const message = applyTokens(msgTpl, tokens).trim();
          const timestamp = tsTpl ? applyTokens(tsTpl, tokens).trim() : "";

          target.push({
            ...baseCfg,
            message,
            timestamp,
            productTitle,
            productImage: prod.image,
            price,
            compareAt,
            productUrl: prod.url,
            rating: prod.rating || 4,
            stockCountValue: type === "lowstock" ? stockCount : null,
          });
        }
      }
    };

    await buildGenericPopups(tableVisitor, "visitor", {
      message: "{full_name} from {country} just viewed this {product_name}",
      timestamp: "Just now",
    });
    await buildGenericPopups(tableLowStock, "lowstock", {
      message: "{product_name} has only {stock_count} items left in stock",
      timestamp: "",
    });
    await buildGenericPopups(tableAddToCart, "addtocart", {
      message: "{full_name} from {country} added {product_name} to cart",
      timestamp: "{time} {unit} ago",
    });
    await buildGenericPopups(tableReview, "review", {
      message:
        "{reviewer_name} from {reviewer_country} just reviewed this product {product_name}",
      timestamp: "{review_date}",
    });

    // ==== BUILD & START STREAMS ====
    const clone = (a) => (Array.isArray(a) ? a.slice() : []);

    const FlashStream =
      window.FlashStream || createStream("flash", renderFlash);
    const RecentStream =
      window.RecentStream || createStream("recent", renderRecent);
    const VisitorStream =
      window.VisitorStream || createStream("visitor", renderProductPopup);
    const LowStockStream =
      window.LowStockStream || createStream("lowstock", renderProductPopup);
    const AddToCartStream =
      window.AddToCartStream || createStream("addtocart", renderProductPopup);
    const ReviewStream =
      window.ReviewStream || createStream("review", renderProductPopup);

    window.FlashStream = FlashStream;
    window.RecentStream = RecentStream;
    window.VisitorStream = VisitorStream;
    window.LowStockStream = LowStockStream;
    window.AddToCartStream = AddToCartStream;
    window.ReviewStream = ReviewStream;

    const setSeq = (stream, seq) => {
      stream.seqDesktop = clone(seq);
      stream.seqMobile = clone(seq);
    };

    setSeq(FlashStream, flashConfigs);

    // De-duplicate + shuffle for recent
    const seen = new Set();
    const uniqRecent = [];
    for (const c of shuffled(recentConfigs)) {
      const key = [
        c.productTitle,
        c.name,
        (c.city || "") + (c.state || "") + (c.country || ""),
        c.timeAbsolute || c.timeText,
      ].join("||");
      if (seen.has(key)) continue;
      seen.add(key);
      uniqRecent.push(c);
    }
    setSeq(RecentStream, uniqRecent);

    setSeq(VisitorStream, visitorConfigs);
    setSeq(LowStockStream, lowStockConfigs);
    setSeq(AddToCartStream, addToCartConfigs);
    setSeq(ReviewStream, reviewConfigs);

    const streamDefs = [
      { type: "flash", stream: FlashStream },
      { type: "recent", stream: RecentStream },
      { type: "visitor", stream: VisitorStream },
      { type: "lowstock", stream: LowStockStream },
      { type: "addtocart", stream: AddToCartStream },
      { type: "review", stream: ReviewStream },
    ];

    const activeStreams = streamDefs.filter(
      (s) => s.stream.seqDesktop.length || s.stream.seqMobile.length
    );
    const activeMobile = streamDefs.filter((s) => s.stream.seqMobile.length);

    const buildCombinedSeq = () =>
      interleaveMany(
        activeMobile.map((s) =>
          s.stream.seqMobile.map((cfg) => ({ type: s.type, cfg }))
        )
      );

    const shouldCombine = () => isMobile() && activeMobile.length > 1;

    function stopAll() {
      try {
        Combined.stop();
      } catch { }
      for (const s of activeStreams) {
        try {
          s.stream.stop();
        } catch { }
      }
    }

    function startAll(immediate = false) {
      const combine = shouldCombine();
      if (combine) {
        Combined.seq = buildCombinedSeq();
        Combined.start(immediate);
        return;
      }
      for (const s of activeStreams) {
        s.stream.start(immediate);
      }
    }

    startAll(false);

    let lastIsMobile = isMobile();
    let lastCombine = shouldCombine();
    window.addEventListener("resize", () => reevaluateMode());
    window.addEventListener("orientationchange", () =>
      setTimeout(() => reevaluateMode(), 0)
    );

    function reevaluateMode() {
      const nowMobile = isMobile();
      const nowCombine = shouldCombine();
      if (nowMobile !== lastIsMobile || nowCombine !== lastCombine) {
        lastIsMobile = nowMobile;
        lastCombine = nowCombine;
        stopAll();
        startAll(true);
        return;
      }
      if (!nowCombine) {
        for (const s of activeStreams) s.stream.resize();
      }
    }

    console.info("[FOMO] Flash items:", FlashStream.seqDesktop);
    console.info("[FOMO] Recent items:", RecentStream.seqDesktop);
    console.info("[FOMO] Visitor items:", VisitorStream.seqDesktop);
    console.info("[FOMO] Low stock items:", LowStockStream.seqDesktop);
    console.info("[FOMO] Add to cart items:", AddToCartStream.seqDesktop);
    console.info("[FOMO] Review items:", ReviewStream.seqDesktop);
  } catch (err) {
    console.error("[FOMO] build error:", err);
  }

  /* ===== local helpers ===== */
  function interleaveList(a, b) {
    const out = [];
    let i = 0;
    while (i < a.length || i < b.length) {
      if (i < a.length) out.push(a[i]);
      if (i < b.length) out.push(b[i]);
      i++;
    }
    return out;
  }
  function interleaveMany(lists) {
    const seqs = Array.isArray(lists) ? lists.filter((l) => l && l.length) : [];
    if (!seqs.length) return [];
    if (seqs.length === 1) return seqs[0].slice();
    let out = [];
    for (const list of seqs) {
      out = out.length ? interleaveList(out, list) : list.slice();
    }
    return out;
  }
  function positionsSet(arr) {
    const s = new Set();
    for (const c of arr || [])
      s.add(normMB(c.mobilePosition || c.positionMobile || "bottom"));
    return s;
  }
  function hasMobileCollision(recentList, flashList) {
    const a = positionsSet(recentList);
    const b = positionsSet(flashList);
    for (const v of a) if (b.has(v)) return true;
    return false;
  }
});
