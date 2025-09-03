import { Card, Layout, Page, Text, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip } from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

export default function AdditionalPage() {
  // Static demo data (date wise)
  const stats = [
    { popup_type: "recent_purchase", visitors: 5, views: 2, engagements: 1, date: "2025-08-28" },
    { popup_type: "flash_sale",      visitors: 7, views: 3, engagements: 2, date: "2025-08-28" },
    { popup_type: "recent_purchase", visitors: 10, views: 4, engagements: 1, date: "2025-08-29" },
    { popup_type: "flash_sale",      visitors: 12, views: 6, engagements: 3, date: "2025-08-29" },
    { popup_type: "recent_purchase", visitors: 8, views: 5, engagements: 2, date: "2025-08-30" },
    { popup_type: "flash_sale",      visitors: 15, views: 9, engagements: 4, date: "2025-08-30" },
  ];

  // Extract unique dates
  const dates = [...new Set(stats.map((s) => s.date))];

  // Helper to get data for chart
  const extractData = (popup, key) =>
    dates.map((d) => stats.find((s) => s.date === d && s.popup_type === popup)?.[key] || 0);

  // Chart data
  const data = {
    labels: dates,
    datasets: [
      { label: "Recent Purchases - Visitors", data: extractData("recent_purchase", "visitors"), borderColor: "blue", backgroundColor: "blue" },
      { label: "Recent Purchases - Views", data: extractData("recent_purchase", "views"), borderColor: "cyan", backgroundColor: "cyan" },
      { label: "Recent Purchases - Engagements", data: extractData("recent_purchase", "engagements"), borderColor: "navy", backgroundColor: "navy" },
      { label: "Flash Sale - Visitors", data: extractData("flash_sale", "visitors"), borderColor: "green", backgroundColor: "green" },
      { label: "Flash Sale - Views", data: extractData("flash_sale", "views"), borderColor: "lime", backgroundColor: "lime" },
      { label: "Flash Sale - Engagements", data: extractData("flash_sale", "engagements"), borderColor: "darkgreen", backgroundColor: "darkgreen" },
    ],
  };

  // Summary totals
  const getTotals = (popup) => {
    const popupStats = stats.filter((s) => s.popup_type === popup);
    return {
      visitors: popupStats.reduce((a, b) => a + b.visitors, 0),
      views: popupStats.reduce((a, b) => a + b.views, 0),
      engagements: popupStats.reduce((a, b) => a + b.engagements, 0),
    };
  };

  const recent = getTotals("recent_purchase");
  const flash = getTotals("flash_sale");

  return (
    <Page>
      <TitleBar title="Popup Dashboard" />
      <Layout>
        {/* Chart Section */}
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
              <Line data={data} />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Summary Cards */}
       
      </Layout>
    </Page>
  );
}
