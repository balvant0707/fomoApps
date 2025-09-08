// app/routes/app.notification.recent.jsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, Frame, Toast, Loading, Layout,
  Modal, IndexTable, Thumbnail, Badge, Pagination, Divider, Icon, Tag, Popover, ColorPicker,
  ButtonGroup
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

/* ─────────────────────────── Constants ─────────────────────────── */
const KEY = "recent";

/* ─────────────────────────── Loader ─────────────────────────── */
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });
  return json({ key: KEY, title: "Recent Purchases" });
}

/* ─────────────────────────── Action ─────────────────────────── */
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  const { form } = await request.json();

  const nullIfBlank = (v) =>
    v === undefined || v === null || String(v).trim() === "" ? null : String(v);
  const intOrNull = (v) => {
    if (v === undefined || v === null || String(v).trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const enabled = form.enabled?.includes?.("enabled") ?? false;

  // Arrays (trim)
  const titles = Array.isArray(form.messageTitles)
    ? form.messageTitles.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const locations = Array.isArray(form.locations)
    ? form.locations.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const names = Array.isArray(form.names)
    ? form.names.map((s) => String(s).trim()).filter(Boolean)
    : [];
  // IMPORTANT: frontend sends HANDLES in selectedProducts
  const productHandles = Array.isArray(form.selectedProducts)
    ? form.selectedProducts.map((s) => String(s).trim()).filter(Boolean)
    : [];

  // Counts must be >0 and ALL equal
  const nTitles = titles.length;
  const nLocs = locations.length;
  const nNames = names.length;
  const nProds = productHandles.length;

  if (!nTitles || !nLocs || !nNames || !nProds) {
    return json(
      { success: false, error: "Please add at least 1 Title, 1 Location, 1 Name and select 1 Product." },
      { status: 400 }
    );
  }
  if (!(nTitles === nLocs && nLocs === nNames && nNames === nProds)) {
    return json(
      {
        success: false,
        error: `Counts must match (e.g., 4/4/4/4). You have ${nTitles} title(s), ${nLocs} location(s), ${nNames} name(s), ${nProds} product(s).`,
      },
      { status: 400 }
    );
  }

  // mobilePositionJson column is String? → store a simple string/JSON string
  const mobilePositionJson = Array.isArray(form.mobilePosition)
    ? JSON.stringify(form.mobilePosition)
    : (form.mobilePosition ? String(form.mobilePosition) : null);

  // Build payload EXACTLY per Prisma schema
  const payload = {
    shop,
    key: KEY,
    enabled,
    showType: nullIfBlank(form.showType),

    // JSON arrays
    messageTitlesJson: JSON.stringify(titles),
    locationsJson: JSON.stringify(locations),
    namesJson: JSON.stringify(names),
    selectedProductsJson: JSON.stringify(productHandles), // HANDLES only

    // styling / behavior
    messageText: nullIfBlank(form.messageText),
    fontFamily: nullIfBlank(form.fontFamily),
    position: nullIfBlank(form.position),
    animation: nullIfBlank(form.animation),
    mobileSize: nullIfBlank(form.mobileSize),
    mobilePositionJson,

    titleColor: nullIfBlank(form.titleColor),
    bgColor: nullIfBlank(form.bgColor),
    msgColor: nullIfBlank(form.msgColor),
    ctaBgColor: nullIfBlank(form.ctaBgColor),

    rounded: intOrNull(form.rounded),
    durationSeconds: intOrNull(form.durationSeconds),
    alternateSeconds: intOrNull(form.alternateSeconds),
    fontWeight: intOrNull(form.fontWeight),

    // icon support (nullable per schema)
    iconKey: nullIfBlank(form.iconKey),
    iconSvg: nullIfBlank(form.iconSvg),
  };

  try {
    const saved = await prisma.notificationConfig.create({ data: payload });
    return json({ success: true, saved });
  } catch (e) {
    return json(
      { success: false, error: e?.message || "Database error while saving configuration." },
      { status: 500 }
    );
  }
}

/* ───────────────────────── Color helpers + input ───────────────────────── */
const hex6 = (v) => /^#[0-9A-F]{6}$/i.test(String(v || ""));

function hexToRgb(hex) {
  const c = hex.replace("#", "");
  const n = parseInt(c, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  const s = max ? d / max : 0;
  return { hue: h, saturation: s, brightness: max };
}
function hsvToRgb({ hue: h, saturation: s, brightness: v }) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let R = 0, G = 0, B = 0;
  if (0 <= h && h < 60) [R, G, B] = [c, x, 0];
  else if (60 <= h && h < 120) [R, G, B] = [x, c, 0];
  else if (120 <= h && h < 180) [R, G, B] = [0, c, x];
  else if (180 <= h && h < 240) [R, G, B] = [0, x, c];
  else [R, G, B] = [x, 0, c];
  return { r: Math.round((R + m) * 255), g: Math.round((G + m) * 255), b: Math.round((B + m) * 255) };
}
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const hexToHSB = (hex) => rgbToHsv(hexToRgb(hex));
const hsbToHEX = (hsb) => rgbToHex(hsvToRgb(hsb));

function ColorInput({ label, value, onChange, placeholder = "#244E89" }) {
  const [open, setOpen] = useState(false);
  const [hsb, setHsb] = useState(hex6(value) ? hexToHSB(value) : { hue: 212, saturation: 0.7, brightness: 0.55 });

  useEffect(() => { if (hex6(value)) setHsb(hexToHSB(value)); }, [value]);

  const swatch = (
    <div
      onClick={() => setOpen(true)}
      style={{
        width: 28, height: 28, borderRadius: 10, cursor: "pointer",
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
            const next = v.toUpperCase();
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

/* ───────────────────────── Token input helper (ENTER-only add) ───────────────────────── */
function useTokenInput(listKey, form, setForm) {
  const [draft, setDraft] = useState("");

  const add = useCallback((val) => {
    const v = String(val || "").trim();
    if (!v) return;
    setForm((f) => {
      const arr = [...(f[listKey] || [])];
      if (!arr.includes(v)) arr.push(v);
      return { ...f, [listKey]: arr };
    });
  }, [listKey, setForm]);

  const removeAt = useCallback((idx) => {
    setForm((f) => {
      const arr = [...(f[listKey] || [])];
      arr.splice(idx, 1);
      return { ...f, [listKey]: arr };
    });
  }, [listKey, setForm]);

  const onChange = useCallback((v) => {
    setDraft(v);
  }, []);

  const commitDraft = useCallback(() => {
    const parts = String(draft).split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) parts.forEach(add);
    setDraft("");
  }, [draft, add]);

  const onKeyDown = () => {};

  return { draft, setDraft, add, removeAt, onChange, onKeyDown, commitDraft };
}

/* ───────────────────────── Animations ───────────────────────── */
const getAnimationStyle = (a) =>
  a === "slide" ? { transform: "translateY(8px)", animation: "notif-slide-in 240ms ease-out" } :
    a === "bounce" ? { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" } :
      a === "zoom" ? { transform: "scale(0.96)", animation: "notif-zoom-in 200ms ease-out forwards" } :
        { opacity: 0, animation: "notif-fade-in 220ms ease-out forwards" };

/* ───────────────────────── Preview helpers & Live Preview ───────────────────────── */
const posToFlex = (pos) => {
  switch (pos) {
    case "top-left": return { justifyContent: "flex-start", alignItems: "flex-start" };
    case "top-right": return { justifyContent: "flex-end", alignItems: "flex-start" };
    case "bottom-left": return { justifyContent: "flex-start", alignItems: "flex-end" };
    case "bottom-right": return { justifyContent: "flex-end", alignItems: "flex-end" };
    default: return { justifyContent: "flex-start", alignItems: "flex-end" };
  }
};
const mobilePosToFlex = (pos) => ({
  justifyContent: "center",
  alignItems: pos === "top" ? "flex-start" : "flex-end",
});
const mobileSizeToWidth = (size) => (size === "compact" ? 300 : size === "large" ? 360 : 330);
const mobileSizeScale = (size) => (size === "compact" ? 0.92 : size === "large" ? 1.06 : 1);

/* Inject keyframes globally for animations */
function PreviewKeyframes() {
  return (
    <style>{`
      @keyframes notif-fade-in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
      @keyframes notif-slide-in { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
      @keyframes notif-zoom-in  { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: scale(1) } }
      @keyframes notif-bounce-in { 0% { transform: translateY(18px); opacity: 0 } 60% { transform: translateY(-6px); opacity: 1 } 100% { transform: translateY(0) } }
    `}</style>
  );
}

/* One bubble used in both desktop & mobile (drafts => live typing) */
function NotificationBubble({ form, selectedProduct, isMobile = false, drafts = {} }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);

  const firstTitle = form?.messageTitles?.[0] || "Someone";
  const firstLoc   = form?.locations?.[0] || "Ahmedabad Gujarat";
  const firstName  = form?.names?.[0] || "Rudra Sachiya";

  // prefer drafts while typing
  const displayTitle = (drafts.title || "").trim() || firstTitle;
  const displayLoc   = (drafts.location || "").trim() || firstLoc;
  const displayName  = (drafts.name || "").trim() || firstName;

  const firstHandle = Array.isArray(form?.selectedProducts) && form.selectedProducts.length
    ? form.selectedProducts[0] : null;

  const baseFont = Number(form?.rounded ?? 14) || 14;
  const scale = isMobile ? mobileSizeScale(form?.mobileSize) : 1;
  const sized = Math.max(10, Math.min(28, Math.round(baseFont * scale)));

  const titleStyle = {
    margin: 0,
    marginBottom: 6,
    color: form?.titleColor,
    fontSize: sized,
    fontWeight: Number(form?.fontWeight) || 400,
    lineHeight: 1.2,
  };

  const bubbleStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontFamily:
      form?.fontFamily === "System"
        ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto"
        : form?.fontFamily,
    background: form?.bgColor,
    color: form?.msgColor,
    borderRadius: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    padding: 10,
    border: "1px solid rgba(17,24,39,0.06)",
    maxWidth: isMobile ? mobileSizeToWidth(form?.mobileSize) : 560,
    ...animStyle,
  };

  return (
    <div style={bubbleStyle}>
      <div className="image">
        {selectedProduct ? (
          <img
            src={selectedProduct.featuredImage || ""}
            alt={selectedProduct.title || "Product"}
            style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, background: "#f4f4f5" }}
          />
        ) : (
          <div style={{ width: 60, height: 60, borderRadius: 6, background: "#f4f4f5", display: 'grid', placeItems: 'center', color: '#111' }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M3 7L12 2L21 7V17L12 22L3 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 7L12 12L21 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      <div>
        <p style={{ margin: 0 }}>
          <span style={titleStyle}>{displayTitle}</span>
          <span style={{ fontSize: sized }}>{" "}from</span>
          <span style={titleStyle}>{" "}{displayLoc}</span><br />
          <span style={{ margin: 0, fontSize: sized }}>{form?.messageText || "bought this product recently"}</span><br />
          <span style={{ fontSize: sized }}></span>
          <span style={{ fontSize: sized, opacity: 0.9, display: 'block', textAlign: 'end' }}>
            <small>{displayName}</small>
          </span>
          {/* {firstHandle ? <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>@{firstHandle}</span> : null} */}
        </p>
      </div>
    </div>
  );
}

/* Desktop frame */
function DesktopPreview({ form, selectedProduct, drafts }) {
  const flex = posToFlex(form?.position);
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
      <NotificationBubble form={form} selectedProduct={selectedProduct} isMobile={false} drafts={drafts} />
    </div>
  );
}

/* Mobile phone frame */
function MobilePreview({ form, selectedProduct, drafts }) {
  const flex = mobilePosToFlex(form?.mobilePosition);
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
        {/* fake notch */}
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
          <NotificationBubble form={form} selectedProduct={selectedProduct} isMobile drafts={drafts} />
        </div>
      </div>
    </div>
  );
}

/* Wrapper that shows Desktop/Mobile/Both with buttons */
function LivePreview({ form, selectedProduct, drafts }) {
  const [mode, setMode] = useState("both"); // 'desktop' | 'mobile' | 'both'
  return (
    <BlockStack gap="200">
      <PreviewKeyframes />

      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingMd">Live Preview</Text>
        <ButtonGroup segmented>
          <Button pressed={mode === "desktop"} onClick={() => setMode("desktop")}>Desktop</Button>
          <Button pressed={mode === "mobile"} onClick={() => setMode("mobile")}>Mobile</Button>
          <Button pressed={mode === "both"} onClick={() => setMode("both")}>Both</Button>
        </ButtonGroup>
      </InlineStack>

      {mode === "desktop" && <DesktopPreview form={form} selectedProduct={selectedProduct} drafts={drafts} />}
      {mode === "mobile"  && <MobilePreview  form={form} selectedProduct={selectedProduct} drafts={drafts} />}
      {mode === "both" && (
        <InlineStack gap="400" align="space-between" wrap>
          <Box width="58%"><DesktopPreview form={form} selectedProduct={selectedProduct} drafts={drafts} /></Box>
          <Box width="40%"><MobilePreview  form={form} selectedProduct={selectedProduct} drafts={drafts} /></Box>
        </InlineStack>
      )}

      <Text as="p" variant="bodySm" tone="subdued">
        The desktop preview follows the Desktop position. The mobile preview follows the Mobile Position and the Notification size on mobile.
      </Text>
    </BlockStack>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function RecentConfigPage() {
  const navigate = useNavigate();
  const { title } = useLoaderData();

  const [saving, setSaving] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastError, setToastError] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toggleToast = () => setToastActive((a) => !a);

  // validation banner state
  const [countError, setCountError] = useState("");

  // Product picker (multi)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const fetcher = useFetcher();
  const isLoadingList = fetcher.state !== "idle";
  const items = fetcher.data?.items || [];
  const hasNextPage = !!fetcher.data?.hasNextPage;

  // Store selected product objects (for UI chips/preview) + first for preview image
  const [selectedProducts, setSelectedProducts] = useState([]); // [{id,title,handle,featuredImage,status}]
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Defaults
  const [form, setForm] = useState({
    enabled: ["enabled"],
    showType: "all",

    messageTitles: ["Someone"],
    locations: ["Ahmedabad Gujarat"],
    names: ["12 Hours Ago"],

    messageText: "bought this product recently",
    fontFamily: "System",
    position: "bottom-left",
    animation: "fade",
    mobileSize: "compact",
    mobilePosition: "bottom",
    titleColor: "#6E62FF",
    bgColor: "#FFFFFF",
    msgColor: "#111111",
    ctaBgColor: "#244E89",
    rounded: "14",
    durationSeconds: 8,

    // IMPORTANT: this carries HANDLES (not IDs)
    selectedProducts: [],

    fontWeight: "600",
    alternateSeconds: 0,

    // icon fields (nullable)
    iconKey: "",
    iconSvg: "",
  });

  const hasProduct = selectedProducts.length > 0;

  // Load product list when modal open / search / page
  useEffect(() => {
    if (!pickerOpen) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(page));
    fetcher.load(`/app/products-picker?${params.toString()}`);
  }, [pickerOpen, search, page]);

  // Toggle product add/remove — form.selectedProducts = HANDLES array
  const togglePick = (item) => {
    setSelectedProducts((prev) => {
      const exists = prev.some(p => p.id === item.id);
      const next = exists ? prev.filter(p => p.id !== item.id) : [...prev, item];
      setSelectedProduct(next[0] || null);
      setForm(f => ({
        ...f,
        selectedProducts: next.map(p => p.handle), // HANDLES ONLY
      }));
      return next;
    });
  };

  const clearSelectedOne = (id) => {
    setSelectedProducts((prev) => {
      const next = prev.filter(p => p.id !== id);
      setSelectedProduct(next[0] || null);
      setForm(f => ({
        ...f,
        selectedProducts: next.map(p => p.handle), // HANDLES ONLY
      }));
      return next;
    });
  };

  // helpers
  const onField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const onText = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const onDurationChange = (val) => {
    const n = parseInt(val || "0", 10);
    const x = isNaN(n) ? 1 : Math.min(60, Math.max(1, n));
    setForm((f) => ({ ...f, durationSeconds: x }));
  };
  const onAlternateChange = (val) => {
    const n = parseInt(val || "0", 10);
    const x = isNaN(n) ? 0 : Math.min(3600, Math.max(0, n));
    setForm((f) => ({ ...f, alternateSeconds: x }));
  };

  // token inputs (ENTER-only) for titles, locations, names
  const titlesInput = useTokenInput("messageTitles", form, setForm);
  const locationsInput = useTokenInput("locations", form, setForm);
  const namesInput = useTokenInput("names", form, setForm);

  // client-side strict counts validation
  const validateCounts = () => {
    const nTitles = (form.messageTitles || []).length;
    const nLocs = (form.locations || []).length;
    const nNames = (form.names || []).length;
    const nProds = (form.selectedProducts || []).length; // HANDLES count

    if (!nTitles || !nLocs || !nNames || !nProds) {
      return "Please add at least 1 Title, 1 Location, 1 Name and select 1 Product.";
    }
    if (!(nTitles === nLocs && nLocs === nNames && nNames === nProds)) {
      return `Counts must match (e.g., 4/4/4/4). You currently have ${nTitles} title(s), ${nLocs} location(s), ${nNames} name(s) and ${nProds} product(s).`;
    }
    return "";
  };

  // SAVE
  const save = async () => {
    try {
      const msg = validateCounts();
      if (msg) {
        setCountError(msg);
        setToastMsg(msg);
        setToastError(true);
        setToastActive(true);
        return;
      }

      setSaving(true);
      setCountError("");

      const res = await fetch("/app/notification/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ form }),
      });

      const bodyText = await res.text();
      if (!res.ok) {
        let msg2 = "Failed to save";
        try {
          const j = JSON.parse(bodyText || "{}");
          if (j?.error) msg2 = String(j.error);
          else if (j?.message) msg2 = String(j.message);
        } catch {
          if (bodyText && !bodyText.trim().startsWith("<")) msg2 = bodyText;
        }
        throw new Error(msg2);
      }

      navigate("/app/dashboard");
    } catch (e) {
      setToastMsg(String(e?.message || "Something went wrong"));
      setToastError(true);
      setToastActive(true);
    } finally {
      setSaving(false);
    }
  };

  const pageOptions = [
    { label: "All Pages", value: "all" },
    { label: "Home Page", value: "home" },
    { label: "Product Page", value: "product" },
    { label: "Collection Page", value: "collection" },
    { label: "Pages", value: "pages" },
    { label: "Cart Page", value: "cart" },
  ];
  const fontOptions = [
    { label: "System", value: "System" },
    { label: "Inter", value: "Inter" },
    { label: "Roboto", value: "Roboto" },
    { label: "Montserrat", value: "Montserrat" },
    { label: "Poppins", value: "Poppins" },
  ];
  const positionOptions = [
    { label: "Top Left", value: "top-left" },
    { label: "Top Right", value: "top-right" },
    { label: "Bottom Left", value: "bottom-left" },
    { label: "Bottom Right", value: "bottom-right" },
  ];
  const animationOptions = [
    { label: "Fade", value: "fade" },
    { label: "Slide", value: "slide" },
    { label: "Bounce", value: "bounce" },
    { label: "Zoom", value: "zoom" },
  ];
  const mobileSizeOptions = [
    { label: "Compact", value: "compact" },
    { label: "Comfortable", value: "comfortable" },
    { label: "Large", value: "large" },
  ];
  const weightOptions = [
    { label: "100 - Thin", value: "100" },
    { label: "200 - Extra Light", value: "200" },
    { label: "300 - Light", value: "300" },
    { label: "400 - Normal", value: "400" },
    { label: "500 - Medium", value: "500" },
    { label: "600 - Semi Bold", value: "600" },
    { label: "700 - Bold", value: "700" },
  ];
  const mobilePosition = [
    { label: "Top", value: "top" },
    { label: "Bottom", value: "bottom" },
  ];

  return (
    <Frame>
      {saving && <Loading />}
      <Page
        title={`Configuration – ${title}`}
        backAction={{ content: "Back", onAction: () => navigate("/app/notification") }}
        primaryAction={{ content: "Save", onAction: save, loading: saving, disabled: saving }}
      >
        <Layout>
          {/* Live Preview */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <LivePreview
                  form={form}
                  selectedProduct={selectedProduct}
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
              <Box padding="4" >
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd">Display</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <ChoiceList
                        title="Show Popup"
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
                      <Select label="Show Type" options={pageOptions} value={form.showType} onChange={onField("showType")} />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <TextField
                        label="Display notification for"
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
                        label="Alternate time"
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
          </Layout.Section>

          {/* Message – ENTER to add + Blur to auto-commit; drafts used for live preview */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Message</Text>

                  {countError ? (
                    <Box paddingBlockStart="200">
                      <div role="alert" style={{ border: '1px solid #E0B3B2', background: '#FFF6F6', borderRadius: 8, padding: 12 }}>
                        <Text tone="critical">{countError}</Text>
                      </div>
                    </Box>
                  ) : null}

                  {/* Titles */}
                  <BlockStack gap="200">
                    <div
                      onKeyDownCapture={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          titlesInput.commitDraft();
                        }
                      }}
                    >
                      <TextField
                        label="Customer Name (add multiple)"
                        value={titlesInput.draft}
                        onChange={titlesInput.onChange}
                        onBlur={titlesInput.commitDraft}
                        autoComplete="off"
                        placeholder="Write like: Name1, Name2,Name3 ... then press Enter to add"
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {(form.messageTitles || []).map((t, i) => (
                        <Tag key={`${t}-${i}`} onRemove={() => titlesInput.removeAt(i)}>{t}</Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>

                  {/* Body */}
                  <TextField
                    label="Message Body"
                    value={form.messageText}
                    onChange={onText("messageText")}
                    multiline={1}
                    autoComplete="off"
                  />

                  {/* Locations */}
                  <BlockStack gap="200">
                    <div
                      onKeyDownCapture={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          locationsInput.commitDraft();
                        }
                      }}
                    >
                      <TextField
                        label="Location (add multiple)"
                        value={locationsInput.draft}
                        onChange={locationsInput.onChange}
                        onBlur={locationsInput.commitDraft}
                        autoComplete="off"
                        placeholder="Write like: Location1, Location2, Location3, ... then press Enter to add"
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {(form.locations || []).map((t, i) => (
                        <Tag key={`${t}-${i}`} onRemove={() => locationsInput.removeAt(i)}>{t}</Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>

                  {/* Names */}
                  <BlockStack gap="200">
                    <div
                      onKeyDownCapture={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          namesInput.commitDraft();
                        }
                      }}
                    >
                      <TextField
                        label="Times (add multiple)"
                        value={namesInput.draft}
                        onChange={namesInput.onChange}
                        onBlur={namesInput.commitDraft}
                        autoComplete="off"
                        placeholder="Write like: 12hours ago, 2hours ago, ... then press Enter to add"
                      />
                    </div>
                    <InlineStack gap="150" wrap>
                      {(form.names || []).map((t, i) => (
                        <Tag key={`${t}-${i}`} onRemove={() => namesInput.removeAt(i)}>{t}</Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Products – multi select; form.selectedProducts = HANDLES */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Products</Text>
                  {!hasProduct && (<Text tone="critical">Please select at least one product.</Text>)}

                  <InlineStack gap="200">
                    <Button onClick={() => {
                      setPickerOpen(true);
                      setPage(1);
                      const params = new URLSearchParams();
                      params.set("page", "1");
                      fetcher.load(`/app/products-picker?${params.toString()}`);
                    }}>
                      Pick products
                    </Button>
                    {!!selectedProducts.length && (
                      <Text variant="bodySm" tone="subdued">{selectedProducts.length} selected</Text>
                    )}
                  </InlineStack>

                  {!!selectedProducts.length && (
                    <InlineStack gap="150" wrap>
                      {selectedProducts.map((p) => (
                        <Tag key={p.id} onRemove={() => clearSelectedOne(p.id)}>{p.title}</Tag>
                      ))}
                    </InlineStack>
                  )}
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
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Font Family" options={fontOptions} value={form.fontFamily} onChange={onField("fontFamily")} /></Box>
                    <Box width="50%"><Select label="Font weight" options={weightOptions} value={form.fontWeight} onChange={onField("fontWeight")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Desktop position" options={positionOptions} value={form.position} onChange={onField("position")} /></Box>
                    <Box width="50%"><Select label="Notification animation" options={animationOptions} value={form.animation} onChange={onField("animation")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Notification size on mobile" options={mobileSizeOptions} value={form.mobileSize} onChange={onField("mobileSize")} /></Box>
                    <Box width="50%"><Select label="Mobile Position" options={mobilePosition} value={form.mobilePosition} onChange={onField("mobilePosition")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <TextField type="number" label="Font Size (px) (Name & Location Only)" value={form.rounded} onChange={onText("rounded")} autoComplete="off" />
                    </Box>
                    <Box width="50%">
                      <ColorInput label="Title Color" value={form.titleColor} onChange={(v) => setForm(f => ({ ...f, titleColor: v }))} />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <ColorInput label="Background Color" value={form.bgColor} onChange={(v) => setForm(f => ({ ...f, bgColor: v }))} />
                    </Box>
                    <Box width="50%">
                      <ColorInput label="Message Color" value={form.msgColor} onChange={(v) => setForm(f => ({ ...f, msgColor: v }))} />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
         
            {/* <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h4" variant="headingSm">Colors</Text>
                  <InlineStack gap="400" wrap>
                    <Box width="48%">
                      <ColorInput label="Title Color" value={form.titleColor} onChange={(v) => setForm(f => ({ ...f, titleColor: v }))} />
                    </Box>
                    <Box width="48%">
                      <ColorInput label="Background Color" value={form.bgColor} onChange={(v) => setForm(f => ({ ...f, bgColor: v }))} />
                    </Box>
                    <Box width="48%">
                      <ColorInput label="Message Color" value={form.msgColor} onChange={(v) => setForm(f => ({ ...f, msgColor: v }))} />
                    </Box>
                    <Box width="48%">
                      <ColorInput label="CTA Background Color" value={form.ctaBgColor} onChange={(v) => setForm(f => ({ ...f, ctaBgColor: v }))} />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card> */}
          </Layout.Section>
          <Layout.Section oneHalf>

          </Layout.Section>
        </Layout>
      </Page>

      {/* PRODUCT PICKER MODAL — multi select */}
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
              prefix={<Icon source={SearchIcon} tone="base" />}
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
                        <BlockStack gap="050">
                          <Text as="span" variant="bodyMd">{item.title}</Text>
                          {item.handle ? (
                            <Text as="span" variant="bodySm" tone="subdued">@{item.handle}</Text>
                          ) : null}
                        </BlockStack>
                      </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone={item.status === "ACTIVE" ? "success" : "attention"}>
                        {item.status?.toLowerCase()}
                      </Badge>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                );
              })}
            </IndexTable>

            {!isLoadingList && items.length === 0 && (
              <Box padding="4"><Text tone="subdued">No products found. Try a different search.</Text></Box>
            )}
            {fetcher.data?.error && (
              <Box padding="4"><Text tone="critical">Error: {String(fetcher.data.error)}</Text></Box>
            )}

            <InlineStack align="center">
              <Pagination
                hasPrevious={page > 1}
                onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                hasNext={hasNextPage}
                onNext={() => setPage((p) => p + 1)}
              />
            </InlineStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Toast */}
      {toastActive && (
        <Toast content={String(toastMsg)} error={toastError} onDismiss={toggleToast} duration={2000} />
      )}
    </Frame>
  );
}
