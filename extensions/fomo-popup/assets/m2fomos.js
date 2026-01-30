document.addEventListener("DOMContentLoaded", async function () {
  if (window.__fomoOneFile) return;
  window.__fomoOneFile = true;

  const SHOP = (window.Shopify && Shopify.shop) || "";
  const ENDPOINT = `/apps/fomo/popup?shop=${SHOP}`;
  const SESSION_ENDPOINT = `/apps/fomo/session?shop=${SHOP}`;
  const ORDERS_ENDPOINT_BASE = `/apps/fomo/orders`; // expects ?shop=&days=&limit=
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

  const parseList = (raw) => {
    if (Array.isArray(raw)) return raw;
    try {
      const v = JSON.parse(raw ?? "[]");
      return Array.isArray(v) ? v : v ? [v] : [];
    } catch {
      return raw ? [raw] : [];
    }
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

  async function fetchJson(url, key, ttlMs) {
    const k = key ? cacheKey(key) : null;
    if (k) {
      const cached = cache.get(k);
      if (cached) return cached;
    }
    try {
      const r = await fetch(url, { headers: { "Content-Type": "application/json" } });
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
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };
  const parseAbsDMY = (s) => {
    if (typeof s !== "string") return null;
    const m = s
      .trim()
      .match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const d = new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0)
    );
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const toDateLoose = (v) => toDate(v) || parseAbsDMY(v);
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
  const displayRecentTime = (cfg) => {
    const d = toDateLoose(cfg.timeIso);
    if (d) return relTime(d);
    return safe(cfg.timeText, "");
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

    const wrap = document.createElement("div");
    wrap.className = "fomo-flash";
    wrap.style.cssText = `
      position:fixed; z-index:9999; box-sizing:border-box;
      width:${mode === "mobile" ? mt.w : ""}; overflow:hidden; cursor:pointer;
      border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
      background:${cfg.bgColor || "#111"}; color:${cfg.fontColor || "#fff"};
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
    img.style.cssText = `width:${iSize}px;height:${iSize}px;object-fit:cover;border-radius:${iRad}px;background:transparent;flex:0 0 ${iSize}px;pointer-events:none;`;
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

    card.appendChild(img);
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
    return wrap;
  }

  // /* ========== RECENT renderer (granular hide) ========== */
  // function renderRecent(cfg, mode, onDone) {
  //   const mt = mobileTokens(cfg.mobileSize);
  //   const visibleSec =
  //     Number(cfg.durationSeconds ?? cfg.visibleSeconds ?? 6) || 6;
  //   const visibleMs = Math.max(1, visibleSec) * 1000;
  //   const theAnim = getAnimPair(cfg, mode);
  //   const { inAnim, outAnim } = theAnim;
  //   const DUR = getAnimDur(cfg);
  //   const ACCENT = cfg.accentColor || cfg.titleColor || "#6C63FF";

  //   const wrap = document.createElement("div");
  //   wrap.style.cssText = `
  //     position:fixed; z-index:9999; box-sizing:border-box;
  //     width:${mode === "mobile" ? mt.w : ""}; overflow:hidden; cursor:pointer;
  //     border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
  //     background:${cfg.bgColor || "#ffffff"}; color:${cfg.fontColor || "#111"};
  //     box-shadow:0 10px 30px rgba(0,0,0,.12);
  //     font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
  //     animation:${inAnim} ${DUR.in}ms ease-out both;
  //   `;
  //   (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

  //   const card = document.createElement("div");
  //   card.style.cssText = `
  //     display:flex; gap:12px; align-items:flex-start; position:relative;
  //     padding:${mode === "mobile" ? mt.pad : 12}px 44px ${mode === "mobile" ? mt.pad : 12
  //     }px 12px;
  //     font-size:${Number(cfg.baseFontSize) || (mode === "mobile" ? mt.fs : 14)
  //     }px; line-height:1.35;
  //   `;

  //   const img = document.createElement("img");
  //   img.src = cfg.uploadedImage || cfg.image || "";
  //   img.alt = safe(cfg.productTitle, "Product");
  //   const iSize = mode === "mobile" ? mt.img : 50,
  //     iRad = Math.round(iSize * 0.18);
  //   img.style.cssText = `width:${iSize}px;height:${iSize}px;object-fit:cover;border-radius:${iRad}px;background:#eee;flex:0 0 ${iSize}px;pointer-events:none;`;
  //   img.onerror = () => {
  //     img.style.display = "none";
  //   };
  //   if (cfg.hideProductImage) img.style.display = "none";

  //   const body = document.createElement("div");
  //   body.style.cssText = `flex:1;min-width:0;pointer-events:none;`;

  //   // Name + granular location
  //   const line1 = document.createElement("div");
  //   line1.style.cssText = `margin:0 0 2px 0;`;
  //   const fw = safe(cfg.fontWeight, "700");
  //   const nameText = cfg.hideName ? "" : safe(cfg.name, "Someone");

  //   // derived location
  //   const derived = deriveLocationParts(cfg);
  //   let cityText = derived.city;
  //   let stateText = derived.state;
  //   let countryText = derived.country;

  //   const locParts = [];
  //   if (!cfg.hideCity && cityText) locParts.push(cityText);
  //   if (!cfg.hideState && stateText) locParts.push(stateText);
  //   if (!cfg.hideCountry && countryText) locParts.push(countryText);

  //   let locFinal = locParts.join(", ");
  //   const anyLocHide = cfg.hideCity || cfg.hideState || cfg.hideCountry;

  //   if (!locFinal && !anyLocHide && cfg.location) {
  //     const fromLocation = formatLocationEntry(cfg.location);
  //     if (fromLocation && fromLocation !== "[object Object]") {
  //       locFinal = fromLocation;
  //     }
  //   }

  //   if (nameText || locFinal) {
  //     const nameHtml = nameText
  //       ? `<span style="font-weight:${fw};color:${ACCENT};">${nameText}</span>`
  //       : "";
  //     const locHtml = locFinal
  //       ? `<span style="font-weight:${fw};color:${ACCENT};">${locFinal}</span>`
  //       : "";
  //     const spacer = nameText && locFinal ? " from " : "";
  //     line1.innerHTML = `${nameHtml}${spacer}${locHtml}`;
  //     body.appendChild(line1);
  //   }

  //   // Product line
  //   const line2 = document.createElement("div");
  //   const msgTxt = safe(cfg.message, "recently bought");
  //   const boughtTxt = cfg.hideProductTitle
  //     ? "placed an order"
  //     : `${msgTxt} ${safe(cfg.productTitle, "")
  //       ? `&ldquo;${safe(cfg.productTitle, "")}&rdquo;`
  //       : "this product"
  //     }`;
  //   line2.innerHTML = boughtTxt;
  //   line2.style.cssText = `opacity:.95;margin:0 0 6px 0;`;
  //   body.appendChild(line2);

  //   // Time
  //   if (!cfg.hideTime) {
  //     const line3 = document.createElement("div");
  //     line3.textContent = safe(cfg.timeAbsolute, "") || safe(cfg.timeText, "");
  //     line3.style.cssText = `font-size:${Math.max(
  //       10,
  //       (Number(cfg.baseFontSize) || 14) - 1
  //     )}px;opacity:.7;`;
  //     body.appendChild(line3);
  //   }

  //   const close = document.createElement("button");
  //   close.type = "button";
  //   close.setAttribute("aria-label", "Close");
  //   close.innerHTML = "&times;";
  //   close.style.cssText = `position:absolute;top:6px;right:10px;border:0;background:transparent;color:inherit;font-size:18px;line-height:1;padding:4px;cursor:pointer;opacity:.55;transition:.15s;z-index:1;`;
  //   close.onmouseenter = () => (close.style.opacity = "1");
  //   close.onmouseleave = () => (close.style.opacity = ".8");

  //   card.appendChild(img);
  //   card.appendChild(body);
  //   card.appendChild(close);
  //   wrap.appendChild(card);

  //   const barWrap = document.createElement("div");
  //   barWrap.style.cssText = `height:4px;width:100%;background:transparent`;
  //   const bar = document.createElement("div");
  //   bar.style.cssText = `height:100%;width:100%;background:${cfg.progressColor || ACCENT
  //     };animation:fomoProgress ${visibleMs}ms linear forwards;transform-origin:left;`;
  //   barWrap.appendChild(bar);
  //   wrap.appendChild(barWrap);

  //   wrap.addEventListener("click", (e) => {
  //     if (e.target === close) return;
  //     if (cfg.productUrl) window.location.href = cfg.productUrl;
  //   });

  //   let tid = setTimeout(autoClose, visibleMs);
  //   function autoClose() {
  //     wrap.style.animation = `${outAnim} ${DUR.out}ms ease-in forwards`;
  //     setTimeout(() => {
  //       wrap.remove();
  //       onDone && onDone("auto");
  //     }, DUR.out + 20);
  //   }
  //   close.onclick = (e) => {
  //     e.stopPropagation();
  //     clearTimeout(tid);
  //     autoClose();
  //     onDone && onDone("closed");
  //   };

  //   document.body.appendChild(wrap);
  //   return wrap;
  // }

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

    // ✅ Product title: only first 2 words + "..." if more
    function shortProductTitle(title, wordCount = 2) {
      const t = String(title || "").trim().replace(/\s+/g, " ");
      if (!t) return "";
      const parts = t.split(" ");
      if (parts.length <= wordCount) return t;
      return parts.slice(0, wordCount).join(" ") + "...";
    }

    const wrap = document.createElement("div");
    wrap.style.cssText = `
    position:fixed; z-index:9999; box-sizing:border-box;
    width:${mode === "mobile" ? mt.w : ""}; overflow:hidden; cursor:pointer;
    border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
    background:${cfg.bgColor || "#ffffff"}; color:${cfg.fontColor || "#111"};
    box-shadow:0 10px 30px rgba(0,0,0,.12);
    font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
    animation:${inAnim} ${DUR.in}ms ease-out both;
  `;
    (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

    const card = document.createElement("div");
    card.style.cssText = `
    display:flex; gap:12px; align-items:flex-start; position:relative;
    padding:${mode === "mobile" ? mt.pad : 12}px 44px ${mode === "mobile" ? mt.pad : 12}px 12px;
    font-size:${Number(cfg.baseFontSize) || (mode === "mobile" ? mt.fs : 14)}px; line-height:1.35;
  `;

    const img = document.createElement("img");
    img.src = cfg.uploadedImage || cfg.image || "";
    img.alt = safe(cfg.productTitle, "Product");
    const iSize = mode === "mobile" ? mt.img : 50,
      iRad = Math.round(iSize * 0.18);
    img.style.cssText = `width:${iSize}px;height:${iSize}px;object-fit:cover;border-radius:${iRad}px;background:#eee;flex:0 0 ${iSize}px;pointer-events:none;`;
    img.onerror = () => {
      img.style.display = "none";
    };
    if (cfg.hideProductImage) img.style.display = "none";

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
    const shortTitle = shortProductTitle(rawTitle, 2);

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
      line3.textContent = displayRecentTime(cfg);
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

    card.appendChild(img);
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
    return wrap;
  }


  /* ========== stream factory ========== */
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
              const gap = Math.max(0, +cfg.alternateSeconds || 0);
              this.idx = (this.idx + 1) % s.length;
              showNext(gap);
            });
          }, Math.max(0, delaySec) * 1000);
        };

        // FIRST POPUP: show immediately
        showNext(0);
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
            const renderer =
              item.type === "recent" ? renderRecent : renderFlash;
            this.el = renderer(item.cfg, "mobile", () => {
              const gap = Math.max(0, +item.cfg.alternateSeconds || 0);
              this.idx = (this.idx + 1) % this.seq.length;
              showNext(gap);
            });
          }, Math.max(0, delaySec) * 1000);
        };

        showNext(0);
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

    const recs = Array.isArray(data?.records) ? data.records : [];
    const pt = pageType(),
      ch = currHandle(),
      isPd = pt === "product";

    const flashConfigs = [],
      recentConfigs = [];

    // ======= MAIN LOOP over DB configs =======
    for (const it of recs) {
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
              timeText: relTime(when),
              timeAbsolute: formatAbs(when),
              timeIso: when,
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
              timeText: pickSmart(
                timesArr,
                0,
                safe(it.relativeTimeText, "")
              ),
              timeAbsolute: nowAbs,
              timeIso: new Date().toISOString(),
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
            timeText: pickSmart(
              timesArr,
              i,
              safe(it.relativeTimeText, "")
            ),
            timeAbsolute: nowAbs,
            timeIso: new Date().toISOString(),
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

    // ==== BUILD & START STREAMS ====
    const clone = (a) => (Array.isArray(a) ? a.slice() : []);

    const FlashStream =
      window.FlashStream || createStream("flash", renderFlash);
    const RecentStream =
      window.RecentStream || createStream("recent", renderRecent);
    window.FlashStream = FlashStream;
    window.RecentStream = RecentStream;

    FlashStream.seqDesktop = clone(flashConfigs);
    FlashStream.seqMobile = clone(flashConfigs);

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
    RecentStream.seqDesktop = uniqRecent.slice();
    RecentStream.seqMobile = uniqRecent.slice();

    // Decide behavior on mobile:
    if (
      isMobile() &&
      hasMobileCollision(RecentStream.seqMobile, FlashStream.seqMobile)
    ) {
      Combined.seq = interleaveList(
        RecentStream.seqMobile.map((cfg) => ({ type: "recent", cfg })),
        FlashStream.seqMobile.map((cfg) => ({ type: "flash", cfg }))
      );
      Combined.start(true);
    } else {
      if (FlashStream.seqDesktop.length || FlashStream.seqMobile.length) {
        FlashStream.start(false);
        window.addEventListener("resize", () => FlashStream.resize());
        window.addEventListener("orientationchange", () =>
          setTimeout(() => FlashStream.resize(), 0)
        );
      }
      if (RecentStream.seqDesktop.length || RecentStream.seqMobile.length) {
        RecentStream.start(false);
        window.addEventListener("resize", () => RecentStream.resize());
        window.addEventListener("orientationchange", () =>
          setTimeout(() => RecentStream.resize(), 0)
        );
      }
    }

    // Re-evaluate on viewport and when collision status changes
    let lastIsMobile = isMobile();
    let lastCollision =
      isMobile() &&
      hasMobileCollision(RecentStream.seqMobile, FlashStream.seqMobile);
    window.addEventListener("resize", () => reevaluateMode());
    window.addEventListener("orientationchange", () =>
      setTimeout(() => reevaluateMode(), 0)
    );

    function reevaluateMode() {
      const nowMobile = isMobile();
      const nowCollision =
        nowMobile &&
        hasMobileCollision(RecentStream.seqMobile, FlashStream.seqMobile);
      if (nowMobile !== lastIsMobile || nowCollision !== lastCollision) {
        lastIsMobile = nowMobile;
        lastCollision = nowCollision;

        try {
          Combined.stop();
        } catch { }
        try {
          FlashStream.stop();
        } catch { }
        try {
          RecentStream.stop();
        } catch { }

        if (nowMobile && nowCollision) {
          Combined.seq = interleaveList(
            RecentStream.seqMobile.map((cfg) => ({ type: "recent", cfg })),
            FlashStream.seqMobile.map((cfg) => ({ type: "flash", cfg }))
          );
          Combined.start(true);
        } else {
          FlashStream.start(true);
          RecentStream.start(true);
        }
      }
    }

    console.info("[FOMO] Flash items:", FlashStream.seqDesktop);
    console.info("[FOMO] Recent items:", RecentStream.seqDesktop);
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
