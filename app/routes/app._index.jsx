// app/routes/app._index.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || "";
  const slug = shop.replace(".myshopify.com", "");
  return json({ slug });
};

export default function AppIndex() {
  const { slug } = useLoaderData();
  const app = useAppBridge();

  const openThemeCustomize = () => {
    const redirect = Redirect.create(app);
    redirect.dispatch(
      Redirect.Action.ADMIN_PATH,
      "/themes/current/editor?context=apps"
    );
  };

  const openFallback = () => {
    window.open(
      `https://admin.shopify.com/store/${slug}/themes/current/editor?context=apps`,
      "_blank"
    );
  };

  // ---- inline styles for popup previews ----
  const wrap = {
    padding: 16,
    borderRadius: 12,
    background:
      "linear-gradient(135deg, rgb(33,150,243) 0%, rgb(233,30,99) 50%, rgb(255,87,34) 100%)",
  };
  const row = {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  };
  const popupBase = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 44px 14px 14px",
    minWidth: 320,
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,.25)",
  };
  const close = {
    position: "absolute",
    right: 12,
    top: 8,
    fontWeight: 700,
    fontSize: 16,
    opacity: 0.9,
  };
  const iconCircle = {
    width: 52,
    height: 52,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flex: "0 0 52px",
  };
  const title = { fontWeight: 700, lineHeight: 1.2, marginBottom: 2 };
  const line = { margin: 0, lineHeight: 1.35, fontSize: 13.5 };
  const small = { opacity: 0.8, marginTop: 4, fontSize: 12.5 };

  return (
    <Page title="M2 Web Fomo">
      <TitleBar title="M2 Web Fomo" />

      <BlockStack gap="400">
        {/* Open Theme Editor */}
        <Card>
          <BlockStack gap="300">
            <Text as="p">
              Click the button below to open App embeds inside the Theme Editor.
            </Text>
            <InlineStack gap="300" align="start">
              <Button variant="primary" onClick={openThemeCustomize}>
                Enable apps
              </Button>
              <Button variant="secondary" onClick={openFallback}>
                Open in new tab (fallback)
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Flex Preview – Popup Content (English only) */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingLg">
                Preview – Popup Content
              </Text>
            </InlineStack>

            <div style={wrap}>
              <div style={row}>
                {/* Flash Sale popup */}
                <div
                  style={{
                    ...popupBase,
                    color: "#fff",
                    background: "#0e0e0e",
                  }}
                >
                  <div style={{ ...iconCircle, background: "#f6d59d" }}>
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1f2937"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.59 13.41 12 22l-9-9 8.59-8.59A2 2 0 0 1 13 4h5v5a2 2 0 0 1-.59 1.41Z"></path>
                      <path d="M7 7h.01"></path>
                      <path d="M10 10l4 4"></path>
                      <path d="M14 10l-4 4"></path>
                    </svg>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={title}>Flash Sale</div>
                    <p style={line}>
                      <strong>Flash Sale: 15% OFF</strong> — ends in{" "}
                      <strong>02:15 hours</strong>
                    </p>
                  </div>

                  <span style={close}>×</span>
                </div>

                {/* Recent Purchase popup */}
                <div
                  style={{
                    ...popupBase,
                    color: "#fff",
                    background: "#6c1676", // deep purple
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 12,
                      background: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      flex: "0 0 54px",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6c1676"
                      strokeWidth="1.8"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="3"></rect>
                      <circle cx="8.5" cy="9" r="1.5" />
                      <path d="M3 17l5.5-5.5L14 17l3-3 4 3" />
                    </svg>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={title}>Ankit from Bhavnagar Gujarat</div>
                    <p style={line}>bought this product recently</p>
                    <p style={small}>12 Hours Ago</p>
                  </div>

                  <span style={close}>×</span>
                </div>
              </div>
            </div>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
