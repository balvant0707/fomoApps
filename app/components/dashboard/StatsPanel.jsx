import { Badge, BlockStack, Card, InlineStack, Text } from "@shopify/polaris";

const EMPTY_STATS = {
  total: 0,
  enabled: 0,
  disabled: 0,
  byType: {},
  analytics: { visitors: 0, clicks: 0, orders: 0, days: 30 },
};

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export default function StatsPanel({ stats }) {
  const safeStats = stats || EMPTY_STATS;
  const byType = safeStats.byType || {};
  const entries = Object.entries(byType);
  const analytics = safeStats.analytics || EMPTY_STATS.analytics;
  const chartRows = [
    { key: "Visitors", value: Number(analytics.visitors || 0), tone: "#1E88E5" },
    { key: "Popup Clicks", value: Number(analytics.clicks || 0), tone: "#FB8C00" },
    { key: "Orders", value: Number(analytics.orders || 0), tone: "#43A047" },
  ];
  const maxVal = Math.max(1, ...chartRows.map((r) => r.value));

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center" wrap>
          <Text variant="headingMd" as="h2">
            Overview
          </Text>
          <InlineStack gap="200" wrap>
            <Badge tone="success">Enabled: {safeStats.enabled || 0}</Badge>
            <Badge tone="critical">Disabled: {safeStats.disabled || 0}</Badge>
            <Badge tone="info">Total: {safeStats.total || 0}</Badge>
            <Badge tone="attention">
              Visitors ({analytics.days || 30}d): {analytics.visitors || 0}
            </Badge>
            <Badge>
              Popup Clicks ({analytics.days || 30}d): {analytics.clicks || 0}
            </Badge>
            <Badge tone="success">
              Orders ({analytics.days || 30}d): {analytics.orders || 0}
            </Badge>
          </InlineStack>
        </InlineStack>

        <Card padding="300">
          <BlockStack gap="200">
            <Text variant="headingSm" as="h3">
              Bar Chart ({analytics.days || 30} days)
            </Text>
            {chartRows.map((row) => (
              <BlockStack key={row.key} gap="100">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">
                    {row.key}
                  </Text>
                  <Text as="span" variant="bodySm" fontWeight="semibold">
                    {row.value}
                  </Text>
                </InlineStack>
                <div
                  style={{
                    width: "100%",
                    height: 10,
                    borderRadius: 999,
                    background: "#EEF1F4",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(6, (row.value / maxVal) * 100)}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: row.tone,
                      transition: "width 280ms ease",
                    }}
                  />
                </div>
              </BlockStack>
            ))}
          </BlockStack>
        </Card>

        {entries.length > 0 ? (
          <InlineStack gap="300" wrap>
            {entries.map(([key, count]) => (
              <Card key={key} padding="300">
                <BlockStack gap="100">
                  <Text variant="bodySm" as="p" tone="subdued">
                    {titleCase(key)}
                  </Text>
                  <Text variant="headingMd" as="p">
                    {count}
                  </Text>
                </BlockStack>
              </Card>
            ))}
          </InlineStack>
        ) : (
          <Text as="p" tone="subdued">
            No notification stats yet.
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
