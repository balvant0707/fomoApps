// app/routes/app._index.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

import { Card, Layout, Page, Text, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

// Loader: re-auth `next` honor + first-time redirect
export const loader = async ({ request }) => {
  const { session, redirect } = await authenticate.admin(request);

  // came back from re-auth? → go to target page
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  if (next) return redirect(next);

  // ensure shop row + first-time onboarding
  const shop = session.shop.toLowerCase();
  const rec = await prisma.shop.upsert({
    where: { shop },
    update: {},
    create: { shop, installed: true },
  });

  if (!rec.onboardedAt) return redirect("/app/theme-embed");

  return json({ ok: true });
};

export default function HomeOverview() {
  useLoaderData();

  // lazy-load react-chartjs-2 on client
  const [LineComp, setLineComp] = useState(null);
  useEffect(() => {
    import("react-chartjs-2").then((mod) => setLineComp(() => mod.Line));
  }, []);

  const stats = [
    { popup_type: "recent_purchase", visitors: 5,  views: 2, engagements: 1, date: "2025-08-28" },
    { popup_type: "flash_sale",      visitors: 7,  views: 3, engagements: 2, date: "2025-08-28" },
    { popup_type: "recent_purchase", visitors: 10, views: 4, engagements: 1, date: "2025-08-29" },
    { popup_type: "flash_sale",      visitors: 12, views: 6, engagements: 3, date: "2025-08-29" },
    { popup_type: "recent_purchase", visitors: 8,  views: 5, engagements: 2, date: "2025-08-30" },
    { popup_type: "flash_sale",      visitors: 15, views: 9, engagements: 4, date: "2025-08-30" },
  ];

  const dates = [...new Set(stats.map((s) => s.date))];
  const extractData = (popup, key) =>
    dates.map((d) => stats.find((s) => s.date === d && s.popup_type === popup)?.[key] || 0);

  const data = {
    labels: dates,
    datasets: [
      { label: "Recent Purchases - Visitors",    data: extractData("recent_purchase", "visitors"),    borderColor: "blue",  backgroundColor: "blue" },
      { label: "Recent Purchases - Views",       data: extractData("recent_purchase", "views"),       borderColor: "cyan",  backgroundColor: "cyan" },
      { label: "Recent Purchases - Engagements", data: extractData("recent_purchase", "engagements"), borderColor: "navy",  backgroundColor: "navy" },
      { label: "Flash Sale - Visitors",          data: extractData("flash_sale", "visitors"),         borderColor: "green", backgroundColor: "green" },
      { label: "Flash Sale - Views",             data: extractData("flash_sale", "views"),            borderColor: "lime",  backgroundColor: "lime" },
      { label: "Flash Sale - Engagements",       data: extractData("flash_sale", "engagements"),      borderColor: "darkgreen", backgroundColor: "darkgreen" },
    ],
  };

  const sum = (arr, k) => arr.reduce((a, b) => a + b[k], 0);
  const recent = (() => {
    const rs = stats.filter(s => s.popup_type === "recent_purchase");
    return { visitors: sum(rs, "visitors"), views: sum(rs, "views"), engagements: sum(rs, "engagements") };
  })();
  const flash = (() => {
    const fs = stats.filter(s => s.popup_type === "flash_sale");
    return { visitors: sum(fs, "visitors"), views: sum(fs, "views"), engagements: sum(fs, "engagements") };
  })();

  return (
    <Page>
      <TitleBar title="home" />
      <Layout>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Recent Purchases</Text>
              <Text>Visitors: {recent.visitors}</Text>
              <Text>Views: {recent.views}</Text>
              <Text>Engagements: {recent.engagements}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Flash Sale Bars</Text>
              <Text>Visitors: {flash.visitors}</Text>
              <Text>Views: {flash.views}</Text>
              <Text>Engagements: {flash.engagements}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">Popup Performance (Date Wise)</Text>
              {LineComp ? <LineComp data={data} /> : <Text>Loading chart…</Text>}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
