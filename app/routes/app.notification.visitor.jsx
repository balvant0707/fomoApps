
// app/routes/app.notification.visitor.jsx
import React, { useMemo, useState } from "react";
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
  Frame,
  Modal,
  IndexTable,
  Thumbnail,
  Badge,
  Checkbox,
  RadioButton,
} from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  await authenticate.admin(request);
  return json({ title: "Visitor Popup" });
}

const NOTI_TYPES = [
  { label: "Visitor list", value: "visitor_list" },
  { label: "Visitor counter", value: "visitor_counter" },
];
const LAYOUTS = [
  { label: "Landscape", value: "landscape" },
  { label: "Portrait", value: "portrait" },
];
const POSITIONS = [
  { label: "Bottom right", value: "bottom-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Top right", value: "top-right" },
  { label: "Top left", value: "top-left" },
];
const TIME_UNITS = [
  { label: "seconds", value: "seconds" },
  { label: "mins", value: "mins" },
  { label: "hours", value: "hours" },
];

const TOKEN_OPTIONS = [
  "full_name",
  "first_name",
  "last_name",
  "product_name",
  "country",
  "city",
  "price",
];
const TIME_TOKENS = ["time", "unit"];

const VISITOR_STYLES = `
.visitor-shell {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.visitor-sidebar {
  width: 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.visitor-nav-btn {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 4px;
  padding: 5px 10px;
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
.visitor-nav-btn:hover {
  border-color: #cbd5e1;
}
.visitor-nav-btn.is-active {
  background: #2f855a;
  color: #ffffff;
  border-color: #2f855a;
}
.visitor-nav-icon {
  width: 20px;
  height: 20px;
}
.visitor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.visitor-columns {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.visitor-form {
  flex: 1;
  min-width: 360px;
}
.visitor-preview {
  flex: 1;
  min-width: 320px;
}
.visitor-preview-box {
  border-radius: 16px;
  padding: 0px;
  min-height: 320px;
  display: flex;
  align-items: start;
  justify-content: center;
  background: #fafafa;
}
.token-pill {
  border: none;
  background: #f3f4f6;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  color: #111827;
  cursor: pointer;
}
.token-pill:hover {
  background: #e5e7eb;
}
.visitor-help {
  margin-top: 24px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}
.visitor-help a {
  color: #111827;
  text-decoration: underline;
}
@media (max-width: 1100px) {
  .visitor-shell {
    flex-direction: column;
  }
  .visitor-sidebar {
    width: 100%;
    flex-direction: row;
  }
  .visitor-nav-btn {
    flex: 1;
    flex-direction: row;
    justify-content: center;
  }
  .visitor-columns {
    flex-direction: column;
  }
}
@media (max-width: 640px) {
  .visitor-nav-btn {
    padding: 10px;
    font-size: 12px;
  }
  .visitor-form,
  .visitor-preview {
    min-width: 0;
  }
}
`;

function LayoutIcon() {
  return (
    <svg
      className="visitor-nav-icon"
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
      className="visitor-nav-icon"
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
      className="visitor-nav-icon"
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
      className="visitor-nav-icon"
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

const MOCK_PRODUCTS = [
  {
    id: "p1",
    title: "Antique Drawers",
    image:
      "https://cdn.shopify.com/s/files/1/0000/0001/products/Antique-Drawers.jpg?v=1",
    price: "Rs. 250.00",
    compareAt: "Rs. 300.00",
    rating: 4,
  },
  {
    id: "p2",
    title: "Bedside Table",
    image:
      "https://cdn.shopify.com/s/files/1/0000/0001/products/Bedside-Table.jpg?v=1",
    price: "Rs. 299.00",
    compareAt: "Rs. 349.00",
    rating: 5,
  },
  {
    id: "p3",
    title: "Black Beanbag",
    image:
      "https://cdn.shopify.com/s/files/1/0000/0001/products/Black-Beanbag.jpg?v=1",
    price: "Rs. 449.00",
    compareAt: "Rs. 499.00",
    rating: 4,
  },
  {
    id: "p4",
    title: "Brown Throw Pillows",
    image:
      "https://cdn.shopify.com/s/files/1/0000/0001/products/Brown-Throw-Pillows.jpg?v=1",
    price: "Rs. 129.00",
    compareAt: "Rs. 159.00",
    rating: 3,
  },
];

function normalizeHex(value, fallback) {
  const v = String(value || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase();
  return fallback;
}

function ColorField({ label, value, onChange, fallback }) {
  const safeValue = normalizeHex(value, fallback);
  return (
    <TextField
      label={label}
      value={safeValue}
      onChange={onChange}
      autoComplete="off"
      suffix={
        <input
          type="color"
          value={safeValue}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{
            width: 26,
            height: 26,
            border: "none",
            padding: 0,
            background: "transparent",
            cursor: "pointer",
          }}
          aria-label={`${label} color`}
        />
      }
    />
  );
}
function PreviewCard({
  layout,
  size,
  transparency,
  bgColor,
  bgAlt,
  textColor,
  timestampColor,
  priceTagBg,
  priceTagAlt,
  priceColor,
  starColor,
  textSizeContent,
  textSizeCompare,
  textSizePrice,
  contentText,
  timestampText,
  showProductImage,
  showPriceTag,
  showRating,
  showClose,
  product,
  template,
}) {
  const scale = 0.8 + (size / 100) * 0.4;
  const opacity = 1 - (transparency / 100) * 0.7;
  const background =
    template === "gradient"
      ? `linear-gradient(135deg, ${bgColor} 0%, ${bgAlt} 100%)`
      : bgColor;

  const isPortrait = layout === "portrait";
  const cardStyle = {
    transform: `scale(${scale})`,
    opacity,
    background,
    color: textColor,
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
    border: "1px solid rgba(0,0,0,0.06)",
    padding: 14,
    display: "flex",
    position: "relative",
    flexDirection: isPortrait ? "column" : "row",
    gap: 12,
    alignItems: isPortrait ? "flex-start" : "center",
    maxWidth: layout === "portrait" ? 320 : 440,
  };

  return (
    <div style={cardStyle}>
      {showClose && (
        <button
          type="button"
          aria-label="Close"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#111827",
            display: "grid",
            placeItems: "center",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          x
        </button>
      )}
      {showProductImage && (
        <div
          style={{
            width: isPortrait ? 56 : 64,
            height: isPortrait ? 56 : 64,
            borderRadius: 12,
            overflow: "hidden",
            background: "#f3f4f6",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          {product?.image ? (
            <img
              src={product.image}
              alt={product.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span style={{ fontSize: 12, color: "#6b7280" }}>IMG</span>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 6, minWidth: 0, flex: 1 }}>
        {showRating && (
          <div style={{ color: starColor, fontSize: 12 }}>
            {"*****".slice(0, product?.rating || 4)}
            <span style={{ color: "#d1d5db" }}>
              {"*****".slice(0, 5 - (product?.rating || 4))}
            </span>
          </div>
        )}
        <div style={{ fontSize: textSizeContent, fontWeight: 600 }}>
          {contentText}
        </div>
        <div
          style={{
            fontSize: textSizeContent,
            fontWeight: 600,
            textDecoration: "underline",
            lineHeight: 1.4,
          }}
        >
          {product?.title || "Your product will show here"}
        </div>
        {showPriceTag && (
          <InlineStack gap="200" blockAlign="center">
            <span
              style={{
                background: priceTagBg,
                color: priceColor,
                fontSize: textSizePrice,
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              {product?.price || "Rs. 299.00"}
            </span>
            <span
              style={{
                color: priceTagAlt,
                fontSize: textSizeCompare,
                textDecoration: "line-through",
              }}
            >
              {product?.compareAt || "Rs. 349.00"}
            </span>
          </InlineStack>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 12,
            color: timestampColor,
          }}
        >
          <span>{timestampText}</span>
        </div>
      </div>
    </div>
  );
}
export default function VisitorPopupPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("layout");

  const [design, setDesign] = useState({
    notiType: "visitor_list",
    layout: "landscape",
    size: 60,
    transparent: 10,
    template: "solid",
    bgColor: "#FFFFFF",
    bgAlt: "#F3F4F6",
    textColor: "#111111",
    timestampColor: "#696969",
    priceTagBg: "#593E3F",
    priceTagAlt: "#E66465",
    priceColor: "#FFFFFF",
    starColor: "#FFD240",
  });

  const [textSize, setTextSize] = useState({
    content: "14",
    compareAt: "13",
    price: "13",
  });

  const [content, setContent] = useState({
    message: "Someone from abroad just viewed this",
    timestamp: "Just now",
    avgTime: "2",
    avgUnit: "mins",
  });

  const [data, setData] = useState({
    directProductPage: true,
    showProductImage: true,
    showPriceTag: true,
    showRating: false,
    ratingSource: "judge_me",
    customerInfo: "shopify",
  });

  const [visibility, setVisibility] = useState({
    showHome: true,
    showProduct: true,
    productScope: "all",
    showCollectionList: true,
    showCollection: true,
    collectionScope: "all",
    showCart: true,
    position: "bottom-right",
  });

  const [behavior, setBehavior] = useState({
    showClose: true,
    hideOnMobile: false,
    delay: "1",
    duration: "10",
    interval: "1",
    intervalUnit: "mins",
    randomize: false,
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");

  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return MOCK_PRODUCTS;
    return MOCK_PRODUCTS.filter((p) => p.title.toLowerCase().includes(term));
  }, [search]);

  const selectedProducts = useMemo(
    () => MOCK_PRODUCTS.filter((p) => selectedIds.includes(p.id)),
    [selectedIds]
  );

  const previewProduct = selectedProducts[0] || MOCK_PRODUCTS[0];

  const togglePick = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const insertToken = (token) => {
    setContent((c) => ({
      ...c,
      message: `${c.message}${c.message ? " " : ""}{${token}}`,
    }));
  };

  const insertTimeToken = (token) => {
    setContent((c) => ({
      ...c,
      timestamp: `${c.timestamp}${c.timestamp ? " " : ""}{${token}}`,
    }));
  };

  return (
    <Frame>
      <Page
        title="Update Visitor notification"
        backAction={{ content: "Back", onAction: () => navigate("/app/notification") }}
        primaryAction={{ content: "Save", onAction: () => {} }}
      >
        <style>{VISITOR_STYLES}</style>
        <div className="visitor-shell">
          <div className="visitor-sidebar">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`visitor-nav-btn ${activeSection === id ? "is-active" : ""}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="visitor-main">
            <div className="visitor-columns">
              <div className="visitor-form">
                <BlockStack gap="400">
                  {activeSection === "layout" && (
                    <>
                      <Card>
                <Box padding="4">
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Design
                    </Text>
                    <InlineStack gap="400" wrap={false}>
                      <Box width="50%">
                        <Select
                          label="Noti type"
                          options={NOTI_TYPES}
                          value={design.notiType}
                          onChange={(v) =>
                            setDesign((d) => ({ ...d, notiType: v }))
                          }
                        />
                      </Box>
                      <Box width="50%">
                        <Select
                          label="Layout"
                          options={LAYOUTS}
                          value={design.layout}
                          onChange={(v) =>
                            setDesign((d) => ({ ...d, layout: v }))
                          }
                        />
                      </Box>
                    </InlineStack>

                    <BlockStack gap="200">
                      <Text>Size</Text>
                      <RangeSlider
                        min={0}
                        max={100}
                        value={design.size}
                        onChange={(v) =>
                          setDesign((d) => ({ ...d, size: v }))
                        }
                      />
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text>Transparent</Text>
                      <RangeSlider
                        min={0}
                        max={100}
                        value={design.transparent}
                        onChange={(v) =>
                          setDesign((d) => ({ ...d, transparent: v }))
                        }
                      />
                    </BlockStack>

                    <ChoiceList
                      title="Color template"
                      choices={[
                        { label: "Solid", value: "solid" },
                        { label: "Gradient", value: "gradient" },
                      ]}
                      selected={[design.template]}
                      onChange={(v) =>
                        setDesign((d) => ({ ...d, template: v[0] }))
                      }
                    />

                    <ColorField
                      label="Background color"
                      value={design.bgColor}
                      fallback="#FFFFFF"
                      onChange={(v) =>
                        setDesign((d) => ({ ...d, bgColor: v }))
                      }
                    />
                    {design.template === "gradient" && (
                      <ColorField
                        label="Background color (alt)"
                        value={design.bgAlt}
                        fallback="#F3F4F6"
                        onChange={(v) =>
                          setDesign((d) => ({ ...d, bgAlt: v }))
                        }
                      />
                    )}

                    <InlineStack gap="400" wrap={false}>
                      <Box width="50%">
                        <ColorField
                          label="Text color"
                          value={design.textColor}
                          fallback="#111111"
                          onChange={(v) =>
                            setDesign((d) => ({ ...d, textColor: v }))
                          }
                        />
                      </Box>
                      <Box width="50%">
                        <ColorField
                          label="Timestamp color"
                          value={design.timestampColor}
                          fallback="#696969"
                          onChange={(v) =>
                            setDesign((d) => ({ ...d, timestampColor: v }))
                          }
                        />
                      </Box>
                    </InlineStack>

                    <InlineStack gap="400" wrap={false}>
                      <Box width="50%">
                        <ColorField
                          label="Price tag background"
                          value={design.priceTagBg}
                          fallback="#593E3F"
                          onChange={(v) =>
                            setDesign((d) => ({ ...d, priceTagBg: v }))
                          }
                        />
                      </Box>
                      <Box width="50%">
                        <ColorField
                          label="Price tag background (alt)"
                          value={design.priceTagAlt}
                          fallback="#E66465"
                          onChange={(v) =>
                            setDesign((d) => ({ ...d, priceTagAlt: v }))
                          }
                        />
                      </Box>
                    </InlineStack>

                    <InlineStack gap="400" wrap={false}>
                      <Box width="50%">
                        <ColorField
                          label="Price color"
                          value={design.priceColor}
                          fallback="#FFFFFF"
                          onChange={(v) =>
                            setDesign((d) => ({ ...d, priceColor: v }))
                          }
                        />
                      </Box>
                      <Box width="50%">
                        <ColorField
                          label="Star color"
                          value={design.starColor}
                          fallback="#FFD240"
                          onChange={(v) =>
                            setDesign((d) => ({ ...d, starColor: v }))
                          }
                        />
                      </Box>
                    </InlineStack>
                  </BlockStack>
                </Box>
                      </Card>
                    </>
                  )}
                  {activeSection === "layout" && (
                    <>
                      <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Text size
                    </Text>
                    <InlineStack gap="400" wrap={false}>
                      <Box width="50%">
                        <TextField
                          label="Content"
                          type="number"
                          value={textSize.content}
                          onChange={(v) =>
                            setTextSize((s) => ({ ...s, content: v }))
                          }
                          autoComplete="off"
                        />
                      </Box>
                      <Box width="50%">
                        <TextField
                          label="Compare at price"
                          type="number"
                          value={textSize.compareAt}
                          onChange={(v) =>
                            setTextSize((s) => ({ ...s, compareAt: v }))
                          }
                          autoComplete="off"
                        />
                      </Box>
                    </InlineStack>
                    <Box width="50%">
                      <TextField
                        label="Price"
                        type="number"
                        value={textSize.price}
                        onChange={(v) =>
                          setTextSize((s) => ({ ...s, price: v }))
                        }
                        autoComplete="off"
                      />
                    </Box>
                  </BlockStack>
                </Box>
                      </Card>
                    </>
                  )}
                  {activeSection === "content" && (
                    <>
                      <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Content
                    </Text>
                    <TextField
                      label="Notification content"
                      value={content.message}
                      onChange={(v) =>
                        setContent((c) => ({ ...c, message: v }))
                      }
                      multiline={4}
                      autoComplete="off"
                      helpText={`${content.message.length}/250`}
                    />
                    <InlineStack gap="150" wrap>
                      {TOKEN_OPTIONS.map((token) => (
                        <button
                          key={token}
                          type="button"
                          className="token-pill"
                          onClick={() => insertToken(token)}
                        >
                          {token}
                        </button>
                      ))}
                    </InlineStack>

                    <TextField
                      label="Timestamp"
                      value={content.timestamp}
                      onChange={(v) =>
                        setContent((c) => ({ ...c, timestamp: v }))
                      }
                      autoComplete="off"
                      helpText={`${content.timestamp.length}/30`}
                    />
                    <InlineStack gap="150" wrap>
                      {TIME_TOKENS.map((token) => (
                        <button
                          key={token}
                          type="button"
                          className="token-pill"
                          onClick={() => insertTimeToken(token)}
                        >
                          {token}
                        </button>
                      ))}
                    </InlineStack>

                    <InlineStack gap="400" wrap={false}>
                      <Box width="50%">
                        <TextField
                          label="Average time"
                          value={content.avgTime}
                          onChange={(v) =>
                            setContent((c) => ({ ...c, avgTime: v }))
                          }
                          autoComplete="off"
                        />
                      </Box>
                      <Box width="50%">
                        <Select
                          label=" "
                          labelHidden
                          options={TIME_UNITS}
                          value={content.avgUnit}
                          onChange={(v) =>
                            setContent((c) => ({ ...c, avgUnit: v }))
                          }
                        />
                      </Box>
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued">
                      Time will be randomized around this time
                    </Text>
                  </BlockStack>
                </Box>
              </Card>
              <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Data (maximum 250 entries)
                    </Text>
                    <InlineStack align="space-between" blockAlign="center" wrap>
                      <Button onClick={() => setPickerOpen(true)}>
                        Browse products
                      </Button>
                      <Text tone="subdued">
                        {selectedIds.length} products selected
                      </Text>
                    </InlineStack>
                    <BlockStack gap="150">
                      <Checkbox
                        label="Notification direct to specific product page"
                        checked={data.directProductPage}
                        onChange={(v) =>
                          setData((d) => ({ ...d, directProductPage: v }))
                        }
                      />
                      <Checkbox
                        label="Show product/avatar image"
                        checked={data.showProductImage}
                        onChange={(v) =>
                          setData((d) => ({ ...d, showProductImage: v }))
                        }
                      />
                      <Checkbox
                        label="Show price tag"
                        checked={data.showPriceTag}
                        onChange={(v) =>
                          setData((d) => ({ ...d, showPriceTag: v }))
                        }
                      />
                      <Checkbox
                        label="Show rating"
                        checked={data.showRating}
                        onChange={(v) =>
                          setData((d) => ({ ...d, showRating: v }))
                        }
                      />
                    </BlockStack>

                    {data.showRating && (
                      <BlockStack gap="200">
                        <Select
                          label="Rating source"
                          options={[
                            { label: "Judge.me", value: "judge_me" },
                            { label: "Loox", value: "loox" },
                            { label: "Okendo", value: "okendo" },
                          ]}
                          value={data.ratingSource}
                          onChange={(v) =>
                            setData((d) => ({ ...d, ratingSource: v }))
                          }
                        />
                        <Button variant="primary">Connect with Judge.me</Button>
                      </BlockStack>
                    )}

                    <Text as="h4" variant="headingSm">
                      Customer info
                    </Text>
                    <BlockStack gap="150">
                      <div>
                        <RadioButton
                          id="customer-info-shopify"
                          name="customer_info"
                          label="Data from Shopify"
                          checked={data.customerInfo === "shopify"}
                          onChange={() =>
                            setData((d) => ({ ...d, customerInfo: "shopify" }))
                          }
                        />
                        <div style={{ marginLeft: 28 }}>
                          <Text tone="subdued">
                            3 customer profiles are imported
                          </Text>
                        </div>
                      </div>
                      <RadioButton
                        id="customer-info-manual"
                        name="customer_info"
                        label="Set manually"
                        checked={data.customerInfo === "manual"}
                        onChange={() =>
                          setData((d) => ({ ...d, customerInfo: "manual" }))
                        }
                      />
                    </BlockStack>

                    {selectedProducts.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          Selected products
                        </Text>
                        <div
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 10,
                            padding: 8,
                            maxHeight: 240,
                            overflow: "auto",
                          }}
                        >
                          <BlockStack gap="200">
                            {selectedProducts.map((item) => (
                              <InlineStack
                                key={item.id}
                                align="space-between"
                                blockAlign="center"
                              >
                                <InlineStack gap="200" blockAlign="center">
                                  <Thumbnail
                                    source={item.image}
                                    alt={item.title}
                                    size="small"
                                  />
                                  <Text>{item.title}</Text>
                                </InlineStack>
                                <Button
                                  tone="critical"
                                  variant="plain"
                                  onClick={() => togglePick(item.id)}
                                >
                                  Remove
                                </Button>
                              </InlineStack>
                            ))}
                          </BlockStack>
                        </div>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Box>
                    </Card>
                    </>
                  )}
                  {activeSection === "display" && (
                    <>
                      <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Visibility
                    </Text>
                    <Text as="h4" variant="headingSm">
                      Show on
                    </Text>
                    <BlockStack gap="200">
                      <Checkbox
                        label="Home page"
                        checked={visibility.showHome}
                        onChange={(v) =>
                          setVisibility((s) => ({ ...s, showHome: v }))
                        }
                      />
                      <Checkbox
                        label="Product page"
                        checked={visibility.showProduct}
                        onChange={(v) =>
                          setVisibility((s) => ({ ...s, showProduct: v }))
                        }
                      />
                      <div style={{ marginLeft: 28, display: "grid", gap: 8 }}>
                        <RadioButton
                          id="product-scope-all"
                          name="product_scope"
                          label="All products"
                          checked={visibility.productScope === "all"}
                          disabled={!visibility.showProduct}
                          onChange={() =>
                            setVisibility((s) => ({ ...s, productScope: "all" }))
                          }
                        />
                        <RadioButton
                          id="product-scope-specific"
                          name="product_scope"
                          label="Specific products"
                          checked={visibility.productScope === "specific"}
                          disabled={!visibility.showProduct}
                          onChange={() =>
                            setVisibility((s) => ({
                              ...s,
                              productScope: "specific",
                            }))
                          }
                        />
                      </div>
                      <Checkbox
                        label="Collection list"
                        checked={visibility.showCollectionList}
                        onChange={(v) =>
                          setVisibility((s) => ({ ...s, showCollectionList: v }))
                        }
                      />
                      <Checkbox
                        label="Collection page"
                        checked={visibility.showCollection}
                        onChange={(v) =>
                          setVisibility((s) => ({ ...s, showCollection: v }))
                        }
                      />
                      <div style={{ marginLeft: 28, display: "grid", gap: 8 }}>
                        <RadioButton
                          id="collection-scope-all"
                          name="collection_scope"
                          label="All collections"
                          checked={visibility.collectionScope === "all"}
                          disabled={!visibility.showCollection}
                          onChange={() =>
                            setVisibility((s) => ({
                              ...s,
                              collectionScope: "all",
                            }))
                          }
                        />
                        <RadioButton
                          id="collection-scope-specific"
                          name="collection_scope"
                          label="Specific collections"
                          checked={visibility.collectionScope === "specific"}
                          disabled={!visibility.showCollection}
                          onChange={() =>
                            setVisibility((s) => ({
                              ...s,
                              collectionScope: "specific",
                            }))
                          }
                        />
                      </div>
                      <Checkbox
                        label="Cart page"
                        checked={visibility.showCart}
                        onChange={(v) =>
                          setVisibility((s) => ({ ...s, showCart: v }))
                        }
                      />
                    </BlockStack>
                    <Select
                      label="Position"
                      options={POSITIONS}
                      value={visibility.position}
                      onChange={(v) =>
                        setVisibility((s) => ({ ...s, position: v }))
                      }
                    />
                  </BlockStack>
                </Box>
              </Card>
                    </>
                  )}
                  {activeSection === "behavior" && (
                    <>
                      <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Appearance
                    </Text>
                    <Checkbox
                      label="Display a close button"
                      checked={behavior.showClose}
                      onChange={(v) =>
                        setBehavior((b) => ({ ...b, showClose: v }))
                      }
                    />
                    <Checkbox
                      label="Hide on mobile"
                      checked={behavior.hideOnMobile}
                      onChange={(v) =>
                        setBehavior((b) => ({ ...b, hideOnMobile: v }))
                      }
                    />
                  </BlockStack>
                </Box>
              </Card>

              <Card>
                <Box padding="4">
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Timing
                    </Text>
                    <TextField
                      label="Delay before first notification"
                      value={behavior.delay}
                      onChange={(v) =>
                        setBehavior((b) => ({ ...b, delay: v }))
                      }
                      suffix="seconds"
                      autoComplete="off"
                    />
                    <TextField
                      label="Display duration"
                      value={behavior.duration}
                      onChange={(v) =>
                        setBehavior((b) => ({ ...b, duration: v }))
                      }
                      suffix="seconds"
                      autoComplete="off"
                    />
                    <InlineStack gap="400" wrap={false}>
                      <Box width="50%">
                        <TextField
                          label="Interval time"
                          value={behavior.interval}
                          onChange={(v) =>
                            setBehavior((b) => ({ ...b, interval: v }))
                          }
                          autoComplete="off"
                        />
                      </Box>
                      <Box width="50%">
                        <Select
                          label=" "
                          labelHidden
                          options={TIME_UNITS}
                          value={behavior.intervalUnit}
                          onChange={(v) =>
                            setBehavior((b) => ({ ...b, intervalUnit: v }))
                          }
                        />
                      </Box>
                    </InlineStack>
                    <Checkbox
                      label="Randomize interval time"
                      checked={behavior.randomize}
                      onChange={(v) =>
                        setBehavior((b) => ({ ...b, randomize: v }))
                      }
                    />
                    <Text variant="bodySm" tone="subdued">
                      Interval time will be randomized around the input above.
                    </Text>
                  </BlockStack>
                </Box>
                      </Card>
                    </>
                  )}
                </BlockStack>
              </div>
              <div className="visitor-preview">
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Preview
                  </Text>
                  <div className="visitor-preview-box">
                    <PreviewCard
                      layout={design.layout}
                      size={design.size}
                      transparency={design.transparent}
                      bgColor={normalizeHex(design.bgColor, "#FFFFFF")}
                      bgAlt={normalizeHex(design.bgAlt, "#F3F4F6")}
                      textColor={normalizeHex(design.textColor, "#111111")}
                      timestampColor={normalizeHex(
                        design.timestampColor,
                        "#696969"
                      )}
                      priceTagBg={normalizeHex(design.priceTagBg, "#593E3F")}
                      priceTagAlt={normalizeHex(design.priceTagAlt, "#E66465")}
                      priceColor={normalizeHex(design.priceColor, "#FFFFFF")}
                      starColor={normalizeHex(design.starColor, "#FFD240")}
                      textSizeContent={Number(textSize.content) || 14}
                      textSizeCompare={Number(textSize.compareAt) || 13}
                      textSizePrice={Number(textSize.price) || 13}
                      contentText={content.message}
                      timestampText={content.timestamp}
                      showProductImage={data.showProductImage}
                      showPriceTag={data.showPriceTag}
                      showRating={data.showRating}
                      showClose={behavior.showClose}
                      product={previewProduct}
                      template={design.template}
                    />
                  </div>
                </BlockStack>
              </Box>
            </Card>
              </div>
            </div>
            <div className="visitor-help">
              We're here to help! Contact support or refer to the{" "}
              <a href="#">User guide</a>
            </div>
          </div>
        </div>
      </Page>
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select products"
        primaryAction={{ content: "Select", onAction: () => setPickerOpen(false) }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setPickerOpen(false) },
        ]}
        large
      >
        <Modal.Section>
          <BlockStack gap="300">
            <InlineStack gap="200" wrap={false}>
              <Box width="70%">
                <TextField
                  label="Search products"
                  labelHidden
                  placeholder="Search products"
                  value={search}
                  onChange={setSearch}
                  autoComplete="off"
                />
              </Box>
              <Box width="30%">
                <Select
                  label="Search by"
                  labelHidden
                  options={[{ label: "All", value: "all" }]}
                  value="all"
                  onChange={() => {}}
                />
              </Box>
            </InlineStack>

            <IndexTable
              resourceName={{ singular: "product", plural: "products" }}
              itemCount={products.length}
              selectable={false}
              headings={[
                { title: "Select" },
                { title: "Product" },
                { title: "Status" },
              ]}
            >
              {products.map((item, index) => {
                const checked = selectedIds.includes(item.id);
                return (
                  <IndexTable.Row id={item.id} key={item.id} position={index}>
                    <IndexTable.Cell>
                      <Checkbox
                        label=""
                        checked={checked}
                        onChange={() => togglePick(item.id)}
                      />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="200" blockAlign="center">
                        <Thumbnail
                          source={item.image}
                          alt={item.title}
                          size="small"
                        />
                        <Text>{item.title}</Text>
                      </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone="success">active</Badge>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                );
              })}
            </IndexTable>

            <Text tone="subdued">{selectedIds.length} products selected</Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Frame>
  );
}
