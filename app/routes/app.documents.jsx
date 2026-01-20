import { useState } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Collapsible,
} from "@shopify/polaris";

/**
 * Put these files in /public/images:
 *  doc1.png  doc2.png  doc3.png  doc4.png  doc5.png
 * Order: 1→5 (not reversed)
 */

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
  alignItems: "center",
};
const imgBox = { width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid #eee" };
const img = { display: "block", width: "100%", height: "auto" };
const textCol = { padding: "4px 6px" };
const h = { fontSize: 18, fontWeight: 700, margin: "0 0 8px" };
const p = { margin: "0 0 10px" };
const ul = { margin: "0 0 0 18px", lineHeight: 1.7 };
const small = { fontSize: 12.5, color: "#6d7175", marginTop: 8 };

export default function Documents() {
  const [open, setOpen] = useState({ s1: true, s2: false, s3: false, s4: false, s5: false });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  return (
    <Page fullWidth title="Documents">
      <TitleBar title="Documents" />
      <div style={{ padding: 24 }}>
        <Card>
          <BlockStack gap="600">
            <Text as="h1" variant="headingLg">📘 Fomoify – App Documentation</Text>
            <Text as="p" variant="bodyLg">
              Configure the <b>Recent Purchases Popup</b> (social proof) and the <b>Flash Sale</b> (urgency).
              Use the <b>Hide / Show</b> toggle on each section below.
            </Text>

            {/* 1) Modules Overview */}
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingLg" style={{ fontSize: 18 }}>1) Sales Popup & Flash Bar Modules</Text>
              <Button variant="plain" onClick={() => toggle("s1")}>{open.s1 ? "Hide" : "Show"}</Button>
            </InlineStack>
            <Collapsible open={open.s1}>
              <div style={grid}>
                <div style={imgBox}><img src="/images/doc1.webp" alt="Modules Overview" style={img} /></div>
                <div style={textCol}>
                  <h4 style={h}>What you can set up</h4>
                  <p style={p}>
                    Two primary modules: the <b>Recent Purchases Popup</b> (shows real-time customer activity) and the
                    <b> Flash Sale</b> (announces limited-time offers).
                  </p>
                  <ul style={ul}>
                    <li>Click <b>Configure</b> to set content, timing, and visuals for each module.</li>
                    <li>Purpose: combine <b>social proof + urgency</b> for a higher conversion rate.</li>
                  </ul>
                </div>
              </div>
            </Collapsible>

            {/* 2) Order Source & Fields */}
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingLg" style={{ fontSize: 18 }}>
                2) Order Source & Fields (Recent Purchases)
              </Text>
              <Button variant="plain" onClick={() => toggle("s2")}>
                {open.s2 ? "Hide" : "Show"}
              </Button>
            </InlineStack>
            <Collapsible open={open.s2}>
              <div style={grid}>
                <div style={imgBox}>
                  <img src="/images/doc2.webp" alt="Order Source & Fields" style={img} />
                </div>
                <div style={textCol}>
                  <h4 style={h}>Real Shopify order data (day-wise)</h4>
                  <p style={p}>
                    Recent Purchases pulls authenticated <b>Shopify orders</b> from the window you choose and renders them in the popup. Use the controls below to decide which data appears.
                  </p>
                  <ul style={ul}>
                    <li>
                      <b>Show orders from last:</b> pick a range between <b>1–60 days</b>. Orders are fetched
                      day-wise using your shop’s timezone.
                    </li>
                    <li>
                      <b>Usable orders only:</b> an order must contain at least one product to be included.
                    </li>
                    <li>
                      <b>No orders in window:</b> a blue validation message appears (<i>You have no orders…</i>).
                      The range dropdown and <b>Save</b> stay disabled until you select a window that has usable orders.
                    </li>
                    <li>
                      <b>Last newest order time (static):</b> shows the most recent order timestamp found in the selected window.
                    </li>
                    <li>
                      <b>Hide Fields (toggle visibility):</b> when a box is <u>checked</u>, that field is
                      <b> hidden</b> in the popup (Customer Name, City, State, Country, Product Name, Product Image, Order Time).
                      Leave unchecked to show the field.
                    </li>
                  </ul>
                </div>
              </div>
            </Collapsible>

            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingLg" style={{ fontSize: 18 }}>
                3) Message (Flash Sale – Titles & Text)
              </Text>
              <Button variant="plain" onClick={() => toggle("s6")}>
                {open.s6 ? "Hide" : "Show"}
              </Button>
            </InlineStack>
            <Collapsible open={open.s6}>
              <div style={grid}>
                <div style={imgBox}>
                  <img src="/images/doc6.webp" alt="Flash Sale – Message fields" style={img} />
                </div>
                <div style={textCol}>
                  <h4 style={h}>Multi-value message chips (press Enter to add)</h4>
                  <p style={p}>
                    These three inputs accept <b>multiple values</b>. Each value becomes a chip and can be rotated in the popup.
                    Keep copy short, factual, and brand-consistent.
                  </p>
                  <ul style={ul}>
                    <li>
                      <b>Headline / Banner Title</b> — Short title that introduces the promotion.
                      Examples: “Flash Sale”, “Weekend Offer”, “Limited Period Offer”.
                    </li>
                    <li>
                      <b>Offer Title / Discount Name</b> — What the customer gets.
                      Examples: “Extra 15% OFF”, “Buy 2 Get 1”, “Free Shipping on Orders Over ₹999”.
                    </li>
                    <li>
                      <b>Countdown Text / Urgency Message</b> — Neutral, time-boxed line.
                      Examples: “ends in 02:15 hours”, “valid today”, “offer closes at 11:59 PM”.
                    </li>
                  </ul>

                  <h4 style={{ ...h, marginTop: 14 }}>Hide Message Fields (toggle visibility)</h4>
                  <p style={p}>
                    When a box is <u>checked</u>, that field is <b>hidden</b> in the popup. Leave unchecked to show it.
                  </p>
                  <ul style={ul}>
                    <li><b>Hide Headline</b> — do not render the headline/title line.</li>
                    <li><b>Hide Offer Title</b> — show the popup without the offer label.</li>
                    <li><b>Hide Countdown Text</b> — suppress the “ends in …” message.</li>
                  </ul>
                </div>
              </div>
            </Collapsible>

            {/* 3) Display Settings */}
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingLg" style={{ fontSize: 18 }}>4) Display Settings – Enable & Timing</Text>
              <Button variant="plain" onClick={() => toggle("s3")}>{open.s3 ? "Hide" : "Show"}</Button>
            </InlineStack>
            <Collapsible open={open.s3}>
              <div style={grid}>
                <div style={imgBox}><img src="/images/doc3.webp" alt="Display Settings" style={img} /></div>
                <div style={textCol}>
                  <h4 style={h}>Visibility & frequency</h4>
                  <ul style={ul}>
                    <li>Master switch to <b>Enable / Disable</b> without losing settings.</li>
                    <li><b>Display on Pages</b>: All, Home, Product, Collection, or Cart.</li>
                    <li><b>Popup Display Duration</b>: how many seconds each popup stays visible.</li>
                    <li><b>Interval Between Popups</b>: the gap before the next popup appears.</li>
                  </ul>
                </div>
              </div>
            </Collapsible>

            {/* 4) Customize – Style */}
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingLg" style={{ fontSize: 18 }}>5) Customize – Fonts, Colors & Positions</Text>
              <Button variant="plain" onClick={() => toggle("s4")}>{open.s4 ? "Hide" : "Show"}</Button>
            </InlineStack>
            <Collapsible open={open.s4}>
              <div style={grid}>
                <div style={imgBox}><img src="/images/doc4.webp" alt="Customize Styles" style={img} /></div>
                <div style={textCol}>
                  <h4 style={h}>Brand-matching controls</h4>
                  <ul style={ul}>
                    <li><b>Font family & weight</b> (400 / 600 / 700) to match your theme.</li>
                    <li><b>Desktop/Mobile positions</b> and <b>Mobile size</b>.</li>
                    <li><b>Headline / Message</b> colors and <b>Background</b> color.</li>
                    <li><b>Animation</b>: Fade/Slide for smooth entry.</li>
                  </ul>
                </div>
              </div>
            </Collapsible>

            {/* 5) Dashboard Empty State */}
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingLg" style={{ fontSize: 18 }}>6) Dashboard – Overview & Empty State</Text>
              <Button variant="plain" onClick={() => toggle("s5")}>{open.s5 ? "Hide" : "Show"}</Button>
            </InlineStack>
            <Collapsible open={open.s5}>
              <div style={grid}>
                <div style={imgBox}><img src="/images/doc5.webp" alt="Dashboard Empty State" style={img} /></div>
                <div style={textCol}>
                  <h4 style={h}>Manage everything in one place</h4>
                  <ul style={ul}>
                    <li>Top filters: Type, Status, Search, and Page size.</li>
                    <li>Empty state shows <b>Create notification</b> or <b>Clear filters</b> actions.</li>
                    <li>When data exists, a Polaris IndexTable gives <b>toggle, edit, delete</b> controls.</li>
                    <li>Built-in pagination for large lists.</li>
                  </ul>
                </div>
              </div>
            </Collapsible>

            <Text as="p" tone="subdued" variant="bodySm">
              © {new Date().getFullYear()} Fomoify Sales Popup & Proof — Pryxo Tech Private Limited.
            </Text>
          </BlockStack>
        </Card>
      </div>

      {/* Responsive: stack on small screens */}
      <style>{`
        @media (max-width: 980px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Page>
  );
}
