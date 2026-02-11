import { defer, json, redirect } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";
import { useEffect, useState, Suspense } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Spinner,
  Collapsible,
} from "@shopify/polaris";
import { getOrSetCache } from "../utils/serverCache.server";
import NotificationTable from "../components/dashboard/NotificationTable";

const THEME_EXTENSION_ID = process.env.SHOPIFY_THEME_EXTENSION_ID || "";

async function fetchRows(shop) {
  if (!prisma?.notificationconfig?.findMany) {
    throw new Error("Prisma not initialized or model missing");
  }

  const rows = await prisma.notificationconfig.findMany({
    where: { shop },
    orderBy: { id: "desc" },
  });

  return { rows, total: rows.length };
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop || "";
  const slug = shop.replace(".myshopify.com", "");

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "all";
  const status = url.searchParams.get("status") || "all";
  const q = (url.searchParams.get("q") || "").trim();
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "10", 10);
  const pageSize = [10, 25, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;

  const themeIdPromise = (async () => {
    try {
      const cacheKey = `themes:main:${shop}`;
      const cached = await getOrSetCache(cacheKey, 60000, async () => {
        const resp = await admin.rest.resources.Theme.all({
          session: admin.session,
          fields: "id,role",
        });
        const themes = resp?.data || [];
        const live = themes.find((t) => t.role === "main");
        return live?.id ?? null;
      });
      return cached ?? null;
    } catch (e) {
      console.error("Theme list failed:", e);
      return null;
    }
  })();

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

  return defer({
    slug,
    themeId: themeIdPromise,
    apiKey,
    extId: THEME_EXTENSION_ID,
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
    try {
      if (id && prisma?.notificationconfig?.deleteMany) {
        await prisma.notificationconfig.deleteMany({ where: { id, shop } });
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
    const messageText = form.get("messageText")?.toString() ?? "";
    const showType = form.get("showType")?.toString() ?? "allpage";
    const enabled = form.get("enabled") === "on";

    try {
      if (id && prisma?.notificationconfig?.updateMany) {
        await prisma.notificationconfig.updateMany({
          where: { id, shop },
          data: { messageText, showType, enabled },
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
    const enabled = form.get("enabled") === "on";
    try {
      if (id && prisma?.notificationconfig?.updateMany) {
        await prisma.notificationconfig.updateMany({
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
  const { slug, themeId, critical, rows } = useLoaderData();
  const [resolvedThemeId, setResolvedThemeId] = useState(null);
  const [showSeoSection, setShowSeoSection] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve(themeId).then((id) => {
      if (active) setResolvedThemeId(id ?? null);
    });
    return () => {
      active = false;
    };
  }, [themeId]);

  const openFallback = (id) => {
    const url = `https://admin.shopify.com/store/${slug}/themes/${id ?? "current"}/editor?context=apps`;
    window.open(url, "_blank");
  };

  const previewOuter = { width: "100%", minWidth: 560, maxWidth: 980, margin: "0 auto" };
  const wrap = {
    padding: 16,
    borderRadius: 12,
    background:
      "linear-gradient(135deg, rgb(33,150,243) 0%, rgb(233,30,99) 50%, rgb(255,87,34) 100%)",
  };
  const row = { display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between" };
  const popupBase = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 40px 12px 12px",
    minWidth: 260,
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,.25)",
    flex: "1 1 0",
  };
  const close = { position: "absolute", right: 12, top: 8, fontWeight: 700, fontSize: 16, opacity: 0.9 };
  const iconCircle = { width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", flex: "0 0 48px" };
  const title = { fontWeight: 700, lineHeight: 1.2, marginBottom: 2 };
  const line = { margin: 0, lineHeight: 1.35, fontSize: 13.5 };
  const small = { opacity: 0.8, marginTop: 4, fontSize: 12.5 };
  const seoBox = {
    width: "100%",
    minWidth: 560,
    maxWidth: 980,
    margin: "14px auto 0",
    background: "#ffffff",
    border: "1px solid #ececec",
    borderRadius: 12,
    padding: "16px 18px",
  };
  const seoH3 = { fontSize: 18, fontWeight: 700, margin: "0 0 8px" };
  const seoP = { margin: "0 0 10px", color: "#202223" };
  const seoUl = { margin: "0 0 0 16px", padding: 0, lineHeight: 1.5 };

  return (
    <Page>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <Text as="p">
              Open Theme Customize - <b>App embeds</b> with this app selected.
            </Text>
            <InlineStack gap="300" align="start">
              <Button variant="secondary" onClick={() => openFallback(resolvedThemeId)}>
                Open in new tab (fallback)
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingLg">Preview - Popup Content</Text>
            <div style={previewOuter} aria-label="Preview area for Fomoify popups">
              <div style={wrap}>
                <div style={row}>
                  <div style={{ ...popupBase, color: "#fff", background: "#0e0e0e" }} aria-label="Flash sale popup">
                    <div style={{ ...iconCircle, background: "#f6d59d" }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41 12 22l-9-9 8.59-8.59A2 2 0 0 1 13 4h5v5a2 2 0 0 1-.59 1.41Z" />
                        <path d="M7 7h.01" />
                        <path d="M10 10l4 4" />
                        <path d="M14 10l-4 4" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={title}>Flash Sale</div>
                      <p style={line}>
                        <strong>Flash Sale: 20% OFF</strong> - ends in <strong>02:15 hours</strong>
                      </p>
                    </div>
                    <span style={close} aria-hidden>x</span>
                  </div>

                  <div style={{ ...popupBase, color: "#fff", background: "#6c1676" }} aria-label="Recent order popup">
                    <div style={{ width: 50, height: 50, borderRadius: 12, background: "#fff", display: "grid", placeItems: "center", overflow: "hidden", flex: "0 0 50px" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6c1676" strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="9" r="1.5" />
                        <path d="M3 17l5.5-5.5L14 17l3-3 4 3" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={title}>Someone from Location</div>
                      <p style={line}>bought this product recently Product Name</p>
                      <p style={small}>12 Hours Ago</p>
                    </div>
                    <span style={close} aria-hidden>x</span>
                  </div>
                </div>
              </div>
            </div>

          </BlockStack>
        </Card>

        <Suspense
          fallback={
            <Card>
              <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner size="small" />
                <Text as="span" tone="subdued">Loading notifications...</Text>
              </div>
            </Card>
          }
        >
          <Await
            resolve={rows}
            errorElement={
              <Card>
                <div style={{ padding: 16 }}>
                  <Text as="p" tone="critical">Failed to load notifications.</Text>
                </div>
              </Card>
            }
          >
            {(data) => (
              <NotificationTable
                rows={data.rows}
                total={data.total}
                page={critical.page}
                pageSize={critical.pageSize}
                filters={critical.filters}
              />
            )}
          </Await>
        </Suspense>

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingMd">
                App Details
              </Text>
              <Button
                onClick={() => setShowSeoSection((prev) => !prev)}
                disclosure={showSeoSection ? "up" : "down"}
              >
                {showSeoSection ? "Hide" : "Show"}
              </Button>
            </InlineStack>

            <Collapsible open={showSeoSection} id="seo-details">
              <section
                style={seoBox}
                itemScope
                itemType="https://schema.org/SoftwareApplication"
              >
                <h3 style={seoH3}>
                  <span itemProp="name">Fomoify Sales Popup &amp; Proof</span>
                </h3>
                <p style={seoP} itemProp="description">
                  Add conversion-focused <strong>sales popups</strong>,{" "}
                  <strong>recent purchase notifications</strong>, Fomoify creates
                  instant trust and urgency so more visitors become buyers.
                </p>
                <ul style={seoUl}>
                  <li>
                    <strong>Social proof</strong>: show real orders, location
                    &amp; time to validate product demand.
                  </li>
                  <li>
                    <strong>Urgency</strong>: flash-sale message with a live end
                    time to reduce cart hesitation.
                  </li>
                  <li>
                    <strong>Customizable</strong>: colors, timing, visibility,
                    and page targeting fit your brand.
                  </li>
                  <li>
                    <strong>Lightweight</strong>: theme app embed; no code
                    required to enable/disable.
                  </li>
                </ul>
                <meta
                  itemProp="applicationCategory"
                  content="MarketingApplication"
                />
                <meta itemProp="operatingSystem" content="Shopify" />
              </section>
            </Collapsible>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
