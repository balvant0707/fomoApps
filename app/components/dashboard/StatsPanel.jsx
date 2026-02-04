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
  const chartMax = Math.max(1, ...visitorsSeries, ...clicksSeries, ...ordersSeries);
  const yTicks = 6;
  const xTickEvery = Math.max(1, Math.floor(labels.length / 6));
  const chartHeight = 220;
  const chartWidth = Math.max(420, labels.length * 64);
  const groupWidth = labels.length > 0 ? chartWidth / labels.length : chartWidth;
  const clusterWidth = groupWidth * 0.82;
  const barGap = 0;
  const barWidth = clusterWidth / 3;
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
              Date-wise Analysis ({analytics.days || 30} days)
            </Text>
            <div
              style={{
                minHeight: 320,
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: 12,
                background: "#FFFFFF",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: chartWidth + 40 }}>
                  <svg width={chartWidth + 40} height={chartHeight + 40}>
                    {[...Array(yTicks)].map((_, i) => {
                      const y = 10 + (i / (yTicks - 1)) * chartHeight;
                      const tickValue = Math.round(chartMax - (i / (yTicks - 1)) * chartMax);
                      return (
                        <g key={`grid-${i}`}>
                          <line x1="30" y1={y} x2={chartWidth + 30} y2={y} stroke="#E6E8EB" />
                          <text x="6" y={y + 4} fontSize="11" fill="#6B7280">
                            {tickValue}
                          </text>
                        </g>
                      );
                    })}
                    {labels.map((day, idx) => {
                      const groupX = idx * groupWidth;
                      const visitors = Number(visitorsSeries[idx] || 0);
                      const clicks = Number(clicksSeries[idx] || 0);
                      const orders = Number(ordersSeries[idx] || 0);
                      const vh = (visitors / chartMax) * chartHeight;
                      const ch = (clicks / chartMax) * chartHeight;
                      const oh = (orders / chartMax) * chartHeight;
                      const baseY = 10 + chartHeight;
                      const startX = 30 + groupX + (groupWidth - clusterWidth) / 2;
                      const dateTooltip =
                        `${formatDateLabel(day)}\n` +
                        `Visitors: ${visitors}\n` +
                        `Clicks: ${clicks}\n` +
                        `Orders: ${orders}`;

                      return (
                        <g key={`bars-${day}`}>
                          <rect
                            x={startX}
                            y={baseY - vh}
                            width={barWidth}
                            height={Math.max(1, vh)}
                            rx="0"
                            fill="#E8C15F"
                          >
                            <title>{dateTooltip}</title>
                          </rect>
                          <rect
                            x={startX + barWidth + barGap}
                            y={baseY - ch}
                            width={barWidth}
                            height={Math.max(1, ch)}
                            rx="0"
                            fill="#4A98D0"
                          >
                            <title>{dateTooltip}</title>
                          </rect>
                          <rect
                            x={startX + (barWidth + barGap) * 2}
                            y={baseY - oh}
                            width={barWidth}
                            height={Math.max(1, oh)}
                            rx="0"
                            fill="#7A63B8"
                          >
                            <title>{dateTooltip}</title>
                          </rect>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                {labels.map((day, idx) => (
                  <div key={`x-${day}`} style={{ flex: 1, minWidth: 28, textAlign: "center" }}>
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
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#E8C15F", display: "inline-block" }} />
                  <Text as="span" variant="bodySm">Visitors</Text>
                </InlineStack>
                <InlineStack gap="100" blockAlign="center">
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#4A98D0", display: "inline-block" }} />
                  <Text as="span" variant="bodySm">Clicks</Text>
                </InlineStack>
                <InlineStack gap="100" blockAlign="center">
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#7A63B8", display: "inline-block" }} />
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
