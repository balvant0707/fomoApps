import { Badge, BlockStack, Card, InlineStack, Text } from "@shopify/polaris";

const EMPTY_STATS = {
  total: 0,
  enabled: 0,
  disabled: 0,
  byType: {},
  analytics: {
    visitors: 0,
    clicks: 0,
    orders: 0,
    days: 30,
    series: { labels: [], visitors: [], clicks: [], orders: [] },
  },
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
  const series = analytics.series || EMPTY_STATS.analytics.series || {};
  const labels = Array.isArray(series.labels) ? series.labels : [];
  const visitorsSeries = Array.isArray(series.visitors) ? series.visitors : [];
  const clicksSeries = Array.isArray(series.clicks) ? series.clicks : [];
  const ordersSeries = Array.isArray(series.orders) ? series.orders : [];
  const chartMax = Math.max(
    1,
    ...visitorsSeries,
    ...clicksSeries,
    ...ordersSeries
  );
  const yTicks = 5;
  const xTickEvery = Math.max(1, Math.floor(labels.length / 4));
  const formatDateLabel = (value) => {
    const d = new Date(`${value}T00:00:00`);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  };

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
            <div
              style={{
                height: 260,
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: "12px 10px 10px 10px",
                background: "#FFFFFF",
              }}
            >
              <div
                style={{
                  height: 200,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 3,
                  borderLeft: "1px solid #D1D5DB",
                  borderBottom: "1px solid #D1D5DB",
                  paddingLeft: 6,
                  paddingRight: 4,
                  position: "relative",
                }}
              >
                {[...Array(yTicks)].map((_, i) => {
                  const y = (i / (yTicks - 1)) * 100;
                  return (
                    <div
                      key={`grid-${i}`}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: `${y}%`,
                        borderTop: "1px solid #EEF2F7",
                      }}
                    />
                  );
                })}
                {labels.map((day, idx) => {
                  const v = Number(visitorsSeries[idx] || 0);
                  const c = Number(clicksSeries[idx] || 0);
                  const o = Number(ordersSeries[idx] || 0);
                  const hV = `${(v / chartMax) * 100}%`;
                  const hC = `${(c / chartMax) * 100}%`;
                  const hO = `${(o / chartMax) * 100}%`;
                  return (
                    <div
                      key={day}
                      style={{
                        flex: 1,
                        minWidth: 8,
                        maxWidth: 14,
                        height: "100%",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        gap: 1,
                        zIndex: 1,
                      }}
                      title={`${formatDateLabel(day)} | Visitors: ${v}, Clicks: ${c}, Orders: ${o}`}
                    >
                      <div style={{ width: 3, height: hV, background: "#00A5A5", borderRadius: "2px 2px 0 0" }} />
                      <div style={{ width: 3, height: hC, background: "#1E3A8A", borderRadius: "2px 2px 0 0" }} />
                      <div style={{ width: 3, height: hO, background: "#43A047", borderRadius: "2px 2px 0 0" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                {labels.map((day, idx) => (
                  <div key={`x-${day}`} style={{ flex: 1, minWidth: 8, maxWidth: 14, textAlign: "center" }}>
                    {idx % xTickEvery === 0 || idx === labels.length - 1 ? (
                      <Text as="span" variant="bodySm" tone="subdued">
                        {formatDateLabel(day)}
                      </Text>
                    ) : null}
                  </div>
                ))}
              </div>
              <InlineStack gap="300" align="center">
                <InlineStack gap="100" blockAlign="center">
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#00A5A5", display: "inline-block" }} />
                  <Text as="span" variant="bodySm">Visitors</Text>
                </InlineStack>
                <InlineStack gap="100" blockAlign="center">
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#1E3A8A", display: "inline-block" }} />
                  <Text as="span" variant="bodySm">Popup Clicks</Text>
                </InlineStack>
                <InlineStack gap="100" blockAlign="center">
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#43A047", display: "inline-block" }} />
                  <Text as="span" variant="bodySm">Orders</Text>
                </InlineStack>
              </InlineStack>
            </div>
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
