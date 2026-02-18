import { defer, json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  useLocation,
  useNavigate,
  useRevalidator,
  useRouteLoaderData,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Badge,
  Banner,
} from "@shopify/polaris";
import { getOrSetCache } from "../utils/serverCache.server";
import { APP_EMBED_HANDLE } from "../utils/themeEmbed.shared";
import { getEmbedPingStatus } from "../utils/embedPingStatus.server";

const REPORT_ISSUE_URL = "https://pryxotech.com/#inquiry-now";
const WRITE_REVIEW_URL = "https://apps.shopify.com";

const INDEX_SUPPORT_STYLES = `
.home-support-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 16px;
}
.home-support-panel {
    border: 1px solid #e6e6e8;
    border-radius: 16px;
    padding: 18px;
    background-image: linear-gradient(0deg, rgba(255, 255, 255, 0.26) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.26) 1px, transparent 1px), linear-gradient(160deg, #c2dcb3 0%, #adc995 100%);
    background-size: 36px 36px, 36px 36px, auto;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.home-support-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 10px;
}
.home-support-item {
  border: 1px solid #d8dadd;
  border-radius: 14px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
  position: relative;
  overflow: hidden;
  background-image:
    linear-gradient(0deg, rgba(255,255,255,0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px),
    linear-gradient(150deg, #f1f5ff 0%, #e5edff 100%);
  background-size: 24px 24px, 24px 24px, auto;
}
.home-support-item.chat {
  border-color: #c8d7f3;
  background-image:
    linear-gradient(0deg, rgba(255,255,255,0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px),
    linear-gradient(150deg, #eaf1ff 0%, #dce9ff 100%);
}
.home-support-item.knowledge {
  border-color: #c6d9ca;
  background-image:
    linear-gradient(0deg, rgba(255,255,255,0.28) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px),
    linear-gradient(150deg, #ebf4e7 0%, #d9eccf 100%);
}
.home-support-item:hover {
  border-color: #96b6ff;
  box-shadow: 0 0 0 2px rgba(47, 133, 90, 0.08);
  transform: translateY(-1px);
}
.home-support-item.knowledge:hover {
  border-color: #8ebd95;
}
.home-support-item-row {
  display: grid;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.home-support-item-icon {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex: 0 0 60px;
  color: #ffffff;
  box-shadow: 0 8px 14px rgba(0, 0, 0, 0.12);
  margin: 0 auto;
}
.home-support-item.chat .home-support-item-icon {
  background: radial-gradient(circle at 35% 35%, #76a7ff 12%, #2f6de7 60%, #1e4ba8 100%);
}
.home-support-item.knowledge .home-support-item-icon {
  background: radial-gradient(circle at 35% 35%, #80c47f 12%, #449c5c 60%, #2f6b3f 100%);
}
.home-support-item-icon svg {
  width: 24px;
  height: 24px;
}
.home-support-item-body {
    min-width: 0;
    display: grid;
    gap: 15px;
}
.home-support-item-link {
  color: #1d4ed8;
  font-weight: 700;
  margin-bottom: 2px;
}
.home-support-item.knowledge .home-support-item-link {
  color: #166534;
}
.home-review-panel {
  border: 1px solid #aec69c;
  border-radius: 20px;
  padding: 20px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-image:
    linear-gradient(0deg, rgba(255,255,255,0.26) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.26) 1px, transparent 1px),
    linear-gradient(160deg, #c2dcb3 0%, #adc995 100%);
  background-size: 36px 36px, 36px 36px, auto;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.home-review-balloon {
  width: 60px;
  height: 60px;
  border-radius: 24px;
  margin: 2px auto 12px;
  background: radial-gradient(circle at 35% 32%, #ff9eb0 8%, #f14e72 56%, #cf2f55 100%);
  display: grid;
  place-items: center;
  color: #ffffff;
  box-shadow: 0 12px 22px rgba(181, 44, 83, 0.34);
}
.home-review-balloon svg {
  width: 31px;
  height: 31px;
}
.home-review-copy {
  max-width: 290px;
  margin: 0 auto;
  color: #1f2937;
  font-size: 16px;
  line-height: 1.35;
}
.home-review-actions {
  display: flex;
  gap: 10px;
}
.home-review-btn {
  flex: 1;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 12px;
  line-height: 1.2;
  padding: 12px 14px;
  cursor: pointer;
}
.home-review-btn.primary {
  background: #111111;
  color: #ffffff;
  border-color: #111111;
}
.home-review-btn.secondary {
  background: #ffffff;
  color: #111827;
  border-color: #d8dadd;
}
@media (max-width: 980px) {
  .home-support-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 740px) {
  .home-support-items {
    grid-template-columns: 1fr;
  }
  .home-review-panel {
    min-height: 220px;
  }
  .home-review-copy {
    font-size: 16px;
  }
  .home-review-btn {
    font-size: 15px;
  }
}
@media (max-width: 420px) {
  .home-review-actions {
    flex-direction: column;
  }
}
`;

async function fetchRows(shop) {
  const hasMissingColumnError = (error) => {
    const code = String(error?.code || "").toUpperCase();
    const msg = String(error?.message || "").toLowerCase();
    return (
      code === "P2022" ||
      msg.includes("unknown column") ||
      (msg.includes("column") && msg.includes("does not exist"))
    );
  };

  const tableModel = (key) => {
    switch (key) {
      case "recent":
        return prisma.recentpopupconfig || prisma.recentPopupConfig || null;
      case "flash":
        return prisma.flashpopupconfig || prisma.flashPopupConfig || null;
      case "visitor":
        return prisma.visitorpopupconfig || prisma.visitorPopupConfig || null;
      case "lowstock":
        return prisma.lowstockpopupconfig || prisma.lowStockPopupConfig || null;
      case "addtocart":
        return prisma.addtocartpopupconfig || prisma.addToCartPopupConfig || null;
      case "review":
        return prisma.reviewpopupconfig || prisma.reviewPopupConfig || null;
      default:
        return null;
    }
  };

  const deriveShowType = (row) => {
    if (!row) return "allpage";
    const flags = [
      row.showHome,
      row.showProduct,
      row.showCollection,
      row.showCollectionList,
      row.showCart,
    ];
    const enabledCount = flags.filter(Boolean).length;
    if (enabledCount === 0) return "allpage";
    if (enabledCount > 1) return "allpage";
    if (row.showHome) return "home";
    if (row.showProduct) return "product";
    if (row.showCollection || row.showCollectionList) return "collection";
    if (row.showCart) return "cart";
    return "allpage";
  };

  const keys = ["recent", "flash", "visitor", "lowstock", "addtocart", "review"];
  const legacySelectByKey = {
    recent: {
      id: true,
      createdAt: true,
      updatedAt: true,
      enabled: true,
      showType: true,
      messageText: true,
    },
    flash: {
      id: true,
      createdAt: true,
      updatedAt: true,
      enabled: true,
      showType: true,
      messageTitle: true,
      name: true,
      messageText: true,
    },
    visitor: {
      id: true,
      createdAt: true,
      updatedAt: true,
      enabled: true,
      showHome: true,
      showProduct: true,
      showCollectionList: true,
      showCollection: true,
      showCart: true,
      message: true,
      timestamp: true,
    },
    lowstock: {
      id: true,
      createdAt: true,
      updatedAt: true,
      enabled: true,
      showHome: true,
      showProduct: true,
      showCollectionList: true,
      showCollection: true,
      showCart: true,
      message: true,
    },
    addtocart: {
      id: true,
      createdAt: true,
      updatedAt: true,
      enabled: true,
      showHome: true,
      showProduct: true,
      showCollectionList: true,
      showCollection: true,
      showCart: true,
      message: true,
      timestamp: true,
    },
    review: {
      id: true,
      createdAt: true,
      updatedAt: true,
      enabled: true,
      showHome: true,
      showProduct: true,
      showCollectionList: true,
      showCollection: true,
      showCart: true,
      message: true,
      timestamp: true,
    },
  };
  const rows = [];
  for (const key of keys) {
    const model = tableModel(key);
    if (!model?.findFirst) continue;
    try {
      const row = await model.findFirst({
        where: { shop },
        orderBy: { id: "desc" },
      });
      if (!row) continue;
      rows.push({
        ...row,
        key,
        enabled:
          row.enabled === true ||
          row.enabled === 1 ||
          row.enabled === "1",
        showType: row.showType || deriveShowType(row),
        messageText:
          row.messageText ||
          row.message ||
          row.name ||
          row.messageTitle ||
          row.title ||
          row.timestamp ||
          "",
      });
    } catch (e) {
      if (!hasMissingColumnError(e)) {
        console.error(`[home.loader] ${key} fetch failed:`, e);
        continue;
      }

      try {
        const select = legacySelectByKey[key];
        if (!select) continue;
        const row = await model.findFirst({
          where: { shop },
          orderBy: { id: "desc" },
          select,
        });
        if (!row) continue;
        rows.push({
          ...row,
          key,
          enabled:
            row.enabled === true ||
            row.enabled === 1 ||
            row.enabled === "1",
          showType: row.showType || deriveShowType(row),
          messageText:
            row.messageText ||
            row.message ||
            row.name ||
            row.messageTitle ||
            row.title ||
            row.timestamp ||
            "",
        });
      } catch (retryError) {
        console.error(`[home.loader] ${key} legacy fetch failed:`, retryError);
      }
    }
  }

  return { rows, total: rows.length };
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { getMainThemeId } = await import(
    "../utils/themeEmbed.server"
  );
  const url = new URL(request.url);
  const normalizeShop = (value) => String(value || "").trim().toLowerCase();
  const toShopSlug = (value) => {
    const raw = normalizeShop(value).replace(/^https?:\/\//, "");
    if (!raw) return "";

    const storeMatch = raw.match(/\/store\/([a-z0-9-]+)/);
    if (storeMatch?.[1]) return storeMatch[1];

    const domainMatch = raw.match(/^([a-z0-9-]+)\.myshopify\.com\b/);
    if (domainMatch?.[1]) return domainMatch[1];

    const pathOnly = raw.split(/[?#]/)[0];
    const parts = pathOnly
      .split("/")
      .filter(Boolean)
      .filter((part) => part !== "store");
    return parts[0] || "";
  };
  const toShopDomain = (value) => {
    const slug = toShopSlug(value);
    return slug ? `${slug}.myshopify.com` : "";
  };
  const shop =
    normalizeShop(session?.shop) ||
    normalizeShop(url.searchParams.get("shop"));
  if (!shop) throw new Response("Unauthorized", { status: 401 });
  const slug =
    toShopSlug(shop) ||
    normalizeShop(shop)
      .replace(".myshopify.com", "")
      .split("/")
      .filter(Boolean)
      .filter((part) => part !== "store")[0] ||
    "";
  const shopDomain = toShopDomain(shop);
  const rawType = (url.searchParams.get("type") || "all").toLowerCase();
  const rawStatus = (url.searchParams.get("status") || "all").toLowerCase();
  const allowedTypes = new Set([
    "all",
    "recent",
    "flash",
    "visitor",
    "lowstock",
    "addtocart",
    "review",
  ]);
  const allowedStatuses = new Set(["all", "enabled", "disabled"]);
  const type = allowedTypes.has(rawType) ? rawType : "all";
  const status = allowedStatuses.has(rawStatus) ? rawStatus : "all";
  const q = (url.searchParams.get("q") || "").trim();
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "10", 10);
  const pageSize = [10, 25, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;

  const themeIdPromise = getMainThemeId({ admin, shop });

  const rowsPromise = getOrSetCache(`home:rows:${shop}`, 10000, () =>
    fetchRows(shop)
  ).catch((e) => {
    console.error("[home.loader] Prisma error:", e);
    return {
      rows: [],
      total: 0,
      error: "Failed to load notification data.",
    };
  });

  const apiKey =
    process.env.SHOPIFY_API_KEY ||
    process.env.SHOPIFY_APP_BRIDGE_APP_ID ||
    "";
  const embedPingStatusPromise = getEmbedPingStatus(shop);

  return defer({
    slug,
    shopDomain,
    themeId: themeIdPromise,
    apiKey,
    embedPingStatus: embedPingStatusPromise,
    critical: { page, pageSize, filters: { type, status, q } },
    rows: rowsPromise,
  });
};

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const form = await request.formData();
  const _action = form.get("_action");
  const isFetch = request.headers.get("X-Remix-Request") === "yes";

  const safeJson = (data, init = {}) => json(data, init);

  if (_action === "delete") {
    const id = Number(form.get("id"));
    const key = String(form.get("key") || "").toLowerCase();
    try {
      const model =
        key === "recent"
          ? prisma.recentpopupconfig || prisma.recentPopupConfig
        : key === "flash"
          ? prisma.flashpopupconfig || prisma.flashPopupConfig
        : key === "visitor"
          ? prisma.visitorpopupconfig || prisma.visitorPopupConfig
        : key === "lowstock"
          ? prisma.lowstockpopupconfig || prisma.lowStockPopupConfig
        : key === "addtocart"
          ? prisma.addtocartpopupconfig || prisma.addToCartPopupConfig
        : key === "review"
          ? prisma.reviewpopupconfig || prisma.reviewPopupConfig
        : null;
      if (id && model?.deleteMany) {
        await model.deleteMany({ where: { id, shop } });
      }
      if (isFetch) return safeJson({ ok: true });
      search.set("deleted", "1");
      return redirect(`/app?${search.toString()}`);
    } catch (e) {
      console.error("[home.action:delete] error:", e);
      if (isFetch) {
        return safeJson({ ok: false, error: "Delete failed" }, { status: 500 });
      }
      search.set("error", "1");
      return redirect(`/app?${search.toString()}`);
    }
  }

  if (_action === "update") {
    const id = Number(form.get("id"));
    const key = String(form.get("key") || "").toLowerCase();
    const messageText = form.get("messageText")?.toString() ?? "";
    const showType = form.get("showType")?.toString() ?? "allpage";
    const enabled = form.get("enabled") === "on";

    try {
      const model =
        key === "recent"
          ? prisma.recentpopupconfig || prisma.recentPopupConfig
        : key === "flash"
          ? prisma.flashpopupconfig || prisma.flashPopupConfig
        : key === "visitor"
          ? prisma.visitorpopupconfig || prisma.visitorPopupConfig
        : key === "lowstock"
          ? prisma.lowstockpopupconfig || prisma.lowStockPopupConfig
        : key === "addtocart"
          ? prisma.addtocartpopupconfig || prisma.addToCartPopupConfig
        : key === "review"
          ? prisma.reviewpopupconfig || prisma.reviewPopupConfig
        : null;
      const data =
        key === "recent" || key === "flash"
          ? { messageText, showType, enabled }
          : { enabled };
      if (id && model?.updateMany) {
        await model.updateMany({
          where: { id, shop },
          data,
        });
      }
      if (isFetch) return safeJson({ ok: true, saved: true });
      search.set("saved", "1");
      return redirect(`/app?${search.toString()}`);
    } catch (e) {
      console.error("[home.action:update] error:", e);
      if (isFetch) {
        return safeJson({ ok: false, error: "Update failed" }, { status: 500 });
      }
      search.set("error", "1");
      return redirect(`/app?${search.toString()}`);
    }
  }

  if (_action === "toggle-enabled") {
    const id = Number(form.get("id"));
    const key = String(form.get("key") || "").toLowerCase();
    const enabled = form.get("enabled") === "on";
    try {
      const model =
        key === "recent"
          ? prisma.recentpopupconfig || prisma.recentPopupConfig
        : key === "flash"
          ? prisma.flashpopupconfig || prisma.flashPopupConfig
        : key === "visitor"
          ? prisma.visitorpopupconfig || prisma.visitorPopupConfig
        : key === "lowstock"
          ? prisma.lowstockpopupconfig || prisma.lowStockPopupConfig
        : key === "addtocart"
          ? prisma.addtocartpopupconfig || prisma.addToCartPopupConfig
        : key === "review"
          ? prisma.reviewpopupconfig || prisma.reviewPopupConfig
        : null;
      if (id && model?.updateMany) {
        await model.updateMany({
          where: { id, shop },
          data: { enabled },
        });
      }
      if (isFetch) return safeJson({ ok: true });
      return redirect(`/app?${search.toString()}`);
    } catch (e) {
      console.error("[home.action:toggle] error:", e);
      if (isFetch) {
        return safeJson({ ok: false, error: "Toggle failed" }, { status: 500 });
      }
      search.set("error", "1");
      return redirect(`/app?${search.toString()}`);
    }
  }

  return safeJson({ ok: false, error: "Unknown action" }, { status: 400 });
}

export default function AppIndex() {
  const { slug, shopDomain, themeId, apiKey, embedPingStatus } = useLoaderData();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const location = useLocation();
  const appRouteData = useRouteLoaderData("routes/app");
  const [resolvedThemeId, setResolvedThemeId] = useState(null);
  const [isEmbedPingLoading, setIsEmbedPingLoading] = useState(true);
  const [embedPing, setEmbedPing] = useState({
    isOn: false,
    lastPingAt: null,
    checkedAt: null,
  });
  const search = location.search || "";
  const appUrl = (path) => `${path}${search}`;
  const hasThemeEmbedCheck = appRouteData?.appEmbedChecked === true;
  const isEmbedActive = hasThemeEmbedCheck
    ? Boolean(appRouteData?.appEmbedEnabled)
    : Boolean(embedPing.isOn);
  const hasReliableEmbedStatus =
    hasThemeEmbedCheck || Boolean(embedPing.lastPingAt);
  const embedBadgeTone = hasReliableEmbedStatus
    ? isEmbedActive
      ? "success"
      : "critical"
    : "attention";
  const embedBadgeText = hasReliableEmbedStatus
    ? `App embed: ${isEmbedActive ? "ON" : "OFF"}`
    : "App embed: CHECKING";

  useEffect(() => {
    let active = true;
    Promise.resolve(themeId).then((id) => {
      if (active) setResolvedThemeId(id ?? null);
    });
    return () => {
      active = false;
    };
  }, [themeId]);

  useEffect(() => {
    let active = true;
    setIsEmbedPingLoading(true);
    Promise.resolve(embedPingStatus)
      .then((state) => {
        if (!active) return;
        setEmbedPing({
          isOn: Boolean(state?.isOn),
          lastPingAt: state?.lastPingAt || null,
          checkedAt: state?.checkedAt || null,
        });
      })
      .catch(() => {
        if (!active) return;
        setEmbedPing({
          isOn: false,
          lastPingAt: null,
          checkedAt: null,
        });
      })
      .finally(() => {
        if (active) setIsEmbedPingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [embedPingStatus]);

  const toThemeEditorThemeId = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "current";
    const idMatch = raw.match(/\d+/);
    return idMatch ? idMatch[0] : "current";
  };

  const openThemeEditor = (id, mode = "open") => {
    const safeThemeId = toThemeEditorThemeId(id);
    const params = new URLSearchParams({ context: "apps" });
    if (mode === "activate" && apiKey) {
      const embedId = `${apiKey}/${APP_EMBED_HANDLE}`;
      params.set("activateAppId", embedId);
    }
    const editorBase = shopDomain
      ? `https://${shopDomain}/admin`
      : `https://admin.shopify.com/store/${slug}`;
    const url = `${editorBase}/themes/${safeThemeId}/editor?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Page>
      <BlockStack gap="400">
        <style>{INDEX_SUPPORT_STYLES}</style>
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingMd">
                App embed status
              </Text>
              <Badge tone={embedBadgeTone}>
                {embedBadgeText}
              </Badge>
            </InlineStack>
            {!hasReliableEmbedStatus && (
              <Text as="p" tone="subdued">
                Embed status check is in progress. Open storefront once and
                refresh status.
              </Text>
            )}
            {hasReliableEmbedStatus && !isEmbedActive && (
              <Banner tone="warning">
                
              </Banner>
            )}
            <InlineStack gap="300" align="start">
              <Button
                variant="primary"
                onClick={() => openThemeEditor(resolvedThemeId, "activate")}
              >
                Open App Embeds
              </Button>
              <Button
                variant="secondary"
                loading={isEmbedPingLoading || revalidator.state !== "idle"}
                onClick={() => revalidator.revalidate()}
              >
                Refresh Status
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <div className="home-support-grid">
          <div className="home-support-panel">
            <Text as="h3" variant="headingMd">
              Support
            </Text>
            <div className="home-support-items">
              <button
                type="button"
                className="home-support-item chat"
                onClick={() => navigate(appUrl("/app/help"))}
              >
                <div className="home-support-item-row">
                  <div className="home-support-item-icon" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7.4 17.5H4V14a7 7 0 0 1 7-7h2a7 7 0 1 1 0 14h-2.6L7.4 23v-5.5z" />
                      <path d="M9 12h6M9 9h3" />
                    </svg>
                  </div>
                  <div className="home-support-item-body">
                    <div className="home-support-item-link">Live chat</div>
                    <Text as="p" tone="subdued">
                      Support, reply, and assist instantly in office hours.
                    </Text>
                  </div>
                </div>
              </button>
              <button
                type="button"
                className="home-support-item knowledge"
                onClick={() => navigate(appUrl("/app/documents"))}
              >
                <div className="home-support-item-row">
                  <div className="home-support-item-icon" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4H19v14H6.8A2.8 2.8 0 0 0 4 20.8V6.8z" />
                      <path d="M6.8 4A2.8 2.8 0 0 0 4 6.8v14" />
                      <path d="M9 8h7M9 11h7M9 14h5" />
                    </svg>
                  </div>
                  <div className="home-support-item-body">
                    <div className="home-support-item-link">Knowledge base</div>
                    <Text as="p" tone="subdued">
                      Find a solution for your problem with our documents.
                    </Text>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="home-review-panel">
            <div>
              <div className="home-review-balloon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 11c0 5.6-7 10-7 10z" />
                </svg>
              </div>
              <Text
                as="p"
                alignment="center"
                fontWeight="semibold"
                className="home-review-copy"
              >
                Motivate our team for future app development
              </Text>
            </div>
            <div className="home-review-actions">
              <button
                type="button"
                className="home-review-btn primary"
                onClick={() => window.open(WRITE_REVIEW_URL, "_blank", "noopener,noreferrer")}
              >
                Write a review
              </button>
              <button
                type="button"
                className="home-review-btn secondary"
                onClick={() => window.open(REPORT_ISSUE_URL, "_blank", "noopener,noreferrer")}
              >
                Report an issue
              </button>
            </div>
          </div>
        </div>
      </BlockStack>
    </Page>
  );
}
