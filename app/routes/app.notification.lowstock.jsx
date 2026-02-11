// app/routes/app.notification.lowstock.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Page,
  Card,
  Button,
  TextField,
  Select,
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
import { useNavigate, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  await authenticate.admin(request);
  return json({ title: "Low Stock Popup" });
}

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

const CONTENT_TOKENS = [
  "full_name",
  "first_name",
  "last_name",
  "country",
  "city",
  "product_name",
  "product_price",
];
const TIME_TOKENS = ["time", "unit"];
const TOKEN_OPTIONS = [...CONTENT_TOKENS, "stock_count"];
const DEFAULT_PRODUCT_NAME_LIMIT = "15";

const LOW_STOCK_STYLES = `
.lowstock-shell {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.lowstock-sidebar {
  width: 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lowstock-nav-btn {
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
.lowstock-nav-btn:hover {
  border-color: #cbd5e1;
}
.lowstock-nav-btn.is-active {
  background: #2f855a;
  color: #ffffff;
  border-color: #2f855a;
}
.lowstock-nav-icon {
  width: 20px;
  height: 20px;
}
.lowstock-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.lowstock-columns {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.lowstock-form {
  flex: 1;
  min-width: 360px;
}
.lowstock-preview {
  flex: 1;
  min-width: 320px;
}
.lowstock-preview-box {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 12px;
  min-height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
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
.lowstock-help {
  margin-top: 24px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}
.lowstock-help a {
  color: #111827;
  text-decoration: underline;
}
@media (max-width: 1100px) {
  .lowstock-shell {
    flex-direction: column;
  }
  .lowstock-sidebar {
    width: 100%;
    flex-direction: row;
  }
  .lowstock-nav-btn {
    flex: 1;
    flex-direction: row;
    justify-content: center;
  }
  .lowstock-columns {
    flex-direction: column;
  }
}
@media (max-width: 640px) {
  .lowstock-nav-btn {
    padding: 10px;
    font-size: 12px;
  }
  .lowstock-form,
  .lowstock-preview {
    min-width: 0;
  }
}
`;

function LayoutIcon() {
  return (
    <svg
      className="lowstock-nav-icon"
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
      className="lowstock-nav-icon"
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
      className="lowstock-nav-icon"
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
      className="lowstock-nav-icon"
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
    title: "Free Polo T-Shirt",
    image:
      "https://cdn.shopify.com/s/files/1/0000/0001/products/Classic-Tee.jpg?v=1",
    price: "Rs. 500.00",
    compareAt: "Rs. 999.00",
    rating: 4,
  },
  {
    id: "p2",
    title: "Canvas Backpack",
    image:
      "https://cdn.shopify.com/s/files/1/0000/0001/products/Canvas-Backpack.jpg?v=1",
    price: "Rs. 299.00",
    compareAt: "Rs. 349.00",
    rating: 5,
  },
];

function normalizeHex(value, fallback) {
  const v = String(value || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase();
  return fallback;
}

function clampNameLimit(value, fallback = 15) {
  const n = parseInt(String(value || ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(60, n);
}

function formatProductName(name, mode, limit) {
  if (!name) return "";
  if (mode !== "half") return name;
  const max = clampNameLimit(limit, 15);
  if (name.length <= max) return name;
  return `${name.slice(0, max).trimEnd()}...`;
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

function resolveTemplate(value, map) {
  return String(value || "")
    .trim()
    .replace(/\{(\w+)\}/g, (match, key) => map[key] ?? match);
}

function PreviewCard({
  layout,
  size,
  transparency,
  bgColor,
  bgAlt,
  textColor,
  numberColor,
  priceTagBg,
  priceTagAlt,
  priceColor,
  starColor,
  textSizeContent,
  textSizeCompare,
  textSizePrice,
  contentText,
  stockCount,
  showProductImage,
  showPriceTag,
  showRating,
  showClose,
  product,
  template,
  productNameMode,
  productNameLimit,
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
    maxWidth: isPortrait ? 320 : 460,
  };

  const rawName = product?.title || "Your product will show here";
  const safeName = formatProductName(rawName, productNameMode, productNameLimit);
  const safeCount = String(stockCount || "5");
  const tokenValues = {
    full_name: "Jenna Doe",
    first_name: "Jenna",
    last_name: "Doe",
    country: "United States",
    city: "New York",
    product_name: "__PRODUCT__",
    product_price: product?.price || "Rs. 500.00",
    stock_count: "__COUNT__",
  };
  const resolvedContent = resolveTemplate(
    contentText || "{product_name} has only {stock_count} items left in stock",
    tokenValues
  );
  const contentParts = resolvedContent.split(/(__PRODUCT__|__COUNT__)/);
  const contentNode = contentParts.map((part, idx) => {
    if (part === "__PRODUCT__") {
      return (
        <span
          key={`product-${idx}`}
          style={{ fontWeight: 600, textDecoration: "underline" }}
        >
          {safeName}
        </span>
      );
    }
    if (part === "__COUNT__") {
      return (
        <span
          key={`count-${idx}`}
          style={{ color: numberColor, fontWeight: 700 }}
        >
          {safeCount}
        </span>
      );
    }
    return <span key={`text-${idx}`}>{part}</span>;
  });

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
        <div style={{ fontSize: textSizeContent, lineHeight: 1.35 }}>
          {contentNode}
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
              {product?.price || "Rs. 500.00"}
            </span>
            <span
              style={{
                color: priceTagAlt,
                fontSize: textSizeCompare,
                textDecoration: "line-through",
              }}
            >
              {product?.compareAt || "Rs. 999.00"}
            </span>
          </InlineStack>
        )}
      </div>
    </div>
  );
}

export default function LowStockPopupPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("layout");

  const [design, setDesign] = useState({
    layout: "landscape",
    size: 60,
    transparent: 10,
    template: "gradient",
    bgColor: "#FFFBD2",
    bgAlt: "#FBCFCF",
    textColor: "#000000",
    numberColor: "#000000",
    priceTagBg: "#593E3F",
    priceTagAlt: "#E66465",
    priceColor: "#FFFFFF",
    starColor: "#F06663",
  });

  const [textSize, setTextSize] = useState({
    content: "14",
    compareAt: "12",
    price: "12",
  });

  const [content, setContent] = useState({
    message: "{product_name} has only {stock_count} items left in stock",
  });
  const [productNameMode, setProductNameMode] = useState("full");
  const [productNameLimit, setProductNameLimit] = useState(
    DEFAULT_PRODUCT_NAME_LIMIT
  );

  const [data, setData] = useState({
    dataSource: "shopify",
    stockUnder: "10",
    hideOutOfStock: true,
    directProductPage: true,
    showProductImage: true,
    showPriceTag: true,
    showRating: false,
  });

  const [visibility, setVisibility] = useState({
    showHome: true,
    showProduct: true,
    productScope: "specific",
    showCollectionList: true,
    showCollection: true,
    collectionScope: "all",
    showCart: true,
    position: "top-right",
  });

  const [behavior, setBehavior] = useState({
    showClose: true,
    hideOnMobile: false,
    delay: "1",
    duration: "10",
    interval: "5",
    intervalUnit: "seconds",
    randomize: true,
  });

  const productFetcher = useFetcher();
  const collectionFetcher = useFetcher();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [page, setPage] = useState(1);
  const [collectionPage, setCollectionPage] = useState(1);
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);
  const [hasLoadedCollections, setHasLoadedCollections] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);

  useEffect(() => {
    if (hasLoadedProducts) return;
    const params = new URLSearchParams();
    params.set("page", "1");
    productFetcher.load(`/app/products-picker?${params.toString()}`);
    setHasLoadedProducts(true);
  }, [hasLoadedProducts, productFetcher]);

  useEffect(() => {
    if (!pickerOpen) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(page));
    productFetcher.load(`/app/products-picker?${params.toString()}`);
  }, [pickerOpen, search, page, productFetcher]);

  useEffect(() => {
    if (hasLoadedCollections) return;
    const params = new URLSearchParams();
    params.set("page", "1");
    collectionFetcher.load(`/app/collections-picker?${params.toString()}`);
    setHasLoadedCollections(true);
  }, [hasLoadedCollections, collectionFetcher]);

  useEffect(() => {
    if (!collectionPickerOpen) return;
    const params = new URLSearchParams();
    if (collectionSearch) params.set("q", collectionSearch);
    params.set("page", String(collectionPage));
    collectionFetcher.load(`/app/collections-picker?${params.toString()}`);
  }, [collectionPickerOpen, collectionSearch, collectionPage, collectionFetcher]);

  const storeProducts = useMemo(() => {
    const items = productFetcher.data?.items || [];
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      image: item.featuredImage || null,
      status: item.status,
      price: item.price || null,
      compareAt: item.compareAt || null,
      rating: 4,
    }));
  }, [productFetcher.data]);

  const storeCollections = useMemo(() => {
    const items = collectionFetcher.data?.items || [];
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      handle: item.handle,
      image: item.image || null,
      productsCount: item.productsCount ?? 0,
      sampleProduct: item.sampleProduct || null,
    }));
  }, [collectionFetcher.data]);

  const fallbackProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return MOCK_PRODUCTS;
    return MOCK_PRODUCTS.filter((p) => p.title.toLowerCase().includes(term));
  }, [search]);

  const products = storeProducts.length ? storeProducts : fallbackProducts;

  const scopedProduct =
    visibility.productScope === "specific" ? selectedProducts[0] : null;
  const scopedCollectionProduct =
    visibility.collectionScope === "specific"
      ? selectedCollections[0]?.sampleProduct
      : null;
  const previewProduct =
    scopedProduct ||
    scopedCollectionProduct ||
    storeProducts[0] ||
    MOCK_PRODUCTS[0];

  const togglePick = (item) => {
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) return prev.filter((p) => p.id !== item.id);
      return [...prev, item];
    });
  };

  const toggleCollection = (item) => {
    setSelectedCollections((prev) => {
      const exists = prev.some((c) => c.id === item.id);
      if (exists) return prev.filter((c) => c.id !== item.id);
      return [...prev, item];
    });
  };

  const hasNextPage = Boolean(productFetcher.data?.hasNextPage);
  const hasNextCollectionPage = Boolean(collectionFetcher.data?.hasNextPage);
  const collectionItems = storeCollections;

  const insertToken = (token) => {
    setContent((c) => ({
      ...c,
      message: `${c.message}${c.message ? " " : ""}{${token}}`,
    }));
  };

  return (
    <Frame>
      <Page
        title="Update Low stock notification"
        backAction={{ content: "Back", onAction: () => navigate("/app/notification") }}
        primaryAction={{ content: "Save", onAction: () => {} }}
      >
        <style>{LOW_STOCK_STYLES}</style>
        <div className="lowstock-shell">
          <div className="lowstock-sidebar">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`lowstock-nav-btn ${activeSection === id ? "is-active" : ""}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="lowstock-main">
            <div className="lowstock-columns">
              <div className="lowstock-form">
                <BlockStack gap="400">
                  {activeSection === "layout" && (
                    <>
                      <Card>
                        <Box padding="4">
                          <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">
                              Design
                            </Text>
                            <Select
                              label="Layout"
                              options={LAYOUTS}
                              value={design.layout}
                              onChange={(v) =>
                                setDesign((d) => ({ ...d, layout: v }))
                              }
                            />

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

                            <BlockStack gap="200">
                              <Text as="p">Color template</Text>
                              <InlineStack gap="300">
                                <RadioButton
                                  id="template-solid"
                                  name="template"
                                  label="Solid"
                                  checked={design.template === "solid"}
                                  onChange={() =>
                                    setDesign((d) => ({ ...d, template: "solid" }))
                                  }
                                />
                                <RadioButton
                                  id="template-gradient"
                                  name="template"
                                  label="Gradient"
                                  checked={design.template === "gradient"}
                                  onChange={() =>
                                    setDesign((d) => ({
                                      ...d,
                                      template: "gradient",
                                    }))
                                  }
                                />
                              </InlineStack>
                            </BlockStack>

                            <InlineStack gap="400" wrap={false}>
                              <Box width="50%">
                                <ColorField
                                  label="Background color"
                                  value={design.bgColor}
                                  fallback="#FFFBD2"
                                  onChange={(v) =>
                                    setDesign((d) => ({ ...d, bgColor: v }))
                                  }
                                />
                              </Box>
                              <Box width="50%">
                                <ColorField
                                  label="Background color (alt)"
                                  value={design.bgAlt}
                                  fallback="#FBCFCF"
                                  onChange={(v) =>
                                    setDesign((d) => ({ ...d, bgAlt: v }))
                                  }
                                />
                              </Box>
                            </InlineStack>

                            <InlineStack gap="400" wrap={false}>
                              <Box width="50%">
                                <ColorField
                                  label="Text color"
                                  value={design.textColor}
                                  fallback="#000000"
                                  onChange={(v) =>
                                    setDesign((d) => ({ ...d, textColor: v }))
                                  }
                                />
                              </Box>
                              <Box width="50%">
                                <ColorField
                                  label="Number color"
                                  value={design.numberColor}
                                  fallback="#000000"
                                  onChange={(v) =>
                                    setDesign((d) => ({
                                      ...d,
                                      numberColor: v,
                                    }))
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
                                  label="Compare at price color"
                                  value={design.priceTagAlt}
                                  fallback="#E66465"
                                  onChange={(v) =>
                                    setDesign((d) => ({
                                      ...d,
                                      priceTagAlt: v,
                                    }))
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
                                  fallback="#F06663"
                                  onChange={(v) =>
                                    setDesign((d) => ({ ...d, starColor: v }))
                                  }
                                />
                              </Box>
                            </InlineStack>
                          </BlockStack>
                        </Box>
                      </Card>

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
                                    setTextSize((s) => ({
                                      ...s,
                                      content: v,
                                    }))
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
                                    setTextSize((s) => ({
                                      ...s,
                                      compareAt: v,
                                    }))
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
                              multiline={3}
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
                            <BlockStack gap="200">
                              <Text as="p" variant="bodySm">
                                Product name display
                              </Text>
                              <InlineStack gap="400">
                                <RadioButton
                                  id="product-name-full"
                                  name="product_name_mode"
                                  label="Show full product name"
                                  checked={productNameMode === "full"}
                                  onChange={() => setProductNameMode("full")}
                                />
                                <RadioButton
                                  id="product-name-half"
                                  name="product_name_mode"
                                  label="Show half product name"
                                  checked={productNameMode === "half"}
                                  onChange={() => setProductNameMode("half")}
                                />
                              </InlineStack>
                              {productNameMode === "half" && (
                                <Box width="50%">
                                  <TextField
                                    label="Character limit"
                                    type="number"
                                    value={productNameLimit}
                                    onChange={setProductNameLimit}
                                    autoComplete="off"
                                  />
                                </Box>
                              )}
                            </BlockStack>
                          </BlockStack>
                        </Box>
                      </Card>

                      <Card>
                        <Box padding="4">
                          <BlockStack gap="300">
                            <Text as="h3" variant="headingMd">
                              Data
                            </Text>
                            <InlineStack gap="400">
                              <RadioButton
                                id="data-shopify"
                                name="data_source"
                                label="Data from Shopify"
                                checked={data.dataSource === "shopify"}
                                onChange={() =>
                                  setData((d) => ({
                                    ...d,
                                    dataSource: "shopify",
                                  }))
                                }
                              />
                              <RadioButton
                                id="data-manual"
                                name="data_source"
                                label="Set manually"
                                checked={data.dataSource === "manual"}
                                onChange={() =>
                                  setData((d) => ({
                                    ...d,
                                    dataSource: "manual",
                                  }))
                                }
                              />
                            </InlineStack>

                            <TextField
                              label="Show notification for product with stock under"
                              type="number"
                              value={data.stockUnder}
                              onChange={(v) =>
                                setData((d) => ({ ...d, stockUnder: v }))
                              }
                              autoComplete="off"
                            />

                            <Checkbox
                              label="Don't show notification when out of stock"
                              checked={data.hideOutOfStock}
                              onChange={(v) =>
                                setData((d) => ({ ...d, hideOutOfStock: v }))
                              }
                            />
                          </BlockStack>
                        </Box>
                      </Card>

                      <Card>
                        <Box padding="4">
                          <BlockStack gap="150">
                            <Checkbox
                              label="Notification direct to specific product page"
                              checked={data.directProductPage}
                              onChange={(v) =>
                                setData((d) => ({
                                  ...d,
                                  directProductPage: v,
                                }))
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
                        </Box>
                      </Card>
                    </>
                  )}

                  {activeSection === "display" && (
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
                                  setVisibility((s) => ({
                                    ...s,
                                    productScope: "all",
                                  }))
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
                              {visibility.productScope === "specific" && (
                                <InlineStack
                                  gap="200"
                                  blockAlign="center"
                                  wrap
                                  style={{ marginTop: 6 }}
                                >
                                  <Button onClick={() => setPickerOpen(true)}>
                                    Browse products
                                  </Button>
                                  <Text tone="subdued">
                                    {selectedProducts.length} products selected
                                  </Text>
                                </InlineStack>
                              )}
                            </div>
                            <Checkbox
                              label="Collection list"
                              checked={visibility.showCollectionList}
                              onChange={(v) =>
                                setVisibility((s) => ({
                                  ...s,
                                  showCollectionList: v,
                                }))
                              }
                            />
                            <Checkbox
                              label="Collection page"
                              checked={visibility.showCollection}
                              onChange={(v) =>
                                setVisibility((s) => ({
                                  ...s,
                                  showCollection: v,
                                }))
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
                              {visibility.collectionScope === "specific" && (
                                <InlineStack
                                  gap="200"
                                  blockAlign="center"
                                  wrap
                                  style={{ marginTop: 6 }}
                                >
                                  <Button onClick={() => setCollectionPickerOpen(true)}>
                                    Browse collections
                                  </Button>
                                  <Text tone="subdued">
                                    {selectedCollections.length} collections selected
                                  </Text>
                                </InlineStack>
                              )}
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
                                    setBehavior((b) => ({
                                      ...b,
                                      intervalUnit: v,
                                    }))
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

              <div className="lowstock-preview">
                <Card>
                  <Box padding="4">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">
                        Preview
                      </Text>
                      <div className="lowstock-preview-box">
                        <PreviewCard
                          layout={design.layout}
                          size={design.size}
                          transparency={design.transparent}
                          bgColor={normalizeHex(design.bgColor, "#FFFBD2")}
                          bgAlt={normalizeHex(design.bgAlt, "#FBCFCF")}
                          textColor={normalizeHex(design.textColor, "#000000")}
                          numberColor={normalizeHex(
                            design.numberColor,
                            "#000000"
                          )}
                          priceTagBg={normalizeHex(design.priceTagBg, "#593E3F")}
                          priceTagAlt={normalizeHex(
                            design.priceTagAlt,
                            "#E66465"
                          )}
                          priceColor={normalizeHex(design.priceColor, "#FFFFFF")}
                          starColor={normalizeHex(design.starColor, "#F06663")}
                          textSizeContent={Number(textSize.content) || 14}
                          textSizeCompare={Number(textSize.compareAt) || 12}
                          textSizePrice={Number(textSize.price) || 12}
                          contentText={content.message}
                          stockCount={data.stockUnder}
                          showProductImage={data.showProductImage}
                          showPriceTag={data.showPriceTag}
                          showRating={data.showRating}
                          showClose={behavior.showClose}
                          product={previewProduct}
                          template={design.template}
                          productNameMode={productNameMode}
                          productNameLimit={productNameLimit}
                        />
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </div>
            </div>

            <div className="lowstock-help">
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
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
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
                const checked = selectedProducts.some((p) => p.id === item.id);
                return (
                  <IndexTable.Row id={item.id} key={item.id} position={index}>
                    <IndexTable.Cell>
                      <Checkbox
                        label=""
                        checked={checked}
                        onChange={() => togglePick(item)}
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

            <InlineStack gap="200" align="space-between" blockAlign="center">
              <Text tone="subdued">
                {selectedProducts.length} products selected
              </Text>
              <InlineStack gap="200">
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  disabled={!hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
      <Modal
        open={collectionPickerOpen}
        onClose={() => setCollectionPickerOpen(false)}
        title="Select collections"
        primaryAction={{ content: "Select", onAction: () => setCollectionPickerOpen(false) }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setCollectionPickerOpen(false) },
        ]}
        large
      >
        <Modal.Section>
          <BlockStack gap="300">
            <InlineStack gap="200" wrap={false}>
              <Box width="70%">
                <TextField
                  label="Search collections"
                  labelHidden
                  placeholder="Search collections"
                  value={collectionSearch}
                  onChange={(v) => {
                    setCollectionSearch(v);
                    setCollectionPage(1);
                  }}
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
              resourceName={{ singular: "collection", plural: "collections" }}
              itemCount={collectionItems.length}
              selectable={false}
              headings={[
                { title: "Select" },
                { title: "Collection" },
                { title: "Products" },
              ]}
            >
              {collectionItems.map((item, index) => {
                const checked = selectedCollections.some((c) => c.id === item.id);
                return (
                  <IndexTable.Row id={item.id} key={item.id} position={index}>
                    <IndexTable.Cell>
                      <Checkbox
                        label=""
                        checked={checked}
                        onChange={() => toggleCollection(item)}
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
                      <Badge tone="info">
                        {Number(item.productsCount ?? 0)} items
                      </Badge>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                );
              })}
            </IndexTable>

            <InlineStack gap="200" align="space-between" blockAlign="center">
              <Text tone="subdued">
                {selectedCollections.length} collections selected
              </Text>
              <InlineStack gap="200">
                <Button
                  disabled={collectionPage <= 1}
                  onClick={() => setCollectionPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  disabled={!hasNextCollectionPage}
                  onClick={() => setCollectionPage((p) => p + 1)}
                >
                  Next
                </Button>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Frame>
  );
}
