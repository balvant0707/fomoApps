// app/routes/app.notification.flash.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, ColorPicker, Frame,
  Toast, Loading, Popover, Tag, ButtonGroup, DropZone
} from "@shopify/polaris";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/* ---------------- Constants ---------------- */
const KEY = "flash";

const FLASH_STYLES = `
.flash-shell {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.flash-sidebar {
  width: 130px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.flash-nav-btn {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 10px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}
.flash-nav-btn:hover {
  border-color: #cbd5e1;
}
.flash-nav-btn.is-active {
  background: #2f855a;
  color: #ffffff;
  border-color: #2f855a;
}
.flash-nav-icon {
  width: 20px;
  height: 20px;
}
.flash-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.flash-columns {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.flash-form {
  flex: 1;
  min-width: 360px;
}
.flash-preview {
  flex: 1;
  min-width: 320px;
}
.flash-preview-box {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}
@media (max-width: 1100px) {
  .flash-shell {
    flex-direction: column;
  }
  .flash-sidebar {
    width: 100%;
    flex-direction: row;
  }
  .flash-nav-btn {
    flex: 1;
    flex-direction: row;
    justify-content: center;
  }
  .flash-columns {
    flex-direction: column;
  }
}
@media (max-width: 640px) {
  .flash-nav-btn {
    padding: 10px;
    font-size: 12px;
  }
  .flash-form,
  .flash-preview {
    min-width: 0;
  }
}
`;

function LayoutIcon() {
  return (
    <svg
      className="flash-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
      <line x1="9" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ContentIcon() {
  return (
    <svg
      className="flash-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="15" y2="13" />
    </svg>
  );
}

function DisplayIcon() {
  return (
    <svg
      className="flash-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function BehaviorIcon() {
  return (
    <svg
      className="flash-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.08-1.06l2-1.55-2-3.46-2.44 1a7 7 0 0 0-1.84-1.06L14.4 2h-4.8l-.24 2.87a7 7 0 0 0-1.84 1.06l-2.44-1-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .36.03.71.08 1.06l-2 1.55 2 3.46 2.44-1c.56.44 1.18.8 1.84 1.06L9.6 22h4.8l.24-2.87c.66-.26 1.28-.62 1.84-1.06l2.44 1 2-3.46-2-1.55c.05-.35.08-.7.08-1.06Z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "layout", label: "Layout", Icon: LayoutIcon },
  { id: "content", label: "Content", Icon: ContentIcon },
  { id: "display", label: "Display", Icon: DisplayIcon },
  { id: "behavior", label: "Behavior", Icon: BehaviorIcon },
];

/* ---------------- Loader (no DB prefill) ---------------- */
export async function loader({ request }) {
  await authenticate.admin(request);
  return json({ existing: null, key: KEY, title: "Flash Sale Bars" });
}

/* ---------------- Action: ALWAYS CREATE NEW ROW ---------------- */
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const { form } = body || {};
  if (!form) return json({ success: false, error: "Missing form" }, { status: 400 });

  const enabled = form?.enabled?.includes?.("enabled") ?? false;

  const fontWeightNum =
    form?.fontWeight !== undefined && form?.fontWeight !== null && form?.fontWeight !== ""
      ? Number(form.fontWeight)
      : null;

  // Priority for icon: uploaded SVG > builtin key > default "reshot"
  const incomingKey = form?.iconKey ?? null;
  const incomingSvgRaw = typeof form?.iconSvg === "string" ? form.iconSvg : "";
  const uploadedSvg = extractFirstSvg(incomingSvgRaw); // "" if invalid

  const builtinByKey = incomingKey && SVGS[incomingKey] ? SVGS[incomingKey] : null;
  const defaultBuiltin = SVGS["reshot"];

  const usedIconSvg = uploadedSvg || builtinByKey || defaultBuiltin;
  const usedIconKey = uploadedSvg ? "upload_svg" : (incomingKey || "reshot");

  // Arrays from client (server will stringify)
  const titleArr     = Array.isArray(form?.messageTitlesJson) ? form.messageTitlesJson : [];
  const locationArr  = Array.isArray(form?.locationsJson) ? form.locationsJson : [];
  const namesArr     = Array.isArray(form?.namesJson) ? form.namesJson : [];
  const mobilePosArr = Array.isArray(form?.mobilePosition) ? form.mobilePosition : [];

  // Optional selected products list as JSON string (nullable)
  const selProdJson =
    Array.isArray(form?.selectedProductsJson) && form.selectedProductsJson.length
      ? JSON.stringify(form.selectedProductsJson)
      : null;

  const data = {
    // keys
    shop,
    key: KEY,

    // flags
    enabled,
    showType: form?.showType ?? null,

    // JSON strings for DB
    messageTitlesJson: JSON.stringify(titleArr),
    locationsJson: JSON.stringify(locationArr),
    namesJson: JSON.stringify(namesArr),
    selectedProductsJson: selProdJson,
    mobilePositionJson: JSON.stringify(mobilePosArr),

    // Scalars
    messageText: form?.messageText ?? (namesArr[0] ?? null),
    fontFamily: form?.fontFamily ?? null,
    fontWeight: isNaN(fontWeightNum) ? null : fontWeightNum,
    position: form?.position ?? null,
    animation: form?.animation ?? null,
    mobileSize: form?.mobileSize ?? null,
    titleColor: form?.titleColor ?? null,
    bgColor: form?.bgColor ?? null,
    msgColor: form?.msgColor ?? null,
    ctaBgColor: form?.ctaBgColor ?? null,

    rounded: form?.rounded != null ? Number(form.rounded) : null,
    durationSeconds: form?.durationSeconds != null ? Number(form.durationSeconds) : null,
    alternateSeconds: form?.alternateSeconds != null ? Number(form.alternateSeconds) : null,

    // Persist icon
    iconKey: usedIconKey,
    iconSvg: usedIconSvg,
  };

  // remove explicit undefined (keep nulls)
  Object.keys(data).forEach((k) => { if (data[k] === undefined) delete data[k]; });

  try {
    // ALWAYS CREATE a NEW ENTRY (no upsert/search)
    const created = await prisma.notificationconfig.create({ data });
    return json({ success: true, id: created.id });
  } catch (e) {
    console.error("[flash create failed]", e?.code, e?.meta, e);
    return json({
      success: false,
      error: String(e?.message || e),
      code: e?.code || null,
      cause: e?.meta?.cause || null,
      hint:
        "Ensure Prisma model name is 'notificationconfig' with @@map('NotificationConfig'), and DB column nullability matches the optional fields.",
    }, { status: 500 });
  }
}

/* ---------------- Built-in SVGs (all valid) ---------------- */
const SVGS = {
  reshot: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 64 64" aria-hidden="true">
  <g>
    <path d="M38.719,63a17.825,17.825,0,0,0,7.422-1.5A14.41,14.41,0,0,0,55,48c0-9-2-11-5-17s0-12,0-12a10.819,10.819,0,0,0-6,4C44,2,30,1,30,1a15.091,15.091,0,0,1-2,14c-5,7-10,11-12,19,0,0-4-2-3-6,0,0-4,7-4,18,0,12.062,9.662,15.6,14.418,16.61a18.53,18.53,0,0,0,3.846.39Z" fill="#febd55"/>
    <path d="M24.842,63S14.526,59.132,14.526,47.526C14.526,34.632,23.474,30,23.474,30s-2.5,4.632.079,5.921c0,0,4.315-14.053,15.921-17.921,0,0-4.053,4.263-1.474,12s11.316,9.474,11.474,18v1a14.54,14.54,0,0,1-2.2,8.213C45.286,60.31,42.991,63,37.737,63Z" fill="#fc9e20"/>
    <path d="M26,63a13.024,13.024,0,0,1-8-12c0-10,5-14,5-14s0,4,2,5c0,0,2-14,11-17,0,0-3,2-1,8s11,8,11,18v.871a12.287,12.287,0,0,1-1.831,6.641A9.274,9.274,0,0,1,36,63Z" fill="#e03e3e"/>
  </g>
</svg>
`,
  reshotFlash: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" aria-hidden="true">
  <g fill="none">
    <circle cx="12" cy="12" r="10" fill="#E3F2FD"/>
    <path d="M11.5 3 7 12h3.3L9.8 21l6.2-11H12l-0.5-7z" fill="#29B6F6"/>
  </g>
</svg>
`,
  deadline: `
<svg xmlns="http://www.w3.org/2000/svg" width ="60" height="60" viewBox="0 0 64 64" aria-hidden="true">
  <g fill="#263238">
    <path d="M18,53.5c-.276,0-.5-.224-.5-.5v-8.511c0-3.609,1.818-6.921,4.863-8.858L28.069,32l-5.706-3.631c-3.045-1.938-4.863-5.249-4.863-8.858V11c0-.276.224-.5.5-.5s.5.224.5.5v8.511c0,3.266,1.645,6.262,4.4,8.015l6.369,4.053c.144.092.231.251.231.422s-.087.33-.231.422L22.9,36.475c-2.755,1.753-4.4,4.749-4.4,8.015V53c0,.276-.224.5-.5.5Z"/>
    <path d="M46,53.5c-.276,0-.5-.224-.5-.5v-8.511c0-3.265-1.645-6.261-4.399-8.015l-6.369-4.053c-.144-.092-.231-.251-.231-.422s.087-.33.231-.422l6.369-4.053c2.755-1.753,4.399-4.75,4.399-8.015V11c0-.276.224-.5.5-.5s.5.224.5.5v8.511c0,3.609-1.817,6.92-4.862,8.858L35.932,32l5.706,3.631c3.045,1.938,4.862,5.25,4.862,8.858V53c0,.276-.224.5-.5.5Z"/>
  </g>
</svg>
`,
  // Fixed, valid SVG (no "..." placeholders)
  reshotflashon: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" aria-hidden="true">
  <g fill="none">
    <circle cx="12" cy="12" r="10" fill="#E8F5E9"/>
    <path d="M13.2 2.5 6.8 13h4l-.5 8.5 6.9-10.5h-4l0-8.5z" fill="#66BB6A"/>
  </g>
</svg>
`,
};

const baseSvgOptions = [
  { label: "Reshot", value: "reshot" },
  { label: "Reshot Flash", value: "reshotFlash" },
  { label: "Reshot Flash On", value: "reshotflashon" },
  { label: "Deadline", value: "deadline" },
];

/* ---------------- Color helpers ---------------- */
const hex6 = (v) => /^#[0-9A-F]{6}$/i.test(String(v || ""));
function hexToRgb(hex) { const c = hex.replace("#", ""); const n = parseInt(c, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: (n & 255) }; }
function rgbToHsv({ r, g, b }) { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; let h = 0; if (d) { switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break }h *= 60; } const s = max ? d / max : 0; return { hue: h, saturation: s, brightness: max }; }
function hsvToRgb({ hue: h, saturation: s, brightness: v }) { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let R = 0, G = 0, B = 0; if (0 <= h && h < 60) [R, G, B] = [c, x, 0]; else if (60 <= h && h < 120) [R, G, B] = [x, c, 0]; else if (120 <= h && h < 180) [R, G, B] = [0, c, x]; else if (180 <= h && h < 240) [R, G, B] = [0, x, c]; else[R, G, B] = [x, 0, c]; return { r: Math.round((R + m) * 255), g: Math.round((G + m) * 255), b: Math.round((B + m) * 255) }; }
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const hexToHSB = (hex) => rgbToHsv(hexToRgb(hex));
const hsbToHEX = (hsb) => rgbToHex(hsvToRgb(hsb));

/* ---------------- SVG utils ---------------- */
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
// guard: avoid rendering corrupt SVGs
function isSvgRenderable(svg) {
  if (!svg) return false;
  if (svg.includes("...")) return false; // obvious corruption/placeholder
  return true;
}

/* ---------------- ColorInput ---------------- */
function ColorInput({ label, value, onChange, placeholder = "#244E89" }) {
  const [open, setOpen] = useState(false);
  const [hsb, setHsb] = useState(hex6(value) ? hexToHSB(value) : { hue: 212, saturation: 0.7, brightness: 0.55 });
  useEffect(() => { if (hex6(value)) setHsb(hexToHSB(value)); }, [value]);

  const swatch = (
    <div
      onClick={() => setOpen(true)}
      style={{ width: 28, height: 28, borderRadius: 10, cursor: "pointer", border: "1px solid rgba(0,0,0,0.08)", background: hex6(value) ? value : "#ffffff" }}
    />
  );

  return (
    <Popover active={open} onClose={() => setOpen(false)} preferredAlignment="right"
      activator={
        <TextField
          label={label}
          value={value}
          onChange={(v) => { const next = v.toUpperCase(); onChange(next); if (hex6(next)) setHsb(hexToHSB(next)); }}
          autoComplete="off"
          placeholder={placeholder}
          suffix={swatch}
          onFocus={() => setOpen(true)}
        />
      }>
      <Box padding="300" minWidth="260px">
        <ColorPicker color={hsb} onChange={(c) => { setHsb(c); onChange(hsbToHEX(c)); }} allowAlpha={false} />
      </Box>
    </Popover>
  );
}

/* ---------------- Multi-value helpers ---------------- */
function useTokenDraft(list, setList) {
  const [draft, setDraft] = useState("");
  const splitOnComma = (raw) => String(raw || "").split(",").map((p) => p.trim()).filter(Boolean);

  const addMany = useCallback((vals) => {
    const incoming = Array.isArray(vals) ? vals : splitOnComma(vals);
    if (!incoming.length) return;
    setList((prev) => { const next = [...prev]; incoming.forEach((v) => next.push(v)); return next; });
  }, [setList]);

  const removeAt = useCallback((idx) => {
    setList((prev) => { const next = [...prev]; next.splice(idx, 1); return next; });
  }, [setList]);

  const commitDraft = useCallback(() => { if (!draft) return; addMany(draft); setDraft(""); }, [draft, addMany]);
  const onInputChange = useCallback((val) => setDraft(val), []);
  const onKeyDown = useCallback((e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } }, [commitDraft]);

  return { draft, setDraft, addMany, removeAt, commitDraft, onInputChange, onKeyDown };
}

/* ---------------- Anim & Preview helpers ---------------- */
const getAnimationStyle = (a) =>
  a === "slide" ? { transform: "translateY(8px)", animation: "notif-slide-in 240ms ease-out" } :
    a === "bounce" ? { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" } :
      a === "zoom" ? { transform: "scale(0.96)", animation: "notif-zoom-in 200ms ease-out forwards" } :
        { opacity: 0, animation: "notif-fade-in 220ms ease-out forwards" };

const mobileSizeToWidth = (size) => (size === "compact" ? 300 : size === "large" ? 360 : 330);
const mobileSizeScale = (size) => (size === "compact" ? 0.92 : size === "large" ? 1.06 : 1);
const posToFlex = (pos) => {
  switch (pos) {
    case "top-left": return { justifyContent: "flex-start", alignItems: "flex-start" };
    case "top-right": return { justifyContent: "flex-end", alignItems: "flex-start" };
    case "bottom-left": return { justifyContent: "flex-start", alignItems: "flex-end" };
    case "bottom-right": return { justifyContent: "flex-end", alignItems: "flex-end" };
    default: return { justifyContent: "flex-start", alignItems: "flex-end" };
  }
};

/* ---------------- Notification bubble ---------------- */
function NotificationPreview({ form, isMobile = false }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);

  const svgMarkup = useMemo(() => {
    const uploaded = extractFirstSvg(form.iconSvg || "");
    const candidate = uploaded || SVGS[form.iconKey] || SVGS["reshot"];
    const base = isSvgRenderable(candidate) ? candidate : SVGS["reshot"];
    return base ? normalizeSvgSize(base, 50) : "";
  }, [form.iconSvg, form.iconKey]);

  const base = Number(form.rounded ?? 14) || 14;
  const scale = isMobile ? mobileSizeScale(form?.mobileSize) : 1;
  const sized = Math.max(10, Math.min(28, Math.round(base * scale)));

  return (
    <div>
      <style>{`
        @keyframes notif-fade-in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes notif-slide-in { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes notif-zoom-in  { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: scale(1) } }
        @keyframes notif-bounce-in { 0% { transform: translateY(18px); opacity: 0 } 60% { transform: translateY(-6px); opacity: 1 } 100% { transform: translateY(0) } }
      `}</style>

      <div style={{
        fontFamily: form.fontFamily === "System" ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" : form.fontFamily,
        background: form.bgColor, color: form.msgColor, borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, border: "1px solid rgba(17,24,39,0.06)",
        display: "flex", alignItems: "center", gap: 12,
        maxWidth: isMobile ? mobileSizeToWidth(form?.mobileSize) : 560,
        ...animStyle
      }}>
        {svgMarkup ? (
          <span
            aria-hidden="true"
            style={{ display: "block", flexShrink: 0, width: 60, height: 60 }}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : null}
        <div style={{ display: "grid", gap: 4 }}>
          <p style={{ margin: 0, color: form.titleColor, fontWeight: form.fontWeight ? Number(form.fontWeight) : 600, fontSize: sized }}>
            {form.messageTitle || "Flash Sale"}
          </p>
          <p style={{ margin: 0, fontSize: sized, lineHeight: 1.5 }}>
            <small>{form.name || "Flash Sale: 20% OFF"} - {form.messageText || "ends in 02:15 hours"}</small>
          </p>
        </div>
      </div>
    </div>
  );
}

/* Desktop frame */
function DesktopPreview({ form }) {
  const flex = posToFlex(form?.position);
  return (
    <div
      style={{
        width: "100%", maxWidth: 900, minHeight: 320, height: 400, borderRadius: 12,
        border: "1px solid #e5e7eb", background: "linear-gradient(180deg,#fafafa 0%,#f5f5f5 100%)",
        overflow: "hidden", position: "relative", display: "flex", padding: 18, boxSizing: "border-box", ...flex,
      }}
    >
      <NotificationPreview form={form} />
    </div>
  );
}

/* Mobile frame */
function MobilePreview({ form }) {
  const mobilePos = (form?.mobilePosition && form.mobilePosition[0]) || "top";
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: 380, height: 400, borderRadius: 40, border: "1px solid #e5e7eb",
          background: "linear-gradient(180deg,#fcfcfd 0%,#f5f5f6 100%)", boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
          position: "relative", overflow: "hidden", padding: 14, display: "flex",
          justifyContent: "center", alignItems: mobilePos === "top" ? "flex-start" : "flex-end",
        }}
      >
        <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 120, height: 18, borderRadius: 10, background: "#0f172a0f" }} />
        <div style={{ padding: 8 }}>
          <NotificationPreview form={form} isMobile />
        </div>
      </div>
    </div>
  );
}

/* Live Preview wrapper */
function LivePreview({ form }) {
  const [mode, setMode] = useState("desktop");
  return (
    <BlockStack gap="300">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingMd">Live Preview</Text>
        <ButtonGroup segmented>
          <Button pressed={mode === "desktop"} onClick={() => setMode("desktop")}>Desktop</Button>
          <Button pressed={mode === "mobile"} onClick={() => setMode("mobile")}>Mobile</Button>
          <Button pressed={mode === "both"} onClick={() => setMode("both")}>Both</Button>
        </ButtonGroup>
      </InlineStack>

      {mode === "desktop" && <DesktopPreview form={form} />}
      {mode === "mobile" && <MobilePreview form={form} />}
      {mode === "both" && (
        <InlineStack gap="400" align="space-between" wrap>
          <Box width="58%"><DesktopPreview form={form} /></Box>
          <Box width="40%"><MobilePreview form={form} /></Box>
        </InlineStack>
      )}

      <Text as="p" variant="bodySm" tone="subdued">
        Desktop preview follows the Desktop position. Mobile preview follows the Mobile Position and the Notification size.
      </Text>
    </BlockStack>
  );
}

/* ---------------- Page ---------------- */
export default function FlashConfigPage() {
  const navigate = useNavigate();
  const { title } = useLoaderData();

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("layout");
  const [toast, setToast] = useState({ active: false, error: false, msg: "" });

  // defaults ONLY (no DB prefill)
  const defaultTitles = ["Flash Sale"];
  const defaultLocations = ["Flash Sale: 20% OFF"];
  const defaultNames = ["ends in 02:15 hours"];

  const [titlesList, setTitlesList] = useState(defaultTitles);
  const [locationsList, setLocationsList] = useState(defaultLocations);
  const [namesList, setNamesList] = useState(defaultNames);

  const [form, setForm] = useState({
    enabled: ["enabled"],
    showType: "allpage",

    messageTitle: defaultTitles[0],
    name: defaultLocations[0],
    messageText: defaultNames[0],
    fontFamily: "System",
    fontWeight: "600",
    position: "top-right",
    animation: "slide",
    mobileSize: "compact",
    mobilePosition: ["top"],
    titleColor: "#111111",
    bgColor: "#FFF8E1",
    msgColor: "#111111",
    rounded: 14,
    durationSeconds: 1,
    alternateSeconds: 5,
    iconKey: "reshot", // default builtin
    iconSvg: "",       // uploaded svg string (optional)
    ctaBgColor: null,
  });

  const [svgName, setSvgName] = useState("");
  const [uploadError, setUploadError] = useState("");

  // keep preview first values in sync (preview only)
  useEffect(() => {
    setForm(f => ({
      ...f,
      messageTitle: titlesList[0] || f.messageTitle || "",
      name: locationsList[0] || f.name || "",
      messageText: namesList[0] || f.messageText || "",
    }));
  }, [titlesList, locationsList, namesList]);

  const onField = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const onDurationChange = (val) => { const n = parseInt(val || "0", 10); const x = isNaN(n) ? 1 : Math.min(60, Math.max(1, n)); setForm(f => ({ ...f, durationSeconds: x })); };
  const onAlternateChange = (val) => { const n = parseInt(val || "0", 10); const x = isNaN(n) ? 0 : Math.min(3600, Math.max(0, n)); setForm(f => ({ ...f, alternateSeconds: x })); };

  const titlesDraft = useTokenDraft(titlesList, setTitlesList);
  const locationsDraft = useTokenDraft(locationsList, setLocationsList);
  const namesDraft = useTokenDraft(namesList, setNamesList);

  // Dynamic icon options (show "Custom (uploaded)" when iconSvg exists)
  const iconOptions = useMemo(() => {
    return form.iconSvg
      ? [{ label: "Custom (uploaded)", value: "upload_svg" }, ...baseSvgOptions]
      : baseSvgOptions;
  }, [form.iconSvg]);

  // Handle SVG drop
  const handleSvgDrop = useCallback((_drop, accepted, rejected) => {
    setUploadError("");

    if (rejected?.length) {
      setUploadError("Only .svg files are allowed.");
      return;
    }
    const file = accepted?.[0];
    if (!file) return;

    if (file.type !== "image/svg+xml") {
      setUploadError("File must be an SVG.");
      return;
    }
    if (file.size > 200 * 1024) {
      setUploadError("SVG is too large. Keep it under 200KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const svg = extractFirstSvg(raw);
      if (!svg) {
        setUploadError("Invalid SVG content.");
        return;
      }
      // Use uploaded: set iconKey to "upload_svg"
      setForm(f => ({ ...f, iconSvg: svg, iconKey: "upload_svg" }));
      setSvgName(file.name);
    };
    reader.readAsText(file);
  }, []);

  const clearUploadedSvg = () => {
    setForm(f => ({ ...f, iconSvg: "", iconKey: "reshot" })); // back to default builtin
    setSvgName("");
    setUploadError("");
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        // send arrays; server will stringify
        messageTitlesJson: titlesList.length ? titlesList : defaultTitles,
        locationsJson: locationsList.length ? locationsList : defaultLocations,
        namesJson: namesList.length ? namesList : defaultNames,
        mobilePosition: form.mobilePosition,
      };
      const res = await fetch("/app/notification/flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: payload }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save");
      setToast({ active: true, error: false, msg: "Saved as a new Flash Bar" });
      setTimeout(() => navigate("/app"), 900);
    } catch (e) {
      setToast({ active: true, error: true, msg: e?.message || "Something went wrong" });
    } finally { setSaving(false); }
  };

  const pageOptions = [
    { label: "All Pages", value: "allpage" },
    { label: "Home Page", value: "home" },
    { label: "Product Page", value: "product" },
    { label: "Collection Page", value: "collection" },
    { label: "Pages", value: "pages" },
    { label: "Cart Page", value: "cart" },
  ];
  const fontOptions = [
    { label: "System", value: "System" }, { label: "Inter", value: "Inter" }, { label: "Roboto", value: "Roboto" },
    { label: "Montserrat", value: "Montserrat" }, { label: "Poppins", value: "Poppins" }
  ];
  const positionOptions = [
    { label: "Top Left", value: "top-left" }, { label: "Top Right", value: "top-right" },
    { label: "Bottom Left", value: "bottom-left" }, { label: "Bottom Right", value: "bottom-right" }
  ];
  const animationOptions = [
    { label: "Fade", value: "fade" }, { label: "Slide", value: "slide" },
    { label: "Bounce", value: "bounce" }, { label: "Zoom", value: "zoom" }
  ];
  const mobileSizeOptions = [
    { label: "Compact", value: "compact" }, { label: "Comfortable", value: "comfortable" }, { label: "Large", value: "large" }
  ];
  const FontweightOptions = [
    { label: "100 - Thin", value: "100" }, { label: "200 - Extra Light", value: "200" },
    { label: "300 - Light", value: "300" }, { label: "400 - Normal", value: "400" },
    { label: "500 - Medium", value: "500" }, { label: "600 - Semi Bold", value: "600" },
    { label: "700 - Bold", value: "700" },
  ];

  return (
    <Frame>
      {saving && <Loading />}
      <Page
        title="Configuration - Flash Sale Bars"
        backAction={{ content: "Back", onAction: () => navigate("/app/notification") }}
        primaryAction={{ content: "Save as New", onAction: save, loading: saving, disabled: saving }}
      >
        <style>{FLASH_STYLES}</style>
<div className="flash-shell">
  <div className="flash-sidebar">
    {NAV_ITEMS.map(({ id, label, Icon }) => (
      <button
        key={id}
        type="button"
        className={`flash-nav-btn ${activeSection === id ? "is-active" : ""}`}
        onClick={() => setActiveSection(id)}
      >
        <Icon />
        <span>{label}</span>
      </button>
    ))}
  </div>

  <div className="flash-main">
    <div className="flash-columns">
      <div className="flash-form">
        <BlockStack gap="400">
          {activeSection === "display" && (
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Display</Text>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%">
                      <ChoiceList
                        title="Enable Flash Sale Bar"
                        choices={[{ label: "Enabled", value: "enabled" }, { label: "Disabled", value: "disabled" }]}
                        selected={form.enabled}
                        onChange={onField("enabled")}
                        alignment="horizontal"
                      />
                    </Box>
                    <Box width="50%">
                      <Select
                        label="Display On Pages"
                        options={pageOptions}
                        value={form.showType}
                        onChange={onField("showType")}
                      />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%">
                      <TextField
                        label="Popup Display Duration (seconds)"
                        type="number"
                        value={String(form.durationSeconds)}
                        onChange={onDurationChange}
                        suffix="S"
                        min={1}
                        max={60}
                        step={1}
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="50%">
                      <TextField
                        label="Interval Between Sale Bars (seconds)"
                        type="number"
                        value={String(form.alternateSeconds)}
                        onChange={onAlternateChange}
                        suffix="S"
                        min={0}
                        max={3600}
                        step={1}
                        autoComplete="off"
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          )}

          {activeSection === "content" && (
            <Card>
              <Box padding="4">
                <BlockStack gap="350">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Message</Text>
                  </InlineStack>

                  <BlockStack gap="150">
                    <div onKeyDownCapture={titlesDraft.onKeyDown}>
                      <TextField
                        label="Flash Sale Headline / Banner Title (add multiple)"
                        value={titlesDraft.draft}
                        onChange={titlesDraft.onInputChange}
                        autoComplete="off"
                        multiline={1}
                        placeholder="Flash Sale, Flash Sale 2 ... (press Enter to add)"
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {titlesList.map((t, i) => (
                        <Tag key={`title-${i}`} onRemove={() => titlesDraft.removeAt(i)}>{t}</Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>

                  <BlockStack gap="150">
                    <div onKeyDownCapture={locationsDraft.onKeyDown}>
                      <TextField
                        label="Offer Title / Discount Name (add multiple)"
                        value={locationsDraft.draft}
                        onChange={locationsDraft.onInputChange}
                        autoComplete="off"
                        multiline={1}
                        placeholder="Flash Sale 10% OFF, Flash Sale 20% OFF ..."
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {locationsList.map((t, i) => (
                        <Tag key={`loc-${i}`} onRemove={() => locationsDraft.removeAt(i)}>{t}</Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>

                  <BlockStack gap="150">
                    <div onKeyDownCapture={namesDraft.onKeyDown}>
                      <TextField
                        label="Countdown Text / Urgency Message (add multiple)"
                        value={namesDraft.draft}
                        onChange={namesDraft.onInputChange}
                        autoComplete="off"
                        multiline={1}
                        placeholder="ends in 01:15 hours, ends in 02:15 hours ..."
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {namesList.map((t, i) => (
                        <Tag key={`name-${i}`} onRemove={() => namesDraft.removeAt(i)}>{t}</Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          )}

          {activeSection === "layout" && (
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Customize</Text>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><Select label="Flash Bar Font Family" options={fontOptions} value={form.fontFamily} onChange={onField("fontFamily")} /></Box>
                    <Box width="50%"><Select label="Text Weight / Style" options={FontweightOptions} value={form.fontWeight} onChange={onField("fontWeight")} /></Box>
                  </InlineStack>

                  <InlineStack gap="400" wrap={false} width="100%" alignItems="center">
                    <Box width="50%">
                      <Select
                        label={`Flash Sale Icon${form.iconSvg ? " (using Uploaded)" : ""}`}
                        options={iconOptions}
                        value={form.iconKey}
                        onChange={onField("iconKey")}
                      />
                    </Box>
                    <Box width="50%">
                      <BlockStack gap="150">
                        <Text>Text Size (px)</Text>
                        <TextField
                          label=" "
                          labelHidden
                          type="number"
                          min={10}
                          max={72}
                          step={1}
                          value={String(form.rounded)}
                          onChange={(v) => {
                            const n = parseInt(v || "0", 10);
                            const clamped = isNaN(n) ? 10 : Math.max(10, Math.min(72, n));
                            setForm(f => ({ ...f, rounded: clamped }));
                          }}
                          suffix="px"
                          autoComplete="off"
                        />
                      </BlockStack>
                    </Box>
                  </InlineStack>

                  <BlockStack gap="150">
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
                      Once you upload, the uploaded icon will be used. Removing it will switch back to the built-in icon.
                    </Text>
                  </BlockStack>

                  <InlineStack gap="400" wrap="wrap" width="100%">
                    <Box width="30%"><ColorInput label="Banner Title Color" value={form.titleColor} onChange={(v) => setForm(f => ({ ...f, titleColor: v }))} /></Box>
                    <Box width="30%"><ColorInput label="Bar Background Color" value={form.bgColor} onChange={(v) => setForm(f => ({ ...f, bgColor: v }))} /></Box>
                    <Box width="30%"><ColorInput label="Offer Text Color" value={form.msgColor} onChange={(v) => setForm(f => ({ ...f, msgColor: v }))} /></Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          )}

          {activeSection === "behavior" && (
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Placement & Motion</Text>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><Select label="Bar Position on Desktop" options={positionOptions} value={form.position} onChange={onField("position")} /></Box>
                    <Box width="50%"><Select label="Popup Animation Style" options={animationOptions} value={form.animation} onChange={onField("animation")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><Select label="Mobile Bar Size" options={mobileSizeOptions} value={form.mobileSize} onChange={onField("mobileSize")} /></Box>
                    <Box width="50%">
                      <Select
                        label="Bar Position on Mobile"
                        options={[{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]}
                        value={(form.mobilePosition && form.mobilePosition[0]) || "top"}
                        onChange={(v) => setForm(f => ({ ...f, mobilePosition: [v] }))}
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          )}
        </BlockStack>
      </div>

      <div className="flash-preview">
        <Card>
          <Box padding="4">
            <div className="flash-preview-box">
              <LivePreview form={form} />
            </div>
          </Box>
        </Card>
      </div>
    </div>
  </div>
</div>

      </Page>

      {toast.active && <Toast content={toast.msg} error={toast.error} onDismiss={() => setToast(t => ({ ...t, active: false }))} duration={2000} />}
    </Frame>
  );
}
