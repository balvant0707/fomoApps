import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, ColorPicker, Frame,
  Toast, Loading, Layout, Popover, Tag, ButtonGroup, DropZone
} from "@shopify/polaris";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

/* ───────── Loader & Action ───────── */
const KEY = "flash";

export async function loader({ request }) {
  await authenticate.admin(request);
  return json({ existing: null, key: KEY, title: "Flash Sale Bars" });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  const { form } = await request.json();

  const enabled = form.enabled?.includes("enabled") ?? false;

  const fontWeightNum =
    form.fontWeight !== undefined && form.fontWeight !== null && form.fontWeight !== ""
      ? Number(form.fontWeight)
      : null;

  // 🟢 Priority: 1) Uploaded SVG → iconKey="upload_svg"  2) Builtin by key  3) Fallback "reshot"
  const incomingKey = form.iconKey ?? null;
  const incomingSvgRaw = typeof form.iconSvg === "string" ? form.iconSvg : "";
  const uploadedSvg = extractFirstSvg(incomingSvgRaw); // "" if invalid

  const builtinByKey = incomingKey && SVGS[incomingKey] ? SVGS[incomingKey] : null;
  const defaultBuiltin = SVGS["reshot"];

  const usedIconSvg = uploadedSvg || builtinByKey || defaultBuiltin;   // always persist something
  const usedIconKey = uploadedSvg ? "upload_svg" : (incomingKey || "reshot"); // ✅ key reflects "upload_svg" on upload

  // Arrays from client
  const titleArr = Array.isArray(form.messageTitlesJson) ? form.messageTitlesJson : [];
  const locationArr = Array.isArray(form.locationsJson) ? form.locationsJson : [];
  const namesArr = Array.isArray(form.namesJson) ? form.namesJson : [];
  const mobilePosArr = Array.isArray(form.mobilePosition) ? form.mobilePosition : [];

  const selProdJson =
    Array.isArray(form.selectedProductsJson) && form.selectedProductsJson.length
      ? JSON.stringify(form.selectedProductsJson)
      : null;

  const data = {
    shop,
    key: "flash",
    enabled,
    showType: form.showType ?? null,

    // JSON strings for DB
    messageTitlesJson: JSON.stringify(titleArr),
    locationsJson: JSON.stringify(locationArr),
    namesJson: JSON.stringify(namesArr),
    selectedProductsJson: selProdJson,
    mobilePositionJson: JSON.stringify(mobilePosArr),

    // Scalars
    messageText: form.messageText ?? (namesArr[0] ?? null),
    fontFamily: form.fontFamily ?? null,
    fontWeight: isNaN(fontWeightNum) ? null : fontWeightNum,
    position: form.position ?? null,
    animation: form.animation ?? null,
    mobileSize: form.mobileSize ?? null,
    titleColor: form.titleColor ?? null,
    bgColor: form.bgColor ?? null,
    msgColor: form.msgColor ?? null,
    ctaBgColor: form.ctaBgColor ?? null,

    rounded: form.rounded != null ? Number(form.rounded) : null,
    durationSeconds: form.durationSeconds != null ? Number(form.durationSeconds) : null,
    alternateSeconds: form.alternateSeconds != null ? Number(form.alternateSeconds) : null,

    // 🟢 Persist icon
    iconKey: usedIconKey,    // "upload_svg" if uploaded
    iconSvg: usedIconSvg,    // uploaded svg or builtin svg string
  };

  await prisma.notificationConfig.create({ data });
  return json({ success: true });
}

/* ───────── Built-in SVGs (short demo) ───────── */
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
    <g style={{clipPath:"url(#id0)"}}>
      <polygon class="fil3" points="2.82094,3.56298 2.48625,3.56343 2.41006,3.56353 2.40948,3.48696 2.3952,1.62404 2.39461,1.54667 2.47197,1.54667 4.05295,1.54667 4.18926,1.54667 4.11889,1.66348 3.58319,2.55274 "/>
      <polygon class="fil4" points="2.8313,3.56296 2.82158,3.56298 2.82094,3.56298 3.58319,2.55274 3.57208,2.57117 3.47211,2.73713 4.2933,2.73713 4.43205,2.73713 4.35833,2.85485 2.98014,5.05561 2.83962,5.28 2.83833,5.01526 "/>
    </g>
    <path class="fil2" d="M3.41333 0c1.88514,0 3.41333,1.52819 3.41333,3.41333 0,1.88514 -1.52819,3.41333 -3.41333,3.41333 -1.88514,0 -3.41333,-1.52819 -3.41333,-3.41333 0,-1.88514 1.52819,-3.41333 3.41333,-3.41333z"/>
  </g>
</svg>
`,
  deadline: `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width ="60" height="60" version="1.1" id="Icon_Set" x="0px" y="0px" viewBox="0 0 64 64" style="enable-background:new 0 0 64 64;" xml:space="preserve">
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
	<g>
		<path class="st1" d="M18,53.5c-0.276,0-0.5-0.224-0.5-0.5v-8.511c0-3.609,1.818-6.921,4.863-8.858L28.069,32l-5.706-3.631    c-3.045-1.938-4.863-5.249-4.863-8.858V11c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v8.511c0,3.266,1.645,6.262,4.4,8.015    l6.369,4.053C29.413,31.67,29.5,31.829,29.5,32s-0.087,0.33-0.231,0.422L22.9,36.475c-2.755,1.753-4.4,4.749-4.4,8.015V53    C18.5,53.276,18.276,53.5,18,53.5z"/>
	</g>
	<g>
		<path class="st1" d="M46,53.5c-0.276,0-0.224-0.5-0.5-0.5v-8.511c0-3.265-1.645-6.261-4.399-8.015l-6.369-4.053    C34.587,32.33,34.5,32.171,34.5,32s0.087-0.33,0.231-0.422l6.369-4.053c2.755-1.753,4.399-4.75,4.399-8.015V11    c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v8.511c0,3.609-1.817,6.92-4.862,8.858L35.932,32l5.706,3.631    c3.045,1.938,4.862,5.25,4.862,8.858V53C46.5,53.276,46.276,53.5,46,53.5z"/>
	</g>
</g>
</svg>
`,
  reshotflashon: `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" width="60" height="60" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" viewBox="0 0 6.82666 6.82666">
 <defs>
  <style type="text/css">
   <![CDATA[
    .fil0 {fill:none}
    .fil1 {fill:#212121;fill-rule:nonzero}
    .fil2 {fill:#66BB6A;fill-rule:nonzero}
   ]]>
  </style>
 </defs>
 <g id="Layer_x0020_1">
  <metadata id="CorelCorpID_0Corel-Layer"/>
  <g id="_372410968">
   <rect id="_372411304" class="fil0" width="6.82666" height="6.82666"/>
   <rect id="_372411232" class="fil0" x="0.853331" y="0.853331" width="5.12" height="5.12"/>
  </g>
  <path class="fil1" d="M2.2782 3.43181l0.477831 -0.000645669 0.10574 -0.000145669 0.000511811 0.10598 0.00847638 1.74953 1.61087 -2.5723 -1.13312 0 -0.188642 0 0.0973898 -0.161669 0.895118 -1.48589 -1.8923 0 0.018126 2.36515zm0.372091 0.212l-0.477531 0.000645669 -0.105437 0.000141732 -0.000814961 -0.105976 -0.0197559 -2.57821 -0.000818898 -0.107087 0.107071 0 2.18801 0 0.188642 3.93701e-006 -0.0973898 0.161665 -0.895118 1.48589 1.1365 0 0.192024 0 -0.102024 0.162921 -1.90737 3.04577 -0.194476 0.310547 -0.00177559 -0.366382 -0.00974016 -2.00993z"/>
  <path class="fil2" d="M3.39739 1.49333l-0.151972 0 -0.555811 0 0.00803937 1.04871 0 0.525819 -0.011252 0.0186772 -0.194606 0.323055 -0.00289764 -0.377638 -0.0126063 -1.64488 -0.000818898 -0.107087 0.107071 0 1.0035 0 0.188642 0 -0.0973898 0.161669 -0.031126 0.0516693 -0.248768 0zm-0.110917 1.61484l7.87402e-006 0.000326772 -7.87402e-006 -0.000448819 0 0.000122047zm-0.212488 0.00449213l-7.87402e-006 0 -0.00173228 -0.0763622 -0.00246457 -0.108752 0.108717 0 0.725177 0 0.192024 0 -0.102024 0.162921 -0.718264 1.14696 -0.194472 0.310547 -0.00177953 -0.366382 -0.000192913 -0.0399173 0.210921 -0.327594 0 0.000295276 0.00684252 -0.0109252 0.113465 -0.176232c0.00487402,-0.00756693 0.00875984,-0.0154961 0.0117008,-0.0236378l0.289752 -0.462693 -0.330972 0c-0.00176378,-7.87402e-005 -0.00353543,-0.000125984 -0.0053189,-0.000125984l-0.301236 0 -0.000133858 -0.0280984z"/>
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

/* ───────── Color helpers ───────── */
const hex6 = (v) => /^#[0-9A-F]{6}$/i.test(String(v || ""));
function hexToRgb(hex) { const c = hex.replace("#", ""); const n = parseInt(c, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: (n & 255) }; }
function rgbToHsv({ r, g, b }) { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; let h = 0; if (d) { switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break }h *= 60; } const s = max ? d / max : 0; return { hue: h, saturation: s, brightness: max }; }
function hsvToRgb({ hue: h, saturation: s, brightness: v }) { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let R = 0, G = 0, B = 0; if (0 <= h && h < 60) [R, G, B] = [c, x, 0]; else if (60 <= h && h < 120) [R, G, B] = [x, c, 0]; else if (120 <= h && h < 180) [R, G, B] = [0, c, x]; else if (180 <= h && h < 240) [R, G, B] = [0, x, c]; else[R, G, B] = [x, 0, c]; return { r: Math.round((R + m) * 255), g: Math.round((G + m) * 255), b: Math.round((B + m) * 255) }; }
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const hexToHSB = (hex) => rgbToHsv(hexToRgb(hex));
const hsbToHEX = (hsb) => rgbToHex(hsvToRgb(hsb));

/* ───────── SVG utils ───────── */
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

/* ───────── ColorInput ───────── */
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

/* ───────── Multi-value helpers ───────── */
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

/* ───────── Anim & Preview helpers ───────── */
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

/* ───────── Notification bubble ───────── */
function NotificationPreview({ form, isMobile = false }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);

  // UI Preview: uploaded > builtin (fallback "reshot")
  const svgMarkup = useMemo(() => {
    const uploaded = extractFirstSvg(form.iconSvg || "");
    const base = uploaded || SVGS[form.iconKey] || SVGS["reshot"];
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
            <small>{form.name || "Flash Sale: 20% OFF"} -- {form.messageText || "ends in 02:15 hours"}</small>
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

/* ───────── Page ───────── */
export default function FlashConfigPage() {
  const navigate = useNavigate();
  const { title } = useLoaderData();

  const [saving, setSaving] = useState(false);
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
    // Preview values (use first items from lists)
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
    durationSeconds: 10,
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
      ? [{ label: "Custom (uploaded)", value: "upload_svg" }, ...baseSvgOptions] // ✅ value = upload_svg
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
      setUploadError("SVG too large. Keep under 200KB.");
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
      // ✅ Use uploaded: set iconKey to "upload_svg"
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
      if (!res.ok) throw new Error(await res.text() || "Failed to save");
      setToast({ active: true, error: false, msg: "Saved successfully" });
      setTimeout(() => navigate("/app/dashboard"), 900);
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
        title="Configuration – Flash Sale Bars"
        backAction={{ content: "Back", onAction: () => navigate("/app/notification") }}
        primaryAction={{ content: "Save", onAction: save, loading: saving, disabled: saving }}
      >
        <Layout>
          {/* Live Preview */}
          <Layout.Section>
            <Card>
              <Box padding="4">
                <LivePreview form={form} />
              </Box>
            </Card>
          </Layout.Section>

          {/* Display */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Display</Text>
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
                    <Box width="50%"><Select label="Display On Pages" options={pageOptions} value={form.showType} onChange={onField("showType")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><TextField label="Popup Display Duration (seconds)" type="number" value={String(form.durationSeconds)} onChange={onDurationChange} suffix="S" min={1} max={60} step={1} autoComplete="off" /></Box>
                    <Box width="50%"><TextField label="Interval Between Sale Bars (seconds)" type="number" value={String(form.alternateSeconds)} onChange={onAlternateChange} suffix="S" min={0} max={3600} step={1} autoComplete="off" /></Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Message */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="350">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Message</Text>
                  </InlineStack>

                  {/* Banner Title */}
                  <BlockStack gap="150">
                    <div onKeyDownCapture={titlesDraft.onKeyDown}>
                      <TextField
                        label="Flash Sale Headline / Banner Title (add multiple)"
                        value={titlesDraft.draft}
                        onChange={titlesDraft.onInputChange}
                        autoComplete="off"
                        multiline={1}
                        placeholder="Flash Sale, Flash Sale 2 … (press Enter to add)"
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {titlesList.map((t, i) => (<Tag key={`title-${i}`} onRemove={() => titlesDraft.removeAt(i)}>{t}</Tag>))}
                    </InlineStack>
                  </BlockStack>

                  {/* Offer Title */}
                  <BlockStack gap="150">
                    <div onKeyDownCapture={locationsDraft.onKeyDown}>
                      <TextField
                        label="Offer Title / Discount Name (add multiple)"
                        value={locationsDraft.draft}
                        onChange={locationsDraft.onInputChange}
                        autoComplete="off"
                        multiline={1}
                        placeholder="Flash Sale 10% OFF, Flash Sale 20% OFF …"
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {locationsList.map((t, i) => (<Tag key={`loc-${i}`} onRemove={() => locationsDraft.removeAt(i)}>{t}</Tag>))}
                    </InlineStack>
                  </BlockStack>

                  {/* Urgency Text */}
                  <BlockStack gap="150">
                    <div onKeyDownCapture={namesDraft.onKeyDown}>
                      <TextField
                        label="Countdown Text / Urgency Message (add multiple)"
                        value={namesDraft.draft}
                        onChange={namesDraft.onInputChange}
                        autoComplete="off"
                        multiline={1}
                        placeholder="ends in 01:15 hours, ends in 02:15 hours …"
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {namesList.map((t, i) => (<Tag key={`name-${i}`} onRemove={() => namesDraft.removeAt(i)}>{t}</Tag>))}
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Customize */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Customize</Text>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><Select label="Flash Bar Font Family" options={fontOptions} value={form.fontFamily} onChange={onField("fontFamily")} /></Box>
                    <Box width="50%"><Select label="Text Weight / Style" options={FontweightOptions} value={form.fontWeight} onChange={onField("fontWeight")} /></Box>
                  </InlineStack>
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

                  {/* Icon + Font size */}
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

                  {/* Custom SVG Upload */}
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
                      Upload karta sathe uploaded icon use thashe. Remove karsho to default/built-in par vāpas.
                    </Text>
                  </BlockStack>

                  {/* Colors */}
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><ColorInput label="Banner Title Color" value={form.titleColor} onChange={(v) => setForm(f => ({ ...f, titleColor: v }))} /></Box>
                    <Box width="50%"><ColorInput label="Bar Background Color" value={form.bgColor} onChange={(v) => setForm(f => ({ ...f, bgColor: v }))} /></Box>
                    <Box width="50%"><ColorInput label="Offer Text Color" value={form.msgColor} onChange={(v) => setForm(f => ({ ...f, msgColor: v }))} /></Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Footer (kept hidden) */}
          <Layout.Section oneHalf>{/* ... */}</Layout.Section>
        </Layout>
      </Page>

      {toast.active && <Toast content={toast.msg} error={toast.error} onDismiss={() => setToast(t => ({ ...t, active: false }))} duration={2000} />}
    </Frame>
  );
}
