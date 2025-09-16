//app.theme-embed.jsx
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { Page, Card, InlineStack, Badge, Button, Text, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { readEmbedStatus } from "../lib/theme-embed.server";
import { EMBED_HANDLE } from "../lib/theme-embed.constants";

export const loader = async ({ request }) => {
  const { rest, admin, session, redirect } = await authenticate.admin(request);
  const api = rest || admin?.rest;              // support both shapes

  // 🔒 one-shot re-auth guard
  const url = new URL(request.url);
  const tried = url.searchParams.get("_reauth") === "1";

  if (!api?.get) {
    // No context → redirect to /app only once (with _reauth=1)
    if (!tried) {
      const next = "/app/theme-embed?_reauth=1";
      return redirect(`/app?next=${encodeURIComponent(next)}`);
    }
    // From the second attempt, do not redirect — show banner (break loop)
    return json({ restReady: false, shop: session?.shop || null });
  }

  try {
    const st = await readEmbedStatus(api);
    const activate_url =
      `/admin/themes/current/editor?context=apps&activateAppId=${process.env.SHOPIFY_API_KEY}/${EMBED_HANDLE}`;
    return json({ restReady: true, shop: session.shop, ...st, activate_url });
  } catch (e) {
    return json({ restReady: true, error: e?.message || String(e) }, { status: 200 });
  }
};

export default function ThemeEmbedPage() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const pending = fetcher.state !== "idle";
  const enabled = fetcher.data?.enabled ?? data.enabled;

  return (
    <Page title="Theme App Extension">
      {!data.restReady && (
        <Banner tone="warning" title="Session not ready">
          <p>Re-open the app from the Apps list or reload. Also check that third-party cookies are allowed.</p>
        </Banner>
      )}

      {data?.error && (
        <Banner tone="critical" title="Theme API error">
          <p>{String(data.error)}</p>
          <p>Add scopes <code>read_themes</code>, <code>write_themes</code> and re-install the app.</p>
        </Banner>
      )}

      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Badge tone={enabled ? "success" : "critical"}>{enabled ? "Enabled" : "Disabled"}</Badge>
            <Text tone="subdued">Controls your app’s Theme App Extension on the MAIN theme.</Text>
          </InlineStack>

          <fetcher.Form method="post" action="/app/theme-embed/toggle">
            <input type="hidden" name="enable" value={String(!enabled)} />
            <Button submit loading={pending} variant={enabled ? "secondary" : "primary"} disabled={!data.restReady}>
              {enabled ? "Disable" : "Enable"}
            </Button>
          </fetcher.Form>
        </InlineStack>
      </Card>
    </Page>
  );
}
