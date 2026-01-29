import React, { useState, useMemo } from "react";
import {
  Page,
  Card,
  Button,
  TextField,
  Select,
  ChoiceList,
  Box,
  BlockStack,
  InlineStack,
  Text,
  RangeSlider,
  ColorPicker,
  Frame,
  Toast,
  Loading,
} from "@shopify/polaris";
import { useLoaderData, useNavigate, useParams } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

/** Loader & Action (unchanged) */
export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  const key = params?.key;
  if (!shop || !key) throw new Response("Missing shop or key", { status: 400 });

  const existing = await prisma.notificationconfig.findFirst({
    where: { shop, key },
    orderBy: { id: "desc" },
  });
  return json({ existing: existing ?? null });
}
export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  const key = params?.key;
  if (!shop || !key) throw new Response("Missing shop or key", { status: 400 });

  const { form } = await request.json();
  const enabled = form.enabled?.includes("enabled") ?? false;
  const isRecent = key === "recent";
  const isFlash = key === "flash";

  const data = {
    enabled,
    showType: form.showType,
    messageText: form.messageText,
    fontFamily: form.fontFamily,
    position: form.position,
    animation: form.animation,
    mobileSize: form.mobileSize,
    mobilePositionJson: JSON.stringify(form.mobilePosition ?? []),
    titleColor: form.titleColor,
    bgColor: form.bgColor,
    msgColor: form.msgColor,
    rounded: Number(form.rounded),
    durationSeconds: Number(form.durationSeconds),
    messageTitlesJson: JSON.stringify(form.messageTitle ? [form.messageTitle] : []),
    namesJson: JSON.stringify(
      isRecent
        ? (form.hideKeys ?? [])
        : isFlash
          ? (form.countdownText ? [form.countdownText] : [])
          : (form.name ? [form.name] : [])
    ),
  };

  const existing = await prisma.notificationconfig.findFirst({
    where: { shop, key },
    orderBy: { id: "desc" },
  });

  const saved = existing
    ? await prisma.notificationconfig.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.notificationconfig.create({
        data: { shop, key, ...data },
      });
  return json({ success: true, saved });
}

const TITLES = {
  recent: "Recent Purchases",
  flash: "Flash Sale Bars",
};
const pretty = (s) =>
  s ? s.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") : "app";

const HIDE_CHOICES = [
  { label: "Customer Name", value: "name" },
  { label: "City", value: "city" },
  { label: "State", value: "state" },
  { label: "Country", value: "country" },
  { label: "Product Name", value: "productTitle" },
  { label: "Product Image", value: "productImage" },
  { label: "Order Time", value: "time" },
];

const parseArr = (val, fallback = []) => {
  try {
    const parsed = JSON.parse(val || "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

/* -------- color helpers -------- */
function hexToRgb(hex) { const clean = hex.replace("#", ""); const bigint = parseInt(clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean, 16); return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }; }
function rgbToHex({ r, g, b }) { const toHex = v => v.toString(16).padStart(2, "0"); return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase(); }
function rgbToHsv({ r, g, b }) { const rn = r / 255, gn = g / 255, bn = b / 255; const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn); const d = max - min; let h = 0; if (d !== 0) { switch (max) { case rn: h = ((gn - bn) / d) % 6; break; case gn: h = (bn - rn) / d + 2; break; case bn: h = (rn - gn) / d + 4; break }h *= 60; if (h < 0) h += 360 } const s = max === 0 ? 0 : d / max; const v = max; return { h, s, v }; }
function hsvToRgb({ h, s, v }) { const c = v * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = v - c; let rp = 0, gp = 0, bp = 0; if (0 <= h && h < 60) [rp, gp, bp] = [c, x, 0]; else if (60 <= h && h < 120) [rp, gp, bp] = [x, c, 0]; else if (120 <= h && h < 180) [rp, gp, bp] = [0, c, x]; else if (180 <= h && h < 240) [rp, gp, bp] = [0, x, c]; else if (240 <= h && h < 300) [rp, gp, bp] = [x, 0, c]; else if (300 <= h && h < 360) [rp, gp, bp] = [c, 0, x]; return { r: Math.round((rp + m) * 255), g: Math.round((gp + m) * 255), b: Math.round((bp + m) * 255) }; }
function hexToHsb(hex) { const rgb = hexToRgb(hex); const { h, s, v } = rgbToHsv(rgb); return { hue: h, saturation: s, brightness: v }; }
function hsbToHex(hsb) { const rgb = hsvToRgb({ h: hsb.hue, s: hsb.saturation, v: hsb.brightness }); return rgbToHex(rgb); }

/* Animation helper */
const getAnimationStyle = (anim) => {
  switch (anim) {
    case "slide": return { transform: "translateY(8px)", animation: "notif-slide-in 240ms ease-out" };
    case "bounce": return { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" };
    case "zoom": return { transform: "scale(0.96)", animation: "notif-zoom-in 200ms ease-out forwards" };
    default: return { opacity: 0, animation: "notif-fade-in 220ms ease-out forwards" }; // fade
  }
};

/* Preview */
function NotificationPreview({ form }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);

  const containerStyle = {
    width: "100%",
    height: "auto",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    background: "transparent",
    border: "none",
    padding: 0,
    position: "relative",
    overflow: "visible",
  };

  const boxStyle = {
    fontFamily:
      form.fontFamily === "System"
        ? "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
        : form.fontFamily,
    background: form.bgColor,
    color: form.msgColor,
    borderRadius: form.rounded,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    padding: 14,
    border: "1px solid rgba(17, 24, 39, 0.06)",
    maxWidth: 560,
    width: "fit-content",
    margin: 0,
    ...animStyle,
  };

  const titleStyle = { margin: 0, marginBottom: 6, color: form.titleColor, fontWeight: 600, fontSize: 14 };
  const textStyle = { margin: 0, fontSize: 13, lineHeight: 1.5 };

  return (
    <div>
      <style>{`
        @keyframes notif-fade-in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes notif-slide-in { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes notif-zoom-in  { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: scale(1) } }
        @keyframes notif-bounce-in { 0% { transform: translateY(18px); opacity: 0 } 60% { transform: translateY(-6px); opacity: 1 } 100% { transform: translateY(0) } }
      `}</style>

      <div style={containerStyle}>
        <div style={boxStyle}>
          <p style={titleStyle}>{form.messageTitle || "Message Title"}</p>
          <p style={textStyle}>
            {form.messageText || "A short preview of your notification message will appear here."}
          </p>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", opacity: 0.7, fontSize: 12 }}>
            <span>{form.name || "Notification"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationConfigPage() {
  const navigate = useNavigate();
  const { key } = useParams();
  const { existing } = useLoaderData();

  const title = TITLES[key] || pretty(key);
  const isRecent = key === "recent";
  const isFlash = key === "flash";

  // UI state
  const [saving, setSaving] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastError, setToastError] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const toggleToast = () => setToastActive((a) => !a);

  const initialMessageTitle = parseArr(existing?.messageTitlesJson)[0] || title;
  const initialHideKeys = parseArr(existing?.namesJson);
  const initialCountdownText = parseArr(existing?.namesJson)[0] || "";
  const initialMobilePosition = (() => {
    const parsed = parseArr(existing?.mobilePositionJson);
    return parsed.length ? parsed : ["bottom"];
  })();

  const [form, setForm] = useState({
    title: title,
    enabled: existing?.enabled ? ["enabled"] : ["disabled"],
    showType: existing?.showType || "all",
    messageTitle: initialMessageTitle,
    messageText: existing?.messageText || "",
    fontFamily: existing?.fontFamily || "System",
    position: existing?.position || "bottom-left",
    animation: existing?.animation || "fade",
    mobileSize: existing?.mobileSize || "compact",
    mobilePosition: initialMobilePosition,
    titleColor: existing?.titleColor || "#6E62FF",
    bgColor: existing?.bgColor || "#FFFFFF",
    msgColor: existing?.msgColor || "#111111",
    rounded: existing?.rounded ?? 12,
    name: "Rudra Solanki",
    durationSeconds: existing?.durationSeconds ?? 8,
    hideKeys: initialHideKeys,
    countdownText: initialCountdownText,
  });

  const [titleHSB, setTitleHSB] = useState(hexToHsb(form.titleColor));
  const [bgHSB, setBgHSB] = useState(hexToHsb(form.bgColor));
  const [msgHSB, setMsgHSB] = useState(hexToHsb(form.msgColor));

  const onField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const onText = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!key) return;
    try {
      setSaving(true);
      const res = await fetch(`/app/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save");
      }

      setToastMsg("Saved successfully");
      setToastError(false);
      setToastActive(true);

      // થોડા પળો બાદ dashboard પર લઇ જવું
      setTimeout(() => {
        navigate("/app/dashboard");
      }, 900);
    } catch (err) {
      setToastMsg(err?.message || "Something went wrong");
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

  const onDurationChange = (val) => {
    const n = Number.parseInt(val || "0", 10);
    const clamped = Number.isNaN(n) ? 1 : Math.min(60, Math.max(1, n));
    setForm((f) => ({ ...f, durationSeconds: clamped }));
  };
  const updateColorByHSB = (field, setHSB) => (newHsb) => {
    setHSB(newHsb);
    setForm((f) => ({ ...f, [field]: hsbToHex(newHsb) }));
  };
  const updateColorByHEX = (field, setHSB) => (val) => {
    const cleaned = val.toUpperCase();
    setForm((f) => ({ ...f, [field]: cleaned }));
    if (/^#[0-9A-F]{6}$/.test(cleaned)) setHSB(hexToHsb(cleaned));
  };

  const toastMarkup = toastActive ? (
    <Toast content={toastMsg} error={toastError} onDismiss={toggleToast} duration={2000} />
  ) : null;

  return (
    <Frame>
      {saving && <Loading />}
      <Page
        title={`Configuration – ${title}`}
        secondaryActions={[{ content: "Back", onAction: () => navigate("/app/notification") }]}
        primaryAction={{ content: "Save", onAction: save, loading: saving, disabled: saving }}
      >
        {/* Preview */}
        <Card>
          <Box padding="4">
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">Live Preview</Text>
              <InlineStack gap="400" wrap>
                <div style={{ width: 480, maxWidth: "100%" }}>
                  <NotificationPreview form={form} />
                </div>
                <div style={{ maxWidth: 520, opacity: 0.9 }}>
                  <Text as="p" variant="bodyMd">
                    This is an approximate on-store preview. It reflects your {`position, colors, font, rounded`} and {`animation`} settings.
                    Duration is shown as a label for demo.
                  </Text>
                </div>
              </InlineStack>
            </BlockStack>
          </Box>
        </Card>

        {/* DISPLAY */}
        <Card>
          <Box padding="4">
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Display</Text>
              <ChoiceList
                title="Show Popup"
                choices={[{ label: "Enabled", value: "enabled" }, { label: "Disabled", value: "disabled" }]}
                selected={form.enabled}
                onChange={onField("enabled")}
                alignment="horizontal"
              />
              <Select label="Show Type" options={pageOptions} value={form.showType} onChange={onField("showType")} />
              <TextField
                label="Display notification for"
                type="number"
                value={String(form.durationSeconds)}
                onChange={onDurationChange}
                suffix="SECONDS"
                min={1}
                max={60}
                step={1}
                autoComplete="off"
              />
            </BlockStack>
          </Box>
        </Card>

        {/* MESSAGE */}
        <Card>
          <Box padding="4">
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Message</Text>
              <TextField label="Message Title" value={form.messageTitle} onChange={onText("messageTitle")} autoComplete="off" />
              <TextField label="Message Body" value={form.messageText} onChange={onText("messageText")} multiline={2} autoComplete="off" />
              {isFlash && (
                <TextField
                  label="Countdown Text / Urgency Message"
                  value={form.countdownText}
                  onChange={onText("countdownText")}
                  autoComplete="off"
                />
              )}
            </BlockStack>
          </Box>
        </Card>

        {/* CUSTOMIZE */}
        <Card>
          <Box padding="4">
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Customize</Text>
              <Select label="Font Family" options={fontOptions} value={form.fontFamily} onChange={onField("fontFamily")} />
              <Select label="Notification position" options={positionOptions} value={form.position} onChange={onField("position")} />
              <Select label="Notification animation" options={animationOptions} value={form.animation} onChange={onField("animation")} />
              <Select label="Notification size on mobile" options={mobileSizeOptions} value={form.mobileSize} onChange={onField("mobileSize")} />
              <ChoiceList
                title="Mobile Position"
                choices={[{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]}
                selected={form.mobilePosition}
                onChange={onField("mobilePosition")}
              />
              <Text as="h4" variant="headingSm">Colors</Text>
              <InlineStack gap="400" wrap>
                <BlockStack gap="200">
                  <Text>Title Color</Text>
                  <ColorPicker color={titleHSB} onChange={updateColorByHSB("titleColor", setTitleHSB)} />
                  <TextField label="HEX" value={form.titleColor} onChange={updateColorByHEX("titleColor", setTitleHSB)} autoComplete="off" />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>Background Color</Text>
                  <ColorPicker color={bgHSB} onChange={updateColorByHSB("bgColor", setBgHSB)} />
                  <TextField label="HEX" value={form.bgColor} onChange={updateColorByHEX("bgColor", setBgHSB)} autoComplete="off" />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>Message Color</Text>
                  <ColorPicker color={msgHSB} onChange={updateColorByHSB("msgColor", setMsgHSB)} />
                  <TextField label="HEX" value={form.msgColor} onChange={updateColorByHEX("msgColor", setMsgHSB)} autoComplete="off" />
                </BlockStack>
              </InlineStack>
              <Text>Rounded Corners (px): {form.rounded}</Text>
              <RangeSlider min={0} max={24} value={form.rounded} onChange={(v) => setForm((f) => ({ ...f, rounded: v }))} />
              {isRecent && (
                <ChoiceList
                  title="Hide Fields (toggle visibility)"
                  allowMultiple
                  choices={HIDE_CHOICES}
                  selected={form.hideKeys}
                  onChange={onField("hideKeys")}
                />
              )}
            </BlockStack>
          </Box>
        </Card>

        {/* LAUNCH */}
        <Card>
          <Box padding="4">
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Launch</Text>
              <TextField label="Notification Name" value={form.name} onChange={onText("name")} autoComplete="off" />
              <InlineStack gap="200">
                <Button onClick={() => navigate("/app/notification")}>Cancel</Button>
                <Button primary onClick={save} loading={saving} disabled={saving}>Save</Button>
              </InlineStack>
            </BlockStack>
          </Box>
        </Card>
      </Page>

      {toastMarkup}
    </Frame>
  );
}
