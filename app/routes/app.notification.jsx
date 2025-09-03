import React from "react";
import { Page, Card, Button } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

const ITEMS = [
  {
    key: "recent",
    title: "Recent Purchases",
    desc: "Show last purchases to build social proof.",
    emoji: "🛒",
    previewText: "Harsh from Ahmedabad bought ‘Classic Tote’ 3 mins ago",
  },
  {
    key: "flash",
    title: "Flash Sale Bars",
    desc: "Announce limited-time offers with a bar.",
    emoji: "⚡",
    previewText: "Flash Sale: 20% OFF — ends in 02:15",
  },
  // more modules can be added here...
];

function PreviewBox({ text }) {
  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid #ececec",
        borderRadius: 12,
        padding: 14,
        background: "#f7f7fb",
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: 14,
          color: "#374151",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={text}
      >
        {text}
      </span>
    </div>
  );
}

function DashboardCard({ title, desc, emoji, previewText, onConfigure }) {
  return (
    <Card>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22 }}>{emoji}</div>
          <h3 style={{ margin: 0, color: "#6E62FF" }}>{title}</h3>
        </div>
        <p style={{ marginTop: 8, color: "#6b7280" }}>{desc}</p>
        <PreviewBox text={previewText} />
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button primary onClick={onConfigure}>
            Configure
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function NotificationDashboard() {
  const navigate = useNavigate();
  return (
    <Page title="Notification Popups">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: 16,
        }}
      >
        {ITEMS.map((it) => (
          <DashboardCard
            key={it.key}
            title={it.title}
            desc={it.desc}
            emoji={it.emoji}
            previewText={it.previewText}
            onConfigure={() => navigate(`/app/${it.key}`)}
          />
        ))}
      </div>
    </Page>
  );
}
