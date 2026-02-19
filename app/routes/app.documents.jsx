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
import { authenticate } from "../shopify.server";

const DOC_SECTIONS = [
  {
    key: "overview",
    title: "1) Fomoify Popup Documentation Overview",
    image: "/images/doc1.webp",
    alt: "Fomoify popup overview",
    summary:
      "This page now uses accordion-style documentation for every popup type and includes detailed setting explanation, font size guidance, and ready content.",
    panels: [
      {
        key: "setup",
        title: "How To Use This Document",
        items: [
          "Open one popup section at a time from the accordion below.",
          "Inside each popup, open sub-accordion panels: Setup, Settings, Font Size, Content, Tokens.",
          "Use the same setting names that appear in actual popup configuration pages.",
          "After changes, always test on Home, Product, Collection, and Cart pages.",
        ],
      },
      {
        key: "notes",
        title: "Common Rules For All Popups",
        items: [
          "Keep message copy short and factual to maintain trust.",
          "Use readable contrast between background and text colors.",
          "Avoid running too many popup types at the same time.",
          "Balance duration and interval to avoid notification fatigue.",
        ],
      },
    ],
  },
  {
    key: "recent",
    title: "2) Recent Purchases Popup",
    image: "/images/doc2.webp",
    alt: "Recent purchases popup",
    summary:
      "Recent popup shows real Shopify order activity. It focuses on social proof using customer location, product, and order time.",
    panels: [
      {
        key: "setup",
        title: "Setup Steps",
        items: [
          "Enable popup and select page visibility (Home, Product, Collection list, Collection page, Cart).",
          "Set order window from 1 to 60 days in Show orders from last.",
          "Pick hidden fields from Hide Fields (name, city, state, country, product name, product image, order time).",
          "Set display timing: delay, duration, and interval.",
          "Save and verify with latest usable Shopify orders.",
        ],
      },
      {
        key: "settings",
        title: "All Settings Explanation",
        settings: [
          { name: "enabled", description: "Enable or disable popup without deleting saved config." },
          { name: "showType", description: "Controls where popup appears based on selected page checkboxes." },
          { name: "orderDays", description: "Order fetch window in days (1 to 60)." },
          { name: "messageText", description: "Main descriptive line shown with purchase activity." },
          { name: "productNameMode", description: "full = full title, half = shortened title." },
          { name: "productNameLimit", description: "Character limit used when productNameMode is half." },
          { name: "namesJson", description: "Hide-fields internal list used to hide specific data points." },
          { name: "layout", description: "Landscape or portrait popup layout." },
          { name: "template", description: "Solid or gradient style template." },
          { name: "imageAppearance", description: "cover or contain for product image rendering." },
          { name: "fontFamily", description: "Popup font family." },
          { name: "fontWeight", description: "Text weight for key content emphasis." },
          { name: "rounded", description: "Text size control in px for preview and rendering scale." },
          { name: "position/mobilePosition", description: "Desktop and mobile popup position." },
          { name: "bg/text/price colors", description: "Control popup readability and branding colors." },
          { name: "firstDelaySeconds", description: "Delay before first popup appears." },
          { name: "durationSeconds", description: "How long each popup stays visible." },
          { name: "alternateSeconds + intervalUnit", description: "Gap between consecutive popups." },
          { name: "animation", description: "Popup entrance style." },
        ],
      },
      {
        key: "font",
        title: "Font Size And Typography Guide",
        items: [
          "Use fontFamily consistent with your store theme.",
          "Use fontWeight 500 to 700 for better readability.",
          "Keep rounded/text-size value around 13 to 16 px for desktop.",
          "If popup looks dense on mobile, lower text size by 1 to 2 px.",
          "Use half product name mode with a limit around 15 to 24 when titles are long.",
        ],
      },
      {
        key: "content",
        title: "Ready Content Examples",
        items: [
          "bought this product recently",
          "placed an order recently",
          "just purchased this item",
          "ordered this product a few minutes ago",
        ],
      },
    ],
  },
  {
    key: "flash",
    title: "3) Flash Sale / Countdown Bar",
    image: "/images/doc6.webp",
    alt: "Flash sale popup",
    summary:
      "Flash bar rotates multiple message chips for headline, offer title, and urgency text to create time-based attention.",
    panels: [
      {
        key: "setup",
        title: "Setup Steps",
        items: [
          "Enable flash bar and select page visibility checkboxes.",
          "Add multiple values in headline, offer, and countdown fields (press Enter to add chip).",
          "Set delay, duration, and interval.",
          "Set desktop/mobile position and animation style.",
          "Save and verify rotating combinations on storefront.",
        ],
      },
      {
        key: "settings",
        title: "All Settings Explanation",
        settings: [
          { name: "enabled", description: "Master on/off for flash bar." },
          { name: "messageTitle", description: "Primary headline text." },
          { name: "name", description: "Offer title or discount label." },
          { name: "messageText", description: "Urgency/countdown text." },
          { name: "messageTitlesJson/locationsJson/namesJson", description: "Multi-chip values rotated in runtime." },
          { name: "showType + visibility flags", description: "Page targeting rules (Home, Product, Collection, Cart)." },
          { name: "layout/template/imageAppearance", description: "Visual style and icon/image behavior." },
          { name: "fontFamily/fontWeight/rounded", description: "Typography and text-size control." },
          { name: "position/mobilePosition", description: "Desktop and mobile bar placement." },
          { name: "mobileSize", description: "Compact, comfortable, or large mobile size." },
          { name: "animation", description: "Fade, slide, bounce, or zoom." },
          { name: "iconKey/iconSvg", description: "Built-in SVG icon or custom uploaded icon." },
          { name: "bg/text/number/price colors", description: "Color controls for bar components." },
          { name: "firstDelaySeconds", description: "Delay before first bar display." },
          { name: "durationSeconds", description: "Display duration per item." },
          { name: "alternateSeconds + intervalUnit", description: "Gap between flash bar items." },
        ],
      },
      {
        key: "font",
        title: "Font Size And Typography Guide",
        items: [
          "Set rounded/text-size between 12 and 18 px for most themes.",
          "Use fontWeight 600 for headline-heavy flash bars.",
          "Keep countdown text slightly smaller than headline for hierarchy.",
          "If bar wraps to two lines too often, reduce size or shorten copy.",
        ],
      },
      {
        key: "content",
        title: "Ready Content Examples",
        items: [
          "Headline: Flash Sale | Weekend Deal | Limited Time Offer",
          "Offer: Extra 15% OFF | Buy 2 Get 1 | Free Shipping Over Rs. 999",
          "Countdown: ends in 02:15 hours | valid today | closes at 11:59 PM",
        ],
      },
    ],
  },
  {
    key: "visitor",
    title: "4) Visitor Popup",
    image: "/images/doc3.webp",
    alt: "Visitor popup",
    summary:
      "Visitor popup supports visitor_list and visitor_counter modes. It can use product, customer, rating, and timing data.",
    panels: [
      {
        key: "setup",
        title: "Setup Steps",
        items: [
          "Choose notiType: visitor_list or visitor_counter.",
          "Set message and timestamp text with token support.",
          "Configure data source blocks: product image, price tag, rating, customer info.",
          "Set visibility scopes for product and collection pages.",
          "Set behavior controls and save.",
        ],
      },
      {
        key: "settings",
        title: "All Settings Explanation",
        settings: [
          { name: "notiType", description: "visitor_list shows person style, visitor_counter shows live count style." },
          { name: "layout/size/transparent", description: "Popup structure, width scale, and background transparency." },
          { name: "template/imageAppearance", description: "Solid or gradient style and cover/contain image mode." },
          { name: "bgColor/bgAlt/textColor/timestampColor", description: "Primary popup visual colors." },
          { name: "priceTagBg/priceTagAlt/priceColor/starColor", description: "Price and rating color controls." },
          { name: "textSize.content/compareAt/price", description: "Three independent text size fields in px." },
          { name: "content.message", description: "Main message line with tokens." },
          { name: "content.timestamp", description: "Time label with token support." },
          { name: "content.avgTime + avgUnit", description: "Fallback average time values when needed." },
          { name: "productNameMode + productNameLimit", description: "Full or shortened product title control." },
          { name: "data.directProductPage", description: "Redirect popup click to product page." },
          { name: "data.showProductImage/showPriceTag/showRating", description: "Show or hide these UI blocks." },
          { name: "data.ratingSource/customerInfo", description: "Rating and customer data source behavior." },
          { name: "visibility flags + scopes + position", description: "Display rules by page and location." },
          { name: "behavior.showClose/hideOnMobile", description: "Close button and mobile visibility control." },
          { name: "behavior.delay/duration/interval/intervalUnit/randomize", description: "Timing and random interval behavior." },
          { name: "selectedDataProducts/selectedVisibilityProducts", description: "Product pools for data and visibility targeting." },
          { name: "selectedCollections", description: "Collection-level visibility filtering." },
        ],
      },
      {
        key: "font",
        title: "Font Size And Typography Guide",
        items: [
          "textSize.content: recommended 13 to 15 px.",
          "textSize.compareAt: keep 1 to 2 px smaller than content.",
          "textSize.price: keep equal or slightly bolder than content.",
          "Use productName half mode when titles are long.",
        ],
      },
      {
        key: "content",
        title: "Ready Content Examples",
        items: [
          "{full_name} from {country} just viewed this {product_name}",
          "{visitor_count} people are viewing {product_name} right now",
          "{first_name} from {city} checked {product_name}",
          "Timestamp: Just now | {time} {unit} ago",
        ],
      },
      {
        key: "tokens",
        title: "Supported Tokens",
        tokens: [
          "full_name",
          "first_name",
          "last_name",
          "product_name",
          "country",
          "city",
          "price",
          "visitor_count",
          "time",
          "unit",
        ],
      },
    ],
  },
  {
    key: "lowstock",
    title: "5) Low Stock Popup",
    image: "/images/doc4.webp",
    alt: "Low stock popup",
    summary:
      "Low stock popup creates urgency based on inventory threshold and product selection strategy.",
    panels: [
      {
        key: "setup",
        title: "Setup Steps",
        items: [
          "Select dataSource: shopify or manual.",
          "Set stockUnder threshold and hideOutOfStock option.",
          "Set content and style options.",
          "Configure page visibility and behavior timing.",
          "Save and test with low inventory products.",
        ],
      },
      {
        key: "settings",
        title: "All Settings Explanation",
        settings: [
          { name: "design.layout/size/transparent", description: "Popup shape, size, and transparency control." },
          { name: "design.template/imageAppearance", description: "Visual style and image fit." },
          { name: "design colors", description: "Background, text, number, price and star colors." },
          { name: "textSize.content/compareAt/price", description: "Font size controls in px." },
          { name: "content.message", description: "Main urgency message with token support." },
          { name: "productNameMode/productNameLimit", description: "Product title length behavior." },
          { name: "data.dataSource", description: "shopify uses store inventory, manual uses selected products." },
          { name: "data.stockUnder", description: "Only products below this quantity are eligible." },
          { name: "data.hideOutOfStock", description: "Exclude products with zero quantity." },
          { name: "data.directProductPage", description: "Popup click goes to product page." },
          { name: "data.showProductImage/showPriceTag/showRating", description: "Control visible product UI blocks." },
          { name: "visibility flags + scopes + position", description: "Per-page show logic and popup placement." },
          { name: "behavior.showClose/hideOnMobile", description: "Close icon and mobile visibility toggles." },
          { name: "behavior.delay/duration/interval/intervalUnit/randomize", description: "Timing flow for repeating popup." },
          { name: "selectedDataProducts", description: "Manual data source product list." },
          { name: "selectedVisibilityProducts", description: "Products eligible for display visibility." },
          { name: "selectedCollections", description: "Collection targeting support." },
        ],
      },
      {
        key: "font",
        title: "Font Size And Typography Guide",
        items: [
          "content text: 13 to 15 px recommended.",
          "compare-at price: 11 to 13 px for strike-through balance.",
          "price tag text: 12 to 14 px for clear CTA weight.",
          "Use stronger color contrast for stock_count visibility.",
        ],
      },
      {
        key: "content",
        title: "Ready Content Examples",
        items: [
          "{product_name} has only {stock_count} items left in stock",
          "Hurry! only {stock_count} left for {product_name}",
          "Almost sold out: {product_name} stock is {stock_count}",
        ],
      },
      {
        key: "tokens",
        title: "Supported Tokens",
        tokens: [
          "full_name",
          "first_name",
          "last_name",
          "country",
          "city",
          "product_name",
          "product_price",
          "stock_count",
          "time",
          "unit",
        ],
      },
    ],
  },
  {
    key: "addtocart",
    title: "6) Add To Cart Notification",
    image: "/images/doc5.webp",
    alt: "Add to cart popup",
    summary:
      "Add to cart popup displays cart activity using Shopify or manual data flows with customer identity support.",
    panels: [
      {
        key: "setup",
        title: "Setup Steps",
        items: [
          "Set dataSource and customerInfo source.",
          "Prepare content message and timestamp.",
          "Configure style, text size, and product visibility options.",
          "Set page targeting and position.",
          "Set behavior timing and save.",
        ],
      },
      {
        key: "settings",
        title: "All Settings Explanation",
        settings: [
          { name: "design.layout/size/transparent", description: "Layout structure and popup sizing controls." },
          { name: "design.template/imageAppearance", description: "Color style and image fit options." },
          { name: "design colors", description: "Background, text, timestamp, price, and star colors." },
          { name: "textSize.content/compareAt/price", description: "Three px-level font size controls." },
          { name: "content.message", description: "Main add-to-cart statement with tokens." },
          { name: "content.timestamp", description: "Elapsed-time label with token support." },
          { name: "content.avgTime/avgUnit", description: "Fallback relative time values." },
          { name: "productNameMode/productNameLimit", description: "Full vs shortened product title display." },
          { name: "data.dataSource", description: "shopify or manual product source." },
          { name: "data.customerInfo", description: "Customer identity source behavior." },
          { name: "data.directProductPage", description: "Click-through to product page." },
          { name: "data.showProductImage/showPriceTag/showRating", description: "Control visibility of product info blocks." },
          { name: "visibility flags + scopes + position", description: "Page targeting and popup position." },
          { name: "behavior.showClose/hideOnMobile", description: "Close icon and mobile visibility controls." },
          { name: "behavior.delay/duration/interval/intervalUnit/randomize", description: "Popup frequency settings." },
          { name: "selectedDataProducts/selectedVisibilityProducts", description: "Product targeting lists." },
          { name: "selectedCollections", description: "Collection filtering in visibility scope." },
        ],
      },
      {
        key: "font",
        title: "Font Size And Typography Guide",
        items: [
          "textSize.content: 13 to 15 px keeps message clean.",
          "textSize.compareAt: keep smaller than active price.",
          "textSize.price: use same or slightly larger than content for emphasis.",
          "Use medium to bold weight for customer name readability.",
        ],
      },
      {
        key: "content",
        title: "Ready Content Examples",
        items: [
          "{full_name} from {country} added {product_name} to cart",
          "{first_name} added {product_name} to cart",
          "{full_name} just added this item",
          "Timestamp: {time} {unit} ago",
        ],
      },
      {
        key: "tokens",
        title: "Supported Tokens",
        tokens: [
          "full_name",
          "first_name",
          "last_name",
          "country",
          "city",
          "product_name",
          "product_price",
          "time",
          "unit",
        ],
      },
    ],
  },
  {
    key: "review",
    title: "7) Review Notification",
    image: "/images/document.jpeg",
    alt: "Review popup",
    summary:
      "Review popup shows product reviews from Judge.me/CSV flow with review-specific token support.",
    panels: [
      {
        key: "setup",
        title: "Setup Steps",
        items: [
          "Choose reviewType (review_content or new_review).",
          "Set dataSource (judge_me or csv).",
          "Write review message and timestamp using review tokens.",
          "Configure product/collection visibility scope.",
          "Set behavior timing and save.",
        ],
      },
      {
        key: "settings",
        title: "All Settings Explanation",
        settings: [
          { name: "design.reviewType", description: "Controls review style variant." },
          { name: "design.template/imageAppearance", description: "Theme and image rendering mode." },
          { name: "design colors", description: "Background, text, timestamp, price and rating colors." },
          { name: "textSize.content/compareAt/price", description: "Font sizing controls in px." },
          { name: "content.message", description: "Review body line with reviewer tokens." },
          { name: "content.timestamp", description: "Usually mapped with review_date token." },
          { name: "productNameMode/productNameLimit", description: "Product title length handling." },
          { name: "data.dataSource", description: "judge_me live flow or csv-based flow." },
          { name: "data.directProductPage", description: "Click action for popup." },
          { name: "data.showProductImage/showPriceTag/showRating", description: "Show/hide visual blocks." },
          { name: "visibility flags + scopes + position", description: "Page-wise targeting and placement." },
          { name: "behavior.showClose/hideOnMobile", description: "Close control and mobile suppression." },
          { name: "behavior.delay/duration/interval/intervalUnit/randomize", description: "Display cadence controls." },
          { name: "selectedProducts/selectedCollections", description: "Scope-limited product and collection selection." },
        ],
      },
      {
        key: "font",
        title: "Font Size And Typography Guide",
        items: [
          "content text: 13 to 15 px recommended.",
          "price text: 12 to 14 px for clean price hierarchy.",
          "compare-at text: 11 to 13 px with strike-through styling.",
          "For long review text, keep font size moderate and use concise templates.",
        ],
      },
      {
        key: "content",
        title: "Ready Content Examples",
        items: [
          '{reviewer_name} - "{review_title}: {review_body}"',
          "{reviewer_name} from {reviewer_country} reviewed this product",
          "Great feedback from {reviewer_name} on {product_name}",
          "Timestamp: {review_date}",
        ],
      },
      {
        key: "tokens",
        title: "Supported Tokens",
        tokens: [
          "reviewer_name",
          "review_title",
          "review_body",
          "reviewer_country",
          "reviewer_city",
          "review_date",
        ],
      },
    ],
  },
];

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  alignItems: "center",
};

const imageWrapStyle = {
  width: "100%",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid #e3e3e3",
};

const imageStyle = {
  width: "100%",
  height: "auto",
  display: "block",
};

const listStyle = {
  margin: "0 0 0 18px",
  lineHeight: "1.7",
};

const panelStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "10px 12px",
  background: "#ffffff",
};

const panelContentStyle = {
  paddingTop: "8px",
};

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

function renderList(items = []) {
  if (!items.length) return null;
  return (
    <ul style={listStyle}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function renderSettingList(settings = []) {
  if (!settings.length) return null;
  return (
    <ul style={listStyle}>
      {settings.map((item, index) => (
        <li key={`${item.name}-${index}`}>
          <strong>{item.name}:</strong> {item.description}
        </li>
      ))}
    </ul>
  );
}

function renderTokens(tokens = []) {
  if (!tokens.length) return null;
  return (
    <InlineStack gap="200" wrap>
      {tokens.map((token) => (
        <code
          key={token}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 8,
            padding: "4px 8px",
            background: "#f9fafb",
          }}
        >
          {`{${token}}`}
        </code>
      ))}
    </InlineStack>
  );
}

export default function DocumentsPage() {
  const [activeSection, setActiveSection] = useState(DOC_SECTIONS[0].key);
  const [activePanels, setActivePanels] = useState(() =>
    DOC_SECTIONS.reduce((acc, section) => {
      acc[section.key] = section.panels?.[0]?.key || null;
      return acc;
    }, {})
  );

  const toggleSection = (sectionKey) => {
    setActiveSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const togglePanel = (sectionKey, panelKey) => {
    setActivePanels((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey] === panelKey ? null : panelKey,
    }));
  };

  return (
    <Page fullWidth title="Popup Documents">
      <TitleBar title="Popup Documents" />
      <div style={{ padding: 24 }}>
        <Card>
          <BlockStack gap="500">
            <Text as="h1" variant="headingLg">
              Fomoify Popup Settings Documentation (Accordion)
            </Text>
            <Text as="p" variant="bodyLg">
              Every popup section now includes accordion panels for setup flow, all settings explanation, font size guide, and content templates.
            </Text>

            {DOC_SECTIONS.map((section) => {
              const sectionOpen = activeSection === section.key;
              return (
                <BlockStack key={section.key} gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingMd">
                      {section.title}
                    </Text>
                    <Button variant="plain" onClick={() => toggleSection(section.key)}>
                      {sectionOpen ? "Hide" : "Show"}
                    </Button>
                  </InlineStack>

                  <Collapsible open={sectionOpen}>
                    <BlockStack gap="300">
                      <div style={gridStyle}>
                        <div style={imageWrapStyle}>
                          <img
                            src={section.image}
                            alt={section.alt}
                            style={imageStyle}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div>
                          <Text as="p" variant="bodyMd">
                            {section.summary}
                          </Text>
                        </div>
                      </div>

                      <BlockStack gap="200">
                        {section.panels.map((panel) => {
                          const panelOpen = activePanels[section.key] === panel.key;
                          return (
                            <div key={`${section.key}-${panel.key}`} style={panelStyle}>
                              <InlineStack align="space-between" blockAlign="center">
                                <Text as="h4" variant="headingSm">
                                  {panel.title}
                                </Text>
                                <Button
                                  variant="plain"
                                  onClick={() => togglePanel(section.key, panel.key)}
                                >
                                  {panelOpen ? "Hide" : "Show"}
                                </Button>
                              </InlineStack>
                              <Collapsible open={panelOpen}>
                                <div style={panelContentStyle}>
                                  {renderList(panel.items)}
                                  {renderSettingList(panel.settings)}
                                  {renderTokens(panel.tokens)}
                                </div>
                              </Collapsible>
                            </div>
                          );
                        })}
                      </BlockStack>
                    </BlockStack>
                  </Collapsible>
                </BlockStack>
              );
            })}

            <Text as="p" variant="bodySm" tone="subdued">
              Copyright {new Date().getFullYear()} Fomoify. Keep message quality, font readability, and timing balance consistent across all popup types.
            </Text>
          </BlockStack>
        </Card>
      </div>

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
