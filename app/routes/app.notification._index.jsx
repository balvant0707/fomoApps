// app/routes/app.notification._index.jsx
import React, { useState, useCallback } from "react";
import { Page, Card, Button, Loading } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

function PreviewBox({ text }) {
  return (
    <div style={{ marginTop: 12, border: "1px solid #ececec", borderRadius: 12, padding: 14, background: "#f7f7fb" }}>
      <span style={{ display: "block", fontSize: 14, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={text}>
        {text}
      </span>
    </div>
  );
}

function DashboardCard({ title, desc, emoji, previewText, onConfigure, loading }) {
  return (
    <Card>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22 }}>{emoji}</div>
          <h3 style={{ margin: 0, color: "#6E62FF" }}>{title}</h3>
        </div>
        <p style={{ marginTop: 8, color: "#6b7280" }}>{desc}</p>
        <PreviewBox text={previewText} />
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <Button primary onClick={onConfigure} loading={loading} disabled={loading}>
            {loading ? "Opening…" : "Configure"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function NotificationDashboardIndex() {
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState(null);

  const go = useCallback((path, key) => {
    if (loadingKey) return;
    setLoadingKey(key);
    setTimeout(() => navigate(path), 450);
  }, [navigate, loadingKey]);

  return (
    <>
      {loadingKey && <Loading />}
      <Page title="Notification Popups">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
          <DashboardCard
            title="Recent Purchases"
            desc="Show last purchases to build social proof."
            emoji="🛒"
            previewText="Harsh from Ahmedabad bought ‘Classic Tote’ 3 mins ago"
            onConfigure={() => go("/app/notification/recent", "recent")}
            loading={loadingKey === "recent"}
          />
          <DashboardCard
            title="Flash Sale Bars"
            desc="Announce limited-time offers with a bar."
            emoji="⚡"
            previewText="Flash Sale: 20% OFF — ends in 02:15"
            onConfigure={() => go("/app/notification/flash", "flash")}
            loading={loadingKey === "flash"}
          />
        </div>
      </Page>
    </>
  );
}
