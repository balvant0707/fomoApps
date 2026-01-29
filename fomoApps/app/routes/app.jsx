// app/routes/app.jsx
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

const norm = (s) => (s || "").toLowerCase();

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request); // completes OAuth if needed
  await prisma.shop.upsert({
    where: { shop: norm(session.shop) },
    update: { accessToken: session.accessToken ?? null, installed: true, uninstalledAt: null },
    create: { shop: norm(session.shop), accessToken: session.accessToken ?? null, installed: true },
  });
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Home</Link>
        <Link to="/app/dashboard">Dashboard</Link>
        <Link to="/app/notification">Notification</Link>
        <Link to="/app/documents">Documents</Link>
        <Link to="/app/help">Help</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() { return boundary.error(useRouteError()); }
export const headers = (h) => boundary.headers(h);
