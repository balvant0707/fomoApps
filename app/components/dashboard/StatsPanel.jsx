import { Badge, BlockStack, Card, InlineStack, Text } from "@shopify/polaris";
import { useEffect, useMemo, useRef } from "react";

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
  const scrollRef = useRef(null);
  const safeStats = stats || EMPTY_STATS;
  const byType = safeStats.byType || {};
  const entries = Object.entries(byType);
  const analytics = safeStats.analytics || EMPTY_STATS.analytics;
  const series = analytics.series || EMPTY_STATS.analytics.series || {};
  const labels = Array.isArray(series.labels) ? series.labels : [];
  const visitorsSeries = Array.isArray(series.visitors) ? series.visitors : [];
  const clicksSeries = Array.isArray(series.clicks) ? series.clicks : [];
  const ordersSeries = Array.isArray(series.orders) ? series.orders : [];
  const todayKey = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.toISOString().slice(0, 10);
  }, []);
  const dataByDay = useMemo(() => {
    const m = new Map();
    for (let i = 0; i < labels.length; i++) {
      m.set(labels[i], {
        visitors: Number(visitorsSeries[i] || 0),
        clicks: Number(clicksSeries[i] || 0),
        orders: Number(ordersSeries[i] || 0),
      });
    }
    return m;
  }, [labels, visitorsSeries, clicksSeries, ordersSeries]);
  const displayLabels = useMemo(() => {
    const start = new Date(`${todayKey}T00:00:00`);
    start.setDate(start.getDate() - 30);
    const end = new Date(`${todayKey}T00:00:00`);
    end.setDate(end.getDate() + 30);
    const out = [];
    const d = new Date(start);
    while (d <= end) {
      out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [labels, todayKey]);
  const mergedVisitors = useMemo(
    () => displayLabels.map((k) => dataByDay.get(k)?.visitors || 0),
    [displayLabels, dataByDay]
  );
  const mergedClicks = useMemo(
    () => displayLabels.map((k) => dataByDay.get(k)?.clicks || 0),
    [displayLabels, dataByDay]
  );
  const mergedOrders = useMemo(
    () => displayLabels.map((k) => dataByDay.get(k)?.orders || 0),
    [displayLabels, dataByDay]
  );
  const chartMax = Math.max(1, ...mergedVisitors, ...mergedClicks, ...mergedOrders);
  const yStep = Math.max(1, Math.ceil(chartMax / 6));
  const yTickValues = [];
  for (let v = chartMax; v >= 0; v -= yStep) yTickValues.push(v);
  if (yTickValues[yTickValues.length - 1] !== 0) yTickValues.push(0);
  const yTicks = yTickValues.length;
  const chartHeight = 220;
  const chartWidth = Math.max(420, displayLabels.length * 48);
  const groupWidth = displayLabels.length > 0 ? chartWidth / displayLabels.length : chartWidth;
  const clusterWidth = groupWidth * 0.82;
  const barGap = 0;
  const barWidth = clusterWidth / 3;
  const formatDateLabel = (value) => {
    const d = new Date(`${value}T00:00:00`);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  };
  const getMonthShort = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short" });
  const getDayTwoDigit = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit" });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = displayLabels.indexOf(todayKey);
    if (idx < 0) return;
    const target = Math.max(0, idx * groupWidth - el.clientWidth / 2 + groupWidth / 2);
    el.scrollLeft = target;
  }, [displayLabels, groupWidth, todayKey]);

  return (
    <Card>
      <style>{`.chart-scroll-hidden::-webkit-scrollbar{display:none}`}</style>
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
              Date-wise Analysis (30 days back + 30 days ahead)
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
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ width: 28, flex: "0 0 28px" }}>
                  <svg width="28" height={chartHeight + 40}>
                    {yTickValues.map((tickValue, i) => {
                      const y = 10 + (i / (yTicks - 1 || 1)) * chartHeight;
                      return (
                        <text key={`axis-${tickValue}-${i}`} x="24" y={y + 4} fontSize="11" fill="#6B7280" textAnchor="end">
                          {tickValue}
                        </text>
                      );
                    })}
                  </svg>
                </div>
                <div
                  ref={scrollRef}
                  className="chart-scroll-hidden"
                  style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", flex: 1 }}
                >
                  <div style={{ minWidth: chartWidth }}>
                    <svg width={chartWidth} height={chartHeight + 40}>
                      {yTickValues.map((tickValue, i) => {
                        const y = 10 + (i / (yTicks - 1 || 1)) * chartHeight;
                        return (
                          <g key={`grid-${tickValue}-${i}`}>
                            <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#E6E8EB" />
                          </g>
                        );
                      })}
                    {displayLabels.map((day, idx) => {
                      const groupX = idx * groupWidth;
                      const visitors = Number(mergedVisitors[idx] || 0);
                      const clicks = Number(mergedClicks[idx] || 0);
                      const orders = Number(mergedOrders[idx] || 0);
                      const vh = (visitors / chartMax) * chartHeight;
                      const ch = (clicks / chartMax) * chartHeight;
                      const oh = (orders / chartMax) * chartHeight;
                      const baseY = 10 + chartHeight;
                      const startX = groupX + (groupWidth - clusterWidth) / 2;
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
                    <div
                      style={{
                        marginTop: 8,
                        width: chartWidth,
                        display: "grid",
                        gridTemplateColumns: `repeat(${displayLabels.length}, 1fr)`,
                      }}
                    >
                      {displayLabels.map((day, idx) => (
                        <div key={`x-${day}`} style={{ minWidth: 18, textAlign: "center" }}>
                          <Text as="span" variant="bodySm" tone={day === todayKey ? undefined : "subdued"}>
                            {idx === 0 || getMonthShort(displayLabels[idx - 1]) !== getMonthShort(day)
                              ? getMonthShort(day)
                              : ""}
                          </Text>
                          <div>
                            <Text as="span" variant="bodySm" tone={day === todayKey ? undefined : "subdued"}>
                              {getDayTwoDigit(day)}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
