document.addEventListener("DOMContentLoaded", async function () {
  if (window.__fomoScheduled) return; window.__fomoScheduled = true;

  const ENDPOINT = `/apps/fomo/popup?shop=${(window.Shopify && Shopify.shop) || ""}`;
  if (!ENDPOINT) return;

  /* =============== helpers =============== */
  const safe = (v, fb = "") => (v === undefined || v === null) ? fb : String(v);
  function parseList(raw) {
    if (Array.isArray(raw)) return raw;
    try {
      const v = JSON.parse(raw ?? "[]");
      return Array.isArray(v) ? v : (v ? [v] : []);
    } catch { return raw ? [raw] : []; }
  }

  const pageType = () => (window.meta && window.meta.page && window.meta.page.pageType) || "allpage";
  const currHandle = () => (window.meta && window.meta.product && window.meta.product.handle) || "";

  const BREAKPOINT = 750;                        // ≤750 = mobile, ≥751 = desktop
  const isMobile = () => window.innerWidth <= BREAKPOINT;

  function mobileTokens(size) {
    const s = (size || "comfortable").toLowerCase();
    if (s === "compact") return { w: "min(92vw,340px)", pad: 10, img: 50, rad: 14, fs: 13 };
    if (s === "large") return { w: "min(92vw,380px)", pad: 14, img: 64, rad: 18, fs: 15 };
    return { w: "min(92vw,360px)", pad: 12, img: 58, rad: 16, fs: 14 };
  }
  function animNames(a) {
    const k = (a || "fade").toLowerCase();
    if (k === "slide") return { in: "fomoSlideIn", out: "fomoSlideOut" };
    if (k === "bounce") return { in: "fomoBounceIn", out: "fomoFadeOut" };
    if (k === "zoom") return { in: "fomoZoomIn", out: "fomoZoomOut" };
    return { in: "fomoFadeIn", out: "fomoFadeOut" };
  }
  if (!document.getElementById("fomo-anim-kf")) {
    const st = document.createElement("style");
    st.id = "fomo-anim-kf";
    st.textContent = `
      @keyframes fomoFadeIn  { from{opacity:0;transform:translateY(6px) scale(.98)} to{opacity:1;transform:none} }
      @keyframes fomoFadeOut { to  {opacity:0;transform:translateY(6px) scale(.98)} }
      @keyframes fomoSlideIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
      @keyframes fomoSlideOut { to  {opacity:0;transform:translateY(10px)} }
      @keyframes fomoZoomIn  { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
      @keyframes fomoZoomOut { to  {opacity:0;transform:scale(.96)} }
      @keyframes fomoBounceIn { 0%{opacity:0;transform:translateY(14px) scale(.98)} 60%{opacity:1;transform:translateY(-4px) scale(1.01)} 100%{opacity:1;transform:none} }
      @keyframes fomoProgress { from{width:100%} to{width:0%} }
    `;
    document.head.appendChild(st);
  }

  // normalize Top/Bottom → top/bottom
  const normMB = (v, fb = "bottom") => {
    const x = String(v || "").trim().toLowerCase();
    return (x === "top" || x === "bottom") ? x : fb;
  };

  /* ===== positions ===== */
  function applyDesktopPosition(el, cfg) {
    el.style.top = el.style.right = el.style.bottom = el.style.left = "";
    el.style.marginLeft = el.style.marginRight = "";
    el.style.transform = "none";
    const dp = (cfg.positionDesktop || cfg.position || "bottom-left").toLowerCase();
    switch (dp) {
      case "bottom-right": el.style.bottom = "20px"; el.style.right = "20px"; break;
      case "top-left": el.style.top = "20px"; el.style.left = "20px"; break;
      case "top-right": el.style.top = "20px"; el.style.right = "20px"; break;
      default: el.style.bottom = "20px"; el.style.left = "20px"; break;
    }
  }
  // HARD center for mobile: left:0; right:0; margin:auto; (works even if theme uses transforms)
  function applyMobilePosition(el, cfg) {
    el.style.top = el.style.right = el.style.bottom = el.style.left = "";
    el.style.marginLeft = el.style.marginRight = "";
    el.style.transform = "none";
    const mp = normMB(cfg.mobilePosition || cfg.positionMobile || "bottom");
    if (mp === "top") el.style.top = "calc(16px + env(safe-area-inset-top, 0px))";
    else el.style.bottom = "calc(16px + env(safe-area-inset-bottom, 0px))";
    el.style.left = "0";
    el.style.right = "0";
    el.style.marginLeft = "auto";
    el.style.marginRight = "auto";
  }

  /* ===== render (mode-specific) ===== */
  function renderPopup(cfg, mode, onDone) {
    const visibleMs = Math.max(1, +cfg.visibleSeconds || 6) * 1000;
    const mt = mobileTokens(cfg.mobileSize);
    const an = animNames(cfg.animation);

    const baseFontSize = Number(cfg.baseFontSize) > 0
      ? Number(cfg.baseFontSize)
      : (mode === "mobile" ? mt.fs : 14);

    const wrap = document.createElement("div");
    wrap.role = "status"; wrap.setAttribute("aria-live", "polite");
    wrap.style.cssText = `
      position:fixed; z-index:9999; box-sizing:border-box;
      width:${mode === "mobile" ? mt.w : "360px"}; max-width:360px;
      border-radius:${Number(cfg.cornerRadius ?? (mode === "mobile" ? mt.rad : 16))}px; overflow:hidden;
      background:${cfg.bgColor || "#fff"}; color:${cfg.fontColor || "#111"};
      box-shadow:0 10px 30px rgba(0,0,0,.15);
      font-family:${cfg.fontFamily || "system-ui,-apple-system,Segoe UI,Roboto,sans-serif"};
      animation:${an.in} .28s ease-out both;
      cursor:pointer;
    `;
    (mode === "mobile" ? applyMobilePosition : applyDesktopPosition)(wrap, cfg);

    const card = document.createElement("div");
    card.style.cssText = `
      display:flex; gap:12px; align-items:flex-start;
      padding:${mode === "mobile" ? mt.pad : 12}px 14px; position:relative;
      font-size:${baseFontSize}px; line-height:1.35;
    `;

    const img = document.createElement("img");
    img.alt = safe(cfg.productTitle, "Product");
    img.src = cfg.uploadedImage || cfg.image || "";
    const iSize = mode === "mobile" ? mt.img : 58;
    const iRad = mode === "mobile" ? Math.round(mt.img * 0.17) : 10;
    img.style.cssText = `width:${iSize}px;height:${iSize}px;object-fit:cover;border-radius:${iRad}px;background:#f2f2f2;flex:0 0 ${iSize}px;pointer-events:none;`;

    const body = document.createElement("div");
    body.style.cssText = `flex:1;min-width:0;pointer-events:none;`;

    /* ===== PRODUCT TITLE (TOGGLE) =====
    // 👉 Un-comment this block to SHOW Product Title. Keep it commented to HIDE.
    const title = document.createElement("div");
    title.textContent = safe(cfg.productTitle);
    title.style.cssText = `
      font-weight:${safe(cfg.fontWeight, "700")};
      color:${cfg.titleColor || "#111"};
      margin-bottom:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    `;
    body.appendChild(title);
    ===== END PRODUCT TITLE ===== */

    // Name (messageTitlesJson) + Location (locationsJson) — BOTH use DB fontWeight + Title Color
    const who = document.createElement("div");
    const fw = safe(cfg.fontWeight, "700");
    const markColor = cfg.titleColor;
    who.innerHTML =
      `<span style="font-weight:${fw}; color:${markColor};">${safe(cfg.name, "Someone")}</span>` +
      ` from <span style="font-weight:${fw}; color:${markColor};">${safe(cfg.location, "Somewhere")}</span>`;

    const msg = document.createElement("div");
    msg.textContent = safe(cfg.message, "bought this product recently");
    msg.style.cssText = `opacity:.9;margin-top:4px;`;

    const bottomRow = document.createElement("div");
    bottomRow.style.cssText = `margin-top:8px;display:flex;justify-content:flex-end;align-items:center;`;
    const timeEl = document.createElement("div");
    timeEl.textContent = safe(cfg.timeText);
    timeEl.style.cssText = `font-size:${Math.max(10, baseFontSize - 1)}px;opacity:.65;`;
    bottomRow.appendChild(timeEl);

    const close = document.createElement("button");
    close.type = "button"; close.setAttribute("aria-label", "Close"); close.innerHTML = "&times;";
    close.style.cssText = `position:absolute;top:6px;right:8px;border:0;background:transparent;color:inherit;font-size:18px;line-height:1;padding:4px;cursor:pointer;opacity:.5;transition:opacity .15s;pointer-events:auto;`;
    close.onmouseenter = () => close.style.opacity = "1";
    close.onmouseleave = () => close.style.opacity = ".5";

    // assemble
    body.appendChild(who);
    body.appendChild(msg);
    body.appendChild(bottomRow);
    card.appendChild(img); card.appendChild(body); card.appendChild(close);
    wrap.appendChild(card);

    const barWrap = document.createElement("div");
    barWrap.style.cssText = `height:4px;width:100%;background:rgba(0,0,0,.08);`;
    const bar = document.createElement("div");
    bar.style.cssText = `height:100%;width:100%;background:${cfg.progressColor || "#3b82f6"};animation:fomoProgress linear forwards;animation-duration:${visibleMs}ms;transform-origin:left center;pointer-events:none;`;
    barWrap.appendChild(bar); wrap.appendChild(barWrap);

    wrap.addEventListener("click", e => { if (e.target === close) return; if (cfg.productUrl) window.location.href = cfg.productUrl; });

    let tid = setTimeout(autoClose, visibleMs);
    function autoClose() { wrap.style.animation = `${an.out} .22s ease-in forwards`; setTimeout(() => { wrap.remove(); onDone && onDone("auto"); }, 220); }
    close.onclick = (e) => { e.stopPropagation(); clearTimeout(tid); autoClose(); onDone && onDone("closed"); };

    document.body.appendChild(wrap);
    return wrap;
  }

  /* ===== two queues + instant switch at 750 ===== */
  const Manager = {
    mode: isMobile() ? "mobile" : "desktop",
    seqDesktop: [],
    seqMobile: [],
    tId: null,
    activeEl: null,

    clearActive() { if (this.tId) { clearTimeout(this.tId); this.tId = null; } if (this.activeEl) { try { this.activeEl.remove(); } catch { } this.activeEl = null; } },

    start(mode, immediate = false) {
      this.clearActive(); this.mode = mode;
      const seq = (mode === "mobile") ? this.seqMobile : this.seqDesktop;
      if (!seq.length) return;

      let idx = 0;
      const showNext = (delay) => {
        this.tId = setTimeout(() => {
          const cfg = seq[idx];
          this.activeEl = renderPopup(cfg, mode, () => {
            const gap = Math.max(0, +cfg.alternateSeconds || 4);
            idx = (idx + 1) % seq.length;
            showNext(gap);
          });
        }, Math.max(0, delay) * 1000);
      };
      const firstDelay = immediate ? 0 : Math.max(0, +seq[0].durationSeconds || 0);
      showNext(firstDelay);
    },

    handleResize() {
      const newMode = isMobile() ? "mobile" : "desktop";
      if (newMode !== this.mode) this.start(newMode, true);
    }
  };
  window.addEventListener("resize", () => Manager.handleResize());
  window.addEventListener("orientationchange", () => setTimeout(() => Manager.handleResize(), 0));

  /* ===== fetch & build (mobilePositionJson supported) ===== */
  try {
    let data = { records: [] };
    try {
      const res = await fetch(ENDPOINT, { method: "GET", headers: { "Content-Type": "application/json" } });
      if (res.ok) data = await res.json(); else throw new Error("HTTP " + res.status);
    } catch (e) {
      console.error("[FOMO] proxy fetch error:", e); data = { records: [] };
    }

    const recs = Array.isArray(data?.records) ? data.records : [];
    const pt = pageType();
    const ch = currHandle();
    const isPd = pt === "product";

    for (const item of recs) {
      if (!(item?.enabled === 1 || item?.enabled === "1" || item?.enabled === true)) continue;
      if (item.key && item.key !== "recent") continue;

      const showType = item.showType || "allpage";
      if (showType !== "allpage" && showType !== pt) continue;

      const namesArr = parseList(item.messageTitlesJson);   // NAME
      const timesArr = parseList(item.namesJson);           // TIME
      const locationsArr = parseList(item.locationsJson);   // LOCATION
      const handles = parseList(item.selectedProductsJson);

      // mobilePositionJson can be array or single string ("Top"/"Bottom")
      const mbPosArr = parseList(item.mobilePositionJson);
      const defaultMBPos = normMB(item.mobilePosition || item.positionMobile || (mbPosArr[0] || "bottom"));

      const COMMON = {
        bgColor: item.bgColor,
        fontColor: item.msgColor,
        titleColor: item.titleColor,               // ✅ DB Title Color (used by name & location)
        nameColor: item.nameColor,
        locationColor: item.locationColor,
        progressColor: item.progressColor,
        positionDesktop: item.positionDesktop || item.position,
        mobileSize: item.mobileSize,
        animation: item.animation,
        fontFamily: item.fontFamily,
        fontWeight: item.fontWeight,               // ✅ DB Font Weight (used by name & location)
        baseFontSize: Number(item.fontSize ?? item.rounded ?? 0) || null,
        cornerRadius: Number(item.cornerRadius ?? 16),
        visibleSeconds: Number(item.visibleSeconds || 6),
        alternateSeconds: Number(item.alternateSeconds || 4),
        uploadedImage: item.iconUrl || item.imageUrl || ""
      };

      // current product first
      const includeCurrent = (item.includeCurrentProduct !== false);
      if (isPd && includeCurrent && ch) {
        const already = Array.isArray(handles) && handles.includes(ch);
        if (!already) {
          try {
            const p = await fetch(`/products/${ch}.js`).then(r => r.json());
            const cfgBase = {
              productTitle: p?.title || ch,
              name: safe(item.currentName, safe(namesArr[0], "Someone")),
              location: safe(item.currentLocation, safe(locationsArr[0])),
              message: safe(item.messageText, "bought this product recently"),
              image: (p?.images && p.images[0]) || "",
              productUrl: p?.url || `/products/${ch}`,
              timeText: safe(item.currentTime, safe(item.relativeTimeText)),
              mobilePosition: normMB(mbPosArr[0], defaultMBPos),
              durationSeconds: Number(item.currentFirstDelaySeconds ?? item.durationSeconds ?? 0),
              ...COMMON
            };
            Manager.seqDesktop.push(cfgBase);
            Manager.seqMobile.push(cfgBase);
          } catch (e) { console.warn("[FOMO] current product fetch failed:", ch, e); }
        }
      }

      // configured handles
      for (let i = 0; i < handles.length; i++) {
        const handle = handles[i];
        if (isPd && handle === ch) continue;

        try {
          const p = await fetch(`/products/${handle}.js`).then(r => r.json());
          const cfg = {
            productTitle: p?.title || handle,
            name: safe(namesArr[i], "Someone"),
            location: safe(locationsArr[i]),
            message: safe(item.messageText, "bought this product recently"),
            image: (p?.images && p.images[0]) || "",
            productUrl: p?.url || `/products/${handle}`,
            timeText: safe(timesArr[i], safe(item.relativeTimeText)),
            mobilePosition: normMB(mbPosArr[i], defaultMBPos),
            durationSeconds: Number(item.durationSeconds || 0),
            ...COMMON
          };
          Manager.seqDesktop.push(cfg);
          Manager.seqMobile.push(cfg);
        } catch (e) { console.warn("[FOMO] product fetch failed:", handle, e); }
      }
    }

    Manager.start(isMobile() ? "mobile" : "desktop");
  } catch (err) {
    console.error("[FOMO] build error:", err);
  }
});