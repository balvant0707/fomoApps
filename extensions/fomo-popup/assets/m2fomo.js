document.addEventListener("DOMContentLoaded", async function () {
  if (window.__fomoOneFile) return; window.__fomoOneFile = true;

  const ENDPOINT = `/apps/fomo/popup?shop=${(window.Shopify && Shopify.shop) || ""}`;

  /* ========== helpers ========== */
  const safe = (v, fb = "") => (v === undefined || v === null) ? fb : String(v);
  const parseList = (raw) => { if (Array.isArray(raw)) return raw; try { const v = JSON.parse(raw ?? "[]"); return Array.isArray(v) ? v : (v ? [v] : []); } catch { return raw ? [raw] : []; } };
  const pageType = () => (window.meta && window.meta.page?.pageType) || "allpage";
  const currHandle = () => (window.meta && window.meta.product?.handle) || "";
  const BREAKPOINT = 750, isMobile = () => window.innerWidth <= BREAKPOINT;
  const mobileTokens = (s) => {
    s = (s || "comfortable").toLowerCase();
    if (s === "compact") return { w: "min(92vw,340px)", pad: 10, img: 50, rad: 14, fs: 13 };
    if (s === "large") return { w: "min(92vw,380px)", pad: 14, img: 64, rad: 18, fs: 15 };
    return { w: "min(92vw,360px)", pad: 12, img: 58, rad: 16, fs: 14 };
  };
  const normMB = (v, fb = "bottom") => { v = String(v || "").trim().toLowerCase(); return (v === "top" || v === "bottom") ? v : fb; };

  const FLAME_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="%23ffb02e" d="M31 4c5 8-3 13 3 19s11-5 11-5c6 15 3 19-1 23-4 4-8 6-13 6s-12-3-14-9c-2-6 1-12 7-17c4-3 6-7 7-17z"/><path fill="%23ef4545" d="M39 33c1 6-4 9-8 9s-10-3-9-9c1-6 7-8 9-14c3 6 7 8 8 14z"/><circle cx="32" cy="44" r="3" fill="%23000"/></svg>';

  // keyframes (once)
  if (!document.getElementById("kf-fomo-onefile")) {
    const st = document.createElement("style");
    st.id = "kf-fomo-onefile";
    st.textContent = `
      @keyframes fIn  { from{opacity:0;transform:translateY(10px) scale(.98)} to{opacity:1;transform:none} }
      @keyframes fOut { to  {opacity:0;transform:translateY(6px)  scale(.98)} }
      @keyframes fomoProgress { from{width:100%} to{width:0%} }
    `;
    document.head.appendChild(st);
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

  /* ========== FLASH renderer (SVG, Title, Location + TimeText same line) ========== */
  function renderFlash(cfg, mode, onDone) {
    const mt = mobileTokens(cfg.mobileSize);
    const visibleMs = Math.max(1, +cfg.visibleSeconds) * 1000;

    const wrap = document.createElement("div");
    wrap.className = "fomo-flash";
    wrap.style.cssText = `
      position:fixed; z-index:9999; box-sizing:border-box;
      width:${mode === "mobile" ? mt.w : ""}; overflow:hidden; cursor:pointer;
      border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
      background:${cfg.bgColor || "#111"}; color:${cfg.fontColor || "#fff"};
      box-shadow:0 10px 30px rgba(0,0,0,.15);
      font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
      animation:fIn .28s ease-out both;
    `;
    (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

    const card = document.createElement("div");
    card.className = "fomo-card";
    card.style.cssText = `
      display:flex; gap:12px; align-items:start; position:relative;
      padding:${mode === "mobile" ? mt.pad : 12}px 44px ${mode === "mobile" ? mt.pad : 12}px 14px;
      font-size:${Number(cfg.baseFontSize) || (mode === "mobile" ? mt.fs : 14)}px; line-height:1.35;
    `;

    // SVG / Image
    const img = document.createElement("img");
    img.className = "fomo-icon";
    img.alt = "Flash";
    img.src = cfg.uploadedImage || cfg.image || FLAME_SVG;
    const iSize = mode === "mobile" ? mt.img : 58, iRad = mode === "mobile" ? Math.round(mt.img * .17) : 10;
    img.style.cssText = `width:${iSize}px;height:${iSize}px;object-fit:cover;border-radius:${iRad}px;background:#222;flex:0 0 ${iSize}px;pointer-events:none;`;
    img.onerror = () => { img.src = FLAME_SVG; };

    // Body
    const body = document.createElement("div");
    body.className = "fomo-body";
    body.style.cssText = `flex:1;min-width:0;pointer-events:none;`;

    // Title
    const ttl = document.createElement("div");
    ttl.className = "fomo-title";
    ttl.textContent = safe(cfg.title, "");
    ttl.style.cssText = `font-weight:${safe(cfg.fontWeight, "700")}; color:${cfg.titleColor || "inherit"}; margin-bottom:4px;`;
    body.appendChild(ttl);

    // Location + TimeText in one line
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

    // Close
    const close = document.createElement("button");
    close.type = "button"; close.setAttribute("aria-label", "Close"); close.innerHTML = "&times;";
    close.className = "fomo-close";
    close.style.cssText = `position:absolute;top:6px;right:10px;border:0;background:transparent;color:inherit;font-size:18px;line-height:1;padding:4px;cursor:pointer;opacity:.55;transition:.15s;z-index:1;`;
    close.onmouseenter = () => close.style.opacity = "1"; close.onmouseleave = () => close.style.opacity = ".8";

    card.appendChild(img);
    card.appendChild(body);
    card.appendChild(close);
    wrap.appendChild(card);

    // progress
    const barWrap = document.createElement("div");
    barWrap.className = "fomo-progress-wrap";
    barWrap.style.cssText = `height:4px;width:100%;background:rgba(255,255,255,.12)`;
    const bar = document.createElement("div");
    bar.className = "fomo-progress";
    bar.style.cssText = `height:100%;width:100%;background:${cfg.progressColor || "#2dd4bf"};animation:fomoProgress ${visibleMs}ms linear forwards;transform-origin:left;`;
    barWrap.appendChild(bar);
    wrap.appendChild(barWrap);

    wrap.addEventListener("click", e => { if (e.target === close) return; if (cfg.productUrl) window.location.href = cfg.productUrl; });

    let tid = setTimeout(autoClose, visibleMs);
    function autoClose() { wrap.style.animation = "fOut .22s ease-in forwards"; setTimeout(() => { wrap.remove(); onDone && onDone("auto"); }, 220); }
    close.onclick = (e) => { e.stopPropagation(); clearTimeout(tid); autoClose(); onDone && onDone("closed"); };

    document.body.appendChild(wrap);
    return wrap;
  }

  /* ========== RECENT renderer (unchanged) ========== */
  function renderRecent(cfg, mode, onDone) {
    const mt = mobileTokens(cfg.mobileSize);
    const visibleMs = Math.max(1, +cfg.visibleSeconds) * 1000;

    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position:fixed; z-index:9999; box-sizing:border-box;
      width:${mode === "mobile" ? mt.w : ""}; overflow:hidden; cursor:pointer;
      border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px;
      background:${cfg.bgColor || "#8cf5f0"}; color:${cfg.fontColor || "#111"};
      box-shadow:0 10px 30px rgba(0,0,0,.15);
      font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
      animation:fIn .28s ease-out both;
    `;
    (mode === "mobile" ? posMobile : posDesktop)(wrap, cfg);

    const card = document.createElement("div");
    card.style.cssText = `
      display:flex; gap:12px; align-items:start; position:relative;
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
    const bar = document.createElement("div"); bar.style.cssText = `height:100%;width:100%;background:${cfg.progressColor || "#3b82f6"};animation:fomoProgress ${visibleMs}ms linear forwards;transform-origin:left;`;
    barWrap.appendChild(bar); wrap.appendChild(barWrap);

    wrap.addEventListener("click", e => { if (e.target === close) return; if (cfg.productUrl) window.location.href = cfg.productUrl; });
    let tid = setTimeout(autoClose, visibleMs);
    function autoClose() { wrap.style.animation = "fOut .22s ease-in forwards"; setTimeout(() => { wrap.remove(); onDone && onDone("auto"); }, 220); }
    close.onclick = (e) => { e.stopPropagation(); clearTimeout(tid); autoClose(); onDone && onDone("closed"); };

    document.body.appendChild(wrap);
    return wrap;
  }

  /* ========== stream factory ========== */
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

  const Flash = createStream("flash", renderFlash);
  const Recent = createStream("recent", renderRecent);
  window.addEventListener("resize", () => { Flash.resize(); Recent.resize(); });
  window.addEventListener("orientationchange", () => setTimeout(() => { Flash.resize(); Recent.resize(); }, 0));

  /* ========== fetch & split ========== */
  try {
    let data = { records: [] };
    try {
      const r = await fetch(ENDPOINT, { headers: { "Content-Type": "application/json" } });
      if (r.ok) data = await r.json();
    } catch (e) { console.warn("[FOMO] fetch failed", e); }

    const recs = Array.isArray(data?.records) ? data.records : [];
    const pt = pageType(), ch = currHandle(), isPd = pt === "product";

    const flashConfigs = [], recentConfigs = [];

    for (const it of recs) {
      if (!(it?.enabled == 1 || it?.enabled === "1" || it?.enabled === true)) continue;
      if (!["flash", "recent"].includes(it.key)) continue;

      const showType = it.showType || "allpage";
      if (!["all", "allpage", pt].includes(showType)) continue;

      const names = parseList(it.messageTitlesJson);  // titles
      const times = parseList(it.namesJson);          // timeText list
      const locs = parseList(it.locationsJson);      // locations
      const handles = parseList(it.selectedProductsJson);
      const mbPos = parseList(it.mobilePositionJson);

      const defaultMB = normMB(it.mobilePosition || it.positionMobile || (mbPos[0] || "bottom"));

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
        uploadedImage: it.iconUrl || it.imageUrl || "",
        progressColor: it.progressColor,
        bgColor: it.bgColor,
        fontColor: it.msgColor,
        titleColor: it.titleColor
      };

      // FLASH (exact fields)
      if (it.key === "flash") {
        const n = Math.max(names.length, locs.length, times.length) || 1;
        for (let i = 0; i < n; i++) {
          flashConfigs.push({
            title: safe(names[i]),
            location: safe(locs[i]),
            timeText: safe(times[i]),
            productUrl: safe(it.ctaUrl, "#"),
            mobilePosition: normMB(mbPos[i], defaultMB),
            durationSeconds: Number(it.durationSeconds || 0),
            ...COMMON
          });
        }
        continue;
      }

      // RECENT (unchanged)
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
        alternateSeconds: Number(it.alternateSeconds || 4),
        uploadedImage: it.iconUrl || it.imageUrl || ""
      };

      const includeCurrent = (it.includeCurrentProduct !== false);
      if (isPd && includeCurrent && ch && !(handles || []).includes(ch)) {
        try {
          const p = await fetch(`/products/${ch}.js`).then(r => r.json());
          recentConfigs.push({
            productTitle: p?.title || ch,
            name: safe(it.currentName, safe(names[0], "Someone")),
            location: safe(it.currentLocation, safe(locs[0], "")),
            message: safe(it.messageText, "bought this product recently"),
            image: (p?.images && p.images[0]) || "",
            productUrl: p?.url || `/products/${ch}`,
            timeText: safe(it.currentTime, safe(it.relativeTimeText, "")),
            mobilePosition: normMB(mbPos[0], defaultMB),
            durationSeconds: Number(it.currentFirstDelaySeconds ?? it.durationSeconds ?? 0),
            ...COMMON_RECENT
          });
        } catch (e) { console.warn("[FOMO] current product fetch failed", e); }
      }

      for (let i = 0; i < handles.length; i++) {
        const handle = handles[i]; if (isPd && handle === ch) continue;
        try {
          const p = await fetch(`/products/${handle}.js`).then(r => r.json());
          recentConfigs.push({
            productTitle: p?.title || handle,
            name: safe(names[i], "Someone"),
            location: safe(locs[i], ""),
            message: safe(it.messageText, "bought this product recently"),
            image: (p?.images && p.images[0]) || "",
            productUrl: p?.url || `/products/${handle}`,
            timeText: safe(times[i], safe(it.relativeTimeText, "")),
            mobilePosition: normMB(mbPos[i], defaultMB),
            durationSeconds: Number(it.durationSeconds || 0),
            ...COMMON_RECENT
          });
        } catch (e) { console.warn("[FOMO] product fetch failed", handle, e); }
      }
    }

    // start
    const clone = (a) => Array.isArray(a) ? a.slice() : [];
    const Flash = window.FlashStream = (window.FlashStream || null) || createStream("flash", renderFlash);
    const Recent = window.RecentStream = (window.RecentStream || null) || createStream("recent", renderRecent);

    Flash.seqDesktop = clone(flashConfigs); Flash.seqMobile = clone(flashConfigs);
    Recent.seqDesktop = clone(recentConfigs); Recent.seqMobile = clone(recentConfigs);
    Flash.start(false); Recent.start(false);

    console.log("[FOMO] Flash:", flashConfigs);
    console.log("[FOMO] Recent:", recentConfigs);

  } catch (err) {
    console.error("[FOMO] build error:", err);
  }
});