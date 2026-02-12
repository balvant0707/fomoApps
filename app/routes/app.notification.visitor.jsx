
// app/routes/app.notification.visitor.jsx
import React, { useMemo, useState, useEffect } from "react";
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
  Toast,
  Loading,
} from "@shopify/polaris";
import {
  useNavigate,
  useFetcher,
  useLocation,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { saveVisitorPopup } from "../models/popup-config.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  let customerCount = null;
  try {
    const resp = await admin.graphql(
      "query { customers(first: 1) { totalCount } }"
    );
    const payload = await resp.json();
    const count = payload?.data?.customers?.totalCount;
    if (Number.isFinite(Number(count))) {
      customerCount = Number(count);
    }
  } catch (e) {
    console.warn("[Visitor Popup] customer count fetch failed:", e);
  }
  return json({ title: "Visitor Popup", customerCount });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) return json({ success: false, error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { form } = body || {};
  if (!form) {
    return json({ success: false, error: "Missing form" }, { status: 400 });
  }

  console.log("[Visitor Popup] form payload:", JSON.stringify(form, null, 2));
  try {
    const saved = await saveVisitorPopup(shop, form);
    console.log("[Visitor Popup] saved id:", saved?.id);
    return json({ success: true, id: saved?.id });
  } catch (e) {
    console.error("[Visitor Popup] save failed:", e);
    return json(
      {
        success: false,
        error: e?.message || "Save failed",
        code: e?.code || null,
      },
      { status: 500 }
    );
  }
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
const DEFAULT_PRODUCT_NAME_LIMIT = "15";

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
  timestampColor,
  priceTagBg,
  priceTagAlt,
  priceColor,
  starColor,
  imageAppearance,
  textSizeContent,
  textSizeCompare,
  textSizePrice,
  contentText,
  timestampText,
  avgTime,
  avgUnit,
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
  const imageMode = imageAppearance || "cover";
  const imageFit = imageMode === "contain" ? "contain" : "cover";
  const avatarSize = isPortrait ? 56 : 64;
  const avatarOffset = Math.round(avatarSize * 0.45);
  const pad = 16;
  const imageOverflow = showProductImage && imageMode === "cover" && !isPortrait;
  const rawName = product?.title || "Your product will show here";
  const safeName = formatProductName(rawName, productNameMode, productNameLimit);
  const hasProductToken = /\{product_name\}/.test(String(contentText || ""));
  const tokenValues = {
    full_name: "Jenna Doe",
    first_name: "Jenna",
    last_name: "Doe",
    product_name: "__PRODUCT__",
    country: "United States",
    city: "New York",
    price: product?.price || "Rs. 299.00",
    time: String(avgTime || "2"),
    unit: String(avgUnit || "mins"),
  };
  const resolvedContent = resolveTemplate(
    contentText ||
      "{full_name} from {country} just viewed this {product_name}",
    tokenValues
  );
  const resolvedTimestamp = resolveTemplate(
    timestampText || "Just now",
    tokenValues
  );
  const contentParts = resolvedContent.split(/(__PRODUCT__)/);
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
    return <span key={`text-${idx}`}>{part}</span>;
  });
  const cardStyle = {
    transform: `scale(${scale})`,
    opacity,
    background,
    color: textColor,
    borderRadius: 18,
    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
    border: "1px solid rgba(0,0,0,0.06)",
    padding: pad,
    paddingLeft: imageOverflow ? pad + avatarOffset : pad,
    display: "flex",
    position: "relative",
    flexDirection: isPortrait ? "column" : "row",
    gap: 12,
    alignItems: "flex-start",
    maxWidth: layout === "portrait" ? 320 : 460,
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
      {showProductImage &&
        (imageOverflow ? (
          <div
            style={{
              position: "absolute",
              left: pad,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: avatarSize,
              height: avatarSize,
              borderRadius: Math.round(avatarSize * 0.22),
              overflow: "hidden",
              background: "#f3f4f6",
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
              border: "2px solid rgba(255,255,255,0.75)",
            }}
          >
            {product?.image ? (
              <img
                src={product.image}
                alt={product.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span style={{ fontSize: 12, color: "#6b7280" }}>IMG</span>
            )}
          </div>
        ) : (
          <div
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: Math.round(avatarSize * 0.22),
              overflow: "hidden",
              background: "#f3f4f6",
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              boxShadow: "0 6px 14px rgba(0,0,0,0.12)",
              border: "1px solid rgba(15,23,42,0.08)",
              alignSelf: isPortrait ? "center" : "flex-start",
            }}
          >
            {product?.image ? (
              <img
                src={product.image}
                alt={product.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: imageFit,
                }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span style={{ fontSize: 12, color: "#6b7280" }}>IMG</span>
            )}
          </div>
        ))}

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
          {contentNode}
        </div>
        {!hasProductToken && (
          <div
            style={{
              fontSize: textSizeContent,
              fontWeight: 600,
              textDecoration: "underline",
              lineHeight: 1.4,
            }}
          >
            {safeName}
          </div>
        )}
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
          <span>{resolvedTimestamp}</span>
        </div>
      </div>
    </div>
  );
}
export default function VisitorPopupPage() {
  const { customerCount } = useLoaderData();
  const navigate = useNavigate();
  const location = useLocation();
  const notificationUrl = `/app/notification${location.search || ""}`;
  const [activeSection, setActiveSection] = useState("layout");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ active: false, error: false, msg: "" });

  const [design, setDesign] = useState({
    notiType: "visitor_list",
    layout: "landscape",
    size: 30,
    transparent: 10,
    template: "solid",
    imageAppearance: "cover",
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
    message: "{full_name} from {country} just viewed this {product_name}",
    timestamp: "Just now",
    avgTime: "2",
    avgUnit: "mins",
  });
  const [productNameMode, setProductNameMode] = useState("full");
  const [productNameLimit, setProductNameLimit] = useState(
    DEFAULT_PRODUCT_NAME_LIMIT
  );

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

  const needsProductSelection =
    visibility.productScope === "specific" && selectedProducts.length === 0;
  const needsCollectionSelection =
    visibility.collectionScope === "specific" &&
    selectedCollections.length === 0;

  const preferredSelectedProduct = selectedProducts[0] || null;
  const scopedProduct =
    visibility.productScope === "specific" ? preferredSelectedProduct : null;
  const scopedCollectionProduct =
    visibility.collectionScope === "specific"
      ? selectedCollections[0]?.sampleProduct
      : null;
  const previewProduct =
    preferredSelectedProduct ||
    scopedProduct ||
    scopedCollectionProduct ||
    storeProducts[0] ||
    null;
  const previewMessage = needsProductSelection
    ? "Select a product to preview."
    : needsCollectionSelection
      ? "Select a collection to preview."
      : !previewProduct
        ? "Preview will appear once a product is available."
        : null;

  const togglePick = (item) => {
    const id = typeof item === "object" ? item?.id : item;
    if (!id) return;
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.id === id);
      if (exists) return prev.filter((p) => p.id !== id);
      if (typeof item === "object") return [...prev, item];
      return prev;
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

  const insertTimeToken = (token) => {
    setContent((c) => ({
      ...c,
      timestamp: `${c.timestamp}${c.timestamp ? " " : ""}{${token}}`,
    }));
  };
  const customerInfoText = Number.isFinite(customerCount)
    ? `${customerCount} customer profile${
        customerCount === 1 ? "" : "s"
      } are imported automatically from Shopify.`
    : "Customer profiles are imported automatically from Shopify.";

  const save = async () => {
    setSaving(true);
    try {
      if (
        visibility.productScope === "specific" &&
        selectedProducts.length === 0
      ) {
        setToast({
          active: true,
          error: true,
          msg: "Please select at least 1 product before saving.",
        });
        setSaving(false);
        return;
      }
      const endpoint = `${location.pathname}${location.search || ""}`;
      const form = {
        enabled: true,
        design,
        textSize,
        content,
        productNameMode,
        productNameLimit,
        data,
        visibility,
        behavior,
        selectedProducts,
        selectedCollections,
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ form }),
      });
      const raw = await res.text();
      let out = {};
      if (raw) {
        try {
          out = JSON.parse(raw);
        } catch {
          out = {};
        }
      }
      if (!res.ok || !out?.success) {
        const msg =
          out?.error ||
          (raw && raw.length < 240 ? raw : "") ||
          "Save failed";
        throw new Error(msg);
      }
      setToast({ active: true, error: false, msg: "Saved." });
    } catch (e) {
      setToast({
        active: true,
        error: true,
        msg: e?.message || "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Frame>
      <Page
        title="Update Visitor notification"
        backAction={{ content: "Back", onAction: () => navigate(notificationUrl) }}
        primaryAction={{ content: "Save", onAction: save, loading: saving }}
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

                    <ChoiceList
                      title="Image appearance"
                      choices={[
                        {
                          label: "Cover (Overflowing container)",
                          value: "cover",
                        },
                        {
                          label: "Fit within container",
                          value: "contain",
                        },
                      ]}
                      selected={[design.imageAppearance]}
                      onChange={(v) =>
                        setDesign((d) => ({
                          ...d,
                          imageAppearance: v[0] || "cover",
                        }))
                      }
                    />
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
                        {selectedProducts.length} products selected
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
                          disabled
                        />
                        <div style={{ marginLeft: 28 }}>
                          <Text tone="subdued">
                            {customerInfoText}
                          </Text>
                        </div>
                      </div>
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
                        {visibility.productScope === "specific" && (
                          <InlineStack
                            gap="200"
                            blockAlign="center"
                            wrap
                            style={{ marginTop: 6 }}
                          >
                            <Button onClick={() => setPickerOpen(true)}>
                              Select Product
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
                    {previewMessage ? (
                      <div style={{ textAlign: "center" }}>
                        <Text as="p" tone="subdued">
                          {previewMessage}
                        </Text>
                      </div>
                    ) : (
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
                        priceTagAlt={normalizeHex(
                          design.priceTagAlt,
                          "#E66465"
                        )}
                        priceColor={normalizeHex(design.priceColor, "#FFFFFF")}
                        starColor={normalizeHex(design.starColor, "#FFD240")}
                        imageAppearance={design.imageAppearance}
                        textSizeContent={Number(textSize.content) || 14}
                        textSizeCompare={Number(textSize.compareAt) || 13}
                        textSizePrice={Number(textSize.price) || 13}
                        contentText={content.message}
                        timestampText={content.timestamp}
                        avgTime={content.avgTime}
                        avgUnit={content.avgUnit}
                        showProductImage={data.showProductImage}
                        showPriceTag={data.showPriceTag}
                        showRating={data.showRating}
                        showClose={behavior.showClose}
                        product={previewProduct}
                        template={design.template}
                        productNameMode={productNameMode}
                        productNameLimit={productNameLimit}
                      />
                    )}
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
      {saving && <Loading />}
      {toast.active && (
        <Toast
          content={toast.msg}
          error={toast.error}
          onDismiss={() => setToast((t) => ({ ...t, active: false }))}
          duration={4000}
        />
      )}
    </Frame>
  );
}
