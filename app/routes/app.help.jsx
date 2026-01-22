// app.help.jsx — Clean Help page with gradient hero (logo colors)

import {
  Page,
  Layout,
  Card,
  InlineStack,
  BlockStack,
  Text,
  Button,
  Divider,
  Link as PolarisLink,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

const CONTACT_URL = "https://pryxotech.com/#inquiry-now";
const DOCS_URL = "https://pryxotech.com/#inquiry-now";
const MAILTO = `mailto:info@pryxotech.com?subject=Support%20Request%20(FOMO%20Shopify%20App)&body=Please%20describe%20your%20issue%3A%0A%0AShop%20URL%3A%20%0ASteps%20to%20reproduce%3A%20%0AExpected%20result%3A%20%0AActual%20result%3A%20%0AScreenshots%2FVideo%20link%3A%20`;

// 🔷 brand gradient (logo colors)
const BRAND_GRADIENT =
  "linear-gradient(135deg, rgba(89,166,229,0.51) 0%, rgba(207,80,122,0.71) 50%, rgba(237,104,64,0.48) 100%)";

function openExternal(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Help() {
  return (
    <>
      <TitleBar
        title="Help & Support"
        primaryAction={{
          content: "Contact Support",
          onAction: () => openExternal(CONTACT_URL),
        }}
        secondaryActions={[
          { content: "Docs / FAQs", onAction: () => openExternal(DOCS_URL) },
        ]}
      />

      <Page title="Help & Support">
        <Layout>
          {/* ===== Hero gradient banner ===== */}
          <Layout.Section>
            <div
              style={{
                background: BRAND_GRADIENT,
                borderRadius: 12,
                padding: "18px 20px",
                border: "1px solid #E5E7EB",
                color: "#111827",
              }}
            >
              <Text as="h3" variant="headingMd">
                Stuck somewhere? We’re here to help.
              </Text>
              <Text as="p" tone="subdued" style={{ marginTop: 6 }}>
                Most issues resolve fastest with a quick message. Share your{" "}
                <strong>shop URL, steps, and screenshots</strong> if possible.
              </Text>

              <InlineStack gap="200" wrap style={{ marginTop: 12 }}>
                <Button
                  onClick={() => openExternal(CONTACT_URL)}
                  style={{ background: BRAND_GRADIENT, border: "none", color: "#fff" }}
                >
                  Contact Us
                </Button>
                <Button
                  onClick={() => openExternal(CONTACT_URL)}
                  style={{ background: BRAND_GRADIENT, border: "none", color: "#fff" }}
                >
                  Email Support
                </Button>
              </InlineStack>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </>
  );
}

