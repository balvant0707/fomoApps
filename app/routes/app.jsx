// app/routes/app.jsx
import { Link, Outlet, useLoaderData, useRouteError, useLocation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import LcpObserver from "../components/LcpObserver";
import { upsertInstalledShop } from "../utils/upsertShop.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

const norm = (s) => (s || "").toLowerCase();

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request); // redirects to /auth if needed

  // Soft-guard: prisma failures should not 500 the whole app frame
  try {
    if (session?.shop) {
      await upsertInstalledShop({
        shop: norm(session.shop),
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

  return { apiKey };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();
  const search = location.search || "";
  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to={`/app${search}`} rel="home" prefetch="intent">Home</Link>
        <Link to={`/app/notification${search}`} prefetch="intent">Notification</Link>
        <Link to={`/app/dashboard${search}`} prefetch="intent">Analytics</Link>
        <Link to={`/app/integrations${search}`} prefetch="intent">Integrations</Link>
        <Link to={`/app/documents${search}`} prefetch="intent">Documents</Link>
        <Link to={`/app/help${search}`} prefetch="intent">Help</Link>
      </NavMenu>
      <LcpObserver />
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() { return boundary.error(useRouteError()); }
export const headers = (h) => boundary.headers(h);
