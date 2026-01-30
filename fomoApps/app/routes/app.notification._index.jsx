// app/routes/app.notification._index.jsx
import React, { useState, useCallback, useMemo } from "react";
import {
  Page,
  Card,
  Button,
  Loading,
  Text,
  Badge,
  InlineStack,
  BlockStack,
} from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

/* ---------- small preview pill ---------- */
function PreviewBox({ text }) {
  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "10px 12px",
        background: "#F9FAFB",
        maxWidth: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={text}
      aria-label={text}
    >
      <span
        style={{
          display: "block",
          fontSize: 13,
          color: "#374151",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/* ---------- gradient helpers ---------- */
const gradients = {
  green: "linear-gradient(135deg,#ECFDF5 0%,#DCFCE7 100%)",
  blue: "linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%)",
  peach: "linear-gradient(135deg,#FFF1F2 0%,#FFE4E6 100%)",
  mint: "linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%)",
};

/* ---------- upgraded card (look-wise only) ---------- */
function DashboardCard({
  title,
  desc,
  emoji,
  tag = "Social proof",
  isNew = false,
  thumbBg = gradients.blue,
  previewText,
  onConfigure,
  loading,
}) {
  const [hover, setHover] = useState(false);

  const cardStyle = useMemo(
    () => ({
      borderRadius: 12,
      transition: "transform .18s ease, box-shadow .18s ease",
      transform: hover ? "translateY(-2px)" : "translateY(0)",
      boxShadow: hover
        ? "0 10px 24px rgba(16,24,40,0.08)"
        : "0 1px 2px rgba(16,24,40,0.06)",
    }),
    [hover]
  );

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={cardStyle}
    >
      <Card padding="0">
        {/* Top preview / thumbnail area */}
        <div
          style={{
            height: 148,
            background: thumbBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* white circular icon badge */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
            }}
            aria-hidden
          >
            {emoji}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          <BlockStack gap="200">
            {/* badges row */}
            <InlineStack gap="200" align="space-between" blockAlign="center">
              <Badge tone="info">{tag}</Badge>
              {isNew ? <Badge tone="new">New</Badge> : null}
            </InlineStack>

            {/* title + desc */}
            <BlockStack gap="050">
              <Text as="h3" variant="headingMd">
                {title}
              </Text>
              <Text as="p" tone="subdued">
                {desc}
              </Text>
            </BlockStack>

            {/* footer row: preview (left) + configure (right) */}
            <InlineStack
              gap="200"
              align="space-between"
              blockAlign="center"
              wrap={false}
            >
              <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                <PreviewBox text={previewText} />
              </div>
              <div style={{ flexShrink: 0 }}>
                <Button
                  primary
                  onClick={onConfigure}
                  loading={loading}
                  disabled={loading}
                >
                  {loading ? "Opening…" : "Configure"}
                </Button>
              </div>
            </InlineStack>
          </BlockStack>
        </div>
      </Card>
    </div>
  );
}

export default function NotificationDashboardIndex() {
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState(null);

  const go = useCallback(
    (path, key) => {
      if (loadingKey) return;
      setLoadingKey(key);
      setTimeout(() => navigate(path), 450);
    },
    [navigate, loadingKey]
  );

  return (
    <>
      {loadingKey && <Loading />}
      <Page title="Sales Popups & Flash Bars">
        {/* Hero strip */}
        <div
          style={{
            marginBottom: 16,
            padding: "18px 16px",
            borderRadius: 12,
            background:
              "linear-gradient(135deg, #59a6e582 0%, #cf507ab5 50%, #ed68407a 100%)",
            border: "1px solid #E5E7EB",
          }}
        >
          <Text as="h2" variant="headingLg">
            Boost conversions with Shopify sales popups
          </Text>
          <Text as="p" tone="subdued">
            Use <strong>recent sales notifications</strong> for social proof and{" "}
            <strong>flash sale countdown bars</strong> to create urgency. Build
            trust, increase CTR, and lift your store’s <em>conversion rate</em>.
          </Text>
        </div>

        {/* Cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 16,
          }}
        >
          <DashboardCard
            title="Recent Purchases Popup"
            desc="Show real-time customer activity to create social proof & FOMO."
            tag="Social proof"
            isNew={true}
            emoji="🛒"
            thumbBg="linear-gradient(135deg, #2196F3 0%, #E91E63 50%, #FF5722 100%)"
            previewText="Harsh from Ahmedabad bought ‘Classic Tote’ 3 mins ago"
            onConfigure={() => go('/app/notification/recent', 'recent')}
            loading={loadingKey === 'recent'}
          />

          <DashboardCard
            title="Flash Sale / Countdown Bar"
            desc="Announce limited-time offers with a sticky top bar and timer."
            tag="Urgency"
            emoji="⚡"
            thumbBg="linear-gradient(135deg, #FF5722 0%, #E91E63 50%, #2196F3 100%)"
            previewText="Flash Sale: 20% OFF — ends in 02:15"
            onConfigure={() => go('/app/notification/flash', 'flash')}
            loading={loadingKey === 'flash'}
          />
        </div>

        {/* ====== FOOTER INFO SECTION ====== */}
        <div
          style={{
            marginTop: 32,
            padding: "20px 24px",
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            background:
              "linear-gradient(135deg, rgba(33,150,243,0.05), rgba(233,30,99,0.05))",
          }}
        >
          {/* <Text as="h3" variant="headingMd">
            Why use sales popups & countdown bars?
          </Text>
          <Text as="p" tone="subdued" style={{ marginTop: 8 }}>
            Real-time popups add <strong>trust signals</strong>, while countdown
            bars create <strong>urgency</strong>. Together they reduce friction
            and nudge shoppers to checkout faster.
          </Text>
          <ul
            style={{
              marginTop: 12,
              paddingLeft: 20,
              color: "#374151",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <li>
              <strong>Increase conversion rate</strong> with authentic social
              proof (recent sales notifications).
            </li>
            <li>
              <strong>Drive faster decisions</strong> using time-bound flash
              deals & countdown timers.
            </li>
            <li>
              <strong>Highlight key promos</strong>: sitewide discounts, new
              launches, or low-stock alerts.
            </li>
            <li>
              <strong>Recover abandoned carts</strong> by re-engaging hesitant
              visitors at the right moment.
            </li>
          </ul> */}

        </div>
      </Page>
    </>
  );
}
