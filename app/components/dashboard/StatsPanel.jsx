import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useLocation, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";

const EMPTY_STATS = {
  total: 0,
  enabled: 0,
  disabled: 0,
  byType: {},
  analytics: {
    visitors: 0,
    clicks: 0,
    orders: 0,
    days: 7,
    startDate: "",
    endDate: "",
    series: { labels: [], visitors: [], clicks: [], orders: [] },
  },
  analyticsFilter: {
    range: "7d",
    days: 7,
    startDate: "",
    endDate: "",
  },
};

const RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 15 days", value: "15d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 60 days", value: "60d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom range", value: "custom" },
];

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function toDayLabel(key) {
  const d = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildLinePoints(values, xAt, yAt) {
  if (!Array.isArray(values) || !values.length) return "";
  return values.map((value, idx) => `${xAt(idx)},${yAt(value)}`).join(" ");
}

export default function StatsPanel({ stats }) {
  const navigate = useNavigate();
  const location = useLocation();
  const safeStats = stats || EMPTY_STATS;
  const byType = safeStats.byType || {};
  const entries = Object.entries(byType);
  const analytics = safeStats.analytics || EMPTY_STATS.analytics;
  const analyticsFilter = safeStats.analyticsFilter || EMPTY_STATS.analyticsFilter;
  const series = analytics.series || EMPTY_STATS.analytics.series || {};
  const labels = Array.isArray(series.labels) ? series.labels : [];
  const impressions = Array.isArray(series.visitors)
    ? series.visitors.map((value) => Number(value || 0))
    : [];
  const clicks = Array.isArray(series.clicks)
    ? series.clicks.map((value) => Number(value || 0))
    : [];

  const [range, setRange] = useState(analyticsFilter.range || "7d");
  const [startDate, setStartDate] = useState(analyticsFilter.startDate || "");
  const [endDate, setEndDate] = useState(analyticsFilter.endDate || "");
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    setRange(analyticsFilter.range || "7d");
    setStartDate(analyticsFilter.startDate || "");
    setEndDate(analyticsFilter.endDate || "");
    setFilterError("");
  }, [analyticsFilter.range, analyticsFilter.startDate, analyticsFilter.endDate]);

  const chartMax = Math.max(1, ...impressions, ...clicks);
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, idx) =>
    Math.round(chartMax - (chartMax * idx) / yTicks)
  );

  const plotHeight = 220;
  const plotWidth = Math.max(640, labels.length * 120);
  const paddingTop = 16;
  const paddingBottom = 32;
  const paddingLeft = 44;
  const paddingRight = 18;
  const svgWidth = paddingLeft + plotWidth + paddingRight;
  const svgHeight = paddingTop + plotHeight + paddingBottom;
  const baseY = paddingTop + plotHeight;
  const xStep = labels.length > 1 ? plotWidth / (labels.length - 1) : 0;
  const xAt = (idx) =>
    paddingLeft + (labels.length <= 1 ? plotWidth / 2 : idx * xStep);
  const yAt = (value) => paddingTop + (1 - Number(value || 0) / chartMax) * plotHeight;
  const impressionsLinePoints = buildLinePoints(impressions, xAt, yAt);
  const clicksLinePoints = buildLinePoints(clicks, xAt, yAt);
  const areaPoints =
    labels.length && impressionsLinePoints
      ? `${xAt(0)},${baseY} ${impressionsLinePoints} ${xAt(labels.length - 1)},${baseY}`
      : "";
  const xTickEvery = Math.max(1, Math.ceil(labels.length / 7));

  const applyQuery = (nextRange, nextStart = "", nextEnd = "") => {
    const params = new URLSearchParams(location.search);
    params.set("range", nextRange);
    params.delete("days");

    if (nextRange === "custom") {
      params.set("start", nextStart);
      params.set("end", nextEnd);
    } else {
      params.delete("start");
      params.delete("end");
    }

    const query = params.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ""}`);
  };

  const onRangeChange = (value) => {
    setRange(value);
    setFilterError("");
    if (value !== "custom") applyQuery(value);
  };

  const applyCustomFilter = () => {
    if (!startDate || !endDate) {
      setFilterError("Select both start and end date.");
      return;
    }
    if (startDate > endDate) {
      setFilterError("Start date must be before end date.");
      return;
    }
    setFilterError("");
    applyQuery("custom", startDate, endDate);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="start" wrap gap="300">
          <BlockStack gap="050">
            <Text variant="headingLg" as="h2">
              Analytics
            </Text>
            <Text as="p" tone="subdued">
              Data updates daily at 11:30 PM (UTC time)
            </Text>
          </BlockStack>

          <div
            style={{
              border: "1px solid #D9DCDE",
              borderRadius: 12,
              padding: 12,
              minWidth: 320,
              background: "#FFFFFF",
            }}
          >
            <BlockStack gap="200">
              <Select
                label="Date range"
                labelHidden
                options={RANGE_OPTIONS}
                value={range}
                onChange={onRangeChange}
              />
              {range === "custom" && (
                <InlineStack gap="200" blockAlign="end" wrap>
                  <TextField
                    label="Start"
                    type="date"
                    value={startDate}
                    onChange={setStartDate}
                    autoComplete="off"
                  />
                  <TextField
                    label="End"
                    type="date"
                    value={endDate}
                    onChange={setEndDate}
                    autoComplete="off"
                  />
                  <Button variant="primary" onClick={applyCustomFilter}>
                    Apply
                  </Button>
                </InlineStack>
              )}
              {filterError ? (
                <Text as="p" tone="critical" variant="bodySm">
                  {filterError}
                </Text>
              ) : null}
            </BlockStack>
          </div>
        </InlineStack>

        <InlineStack gap="200" wrap>
          <Badge tone="attention">Notification impressions: {analytics.visitors || 0}</Badge>
          <Badge tone="info">Notification clicks: {analytics.clicks || 0}</Badge>
          <Badge tone="success">Orders: {analytics.orders || 0}</Badge>
          <Badge>{`Window: ${analytics.days || 0} day(s)`}</Badge>
        </InlineStack>

        <Card padding="300">
          <BlockStack gap="200">
            <Text variant="headingSm" as="h3">
              Date-wise Analysis
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
              {labels.length === 0 ? (
                <Text as="p" tone="subdued">
                  No analytics data found for this range.
                </Text>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <div style={{ minWidth: svgWidth }}>
                      <svg width={svgWidth} height={svgHeight}>
                        {yTickValues.map((tick, idx) => {
                          const y = paddingTop + (idx / yTicks) * plotHeight;
                          return (
                            <g key={`grid-${tick}-${idx}`}>
                              <line
                                x1={paddingLeft}
                                y1={y}
                                x2={paddingLeft + plotWidth}
                                y2={y}
                                stroke="#E7EAEE"
                              />
                              <text
                                x={paddingLeft - 8}
                                y={y + 4}
                                fontSize="11"
                                fill="#6B7280"
                                textAnchor="end"
                              >
                                {tick}
                              </text>
                            </g>
                          );
                        })}

                        {areaPoints ? (
                          <polygon
                            points={areaPoints}
                            fill="rgba(38, 169, 230, 0.16)"
                            stroke="none"
                          />
                        ) : null}

                        {impressionsLinePoints ? (
                          <polyline
                            points={impressionsLinePoints}
                            fill="none"
                            stroke="#26A9E6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}

                        {clicksLinePoints ? (
                          <polyline
                            points={clicksLinePoints}
                            fill="none"
                            stroke="#6F4CF6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}
                      </svg>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      display: "grid",
                      gridTemplateColumns: `repeat(${labels.length}, minmax(80px, 1fr))`,
                      gap: 0,
                      paddingLeft: 44,
                      paddingRight: 18,
                    }}
                  >
                    {labels.map((day, idx) => (
                      <div key={`x-${day}`} style={{ textAlign: "center" }}>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {idx % xTickEvery === 0 || idx === labels.length - 1
                            ? toDayLabel(day)
                            : ""}
                        </Text>
                      </div>
                    ))}
                  </div>

                  <InlineStack gap="300" align="center">
                    <InlineStack gap="100" blockAlign="center">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: "#26A9E6",
                          display: "inline-block",
                        }}
                      />
                      <Text as="span" variant="bodySm">
                        Notification impression
                      </Text>
                    </InlineStack>
                    <InlineStack gap="100" blockAlign="center">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: "#6F4CF6",
                          display: "inline-block",
                        }}
                      />
                      <Text as="span" variant="bodySm">
                        Notification clicks
                      </Text>
                    </InlineStack>
                  </InlineStack>
                </>
              )}
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
