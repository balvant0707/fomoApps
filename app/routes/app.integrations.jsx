import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Frame,
  InlineStack,
  Link as PolarisLink,
  Page,
  Text,
  TextField,
  Toast,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const INTEGRATION_KEY = "integration_judge_me";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || "";

  let connected = false;
  try {
    const model = prisma?.notificationconfig || null;
    if (shop && model?.findFirst) {
      const row = await model.findFirst({
        where: { shop, key: INTEGRATION_KEY },
        orderBy: { id: "desc" },
      });
      connected = Boolean(row?.messageText);
    }
  } catch (error) {
    console.warn("[Integrations] loader fetch failed:", error);
  }

  return json({
    shop,
    connected,
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || "";
  if (!shop) {
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const apiKey = String(form.get("apiKey") || "").trim();

  if (!apiKey) {
    return json(
      { ok: false, error: "Private API Key is required." },
      { status: 400 }
    );
  }

  try {
    const model = prisma?.notificationconfig || null;
    if (!model?.findFirst || !model?.create) {
      throw new Error("Integration storage model is unavailable");
    }

    const existing = await model.findFirst({
      where: { shop, key: INTEGRATION_KEY },
      orderBy: { id: "desc" },
    });

    if (existing?.id && model?.update) {
      await model.update({
        where: { id: existing.id },
        data: { enabled: true, messageText: apiKey },
      });
    } else {
      await model.create({
        data: {
          shop,
          key: INTEGRATION_KEY,
          enabled: true,
          showType: "integration",
          messageText: apiKey,
        },
      });
    }

    return json({ ok: true, message: "Judge.me connected successfully." });
  } catch (error) {
    console.error("[Integrations] save failed:", error);
    return json(
      { ok: false, error: error?.message || "Failed to connect Judge.me." },
      { status: 500 }
    );
  }
};

function JudgeMeBadge() {
  return (
    <div
      style={{
        width: 84,
        height: 84,
        borderRadius: 14,
        background: "linear-gradient(135deg, #0E8B8B 0%, #4AB7A4 100%)",
        color: "#ffffff",
        display: "grid",
        placeItems: "center",
        fontSize: 54,
        fontWeight: 700,
      }}
      aria-hidden
    >
      J
    </div>
  );
}

export default function IntegrationsPage() {
  const { shop, connected } = useLoaderData();
  const fetcher = useFetcher();
  const [apiKey, setApiKey] = useState("");
  const [toast, setToast] = useState({ active: false, error: false, msg: "" });

  const saving = fetcher.state !== "idle";
  const isConnected = connected || Boolean(apiKey);

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.ok) {
      setToast({
        active: true,
        error: false,
        msg: fetcher.data.message || "Integration saved.",
      });
      return;
    }
    setToast({
      active: true,
      error: true,
      msg: fetcher.data.error || "Unable to save integration.",
    });
  }, [fetcher.data]);

  return (
    <Frame>
      <Page title="Integrations">
        <Card>
          <Box padding="500">
            <fetcher.Form method="post">
              <BlockStack gap="500">
                <InlineStack align="space-between" blockAlign="start">
                  <InlineStack gap="400" blockAlign="center">
                    <JudgeMeBadge />
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h2" variant="headingLg">
                          Judge.me Product Reviews
                        </Text>
                        {isConnected ? <Badge tone="success">Connected</Badge> : null}
                      </InlineStack>
                      <Text tone="subdued" as="p">
                        Build trust with unlimited product reviews, photos and
                        videos.
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </InlineStack>

                <TextField
                  label="Shopify domain"
                  value={shop}
                  autoComplete="off"
                  readOnly
                  helpText="We automatic detect your shopify domain"
                />

                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd">
                      Private API Key
                    </Text>
                    <PolarisLink
                      removeUnderline
                      url="https://judge.me/help/en/articles/44001839947-how-to-get-your-api-token"
                      external
                    >
                      How to get API token
                    </PolarisLink>
                  </InlineStack>
                  <TextField
                    name="apiKey"
                    value={apiKey}
                    onChange={setApiKey}
                    autoComplete="off"
                  />
                </BlockStack>

                <InlineStack align="end">
                  <Button submit variant="primary" loading={saving}>
                    Connect
                  </Button>
                </InlineStack>
              </BlockStack>
            </fetcher.Form>
          </Box>
        </Card>
      </Page>
      {toast.active ? (
        <Toast
          content={toast.msg}
          error={toast.error}
          onDismiss={() => setToast((prev) => ({ ...prev, active: false }))}
          duration={4000}
        />
      ) : null}
    </Frame>
  );
}
