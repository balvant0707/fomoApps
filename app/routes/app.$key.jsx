import React, { useMemo, useState } from "react";
import {
  Page,
  Card,
  Button,
  TextField,
  Select,
  ChoiceList,
  DropZone,
  Box,
  BlockStack,
  InlineStack,
  Text,
  RangeSlider,
  ColorPicker,
} from "@shopify/polaris";
import { useNavigate, useParams } from "@remix-run/react";

/* ---------- titles ---------- */
const TITLES = {
  recent: "Recent Purchases",
  visitors: "Live Visitor Count",
  stock: "Low Stock Alerts",
  reviews: "Product Reviews",
  cart: "Cart Activity",
  flash: "Flash Sale Bars",
  announcement: "Announcements",
  geo: "Geo Messaging",
};

/* ---------- color utils (hsb <-> hex) ---------- */
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}
function rgbToHex({ r, g, b }) {
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
function rgbToHsv({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn: h = ((gn - bn) / d) % 6; break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
      default: break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}
function hsvToRgb({ h, s, v }) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0, gp = 0, bp = 0;
  if (0 <= h && h < 60) [rp, gp, bp] = [c, x, 0];
  else if (60 <= h && h < 120) [rp, gp, bp] = [x, c, 0];
  else if (120 <= h && h < 180) [rp, gp, bp] = [0, c, x];
  else if (180 <= h && h < 240) [rp, gp, bp] = [0, x, c];
  else if (240 <= h && h < 300) [rp, gp, bp] = [x, 0, c];
  else if (300 <= h && h < 360) [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}
function hexToHsb(hex) {
  const rgb = hexToRgb(hex);
  const { h, s, v } = rgbToHsv(rgb);
  return { hue: h, saturation: s, brightness: v };
}
function hsbToHex(hsb) {
  const rgb = hsvToRgb({ h: hsb.hue, s: hsb.saturation, v: hsb.brightness });
  return rgbToHex(rgb);
}

/* ---------- component ---------- */
export default function NotificationConfigPage() {
  const navigate = useNavigate();
  const { key } = useParams();
  const pretty = (s) =>
    s ? s.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") : "Notification";
  const title = TITLES[key] || pretty(key);

  const [form, setForm] = useState({
    enabled: ["enabled"],       // ChoiceList expects array
    showType: "all",
    messageTitle: "",
    messageText: "",
    imageFiles: [],
    fontFamily: "System",
    position: "bottom-left",
    animation: "fade",
    mobileSize: "compact",
    mobilePosition: ["bottom"],
    titleColor: "#6E62FF",
    bgColor: "#FFFFFF",
    msgColor: "#111111",
    rounded: 12,
    name: "",
  });

  // HSB mirrors for ColorPicker (Polaris accepts HSB)
  const [titleHSB, setTitleHSB] = useState(hexToHsb(form.titleColor));
  const [bgHSB, setBgHSB] = useState(hexToHsb(form.bgColor));
  const [msgHSB, setMsgHSB] = useState(hexToHsb(form.msgColor));

  const onField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const onText = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const handleDrop = (_dropFiles, accepted) =>
    setForm((f) => ({ ...f, imageFiles: accepted }));

  const save = () => {
    console.log("SAVE", key, form);
    navigate("/app/notification");
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

  // sync ColorPicker <-> TextField (HEX)
  const updateColorByHSB = (field, setHSB) => (newHsb) => {
    setHSB(newHsb);
    setForm((f) => ({ ...f, [field]: hsbToHex(newHsb) }));
  };
  const updateColorByHEX = (field, setHSB) => (val) => {
    const cleaned = val.toUpperCase();
    setForm((f) => ({ ...f, [field]: cleaned }));
    // only convert if valid hex (#RRGGBB)
    if (/^#[0-9A-F]{6}$/.test(cleaned)) {
      setHSB(hexToHsb(cleaned));
    }
  };

  const fileNames = useMemo(
    () => form.imageFiles.map((f) => f.name).join(", "),
    [form.imageFiles]
  );

  return (
    <Page
      title={`Configuration – ${title}`}
      secondaryActions={[{ content: "Back", onAction: () => navigate("/app/notification") }]}
      primaryAction={{ content: "Save", onAction: save }}
    >
      {/* DISPLAY */}
      <Card>
        <Box padding="4">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Display</Text>

            <BlockStack gap="400" blockAlign="center" className="responsive-choice-list">
              <Text as="span" variant="bodyMd">Show Popup</Text>
              <ChoiceList
                title=""
                choices={[
                  { label: "Enabled", value: "enabled" },
                  { label: "Disabled", value: "disabled" },
                ]}
                selected={form.enabled}
                onChange={onField("enabled")}
                alignment="horizontal"
                className="choice-list-horizontal" // 👈 custom class
              />
            </BlockStack>

            <Select
              label="Show Type"
              options={pageOptions}
              value={form.showType}
              onChange={onField("showType")}
            />
          </BlockStack>
        </Box>
      </Card>

      {/* MESSAGE */}
      <Card>
        <Box padding="4">
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">Message</Text>

            <TextField
              label="Message Title"
              value={form.messageTitle}
              onChange={onText("messageTitle")}
              autoComplete="off"
            />

            <TextField
              label="Message Body"
              value={form.messageText}
              onChange={onText("messageText")}
              autoComplete="off"
              multiline={2}
            />

            <BlockStack gap="200">
              <Text as="span" variant="bodySm" tone="subdued">Image Upload</Text>
              <DropZone allowMultiple={false} accept="image/*" onDrop={handleDrop}>
                <DropZone.FileUpload />
              </DropZone>
              {fileNames ? (
                <Text as="span" variant="bodySm" tone="subdued">
                  Selected: {fileNames}
                </Text>
              ) : null}
            </BlockStack>
          </BlockStack>
        </Box>
      </Card>

      {/* CUSTOMIZE */}
      <Card>
        <Box padding="4">
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">Customize</Text>

            <Select
              label="Font Family"
              options={fontOptions}
              value={form.fontFamily}
              onChange={onField("fontFamily")}
            />

            <Select
              label="Notification position"
              options={positionOptions}
              value={form.position}
              onChange={onField("position")}
            />

            <Select
              label="Notification animation"
              options={animationOptions}
              value={form.animation}
              onChange={onField("animation")}
            />

            <Select
              label="Notification size on mobile"
              options={mobileSizeOptions}
              value={form.mobileSize}
              onChange={onField("mobileSize")}
            />

            <BlockStack gap="300">
              <Text as="span" variant="bodySm" tone="subdued">Mobile Position</Text>
              <ChoiceList
                title=""
                choices={[
                  { label: "Top", value: "top" },
                  { label: "Bottom", value: "bottom" },
                ]}
                selected={form.mobilePosition}
                onChange={onField("mobilePosition")}
              />
            </BlockStack>

            {/* Colors - Polaris ColorPicker + HEX fields */}
            <BlockStack gap="300">
              <Text as="h4" variant="headingSm">Colors</Text>

              <InlineStack gap="400" align="start" wrap>
                <BlockStack gap="200" align="start">
                  <Text as="span" variant="bodySm">Title Color</Text>
                  <ColorPicker
                    onChange={updateColorByHSB("titleColor", setTitleHSB)}
                    color={titleHSB}
                  />
                  <TextField
                    label="HEX"
                    value={form.titleColor}
                    onChange={updateColorByHEX("titleColor", setTitleHSB)}
                    autoComplete="off"
                    helpText="Format: #RRGGBB"
                  />
                </BlockStack>

                <BlockStack gap="200" align="start">
                  <Text as="span" variant="bodySm">Background Color</Text>
                  <ColorPicker
                    onChange={updateColorByHSB("bgColor", setBgHSB)}
                    color={bgHSB}
                  />
                  <TextField
                    label="HEX"
                    value={form.bgColor}
                    onChange={updateColorByHEX("bgColor", setBgHSB)}
                    autoComplete="off"
                    helpText="Format: #RRGGBB"
                  />
                </BlockStack>

                <BlockStack gap="200" align="start">
                  <Text as="span" variant="bodySm">Message Color</Text>
                  <ColorPicker
                    onChange={updateColorByHSB("msgColor", setMsgHSB)}
                    color={msgHSB}
                  />
                  <TextField
                    label="HEX"
                    value={form.msgColor}
                    onChange={updateColorByHEX("msgColor", setMsgHSB)}
                    autoComplete="off"
                    helpText="Format: #RRGGBB"
                  />
                </BlockStack>
              </InlineStack>
            </BlockStack>

            {/* Rounded */}
            <BlockStack gap="200">
              <Text as="span" variant="bodySm" tone="subdued">
                Rounded Corners (px): {form.rounded}
              </Text>
              <RangeSlider
                min={0}
                max={24}
                value={form.rounded}
                onChange={(v) => setForm((f) => ({ ...f, rounded: v }))}
              />
            </BlockStack>
          </BlockStack>
        </Box>
      </Card>

      {/* LAUNCH */}
      <Card>
        <Box padding="4">
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">Launch</Text>
            <Text as="p" tone="subdued">
              Identify your notification
            </Text>

            <TextField
              label="What is the name of your notification?"
              value={form.name}
              onChange={onText("name")}
              autoComplete="off"
            />

            <InlineStack gap="200">
              <Button onClick={() => navigate("/app/notification")}>Cancel</Button>
              <Button primary onClick={save}>Save</Button>
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>
    </Page>
  );
}
