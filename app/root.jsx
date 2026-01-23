import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { useEffect } from "react";

export const loader = async () => {
  const apiKey =
    process.env.SHOPIFY_API_KEY ||
    process.env.SHOPIFY_APP_BRIDGE_APP_ID ||
    "";
  return json({ apiKey });
};

export default function App() {
  const { apiKey } = useLoaderData();
  useEffect(() => {
    const remove = () => document.documentElement.classList.remove("no-anim");
    if ("requestAnimationFrame" in window) {
      window.requestAnimationFrame(() => remove());
    } else {
      setTimeout(remove, 0);
    }
  }, []);
  return (
    <html className="no-anim">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {apiKey ? (
          <>
            <meta name="shopify-api-key" content={apiKey} />
            <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" data-api-key={apiKey} />
          </>
        ) : null}
        <style>{`
          html.no-anim *, html.no-anim *::before, html.no-anim *::after {
            animation: none !important;
            transition: none !important;
          }
        `}</style>
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
