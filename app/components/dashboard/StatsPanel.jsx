import { Badge, BlockStack, Card, InlineStack, Text } from "@shopify/polaris";

const EMPTY_STATS = { total: 0, enabled: 0, disabled: 0, byType: {} };

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export default function StatsPanel({ stats }) {
  const safeStats = stats || EMPTY_STATS;
  const byType = safeStats.byType || {};
  const entries = Object.entries(byType);

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
          </InlineStack>
        </InlineStack>

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
