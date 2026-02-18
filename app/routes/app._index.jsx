import { defer, json, redirect } from "@remix-run/node";
import { useLoaderData, useLocation, useNavigate } from "@remix-run/react";
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
} from "@shopify/polaris";
import { getOrSetCache } from "../utils/serverCache.server";
import { APP_EMBED_HANDLE } from "../utils/themeEmbed.shared";

const THEME_EXTENSION_ID = process.env.SHOPIFY_THEME_EXTENSION_ID || "";
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
  background: #f9f9fa;
  padding: 18px;
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
  background: #ffffff;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.home-support-item:hover {
  border-color: #96b6ff;
  box-shadow: 0 0 0 2px rgba(47, 133, 90, 0.08);
}
.home-support-item-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.home-support-item-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex: 0 0 30px;
  color: #1260d8;
  background: #eff6ff;
}
.home-support-item-icon svg {
  width: 18px;
  height: 18px;
}
.home-support-item-body {
  min-width: 0;
}
.home-support-item-link {
  color: #1260d8;
  font-weight: 700;
  margin-bottom: 2px;
}
.home-review-panel {
  border: 1px solid #c8d9be;
  border-radius: 16px;
  padding: 16px;
  min-height: 184px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-image:
    linear-gradient(0deg, rgba(255,255,255,0.28) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px),
    linear-gradient(150deg, #cde3bf 0%, #b5d49e 100%);
  background-size: 28px 28px, 28px 28px, auto;
}
.home-review-balloon {
  width: 62px;
  height: 62px;
  border-radius: 18px;
  margin: 0 auto 8px;
  background: radial-gradient(circle at 35% 35%, #ff9ca9 10%, #f14666 55%, #cc2747 100%);
  display: grid;
  place-items: center;
  color: #ffffff;
  box-shadow: 0 10px 16px rgba(0, 0, 0, 0.14);
}
.home-review-balloon svg {
  width: 30px;
  height: 30px;
}
.home-review-actions {
  display: flex;
  gap: 8px;
}
.home-review-btn {
  flex: 1;
  border-radius: 12px;
  border: 1px solid #d0d5dd;
  font-weight: 700;
  padding: 10px 12px;
  cursor: pointer;
}
.home-review-btn.primary {
  background: #121212;
  color: #ffffff;
  border-color: #121212;
}
.home-review-btn.secondary {
  background: #ffffff;
  color: #111827;
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
  const { getMainThemeId, getThemeEmbedState } = await import(
    "../utils/themeEmbed.server"
  );
  const url = new URL(request.url);
  const normalizeShop = (value) => String(value || "").trim().toLowerCase();
  const shop =
    normalizeShop(session?.shop) ||
    normalizeShop(url.searchParams.get("shop"));
  if (!shop) throw new Response("Unauthorized", { status: 401 });
  const slug = shop.replace(".myshopify.com", "");
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
  const appEmbedStatePromise = Promise.resolve(themeIdPromise).then((themeId) =>
    getThemeEmbedState({
      admin,
      shop,
      themeId,
      apiKey,
      extId: THEME_EXTENSION_ID,
      embedHandle: APP_EMBED_HANDLE,
    })
  );

  return defer({
    slug,
    themeId: themeIdPromise,
    apiKey,
    extId: THEME_EXTENSION_ID,
    appEmbedState: appEmbedStatePromise,
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
  const { slug, themeId, apiKey, appEmbedState } = useLoaderData();
  const navigate = useNavigate();
  const location = useLocation();
  const [resolvedThemeId, setResolvedThemeId] = useState(null);
  const [isEmbedEnabled, setIsEmbedEnabled] = useState(false);
  const [isEmbedStateLoading, setIsEmbedStateLoading] = useState(true);
  const search = location.search || "";
  const appUrl = (path) => `${path}${search}`;

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
    setIsEmbedStateLoading(true);
    Promise.resolve(appEmbedState)
      .then((state) => {
        if (!active) return;
        setIsEmbedEnabled(Boolean(state?.enabled));
      })
      .catch(() => {
        if (!active) return;
        setIsEmbedEnabled(false);
      })
      .finally(() => {
        if (active) setIsEmbedStateLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appEmbedState]);

  const openThemeEditor = (id, mode = "open") => {
    const params = new URLSearchParams({
      context: "apps",
      template: "index",
    });
    if (mode === "activate" && apiKey) {
      params.set("activateAppId", `${apiKey}/${APP_EMBED_HANDLE}`);
    }
    const url = `https://admin.shopify.com/store/${slug}/themes/${id ?? "current"}/editor?${params.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <Page>
      <BlockStack gap="400">
        <style>{INDEX_SUPPORT_STYLES}</style>
        <Card>
          <BlockStack gap="300">
            <Text as="p">
              Open Theme Customize - <b>App embeds</b> with this app selected.
            </Text>
            <InlineStack gap="300" align="start">
              <Button
                variant="secondary"
                loading={isEmbedStateLoading}
                onClick={() =>
                  openThemeEditor(
                    resolvedThemeId,
                    isEmbedEnabled ? "open" : "activate"
                  )
                }
              >
                {isEmbedEnabled ? "Deactivate" : "Activate"}
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
                className="home-support-item"
                onClick={() => navigate(appUrl("/app/help"))}
              >
                <div className="home-support-item-row">
                  <div className="home-support-item-icon" aria-hidden>
                    <img src="/assets/live-chat-icon.svg" alt="" width={"100px"} />
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
                className="home-support-item"
                onClick={() => navigate(appUrl("/app/documents"))}
              >
                <div className="home-support-item-row">
                  <div className="home-support-item-icon" aria-hidden>
                    <img src="/assets/document-icon.svg" alt="" width={"100px"} />
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
              <Text as="p" alignment="center" fontWeight="semibold">
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
