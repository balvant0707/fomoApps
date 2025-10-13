document.addEventListener("DOMContentLoaded", async function () {
  if (window.__fomoOneFile) return; window.__fomoOneFile = true;

  const SHOP = (window.Shopify && Shopify.shop) || "";
  const ENDPOINT = `/apps/fomo/popup?shop=${SHOP}`;
  const SESSION_ENDPOINT = `/apps/fomo/session?shop=${SHOP}`;

  /* ========== helpers ========== */
  const safe = (v, fb = "") => (v === undefined || v === null) ? fb : String(v);
  const parseList = (raw) => {
    if (Array.isArray(raw)) return raw;
    try { const v = JSON.parse(raw ?? "[]"); return Array.isArray(v) ? v : (v ? [v] : []); }
    catch { return raw ? [raw] : []; }
  };
  const pageType   = () => (window.meta && window.meta.page?.pageType) || "allpage";
  const currHandle = () => (window.meta && window.meta.product?.handle) || "";

  const BREAKPOINT = 750, isMobile = () => window.innerWidth <= BREAKPOINT;
  const mobileTokens = (s) => {
    s = (s || "comfortable").toLowerCase();
    if (s === "compact") return { w: "min(92vw,340px)", pad: 10, img: 50, rad: 14, fs: 13 };
    if (s === "large")   return { w: "min(92vw,380px)", pad: 14, img: 64, rad: 18, fs: 15 };
    return { w: "min(92vw,360px)", pad: 12, img: 58, rad: 16, fs: 14 };
  };
  const normMB = (v, fb = "bottom") => { v = String(v || "").trim().toLowerCase(); return (v === "top" || v === "bottom") ? v : fb; };

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

  /**
   * pickSmart(list, i, fb):
   * - empty → fb
   * - length==1 → same item for all popups
   * - length>1 → rotate by index i; fallback random non-blank
   */
  function pickSmart(list, i, fb = "") {
    if (!Array.isArray(list) || list.length === 0) return fb;
    if (list.length === 1) return safe(list[0], fb);
    if (typeof i === "number") {
      const v = list[i % list.length];
      if (v !== undefined && v !== null && String(v).trim() !== "") return safe(v, fb);
    }
    let tries = 0, v = "";
    while (tries < 7 && (!v || String(v).trim() === "")) {
      v = list[Math.floor(Math.random() * list.length)];
      tries++;
    }
    return safe(v, fb);
  }

  // ---- SVG helpers (DB iconSvg -> data URL) ----
  function svgToDataUrl(svgRaw) {
    if (!svgRaw || typeof svgRaw !== "string") return "";
    // strip BOM/newlines/spaces at extremes
    const cleaned = svgRaw.replace(/^\uFEFF/, "").trim();
    // ensure it looks like svg
    if (!/^<svg[\s\S]*<\/svg>$/i.test(cleaned)) return "";
    return "data:image/svg+xml;utf8," + encodeURIComponent(cleaned);
  }

  // if API sends base64 instead of raw, handle that too (optional)
  function tryAnySvg(s) {
    if (!s) return "";
    if (/^<svg/i.test(s)) return svgToDataUrl(s); // raw xml
    // maybe already data url
    if (String(s).startsWith("data:image/svg+xml")) return s;
    // maybe base64 xml text
    try {
      const dec = atob(String(s));
      if (/^<svg/i.test(dec)) return svgToDataUrl(dec);
    } catch {}
    return "";
  }

  // resolve icon for a record + index:
  // priority: iconsJson[i] (svg/raw/url) → iconSvg → iconUrl/imageUrl → default
  function resolveIconForIndex(it, i = 0) {
    const iconsArr = parseList(it.iconsJson); // optional array (strings: svg raw OR urls)
    // 1) array provided?
    if (iconsArr.length) {
      const pick = pickSmart(iconsArr, i, "");
      // if SVG raw in array
      const svg = tryAnySvg(pick);
      if (svg) return svg;
      // else treat as normal URL
      if (pick) return pick;
    }
    // 2) single iconSvg column from DB
    const svg1 = tryAnySvg(it.iconSvg);
    if (svg1) return svg1;

    // 3) URLs in DB
    if (it.iconUrl)  return it.iconUrl;
    if (it.imageUrl) return it.imageUrl;

    // 4) nothing
    return "";
  }

  const FLAME_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="%23ffb02e" d="M31 4c5 8-3 13 3 19s11-5 11-5c6 15 3 19-1 23-4 4-8 6-13 6s-12-3-14-9c-2-6 1-12 7-17c4-3 6-7 7-17z"/><path fill="%23ef4545" d="M39 33c1 6-4 9-8 9s-10-3-9-9c1-6 7-8 9-14c3 6 7 8 8 14z"/><circle cx="32" cy="44" r="3" fill="%23000"/></svg>';

  // keyframes (once)
  if (!document.getElementById("kf-fomo-onefile")) {
    const st = document.createElement("style");
    st.id = "kf-fomo-onefile";
    st.textContent = `
      @keyframes fIn  { from{opacity:0;transform:translateY(10px) scale(.98)} to{opacity:1;transform:none} }
      @keyframes fOut { to  {opacity:0;transform:translateY(6px)  scale(.98)} }
      @keyframes fFadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes fFadeOut { from{opacity:1} to{opacity:0} }
      @keyframes fZoomIn  { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
      @keyframes fZoomOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(.96)} }
      @keyframes fSlideInLeft  { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:none} }
      @keyframes fSlideOutLeft { from{opacity:1;transform:none} to{opacity:0;transform:translateX(-12px)} }
      @keyframes fSlideInRight { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:none} }
      @keyframes fSlideOutRight{ from{opacity:1;transform:none} to{opacity:0;transform:translateX(12px)} }
      @keyframes fomoProgress { from{width:100%} to{width:0%} }
    `;
    document.head.appendChild(st);
  }

  /* === animation selector === */
  function getAnimPair(cfg, mode) {
    const val = (cfg?.animation || "").toLowerCase();
    if (val === "slide") {
      if (mode === "desktop") {
        const pos = (cfg.positionDesktop || cfg.position || "bottom-left").toLowerCase();
        const isLeft = pos.includes("left");
        return isLeft ? { inAnim: "fSlideInLeft", outAnim: "fSlideOutLeft" }
                      : { inAnim: "fSlideInRight", outAnim: "fSlideOutRight" };
      }
      return { inAnim: "fIn", outAnim: "fOut" };
    }
    if (val === "fade")   return { inAnim: "fFadeIn",   outAnim: "fFadeOut" };
    if (val === "zoom")   return { inAnim: "fZoomIn",   outAnim: "fZoomOut" };
    if (val === "bounce") return { inAnim: "fBounceIn", outAnim: "fBounceOut" };
    return { inAnim: "fIn", outAnim: "fOut" };
  }

  /* ========== positions ========== */
  function posDesktop(el, cfg) {
    el.style.top = el.style.right = el.style.bottom = el.style.left = "";
    const p = (cfg.positionDesktop || cfg.position || "bottom-left").toLowerCase();
    if (p === "bottom-right") { el.style.bottom = "20px"; el.style.right = "20px"; }
    else if (p === "top-left") { el.style.top = "20px"; el.style.left = "20px"; }
    else if (p === "top-right") { el.style.top = "20px"; el.style.right = "20px"; }
    else { el.style.bottom = "20px"; el.style.left = "20px"; }
  }
  function posMobile(el, cfg) {
    el.style.top = el.style.right = el.style.bottom = el.style.left = "";
    const p = normMB(cfg.mobilePosition || cfg.positionMobile || "bottom");
    if (p === "top") el.style.top = "calc(16px + env(safe-area-inset-top,0px))";
    else el.style.bottom = "calc(16px + env(safe-area-inset-bottom,0px))";
    el.style.left = "0"; el.style.right = "0"; el.style.margin = "0 auto";
  }

  /* ========== FLASH renderer ========== */
  function renderFlash(cfg, mode, onDone) {
    const mt = mobileTokens(cfg.mobileSize);
    const visibleMs = Math.max(1, +cfg.visibleSeconds) * 1000;
    const { inAnim, outAnim } = getAnimPair(cfg, mode);
    const wrap = document.createElement("div");
    wrap.className = "fomo-flash";
    wrap.style.cssText = `
      position:fixed; z-index:9999; box-sizing:border-box;
      width:${mode === "mobile" ? mt.w : ""}; overflow:hidden; cursor:pointer;
      border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
      background:${cfg.bgColor}; color:${cfg.fontColor || "#fff"};
      box-shadow:0 10px 30px rgba(0,0,0,.15);
      font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
      animation:${inAnim} .28s ease-out both;
    `;
    (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

    const card = document.createElement("div");
    card.className = "fomo-card";
    card.style.cssText = `
      display:flex; gap:12px; align-items:center; position:relative;
      padding:${mode === "mobile" ? mt.pad : 12}px 44px ${mode === "mobile" ? mt.pad : 12}px 14px;
      font-size:${Number(cfg.baseFontSize) || (mode === "mobile" ? mt.fs : 14)}px; line-height:1.35;
    `;

    const img = document.createElement("img");
    img.className = "fomo-icon";
    img.alt = "Flash";
    img.src = cfg.uploadedImage || cfg.image || FLAME_SVG;
    const iSize = mode === "mobile" ? mt.img : 58, iRad = mode === "mobile" ? Math.round(mt.img * .17) : 10;
    img.style.cssText = `width:${iSize}px;height:${iSize}px;object-fit:cover;border-radius:${iRad}px;background:transparent;flex:0 0 ${iSize}px;pointer-events:none;`;
    img.onerror = () => { img.src = FLAME_SVG; };

    const body = document.createElement("div");
    body.className = "fomo-body";
    body.style.cssText = `flex:1;min-width:0;pointer-events:none;`;

    const ttl = document.createElement("div");
    ttl.className = "fomo-title";
    ttl.textContent = safe(cfg.title, "");
    ttl.style.cssText = `font-weight:${safe(cfg.fontWeight, "700")}; color:${cfg.titleColor || "inherit"}; margin-bottom:4px;`;
    body.appendChild(ttl);

    const locLine = document.createElement("div");
    locLine.className = "fomo-locline";
    locLine.style.cssText = "opacity:.95;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;";

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
      tmt.style.cssText = `font-size:${Math.max(10, (Number(cfg.baseFontSize) || 14) - 1)}px; opacity:.8;`;
      locLine.appendChild(sep);
      locLine.appendChild(tmt);
    }
    body.appendChild(locLine);

    const close = document.createElement("button");
    close.type = "button"; close.setAttribute("aria-label", "Close"); close.innerHTML = "&times;";
    close.className = "fomo-close";
    close.style.cssText = `position:absolute;top:6px;right:10px;border:0;background:transparent;color:inherit;font-size:18px;line-height:1;padding:4px;cursor:pointer;opacity:.55;transition:.15s;z-index:1;`;
    close.onmouseenter = () => close.style.opacity = "1"; close.onmouseleave = () => close.style.opacity = ".8";

    card.appendChild(img); card.appendChild(body); card.appendChild(close);
    wrap.appendChild(card);

    const barWrap = document.createElement("div");
    barWrap.className = "fomo-progress-wrap";
    barWrap.style.cssText = `height:4px;width:100%;background:transparent`;
    const bar = document.createElement("div");
    bar.className = "fomo-progress";
    bar.style.cssText = `height:100%;width:100%;background:${cfg.progressColor || "#2dd4bf"};animation:fomoProgress ${visibleMs}ms linear forwards;transform-origin:left;`;
    barWrap.appendChild(bar);
    wrap.appendChild(barWrap);

    wrap.addEventListener("click", e => { if (e.target === close) return; if (cfg.productUrl) window.location.href = cfg.productUrl; });

    let tid = setTimeout(autoClose, visibleMs);
    function autoClose() {
      wrap.style.animation = `${outAnim} .22s ease-in forwards`;
      setTimeout(() => { wrap.remove(); onDone && onDone("auto"); }, 220);
    }
    close.onclick = (e) => { e.stopPropagation(); clearTimeout(tid); autoClose(); onDone && onDone("closed"); };

    document.body.appendChild(wrap);
    return wrap;
  }

  /* ========== RECENT renderer ========== */
  function renderRecent(cfg, mode, onDone) {
    const mt = mobileTokens(cfg.mobileSize);
    const visibleMs = Math.max(1, +cfg.visibleSeconds) * 1000;
    const { inAnim, outAnim } = getAnimPair(cfg, mode);

    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position:fixed; z-index:9999; box-sizing:border-box;
      width:${mode === "mobile" ? mt.w : ""}; overflow:hidden; cursor:pointer;
      border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
      background:${cfg.bgColor || "#8cf5f0"}; color:${cfg.fontColor || "#111"};
      box-shadow:0 10px 30px rgba(0,0,0,.15);
      font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
      animation:${inAnim} .28s ease-out both;
    `;
    (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

    const card = document.createElement("div");
    card.style.cssText = `
      display:flex; gap:12px; align-items:center; position:relative;
      padding:${mode === "mobile" ? mt.pad : 12}px 44px ${mode === "mobile" ? mt.pad : 12}px 14px;
      font-size:${Number(cfg.baseFontSize) || (mode === "mobile" ? mt.fs : 14)}px; line-height:1.35;
    `;

    const img = document.createElement("img");
    img.src = cfg.uploadedImage || cfg.image || "";
    img.alt = safe(cfg.productTitle, "Product");
    const iSize = mode === "mobile" ? mt.img : 58, iRad = mode === "mobile" ? Math.round(mt.img * .17) : 10;
    img.style.cssText = `width:${iSize}px;height:${iSize}px;object-fit:cover;border-radius:${iRad}px;background:#eee;flex:0 0 ${iSize}px;pointer-events:none;`;
    img.onerror = () => { img.style.display = "none"; };

    const body = document.createElement("div"); body.style.cssText = `flex:1;min-width:0;pointer-events:none;`;

    if (mode === "mobile") {
      const line = document.createElement("div");
      line.style.cssText = `opacity:1;margin-top:0;`;
      const fw = safe(cfg.fontWeight, "700"); const mark = cfg.titleColor || "#0a0a0a";
      line.innerHTML = `<span style="font-weight:${fw};color:${mark};">${safe(cfg.name, "Someone")}</span> from <span style="font-weight:${fw};color:${mark};">${safe(cfg.location, "Somewhere")}</span> `;
      line.appendChild(document.createTextNode(safe(cfg.message, "bought this product recently")));
      body.appendChild(line);
    } else {
      const who = document.createElement("div");
      const fw = safe(cfg.fontWeight, "700"); const mark = cfg.titleColor || "#0a0a0a";
      who.innerHTML = `<span style="font-weight:${fw};color:${mark};">${safe(cfg.name, "Someone")}</span> from <span style="font-weight:${fw};color:${mark};">${safe(cfg.location, "Somewhere")}</span>`;
      const msg = document.createElement("div");
      msg.textContent = safe(cfg.message, "bought this product recently");
      msg.style.cssText = `opacity:.9;margin-top:4px;`;
      body.appendChild(who); body.appendChild(msg);
    }

    const bottom = document.createElement("div");
    bottom.style.cssText = `margin-top:8px;display:flex;justify-content:flex-end;align-items:center;`;
    const time = document.createElement("div");
    time.textContent = safe(cfg.timeText, "");
    time.style.cssText = `font-size:${Math.max(10, (Number(cfg.baseFontSize) || 14) - 1)}px;opacity:.65;`;
    bottom.appendChild(time);

    const close = document.createElement("button");
    close.type = "button"; close.setAttribute("aria-label", "Close"); close.innerHTML = "&times;";
    close.style.cssText = `position:absolute;top:6px;right:10px;border:0;background:transparent;color:inherit;font-size:18px;line-height:1;padding:4px;cursor:pointer;opacity:.55;transition:.15s;z-index:1;`;
    close.onmouseenter = () => close.style.opacity = "1"; close.onmouseleave = () => close.style.opacity = ".8";

    body.appendChild(bottom);
    card.appendChild(img); card.appendChild(body); card.appendChild(close);
    wrap.appendChild(card);

    const barWrap = document.createElement("div"); barWrap.style.cssText = `height:4px;width:100%;background:rgba(0,0,0,.08)`;
    const bar = document.createElement("div");     bar.style.cssText = `height:100%;width:100%;background:${cfg.progressColor || "#3b82f6"};animation:fomoProgress ${visibleMs}ms linear forwards;transform-origin:left;`;
    barWrap.appendChild(bar); wrap.appendChild(barWrap);

    wrap.addEventListener("click", e => { if (e.target === close) return; if (cfg.productUrl) window.location.href = cfg.productUrl; });
    let tid = setTimeout(autoClose, visibleMs);
    function autoClose() {
      wrap.style.animation = `${outAnim} .22s ease-in forwards`;
      setTimeout(() => { wrap.remove(); onDone && onDone("auto"); }, 220);
    }
    close.onclick = (e) => { e.stopPropagation(); clearTimeout(tid); autoClose(); onDone && onDone("closed"); };

    document.body.appendChild(wrap);
    return wrap;
  }

  /* ========== stream factory (original order rotation) ========== */
  function createStream(name, renderer) {
    return {
      name, renderer,
      mode: isMobile() ? "mobile" : "desktop",
      seqDesktop: [], seqMobile: [],
      t: null, idx: 0, el: null,
      start(immediate = false) {
        const seq = (this.mode === "mobile") ? this.seqMobile : this.seqDesktop;
        if (!seq.length) return;
        const first = seq[this.idx % seq.length];
        const firstDelay = immediate ? 0 : Math.max(0, +first.durationSeconds || 0);
        const showNext = (delay) => {
          this.t = setTimeout(() => {
            const s = (this.mode === "mobile") ? this.seqMobile : this.seqDesktop;
            const cfg = s[this.idx % s.length];
            this.el = this.renderer(cfg, this.mode, () => {
              const gap = Math.max(0, +cfg.alternateSeconds || 4);
              this.idx = (this.idx + 1) % s.length;
              showNext(gap);
            });
          }, Math.max(0, delay) * 1000);
        };
        showNext(firstDelay);
      },
      resize() {
        const nm = isMobile() ? "mobile" : "desktop";
        if (nm !== this.mode) {
          if (this.t) clearTimeout(this.t);
          if (this.el) try { this.el.remove(); } catch { }
          this.mode = nm;
          this.start(true);
        }
      }
    };
  }

  const Flash  = createStream("flash",  renderFlash);
  const Recent = createStream("recent", renderRecent);
  window.addEventListener("resize", () => { Flash.resize(); Recent.resize(); });
  window.addEventListener("orientationchange", () => setTimeout(() => { Flash.resize(); Recent.resize(); }, 0));

  /* ========== session check & fetch & build (DB iconSvg + rotation) ========== */
  try {
    // Check session readiness first
    let sessionReady = false;
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    while (!sessionReady && retries < maxRetries) {
      try {
        const sessionResponse = await fetch(SESSION_ENDPOINT, { headers: { "Content-Type": "application/json" } });
        if (sessionResponse.ok) {
          try {
            const sessionData = await sessionResponse.json();
            sessionReady = sessionData.sessionReady;
            console.log("[FOMO] Session check:", sessionData);
          } catch (jsonError) {
            console.error("[FOMO] Session response not JSON:", jsonError);
            sessionReady = false;
          }
          if (!sessionReady) {
            console.warn("[FOMO] Session not ready, retrying in", retryDelay, "ms");
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retries++;
          }
        } else {
          console.warn("[FOMO] Session check failed:", sessionResponse.status);
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      } catch (e) {
        console.warn("[FOMO] Session check error:", e);
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (!sessionReady) {
      console.error("[FOMO] Session not ready after retries, aborting");
      return;
    }

    let data = { records: [] };
    try {
      const r = await fetch(ENDPOINT, { headers: { "Content-Type": "application/json" } });
      if (r.ok) {
        try {
          data = await r.json();
        } catch (jsonError) {
          console.error("[FOMO] Popup response not JSON:", jsonError);
          data = { records: [] };
        }
      }
    } catch (e) { console.warn("[FOMO] fetch failed", e); }

    const recs = Array.isArray(data?.records) ? data.records : [];
    const pt = pageType(), ch = currHandle(), isPd = pt === "product";

    const flashConfigs = [], recentConfigs = [];

    for (const it of recs) {
      if (!(it?.enabled == 1 || it?.enabled === "1" || it?.enabled === true)) continue;
      if (!["flash", "recent"].includes(it.key)) continue;

      const showType = it.showType || "allpage";
      if (!["all", "allpage", pt].includes(showType)) continue;

      // source arrays
      const titlesArr = parseList(it.messageTitlesJson); // flash: title | recent: name
      const timesArr  = parseList(it.namesJson);         // flash: timeText | recent: timeText
      const locsArr   = parseList(it.locationsJson);     // both: location
      let handlesArr  = parseList(it.selectedProductsJson);
      const mbPosArr  = parseList(it.mobilePositionJson);

      // randomize products order so they vary
      if (handlesArr.length > 1) handlesArr = shuffled(handlesArr);

      const defaultMB = normMB(it.mobilePosition || it.positionMobile || (mbPosArr[0] || "bottom"));

      const COMMON = {
        positionDesktop: it.positionDesktop || it.position,
        mobileSize: it.mobileSize,
        animation: it.animation,
        fontFamily: it.fontFamily,
        fontWeight: it.fontWeight,
        baseFontSize: Number(it.fontSize ?? it.rounded ?? 0) || null,
        cornerRadius: Number(it.cornerRadius ?? 16),
        visibleSeconds: Number(it.visibleSeconds || 6),
        alternateSeconds: Number(it.alternateSeconds || 4),
        // ↓ uploadedImage will be set per-item using resolveIconForIndex
        progressColor: it.progressColor,
        bgColor: it.bgColor,
        fontColor: it.msgColor,
        titleColor: it.titleColor
      };

      // ---------- FLASH ----------
      if (it.key === "flash") {
        const n = Math.max(
          titlesArr.length || 0,
          locsArr.length   || 0,
          timesArr.length  || 0,
          mbPosArr.length  || 0,
          1
        );
        for (let i = 0; i < n; i++) {
          const title    = pickSmart(titlesArr, i, safe(it.messageText, "Flash Sale"));
          const location = pickSmart(locsArr,   i, "Limited time");
          const timeText = pickSmart(timesArr,  i, safe(it.relativeTimeText, "Just now"));
          const mbPos    = pickSmart(mbPosArr,  i, defaultMB);
          const iconSrc  = resolveIconForIndex(it, i) || ""; // DB iconSvg/iconsJson/url

          flashConfigs.push({
            title,
            location,
            timeText,
            uploadedImage: iconSrc,
            productUrl: safe(it.ctaUrl, "#"),
            mobilePosition: normMB(mbPos, defaultMB),
            durationSeconds: Number(it.durationSeconds || 0),
            ...COMMON
          });
        }
        continue;
      }

      // ---------- RECENT ----------
      const COMMON_RECENT = {
        bgColor: it.bgColor || "#8cf5f0",
        fontColor: it.msgColor || "#111",
        titleColor: it.titleColor || "#0a0a0a",
        progressColor: it.progressColor || "#3b82f6",
        positionDesktop: it.positionDesktop || it.position,
        mobileSize: it.mobileSize,
        animation: it.animation,
        fontFamily: it.fontFamily,
        fontWeight: it.fontWeight,
        baseFontSize: Number(it.fontSize ?? it.rounded ?? 0) || null,
        cornerRadius: Number(it.cornerRadius ?? 16),
        visibleSeconds: Number(it.visibleSeconds || 6),
        alternateSeconds: Number(it.alternateSeconds || 4)
      };

      const includeCurrent = (it.includeCurrentProduct !== false);

      if (isPd && includeCurrent && ch) {
        try {
          const response = await fetch(`/products/${ch}.js`);
          if (response.ok) {
            try {
              const p = await response.json();
              const iconSrc0 = resolveIconForIndex(it, 0);
              recentConfigs.push({
                productTitle: p?.title || ch,
                name: pickSmart(titlesArr, 0, "Someone"),
                location: pickSmart(locsArr, 0, "Somewhere"),
                message: safe(it.messageText, "bought this product recently"),
                image: (p?.images && p.images[0]) || "",
                productUrl: p?.url || `/products/${ch}`,
                uploadedImage: iconSrc0,
                timeText: pickSmart(timesArr, 0, safe(it.relativeTimeText, "Just now")),
                mobilePosition: normMB(pickSmart(mbPosArr, 0, defaultMB), defaultMB),
                durationSeconds: Number(it.currentFirstDelaySeconds ?? it.durationSeconds ?? 0),
                ...COMMON_RECENT
              });
            } catch (jsonError) {
              console.warn("[FOMO] Current product JSON parse failed", jsonError);
            }
          } else {
            console.warn("[FOMO] Current product fetch not ok", response.status);
          }
        } catch (e) { console.warn("[FOMO] current product fetch failed", e); }
      }

      const n = Math.max(
        handlesArr.length || 0,
        titlesArr.length  || 0,
        locsArr.length    || 0,
        timesArr.length   || 0,
        mbPosArr.length   || 0,
        1
      );

      for (let i = 0; i < n; i++) {
        const handle = (handlesArr.length ? handlesArr[i % handlesArr.length] : "");
        try {
          let p = null;
          if (handle) {
            const response = await fetch(`/products/${handle}.js`);
            if (response.ok) {
              try {
                p = await response.json();
              } catch (jsonError) {
                console.warn("[FOMO] Product JSON parse failed for", handle, jsonError);
              }
            } else {
              console.warn("[FOMO] Product fetch not ok for", handle, response.status);
            }
          }

          const iconSrc = resolveIconForIndex(it, i);

          recentConfigs.push({
            productTitle: (p?.title || handle || "Product"),
            name: pickSmart(titlesArr, i, "Someone"),
            location: pickSmart(locsArr, i, "Somewhere"),
            message: safe(it.messageText, "bought this product recently"),
            image: (p?.images && p.images[0]) || "",
            productUrl: (p?.url || (handle ? `/products/${handle}` : (includeCurrent && ch ? `/products/${ch}` : "#"))),
            uploadedImage: iconSrc,
            timeText: pickSmart(timesArr, i, safe(it.relativeTimeText, "Just now")),
            mobilePosition: normMB(pickSmart(mbPosArr, i, defaultMB), defaultMB),
            durationSeconds: Number(it.durationSeconds || 0),
            ...COMMON_RECENT
          });
        } catch (e) { console.warn("[FOMO] product fetch failed", handle, e); }
      }
    }

    // start streams
    const clone = (a) => Array.isArray(a) ? a.slice() : [];
    const FlashStream  = window.FlashStream  || createStream("flash",  renderFlash);
    const RecentStream = window.RecentStream || createStream("recent", renderRecent);
    window.FlashStream = FlashStream;
    window.RecentStream = RecentStream;

    FlashStream.seqDesktop  = clone(flashConfigs);
    FlashStream.seqMobile   = clone(flashConfigs);
    RecentStream.seqDesktop = clone(recentConfigs);
    RecentStream.seqMobile  = clone(recentConfigs);

    FlashStream.start(false);
    RecentStream.start(false);

    console.log("[FOMO] Flash items:", flashConfigs);
    console.log("[FOMO] Recent items:", recentConfigs);

  } catch (err) {
    console.error("[FOMO] build error:", err);
  }
});
