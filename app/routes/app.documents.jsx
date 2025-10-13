// app/routes/app.documents.jsx
import { useState } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Card,
  Layout,
  Page,
  Text,
  BlockStack,
  Image,
  Divider,
  Collapsible,
  Button,
  InlineStack,
} from "@shopify/polaris";

/**
 * M2 Web Fomo Popup — Documents (last → first images)
 * Place these in /public/images:
 *  doc1-dashboard.png
 *  doc2-recent-preview.png
 *  doc3-recent-settings.png
 *  doc4-recent-customize.png
 *  doc5-flash-preview.png
 *  doc6-flash-settings.png
 *  doc7-flash-customize.png
 */

const imgStyle = { borderRadius: 10, margin: "12px 0", maxWidth: "100%" };
const ulStyle = { marginTop: 8, lineHeight: 1.7 };

export default function Documents() {
  // accordion states (open by default for the first section)
  const [open, setOpen] = useState({
    s1: true,
    s2: false,
    s3: false,
    s4: false,
    s5: false,
    s6: false,
    s7: false,
  });

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  return (
    <Page fullWidth>
      <TitleBar title="Documents" />
      <div style={{ padding: 24 }}>
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <BlockStack gap="600">
                {/* INTRO */}
                <Text variant="headingLg" as="h1" style={{ fontSize: "17px" }}>
                  📘 M2 Web Fomo Popup – App Documentation
                </Text>
                <Text variant="bodyLg" as="p">
                  A quick guide to configure <b>Sales Popups</b> (social proof) and{" "}
                  <b>Flash Sale Bars</b> (urgency). Images are shown in{" "}
                  <b>last → first</b> order as requested.
                </Text>

                {/* 1) Dashboard (last image) */}
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h5" style={{ fontSize: "17px" }}>1️⃣ Dashboard Overview</Text>
                  <Button onClick={() => toggle("s1")} variant="plain">
                    {open.s1 ? "Hide" : "Show"}
                  </Button>
                </InlineStack>
                <Collapsible open={open.s1}>
                  <Image source="/images/doc1-dashboard.png" alt="Dashboard overview" style={imgStyle} />
                  <Text variant="bodyLg" as="p">
                    Two modules:
                    <ul style={ulStyle}>
                      <li><b>Recent Purchases Popup</b> — social proof.</li>
                      <li><b>Flash Sale / Countdown Bar</b> — urgency banner.</li>
                    </ul>
                    Click <b>Configure</b> to manage each.
                  </Text>
                </Collapsible>

                {/* 2) RP Preview */}
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h5" style={{ fontSize: "17px" }}>2️⃣ Recent Purchases – Live Preview</Text>
                  <Button onClick={() => toggle("s2")} variant="plain">
                    {open.s2 ? "Hide" : "Show"}
                  </Button>
                </InlineStack>
                <Collapsible open={open.s2}>
                  <Image source="/images/doc2-recent-preview.png" alt="Recent Purchase Preview" style={imgStyle} />
                  <Text variant="bodyLg" as="p">
                    Toggle <b>Desktop / Mobile / Both</b> to see size/position behaviour.
                    Mobile preview follows the mobile position & size.
                  </Text>
                </Collapsible>

                {/* 3) RP Display & Message */}
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h5" style={{ fontSize: "17px" }}>3️⃣ Recent Purchases – Display & Message Settings</Text>
                  <Button onClick={() => toggle("s3")} variant="plain">
                    {open.s3 ? "Hide" : "Show"}
                  </Button>
                </InlineStack>
                <Collapsible open={open.s3}>
                  <Image source="/images/doc3-recent-settings.png" alt="Recent Purchase Settings" style={imgStyle} />
                  <Text variant="bodyLg" as="p">
                    Control <b>Enable</b>, <b>Display Duration</b>, <b>Interval</b>. Rotate message chips:
                    <ul style={ulStyle}>
                      <li><b>Buyer Name</b> (Harsh, Priya, Someone…)</li>
                      <li><b>Location/City</b> (Ahmedabad, Mumbai…)</li>
                      <li><b>Time</b> (3 mins ago, 12 hours ago…)</li>
                      <li><b>Action text</b> (“bought this product recently”)</li>
                    </ul>
                  </Text>
                </Collapsible>

                {/* 4) RP Product & Style */}
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h5" style={{ fontSize: "17px" }}>4️⃣ Recent Purchases – Product & Style Customization</Text>
                  <Button onClick={() => toggle("s4")} variant="plain">
                    {open.s4 ? "Hide" : "Show"}
                  </Button>
                </InlineStack>
                <Collapsible open={open.s4}>
                  <Image source="/images/doc4-recent-customize.png" alt="Recent Purchase Customization" style={imgStyle} />
                  <Text variant="bodyLg" as="p">
                    Select products to feature and tune design:
                    <ul style={ulStyle}>
                      <li>Font family & weight</li>
                      <li>Background & text colors</li>
                      <li>Animation (Fade/Slide)</li>
                      <li>Desktop/Mobile positions & Mobile size</li>
                    </ul>
                  </Text>
                </Collapsible>

                {/* 5) Flash Sale Preview */}
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h5" style={{ fontSize: "17px" }}>5️⃣ Flash Sale / Countdown Bar – Live Preview</Text>
                  <Button onClick={() => toggle("s5")} variant="plain">
                    {open.s5 ? "Hide" : "Show"}
                  </Button>
                </InlineStack>
                <Collapsible open={open.s5}>
                  <Image source="/images/doc5-flash-preview.png" alt="Flash Sale Preview" style={imgStyle} />
                  <Text variant="bodyLg" as="p">
                    Short, clear copy; ensure it looks good on both Desktop and Mobile.
                  </Text>
                </Collapsible>

                {/* 6) Flash Sale Display & Message */}
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h5" style={{ fontSize: "17px" }}>6️⃣ Flash Sale / Countdown Bar – Display & Message</Text>
                  <Button onClick={() => toggle("s6")} variant="plain">
                    {open.s6 ? "Hide" : "Show"}
                  </Button>
                </InlineStack>
                <Collapsible open={open.s6}>
                  <Image source="/images/doc6-flash-settings.png" alt="Flash Sale Settings" style={imgStyle} />
                  <Text variant="bodyLg" as="p">
                    Define:
                    <ul style={ulStyle}>
                      <li><b>Headline</b> — “Flash Sale”, “Limited Time”</li>
                      <li><b>Offer</b> — “20% OFF”, “Buy 1 Get 1”</li>
                      <li><b>Countdown</b> — “Ends in 02:15 hours”</li>
                    </ul>
                  </Text>
                </Collapsible>

                {/* 7) Flash Sale Design (first image) */}
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h5" style={{ fontSize: "17px" }}>7️⃣ Flash Sale / Countdown Bar – Design Customization</Text>
                  <Button onClick={() => toggle("s7")} variant="plain">
                    {open.s7 ? "Hide" : "Show"}
                  </Button>
                </InlineStack>
                <Collapsible open={open.s7}>
                  <Image source="/images/doc7-flash-customize.png" alt="Flash Sale Customization" style={imgStyle} />
                  <Text variant="bodyLg" as="p">
                    Tune <b>Font</b>, <b>Positions</b>, <b>Animation</b>, and upload a <b>Custom SVG</b> (≤200KB).
                    Set <b>Title</b>, <b>Offer</b>, and <b>Background</b> colors to match your brand.
                  </Text>
                </Collapsible>

                {/* Tips */}
                <Divider />
                <Text variant="headingLg" as="h5" style={{ fontSize: "17px" }}>💡 Tips & Best Practices</Text>
                <Text variant="bodyLg" as="p">
                  ✅ Realistic names & cities • ✅ Intervals ~8–15s • ✅ Test on Desktop & Mobile • ✅ Match theme branding
                </Text>

                <Divider />
                <Text variant="bodySm" tone="subdued" as="p">
                  © 2025 M2 Web Fomo Popup – Built by M2 Web Designing.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </div>
    </Page>
  );
}
