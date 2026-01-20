import { Badge, Card, InlineStack, Text } from "@shopify/polaris";

export default function StatsPanel({ stats }) {
  const items = [
    { label: "Total", value: stats.total },
    { label: "Enabled", value: stats.enabled },
    { label: "Disabled", value: stats.disabled },
  ];

  return (
    <Card>
      <div style={{ padding: 16 }}>
        <InlineStack align="space-between" blockAlign="center" wrap>
          <Text as="h3" variant="headingMd">
            Quick Stats
          </Text>
          <InlineStack gap="200" wrap>
            {Object.entries(stats.byType || {}).map(([key, count]) => (
              <Badge key={key} tone="info">
                {key}: {count}
              </Badge>
            ))}
          </InlineStack>
        </InlineStack>

        <InlineStack gap="600" wrap>
          {items.map((item) => (
            <div key={item.label}>
              <Text as="p" tone="subdued">
                {item.label}
              </Text>
              <Text as="p" variant="headingLg">
                {item.value}
              </Text>
            </div>
          ))}
        </InlineStack>
      </div>
    </Card>
  );
}
