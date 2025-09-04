import React, { useMemo, useState } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, RangeSlider, ColorPicker, Frame, Toast, Loading, Layout
} from "@shopify/polaris";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

/* ───────── Loader & Action ───────── */
const KEY = "flash";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  const existing = await prisma.notificationConfig.findUnique({
    where: { shop_key: { shop, key: KEY } },
  });
  return json({ existing: existing ?? null, key: KEY, title: "Flash Sale Bars" });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  const { form } = await request.json();
  const enabled = form.enabled?.includes("enabled") ?? false;

  const saved = await prisma.notificationConfig.upsert({
    where: { shop_key: { shop, key: KEY } },
    update: {
      enabled,
      showType: form.showType,
      messageTitle: form.messageTitle,
      messageText: form.messageText,
      fontFamily: form.fontFamily,
      fontWeight: form.fontWeight,               // NEW
      position: form.position,
      animation: form.animation,
      mobileSize: form.mobileSize,
      mobilePositionJson: form.mobilePosition ?? [],
      titleColor: form.titleColor,
      bgColor: form.bgColor,
      msgColor: form.msgColor,
      rounded: Number(form.rounded),
      name: form.name,
      durationSeconds: Number(form.durationSeconds),
      alternateSeconds: Number(form.alternateSeconds), // NEW
    },
    create: {
      shop,
      key: KEY,
      enabled,
      showType: form.showType,
      messageTitle: form.messageTitle,
      messageText: form.messageText,
      fontFamily: form.fontFamily,
      fontWeight: form.fontWeight,               // NEW
      position: form.position,
      animation: form.animation,
      mobileSize: form.mobileSize,
      mobilePositionJson: form.mobilePosition ?? [],
      titleColor: form.titleColor,
      bgColor: form.bgColor,
      msgColor: form.msgColor,
      rounded: Number(form.rounded),
      name: form.name,
      durationSeconds: Number(form.durationSeconds),
      alternateSeconds: Number(form.alternateSeconds), // NEW
    },
  });

  return json({ success: true, saved });
}

/* ───────── color + preview helpers (same as recent) ───────── */
function hexToRgb(hex) { const c = hex.replace("#", ""); const b = parseInt(c.length === 3 ? c.split("").map(x => x + x).join("") : c, 16); return { r: (b >> 16) & 255, g: (b >> 8) & 255, b: b & 255 } }
function rgbToHex({ r, g, b }) { const h = v => v.toString(16).padStart(2, "0"); return `#${h(r)}${h(g)}${h(b)}`.toUpperCase() }
function rgbToHsv({ r, g, b }) { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; let h = 0; if (d) { switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break }h *= 60 } const s = max ? d / max : 0; return { h, s, v: max } }
function hsvToRgb({ h, s, v }) { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let R = 0, G = 0, B = 0; if (0 <= h && h < 60) [R, G, B] = [c, x, 0]; else if (60 <= h && h < 120) [R, G, B] = [x, c, 0]; else if (120 <= h && h < 180) [R, G, B] = [0, c, x]; else if (180 <= h && h < 240) [R, G, B] = [0, x, c]; else if (240 <= h && h < 300) [R, G, B] = [x, 0, c]; else[R, G, B] = [c, 0, x]; return { r: Math.round((R + m) * 255), g: Math.round((G + m) * 255), b: Math.round((B + m) * 255) } }
const hexToHsb = (hex) => { const { h, s, v } = rgbToHsv(hexToRgb(hex)); return { hue: h, saturation: s, brightness: v } }
const hsbToHex = (hsb) => rgbToHex(hsvToRgb({ h: hsb.hue, s: hsb.saturation, v: hsb.brightness }))

const getAnimationStyle = (a) => a === "slide" ? { transform: "translateY(8px)", animation: "notif-slide-in 240ms ease-out" } :
  a === "bounce" ? { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" } :
    a === "zoom" ? { transform: "scale(0.96)", animation: "notif-zoom-in 200ms ease-out forwards" } :
      { opacity: 0, animation: "notif-fade-in 220ms ease-out forwards" };

function NotificationPreview({ form }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);
  return (
    <div>
      <style>{`
        .Polaris-BlockStack.Polaris-BlockStack--listReset {
            display: flex;
            justify-content: start;
            flex-direction: row !important;
            gap: 2rem;
        }
        @keyframes notif-fade-in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes notif-slide-in { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes notif-zoom-in  { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: scale(1) } }
        @keyframes notif-bounce-in { 0% { transform: translateY(18px); opacity: 0 } 60% { transform: translateY(-6px); opacity: 1 } 100% { transform: translateY(0) } }
      `}</style>
      <div style={{ display: "flex" }}>
        <div style={{
          fontFamily: form.fontFamily === "System" ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" : form.fontFamily,
          background: form.bgColor, color: form.msgColor, borderRadius: form.rounded,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 14, border: "1px solid rgba(17,24,39,0.06)",
          maxWidth: 560, ...animStyle
        }}>
          <p style={{
            margin: 0, marginBottom: 6, color: form.titleColor,
            fontWeight: form.fontWeight ? Number(form.fontWeight) : 600,   // uses new field
            fontSize: 14
          }}>
            {form.messageTitle || "Flash Sale"}
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            {form.messageText || "Flash Sale: 20% OFF — ends in 02:15"}
            {form.alternateSeconds ? ` (alt: ${form.alternateSeconds}s)` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────── Page ───────── */
export default function FlashConfigPage() {
  const navigate = useNavigate();
  const { existing, title } = useLoaderData();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ active: false, error: false, msg: "" });

  const [form, setForm] = useState({
    enabled: existing?.enabled ? ["enabled"] : ["enabled"],
    showType: existing?.showType || "all",
    messageTitle: existing?.messageTitle || title,
    messageText: existing?.messageText || "",
    fontFamily: existing?.fontFamily || "System",
    fontWeight: existing?.fontWeight || "600",                 // NEW default
    position: existing?.position || "top-right",
    animation: existing?.animation || "slide",
    mobileSize: existing?.mobileSize || "compact",
    mobilePosition: existing?.mobilePositionJson || ["top"],
    titleColor: existing?.titleColor || "#111111",
    bgColor: existing?.bgColor || "#FFF8E1",
    msgColor: existing?.msgColor || "#111111",
    rounded: Number(existing?.rounded ?? 8),
    name: existing?.name || "Flash Sale Bar",
    durationSeconds: Number(existing?.durationSeconds ?? 10),
    alternateSeconds: Number(existing?.alternateSeconds ?? 5), // NEW default
  });

  const [titleHSB, setTitleHSB] = useState(hexToHsb(form.titleColor));
  const [bgHSB, setBgHSB] = useState(hexToHsb(form.bgColor));
  const [msgHSB, setMsgHSB] = useState(hexToHsb(form.msgColor));
  const onField = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const onText = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const onDurationChange = (val) => { const n = parseInt(val || "0", 10); const x = isNaN(n) ? 1 : Math.min(60, Math.max(1, n)); setForm(f => ({ ...f, durationSeconds: x })) };
  const onAlternateChange = (val) => { const n = parseInt(val || "0", 10); const x = isNaN(n) ? 0 : Math.min(3600, Math.max(0, n)); setForm(f => ({ ...f, alternateSeconds: x })) }; // allow 0..3600

  const updateColorByHSB = (field, setHSB) => (hsb) => { setHSB(hsb); setForm(f => ({ ...f, [field]: hsbToHex(hsb) })) };
  const updateColorByHEX = (field, setHSB) => (val) => { const c = val.toUpperCase(); setForm(f => ({ ...f, [field]: c })); if (/^#[0-9A-F]{6}$/.test(c)) setHSB(hexToHsb(c)) };

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch("/app/notification/flash", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form }),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to save");
      setToast({ active: true, error: false, msg: "Saved successfully" });
      setTimeout(() => navigate("/app/dashboard"), 900);
    } catch (e) {
      setToast({ active: true, error: true, msg: e?.message || "Something went wrong" });
    } finally { setSaving(false); }
  };

  const pageOptions = [{ label: "All Pages", value: "all" }, { label: "Home Page", value: "home" }, { label: "Product Page", value: "product" }, { label: "Collection Page", value: "collection" }, { label: "Pages", value: "pages" }, { label: "Cart Page", value: "cart" }];
  const fontOptions = [{ label: "System", value: "System" }, { label: "Inter", value: "Inter" }, { label: "Roboto", value: "Roboto" }, { label: "Montserrat", value: "Montserrat" }, { label: "Poppins", value: "Poppins" }];

  const positionOptions = [{ label: "Top Left", value: "top-left" }, { label: "Top Right", value: "top-right" }, { label: "Bottom Left", value: "bottom-left" }, { label: "Bottom Right", value: "bottom-right" }];
  const animationOptions = [{ label: "Fade", value: "fade" }, { label: "Slide", value: "slide" }, { label: "Bounce", value: "bounce" }, { label: "Zoom", value: "zoom" }];
  const mobileSizeOptions = [{ label: "Compact", value: "compact" }, { label: "Comfortable", value: "comfortable" }, { label: "Large", value: "large" }];
  const FontweightOptions = [
    { label: "100 - Thin", value: "100" },
    { label: "200 - Extra Light", value: "200" },
    { label: "300 - Light", value: "300" },
    { label: "400 - Normal", value: "400" },
    { label: "500 - Medium", value: "500" },
    { label: "600 - Semi Bold", value: "600" },
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
        {/* Preview */}
        <Layout>
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Live Preview</Text>
                  <InlineStack gap="400" wrap>
                    <div style={{ width: 480, maxWidth: "100%" }}>
                      <NotificationPreview form={form} />
                    </div>
                    <div style={{ maxWidth: 520, opacity: .9 }}>
                      <Text as="p" variant="bodyMd">
                        Preview shows your bar style, animation and colors. Adjust as needed.
                      </Text>
                    </div>
                  </InlineStack>
                </BlockStack>
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
                    <Box width="50%"><ChoiceList title="Show Popup" choices={[{ label: "Enabled", value: "enabled" }, { label: "Disabled", value: "disabled" }]} selected={form.enabled} onChange={onField("enabled")} alignment="horizontal" /></Box>
                    <Box width="50%"><Select label="Show Type" options={pageOptions} value={form.showType} onChange={onField("showType")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><TextField label="Display notification for" type="number" value={String(form.durationSeconds)} onChange={onDurationChange} suffix="S" min={1} max={60} step={1} autoComplete="off" /></Box>
                    <Box width="50%"><TextField label="Alternate time" type="number" value={String(form.alternateSeconds)} onChange={onAlternateChange} suffix="S" min={0} max={3600} step={1} autoComplete="off" /></Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            {/* Message */}
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Message</Text>
                  <TextField label="Banner Title" value={form.messageTitle} onChange={onText("messageTitle")} autoComplete="off" />
                  <TextField label="Banner Text" value={form.messageText} onChange={onText("messageText")} multiline={2} autoComplete="off" />
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
                    <Box width="50%">
                      <Select label="Font Family" options={fontOptions} value={form.fontFamily} onChange={onField("fontFamily")} /></Box>
                    <Box width="50%">
                      <Select label="Font Weight" options={FontweightOptions} value={form.fontWeight} onChange={onField("fontWeight")} /> {/* NEW */}</Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"> <Select label="Notification position" options={positionOptions} value={form.position} onChange={onField("position")} /></Box>
                    <Box width="50%"><Select label="Notification animation" options={animationOptions} value={form.animation} onChange={onField("animation")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><Select label="Notification size on mobile" options={mobileSizeOptions} value={form.mobileSize} onChange={onField("mobileSize")} /></Box>
                    <Box width="50%"><ChoiceList title="Mobile Position" choices={[{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]} selected={form.mobilePosition} onChange={onField("mobilePosition")} /></Box>
                  </InlineStack>
                  <Text as="h4" variant="headingSm">Colors</Text>
                  <InlineStack gap="400" wrap>
                    <BlockStack gap="200">
                      <Text>Title Color</Text>
                      <ColorPicker color={hexToHsb(form.titleColor)} onChange={(hsb) => { setTitleHSB(hsb); setForm(f => ({ ...f, titleColor: hsbToHex(hsb) })) }} />
                      <TextField label="HEX" value={form.titleColor} onChange={(val) => { const c = val.toUpperCase(); setForm(f => ({ ...f, titleColor: c })) }} />
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text>Background Color</Text>
                      <ColorPicker color={hexToHsb(form.bgColor)} onChange={(hsb) => { setBgHSB(hsb); setForm(f => ({ ...f, bgColor: hsbToHex(hsb) })) }} />
                      <TextField label="HEX" value={form.bgColor} onChange={(val) => { const c = val.toUpperCase(); setForm(f => ({ ...f, bgColor: c })) }} />
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text>Message Color</Text>
                      <ColorPicker color={hexToHsb(form.msgColor)} onChange={(hsb) => { setMsgHSB(hsb); setForm(f => ({ ...f, msgColor: hsbToHex(hsb) })) }} />
                      <TextField label="HEX" value={form.msgColor} onChange={(val) => { const c = val.toUpperCase(); setForm(f => ({ ...f, msgColor: c })) }} />
                    </BlockStack>
                  </InlineStack>
                  <Text>Rounded Corners (px): {form.rounded}</Text>
                  <RangeSlider min={0} max={24} value={form.rounded} onChange={(v) => setForm(f => ({ ...f, rounded: v }))} />
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Launch */}
          <Layout.Section oneHalf>
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
          </Layout.Section>
        </Layout>
      </Page>

      {toast.active && <Toast content={toast.msg} error={toast.error} onDismiss={() => setToast(t => ({ ...t, active: false }))} duration={2000} />}
    </Frame>
  );
}
