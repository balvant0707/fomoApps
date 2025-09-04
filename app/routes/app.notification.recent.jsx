// app/routes/app.notification.recent.jsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, RangeSlider, ColorPicker, Frame,
  Toast, Loading, Layout, Modal, IndexTable, Thumbnail, Badge,
  Pagination, Divider, Icon
} from "@shopify/polaris";
import { SearchIcon, XIcon } from "@shopify/polaris-icons";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

/* ───────────────────────────────── Loader & Action ───────────────────────────────── */

const KEY = "recent";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  // DB: existing config
  const existing = await prisma.notificationConfig.findUnique({
    where: { shop_key: { shop, key: KEY } },
  });

  // tiny initial list (not used by modal, but harmless)
  const resp = await admin.graphql(`
    query ProductsForRecent {
      products(first: 10, sortKey: TITLE) {
        edges { node { id title } }
      }
    }
  `);
  const data = await resp.json();
  const edges = data?.data?.products?.edges ?? [];
  const productOptions = edges.map((e) => ({ value: e.node.id, label: e.node.title }));

  return json({
    existing: existing ?? null,
    key: KEY,
    title: "Recent Purchases",
    productOptions,
  });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  const { form } = await request.json();
  const enabled = form.enabled?.includes?.("enabled") ?? false;

  // single product id as array of one (backward-compatible)
  const selectedProducts = Array.isArray(form.selectedProducts) ? form.selectedProducts.slice(0,1) : [];
  const location = form.location ?? "";
  const fontWeight = Number(form.fontWeight ?? 600);
  const alternateSeconds = Number(form.alternateSeconds ?? 0) || 0;

  const saved = await prisma.notificationConfig.upsert({
    where: { shop_key: { shop, key: KEY } },
    update: {
      enabled,
      showType: form.showType,
      messageTitle: form.messageTitle,
      messageText: form.messageText,
      fontFamily: form.fontFamily,
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

      // new fields
      productIdsJson: selectedProducts,
      location,
      fontWeight,
      alternateSeconds,
    },
    create: {
      shop,
      key: KEY,
      enabled,
      showType: form.showType,
      messageTitle: form.messageTitle,
      messageText: form.messageText,
      fontFamily: form.fontFamily,
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

      // new fields
      productIdsJson: selectedProducts,
      location,
      fontWeight,
      alternateSeconds,
    },
  });

  return json({ success: true, saved });
}

/* ────────────────────────────── color helpers ────────────────────────────── */
function hexToRgb(hex) {
  const c = hex.replace("#", "");
  const b = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  return { r: (b >> 16) & 255, g: (b >> 8) & 255, b: b & 255 };
}
function rgbToHex({ r, g, b }) {
  const h = (v) => v.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
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
  return { h, s, v: max };
}
function hsvToRgb({ h, s, v }) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let R = 0, G = 0, B = 0;
  if (0 <= h && h < 60) [R, G, B] = [c, x, 0];
  else if (60 <= h && h < 120) [R, G, B] = [x, c, 0];
  else if (120 <= h && h < 180) [R, G, B] = [0, c, x];
  else if (180 <= h && h < 240) [R, G, B] = [0, x, c];
  else if (240 <= h && h < 300) [R, G, B] = [x, 0, c];
  else [R, G, B] = [c, 0, x];
  return { r: Math.round((R + m) * 255), g: Math.round((G + m) * 255), b: Math.round((B + m) * 255) };
}
const hexToHsb = (hex) => { const { h, s, v } = rgbToHsv(hexToRgb(hex)); return { hue: h, saturation: s, brightness: v }; };
const hsbToHex = (hsb) => rgbToHex(hsvToRgb({ h: hsb.hue, s: hsb.saturation, v: hsb.brightness }));

/* ───────────────────────── animation + preview ───────────────────────── */
const getAnimationStyle = (a) =>
  a === "slide" ? { transform: "translateY(8px)", animation: "notif-slide-in 240ms ease-out" } :
  a === "bounce" ? { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" } :
  a === "zoom" ? { transform: "scale(0.96)", animation: "notif-zoom-in 200ms ease-out forwards" } :
  { opacity: 0, animation: "notif-fade-in 220ms ease-out forwards" };

const parseGid = (gid) => (gid ? gid.split("/").pop() : gid);

function NotificationPreview({ form, selectedProduct }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);
  const titleStyle = {
    margin: 0,
    marginBottom: 6,
    color: form.titleColor,
    fontSize: form.rounded,
    fontWeight: Number(form.fontWeight) || 400,
  };
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
        <div
          style={{
            display:"flex",
            alignItems: "center",
            gap: "1rem",
            fontFamily: form.fontFamily === "System" ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" : form.fontFamily,
            background: form.bgColor,
            color: form.msgColor,
            borderRadius: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: 14,
            border: "1px solid rgba(17,24,39,0.06)",
            maxWidth: 560,
            ...animStyle,
          }}
        >
          <div className="image">
            {selectedProduct ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <img
                src={selectedProduct.featuredImage || ""}
                alt={selectedProduct.title || "Product"}
                style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, background: "#f4f4f5" }}
              />
            </div>
          ) : <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7L12 2L21 7V17L12 22L3 17V7Z" stroke="black" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M12 22V12" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M3 7L12 12L21 7" stroke="black" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                }
          </div>
          <div >
            <p>
              <span style={titleStyle}>{form.messageTitle || "Someone"}</span><span style={{ fontSize: form.rounded}}> from</span>
                <span style={titleStyle}>{form.location ? `  ${form.location}` : "Ahmedabad Gujarat"}</span><br></br>
                <span style={{ margin: 0, fontSize: form.rounded }}>{form.messageText || "bought this product recently 12 Hours Ago"}</span><br></br>
                <span style={{ fontSize: form.rounded}}>{form.name ? `  ${form.name}` : "Rudra Sachiya"}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Page ─────────────────────────────────── */
export default function RecentConfigPage() {
  const navigate = useNavigate();
  const { existing, title } = useLoaderData();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ active: false, error: false, msg: "" });

  // Modal picker (single select)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetcher = useFetcher();
  const isLoadingList = fetcher.state !== "idle";
  const items = fetcher.data?.items || [];
  const hasNextPage = !!fetcher.data?.hasNextPage;

  // single selected product id + meta
  const initialId = Array.isArray(existing?.productIdsJson) && existing.productIdsJson.length ? existing.productIdsJson[0] : null;
  const [selectedProductId, setSelectedProductId] = useState(initialId);
  const [selectedProduct, setSelectedProduct] = useState(null); // {id,title,featuredImage,status,totalInventory}

  // keep form (we store array of one id for backward-compat)
  const [form, setForm] = useState({
    enabled: existing?.enabled ? ["enabled"] : ["enabled"],
    showType: existing?.showType || "all",
    messageTitle: existing?.messageTitle || "Someone",
    messageText: existing?.messageText || "bought this product recently 12 Hours Ago",
    fontFamily: existing?.fontFamily || "System",
    position: existing?.position || "bottom-left",
    animation: existing?.animation || "fade",
    mobileSize: existing?.mobileSize || "compact",
    mobilePosition: existing?.mobilePositionJson || ["bottom"],
    titleColor: existing?.titleColor || "#6E62FF",
    bgColor: existing?.bgColor || "#FFFFFF",
    msgColor: existing?.msgColor || "#111111",
    rounded: Number(existing?.rounded ?? 14),
    name: existing?.name || "Rudra Sachiya",
    durationSeconds: Number(existing?.durationSeconds ?? 8),

    // new fields
    selectedProducts: initialId ? [initialId] : [],
    location: existing?.location ?? "Ahmedabad Gujarat",
    fontWeight: String(existing?.fontWeight ?? 600),
    alternateSeconds: Number(existing?.alternateSeconds ?? 0),
  });

  // load list when modal opens / search / page changes
  useEffect(() => {
    if (!pickerOpen) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(page));
    fetcher.load(`/app/products-picker?${params.toString()}`);
  }, [pickerOpen, search, page]);

  // choose item immediately (single-select)
  const chooseProduct = useCallback((item) => {
    setSelectedProductId(item.id);
    setSelectedProduct(item);
    setForm((f) => ({ ...f, selectedProducts: [item.id] }));
    setPickerOpen(false);
  }, []);

  // clear selected
  const clearSelected = useCallback(() => {
    setSelectedProductId(null);
    setSelectedProduct(null);
    setForm((f) => ({ ...f, selectedProducts: [] }));
  }, []);

  const [titleHSB, setTitleHSB] = useState(hexToHsb(form.titleColor));
  const [bgHSB, setBgHSB] = useState(hexToHsb(form.bgColor));
  const [msgHSB, setMsgHSB] = useState(hexToHsb(form.msgColor));

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

  const updateColorByHEX = (field, setHSB) => (val) => {
    const c = val.toUpperCase();
    setForm((f) => ({ ...f, [field]: c }));
    if (/^#[0-9A-F]{6}$/.test(c)) setHSB(hexToHsb(c));
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = { ...form, selectedProducts: selectedProductId ? [selectedProductId] : [] };
      const res = await fetch("/app/notification/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: payload }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save");
      setToast({ active: true, error: false, msg: "Saved successfully" });
      setTimeout(() => navigate("/app/notification"), 900);
    } catch (e) {
      setToast({ active: true, error: true, msg: e?.message || "Something went wrong" });
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

  return (
    <Frame>
      {saving && <Loading />}
      <Page
        title="Configuration – Recent Purchases"
        backAction={{ content: "Back", onAction: () => navigate("/app/notification") }}
        primaryAction={{ content: "Save", onAction: save, loading: saving, disabled: saving }}
      >
        <Layout>
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Live Preview</Text>
                  <InlineStack gap="400" wrap>
                    <div style={{ width: 480, maxWidth: "100%" }}>
                      <NotificationPreview form={form} selectedProduct={selectedProduct} />
                    </div>
                    <div style={{ maxWidth: 520, opacity: 0.9 }}>
                      <Text as="p" variant="bodyMd">
                        Preview now shows the chosen product’s image & title along with your message.
                      </Text>
                    </div>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            {/* Display */}
            <Card>
              <Box padding="4" >
                <BlockStack gap="100" width="100%">
                  <Text as="h3" variant="headingMd">Display</Text>
                  <InlineStack gap="400" wrap={false} width="100%">
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

          <Layout.Section oneHalf>
            {/* Message */}
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Message</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><TextField label="Message Title" value={form.messageTitle} onChange={onText("messageTitle")} autoComplete="off" /></Box>
                    <Box width="50%"><TextField label="Message Body" value={form.messageText} onChange={onText("messageText")} multiline={1} autoComplete="off" /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <TextField label="Location" value={form.location} onChange={onText("location")} autoComplete="off" />
                    </Box>
                    <Box width="50%">
                      <Select label="Font weight" options={weightOptions} value={form.fontWeight} onChange={onField("fontWeight")} />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Product (single-select) */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Product</Text>

                  <InlineStack gap="200">
                    <Button onClick={() => {
                      setPickerOpen(true);
                      setPage(1);
                      const params = new URLSearchParams();
                      params.set("page", "1");
                      fetcher.load(`/app/products-picker?${params.toString()}`);
                    }}>
                      Pick product
                    </Button>
                    {selectedProductId ? (
                      <Text variant="bodySm" tone="subdued">
                      
                      </Text>
                    ) : null}
                  </InlineStack>

                  {/* Selected product card */}
                  {selectedProductId && (
                    <InlineStack
                      align="space-between"
                      blockAlign="center"
                      wrap={false}
                      style={{
                        border: "1px solid var(--p-color-border)",
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      <InlineStack gap="200" blockAlign="center">
                        <Thumbnail
                          source={selectedProduct?.featuredImage || ""}
                          alt={selectedProduct?.title || selectedProductId}
                          size="small"
                        />
                        <BlockStack gap="050">
                          <Text variant="bodyMd">
                            {selectedProduct?.title || selectedProductId.split("/").pop()}
                          </Text>
                          <InlineStack gap="150" blockAlign="center">
                            {selectedProduct?.status && (
                              <Badge tone={selectedProduct.status === "ACTIVE" ? "success" : "attention"}>
                                {selectedProduct.status?.toLowerCase()}
                              </Badge>
                            )}
                          </InlineStack>
                        </BlockStack>
                      </InlineStack>
                      <Button icon={XIcon} variant="tertiary" onClick={clearSelected} />
                    </InlineStack>
                  )}
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* RIGHT column */}
          <Layout.Section oneHalf>
            {/* Customize */}
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Customize</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Font Family" options={fontOptions} value={form.fontFamily} onChange={onField("fontFamily")} /></Box>
                    <Box width="50%"><Select label="Notification position" options={positionOptions} value={form.position} onChange={onField("position")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Notification animation" options={animationOptions} value={form.animation} onChange={onField("animation")} /></Box>
                    <Box width="50%"><Select label="Notification size on mobile" options={mobileSizeOptions} value={form.mobileSize} onChange={onField("mobileSize")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <ChoiceList
                        title="Mobile Position"
                        choices={[{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]}
                        selected={form.mobilePosition}
                        onChange={onField("mobilePosition")}
                      />
                    </Box>
                    <Box width="50%">
                      <Text>Font Size (px): {form.rounded}</Text>
                      <RangeSlider min={0} max={30} value={form.rounded} onChange={(v) => setForm((f) => ({ ...f, rounded: v }))} />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h4" variant="headingSm">Colors</Text>
                  <InlineStack gap="400" wrap>
                    <BlockStack gap="200">
                      <Text>Title Color</Text>
                      <ColorPicker
                        color={titleHSB}
                        onChange={(hsb) => {
                          setTitleHSB(hsb);
                          setForm((f) => ({ ...f, titleColor: hsbToHex(hsb) }));
                        }}
                      />
                      <TextField
                        label="HEX"
                        value={form.titleColor}
                        onChange={(val) => updateColorByHEX("titleColor", setTitleHSB)(val)}
                        autoComplete="off"
                      />
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text>Background Color</Text>
                      <ColorPicker
                        color={bgHSB}
                        onChange={(hsb) => {
                          setBgHSB(hsb);
                          setForm((f) => ({ ...f, bgColor: hsbToHex(hsb) }));
                        }}
                      />
                      <TextField
                        label="HEX"
                        value={form.bgColor}
                        onChange={(val) => updateColorByHEX("bgColor", setBgHSB)(val)}
                        autoComplete="off"
                      />
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text>Message Color</Text>
                      <ColorPicker
                        color={msgHSB}
                        onChange={(hsb) => {
                          setMsgHSB(hsb);
                          setForm((f) => ({ ...f, msgColor: hsbToHex(hsb) }));
                        }}
                      />
                      <TextField
                        label="HEX"
                        value={form.msgColor}
                        onChange={(val) => updateColorByHEX("msgColor", setMsgHSB)(val)}
                        autoComplete="off"
                      />
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Launch */}
          <Layout.Section oneHalf marginBottom="8">
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

      {/* PRODUCT PICKER MODAL — single select (row button) */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select a product"
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
              selectable={false} // single-select via per-row button
              headings={[{ title: "Action" }, { title: "Product" }, { title: "Status" }]}
              loading={isLoadingList}
            >
              {items.map((item, index) => (
                <IndexTable.Row id={item.id} key={item.id} position={index}>
                  <IndexTable.Cell>
                    <Button size="slim" onClick={() => chooseProduct(item)}>Select</Button>
                  </IndexTable.Cell>
                  <IndexTable.Cell width>
                    <InlineStack gap="200" blockAlign="center">
                      <Thumbnail source={item.featuredImage || ""} alt={item.title} size="small" />
                      <Text as="span" variant="bodyMd">{item.title}</Text>
                    </InlineStack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge tone={item.status === "ACTIVE" ? "success" : "attention"}>
                      {item.status?.toLowerCase()}
                    </Badge>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>

            {!isLoadingList && items.length === 0 && (
              <Box padding="4">
                <Text tone="subdued">No products found. Try a different search.</Text>
              </Box>
            )}
            {fetcher.data?.error && (
              <Box padding="4">
                <Text tone="critical">Error: {String(fetcher.data.error)}</Text>
              </Box>
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

      {toast.active && (
        <Toast
          content={toast.msg}
          error={toast.error}
          onDismiss={() => setToast((t) => ({ ...t, active: false }))}
          duration={2000}
        />
      )}
    </Frame>
  );
}
