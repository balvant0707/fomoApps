// app/routes/app.jsx
import { Outlet, useLoaderData, useRouteError, useLocation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { Banner, Button } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import LcpObserver from "../components/LcpObserver";
import { upsertInstalledShop } from "../utils/upsertShop.server";
import { APP_EMBED_HANDLE } from "../utils/themeEmbed.shared";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

const norm = (s) => (s || "").toLowerCase();

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request); // redirects to /auth if needed
  const { getAppEmbedContext } = await import("../utils/themeEmbed.server");

  // Soft-guard: prisma failures should not 500 the whole app frame
  const shop = norm(session?.shop);
  try {
    if (shop) {
      await upsertInstalledShop({
        shop,
        accessToken: session.accessToken ?? null,
      });
    }
  } catch (e) {
    // log and continue (don’t block UI)
    console.error("Prisma upsert(shop) failed:", e);
  }

  const apiKey =
    process.env.SHOPIFY_API_KEY ||
    process.env.SHOPIFY_APP_BRIDGE_APP_ID ||
    "";

  if (!apiKey) {
    // Make the error obvious but not a 500 blank page
    return new Response(
      "Missing SHOPIFY_API_KEY or SHOPIFY_APP_BRIDGE_APP_ID in environment. Set one to your app's Client ID.",
      { status: 500 }
    );
  }

  const extId = process.env.SHOPIFY_THEME_EXTENSION_ID || "";
  const embedContext = shop
    ? await getAppEmbedContext({
        admin,
        shop,
        apiKey,
        extId,
        embedHandle: APP_EMBED_HANDLE,
      })
    : { themeId: null, appEmbedEnabled: false, appEmbedFound: false };
  const slug = shop.replace(".myshopify.com", "");

  return {
    apiKey,
    slug,
    themeId: embedContext.themeId,
    appEmbedEnabled: embedContext.appEmbedEnabled,
    appEmbedFound: embedContext.appEmbedFound,
  };
};

export default function App() {
  const { apiKey, slug, themeId, appEmbedEnabled } = useLoaderData();
  const location = useLocation();
  const search = location.search || "";
  const appUrl = (path) => `${path}${search}`;
  const openThemeEmbedActivation = () => {
    const params = new URLSearchParams({
      context: "apps",
      template: "index",
      activateAppId: `${apiKey}/${APP_EMBED_HANDLE}`,
    });
    const url = `https://admin.shopify.com/store/${slug}/themes/${themeId ?? "current"}/editor?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <a href={appUrl("/app")} rel="home">Home</a>
        <a href={appUrl("/app/notification")}>Notification</a>
        <a href={appUrl("/app/dashboard")}>Analytics</a>
        <a href={appUrl("/app/integrations")}>Integrations</a>
        <a href={appUrl("/app/documents")}>Documents</a>
        <a href={appUrl("/app/help")}>Help</a>
      </NavMenu>
      <LcpObserver />
      {!appEmbedEnabled && (
        <div style={{ padding: "12px 16px 0" }}>
          <Banner status="warning" title="Enable app embed to show notifications on storefront">
            <p>Theme Customize ma App embeds ma Fomoify embed ON karo.</p>
            <div style={{ marginTop: 10 }}>
              <Button primary onClick={openThemeEmbedActivation}>
                Turn on app embed
              </Button>
            </div>
          </Banner>
        </div>
      )}
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() { return boundary.error(useRouteError()); }
export const headers = (h) => boundary.headers(h);
