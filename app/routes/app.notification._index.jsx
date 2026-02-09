// app/routes/app.notification._index.jsx
import React, { useState, useCallback } from "react";
import { Page, Button, Loading, Text } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const DASHBOARD_STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap");

.notify-page {
  font-family: "Space Grotesk", "DM Sans", sans-serif;
  color: #1b1b1b;
}
.notify-hero {
  position: relative;
  padding: 26px 24px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, #fff7d6 0%, #f4efe4 40%, #efe9dd 100%);
  border: 1px solid #eadfcd;
  box-shadow: 0 18px 40px rgba(35, 31, 26, 0.08);
  overflow: hidden;
}
.notify-hero:before,
.notify-hero:after {
  content: "";
  position: absolute;
  border-radius: 999px;
  opacity: 0.35;
}
.notify-hero:before {
  width: 220px;
  height: 220px;
  right: -70px;
  top: -80px;
  background: radial-gradient(circle, #f8c06d 0%, #f6a95c 60%, transparent 70%);
}
.notify-hero:after {
  width: 260px;
  height: 260px;
  left: -100px;
  bottom: -120px;
  background: radial-gradient(circle, #8fd3b4 0%, #7cc8a6 55%, transparent 70%);
}
.notify-hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(240px, 1.2fr) minmax(200px, 0.8fr);
  gap: 20px;
  align-items: center;
}
.notify-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff7e6;
  border: 1px solid #f2d6a8;
  font-size: 12px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #8a5a1f;
  font-weight: 600;
}
.notify-hero h2 {
  margin: 14px 0 8px;
  font-size: 28px;
  line-height: 1.2;
}
.notify-hero p {
  margin: 0;
  color: #4b4b4b;
  font-family: "DM Sans", sans-serif;
  font-size: 14px;
  max-width: 520px;
}
.notify-hero-actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.notify-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #e6d5bf;
  background: #fffaf0;
  font-size: 12px;
  color: #6a4f2b;
  font-weight: 600;
}
.notify-hero-card {
  background: #ffffff;
  border: 1px solid #eadfcd;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 12px 26px rgba(23, 20, 16, 0.08);
  display: grid;
  gap: 10px;
}
.notify-hero-line {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f6b85f 0%, #7cc8a6 100%);
}
.notify-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}
.notify-card {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid #ece3d2;
  box-shadow: 0 12px 30px rgba(22, 18, 12, 0.08);
  transition: transform 180ms ease, box-shadow 180ms ease;
  animation: card-in 560ms ease both;
  animation-delay: var(--delay, 0ms);
  background: #fffefb;
}
.notify-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 36px rgba(22, 18, 12, 0.12);
}
.notify-card-top {
  position: relative;
  padding: 20px;
  min-height: 120px;
  display: flex;
  align-items: flex-end;
  background: #f7f3ea;
}
.notify-card-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.notify-card-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 1px;
  color: #1b1b1b;
  box-shadow: 0 8px 18px rgba(22, 18, 12, 0.16);
}
.notify-card-body {
  padding: 16px;
  display: grid;
  gap: 12px;
}
.notify-card-title {
  font-size: 16px;
  font-weight: 700;
}
.notify-card-desc {
  font-size: 13px;
  color: #5d5d5d;
  font-family: "DM Sans", sans-serif;
}
.notify-preview {
  border: 1px dashed #d8cbb6;
  background: #fff6e6;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 12px;
  color: #6b4b1c;
  font-family: "DM Sans", sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notify-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.notify-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: #8b6a3d;
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (max-width: 900px) {
  .notify-hero-grid {
    grid-template-columns: 1fr;
  }
}
`;

function PreviewBox({ text }) {
  return (
    <div className="notify-preview" title={text} aria-label={text}>
      {text}
    </div>
  );
}

const gradients = {
  ocean: "linear-gradient(135deg, #1d4ed8 0%, #f97316 100%)",
  ember: "linear-gradient(135deg, #fb7185 0%, #f97316 100%)",
  citrus: "linear-gradient(135deg, #fde68a 0%, #f97316 100%)",
  forest: "linear-gradient(135deg, #34d399 0%, #14b8a6 100%)",
  dusk: "linear-gradient(135deg, #c084fc 0%, #fb7185 100%)",
  sand: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
};

function DashboardCard({
  title,
  desc,
  icon,
  tag = "Social proof",
  isNew = false,
  thumbBg = gradients.ocean,
  previewText,
  onConfigure,
  loading,
  delay = 0,
}) {
  return (
    <div className="notify-card" style={{ "--delay": `${delay}ms` }}>
      <div className="notify-card-top" style={{ background: thumbBg }}>
        <span className="notify-card-badge">{tag}</span>
        <div className="notify-card-icon" aria-hidden>
          {icon}
        </div>
      </div>
      <div className="notify-card-body">
        <div>
          <div className="notify-card-title">{title}</div>
          <div className="notify-card-desc">{desc}</div>
        </div>
        <PreviewBox text={previewText} />
        <div className="notify-actions">
          <span className="notify-tag">{isNew ? "NEW" : "READY"}</span>
          <Button
            primary
            onClick={onConfigure}
            loading={loading}
            disabled={loading}
          >
            {loading ? "Opening..." : "Configure"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const CARD_DATA = [
  {
    key: "recent",
    title: "Recent Purchases Popup",
    desc: "Show real-time customer activity to create social proof and FOMO.",
    tag: "Social proof",
    icon: "REC",
    thumbBg: gradients.ocean,
    previewText: "Someone from Location bought 'Classic Tote' 3 mins ago",
    path: "/app/notification/recent",
    isNew: true,
  },
  {
    key: "flash",
    title: "Flash Sale / Countdown Bar",
    desc: "Announce limited-time offers with a sticky top bar and timer.",
    tag: "Urgency",
    icon: "FLASH",
    thumbBg: gradients.ember,
    previewText: "Flash Sale: 20% OFF - ends in 02:15",
    path: "/app/notification/flash",
  },
  {
    key: "visitor",
    title: "Visitor Popup",
    desc: "Show live visitor activity and product interest notifications.",
    tag: "Social proof",
    icon: "VIEW",
    thumbBg: gradients.forest,
    previewText: "Someone from abroad just viewed this T-shirt",
    path: "/app/notification/visitor",
  },
  {
    key: "lowstock",
    title: "Low Stock Popup",
    desc: "Create urgency when inventory is running low.",
    tag: "Urgency",
    icon: "LOW",
    thumbBg: gradients.citrus,
    previewText: "Free Polo T-Shirt has only 5 items left",
    path: "/app/notification/lowstock",
  },
  {
    key: "addtocart",
    title: "Add to Cart Notification",
    desc: "Show live add-to-cart activity to build social proof.",
    tag: "Social proof",
    icon: "CART",
    thumbBg: gradients.sand,
    previewText: "Someone from abroad added DREAMY BLUE BALL GOWN to cart",
    path: "/app/notification/addtocart",
  },
  {
    key: "review",
    title: "Review Notification",
    desc: "Show new product reviews to build trust and social proof.",
    tag: "Social proof",
    icon: "RATE",
    thumbBg: gradients.dusk,
    previewText: "Jane B. from abroad just reviewed DREAMY BLUE BALL GOWN",
    path: "/app/notification/review",
  },
];

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
        <style>{DASHBOARD_STYLES}</style>
        <div className="notify-page">
          <section className="notify-hero">
            <div className="notify-hero-grid">
              <div>
                <span className="notify-kicker">Social Proof Studio</span>
                <h2>Turn real activity into trust and momentum</h2>
                <p>
                  Design on-store notifications that feel premium. Mix social
                  proof with urgency so shoppers stay confident and engaged.
                </p>
                <div className="notify-hero-actions">
                  <span className="notify-chip">Live previews</span>
                  <span className="notify-chip">Quick setup</span>
                  <span className="notify-chip">Mobile friendly</span>
                </div>
              </div>
              <div className="notify-hero-card">
                <div className="notify-hero-line" />
                <Text as="h3" variant="headingMd">
                  Ready in minutes
                </Text>
                <Text as="p" tone="subdued">
                  Pick a template, customize the message, and publish to your
                  storefront instantly.
                </Text>
              </div>
            </div>
          </section>

          <div className="notify-grid">
            {CARD_DATA.map((card, index) => (
              <DashboardCard
                key={card.key}
                title={card.title}
                desc={card.desc}
                tag={card.tag}
                icon={card.icon}
                thumbBg={card.thumbBg}
                previewText={card.previewText}
                onConfigure={() => go(card.path, card.key)}
                loading={loadingKey === card.key}
                isNew={card.isNew}
                delay={index * 60}
              />
            ))}
          </div>
        </div>
      </Page>
    </>
  );
}
