import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import {
  Action as RedirectAction,
  create as createRedirect,
} from "@shopify/app-bridge/actions/Navigation/Redirect";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import {
  getStoreHandleFromShopDomain,
  normalizeShopDomain,
} from "../utils/shopDomain.server";

const STATUS_WINDOW_MS = 15 * 60 * 1000;
const DISABLED_MESSAGE =
  "Fomoify App Embed is currently disabled. To enable popups and social proof on your storefront, go to Theme Customize \u2192 App embeds and turn ON \u201cFomoify - Core Embed\u201d.";

type EmbedPingRecord = {
  lastPingAt: Date;
};

const getEmbedPingModel = () =>
  (prisma as any).embedPing || (prisma as any).embedping || null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = normalizeShopDomain(session?.shop);
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  const storeHandle = getStoreHandleFromShopDomain(shop);
  const model = getEmbedPingModel();

  let ping: EmbedPingRecord | null = null;
  if (model?.findUnique) {
    ping = await model.findUnique({
      where: { shop },
      select: { lastPingAt: true },
    });
  }

  const nowMs = Date.now();
  const lastPingMs = ping?.lastPingAt ? ping.lastPingAt.getTime() : 0;
  const isEmbedOn = lastPingMs > 0 && nowMs - lastPingMs <= STATUS_WINDOW_MS;

  return json({
    shop,
    storeHandle,
    isEmbedOn,
    lastPingAt: ping?.lastPingAt?.toISOString() ?? null,
    checkedAt: new Date(nowMs).toISOString(),
  });
};

export default function AppEmbedStatusSettingsPage() {
  const { storeHandle, isEmbedOn, lastPingAt, checkedAt } =
    useLoaderData<typeof loader>();
  const app = useAppBridge();
  const revalidator = useRevalidator();
  const isRefreshing = revalidator.state !== "idle";

  const openAppEmbeds = () => {
    const url = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?context=apps`;
    const redirect = createRedirect(app as any);
    redirect.dispatch(RedirectAction.REMOTE, { url, newContext: true });
  };

  return (
    <Page title="Embed Settings">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                App embed status
              </Text>
              <Badge tone={isEmbedOn ? "success" : "critical"}>
                {`App embed: ${isEmbedOn ? "ON" : "OFF"}`}
              </Badge>
            </InlineStack>

            {lastPingAt ? (
              <Text as="p" tone="subdued">
                Last embed ping: {new Date(lastPingAt).toLocaleString()}
              </Text>
            ) : (
              <Text as="p" tone="subdued">
                Last embed ping: never
              </Text>
            )}
            <Text as="p" tone="subdued">
              Checked at: {new Date(checkedAt).toLocaleString()}
            </Text>

            {!isEmbedOn && (
              <Banner tone="warning">
                <p>{DISABLED_MESSAGE}</p>
              </Banner>
            )}

            <InlineStack gap="300" align="start">
              <Button variant="primary" onClick={openAppEmbeds}>
                Open App Embeds
              </Button>
              <Button
                variant="secondary"
                loading={isRefreshing}
                onClick={() => revalidator.revalidate()}
              >
                Refresh Status
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
