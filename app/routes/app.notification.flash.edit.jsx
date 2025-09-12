// app/routes/app.notification.flash.edit.jsx
import React, { useMemo, useState } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, Frame, Toast, Loading, Layout, Tag
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

/** ---------- CONST ---------- */
const KEY = "flash";
const pageOptions = [
  { label: "All Pages", value: "allpage" },
  { label: "Home Page", value: "home" },
  { label: "Product Page", value: "product" },
  { label: "Collection Page", value: "collection" },
  { label: "Pages", value: "pages" },
  { label: "Cart Page", value: "cart" },
];
const svgOptions = [
  { label: "Reshot", value: "reshot" },
  { label: "Reshot Flash", value: "reshotFlash" },
  { label: "Reshot Flash On", value: "reshotflashon" },
  { label: "Deadline", value: "deadline" },
];

/** ---------- helper ---------- */
const arr = (s) => { try { const v = JSON.parse(s||"[]"); return Array.isArray(v)?v:[]; } catch { return []; } };

/** ---------- LOADER ---------- */
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  const row = await prisma.notificationConfig.findFirst({
    where: { shop, key: KEY },
    orderBy: { id: "desc" },
    select: {
      id: true, enabled: true, showType: true,
      messageTitlesJson: true, locationsJson: true, namesJson: true,
      messageText: true, fontFamily: true, fontWeight: true, position: true, animation: true,
      mobileSize: true, mobilePositionJson: true,
      titleColor: true, bgColor: true, msgColor: true, rounded: true,
      durationSeconds: true, alternateSeconds: true, iconKey: true, ctaBgColor: true,
    }
  });

  const defaults = {
    id: null,
    enabled: ["enabled"],
    showType: "allpage",
    titlesList: ["Flash Sale"],
    locationsList: ["Flash Sale: 20% OFF"],
    namesList: ["ends in 02:15 hours"],
    messageText: "ends in 02:15 hours",
    fontFamily: "System",
    fontWeight: "600",
    position: "top-right",
    animation: "slide",
    mobileSize: "compact",
    mobilePosition: ["top"],
    titleColor: "#111111",
    bgColor: "#FFF8E1",
    msgColor: "#111111",
    rounded: 14,
    durationSeconds: 10,
    alternateSeconds: 5,
    iconKey: "reshot",
    ctaBgColor: null,
  };

  if (!row) {
    return json({ key: KEY, title: "Flash Sale Bars", data: defaults });
  }

  const data = {
    id: row.id,
    enabled: row.enabled ? ["enabled"] : ["disabled"],
    showType: row.showType ?? defaults.showType,
    titlesList: arr(row.messageTitlesJson),
    locationsList: arr(row.locationsJson),
    namesList: arr(row.namesJson),
    messageText: row.messageText ?? defaults.messageText,
    fontFamily: row.fontFamily ?? defaults.fontFamily,
    fontWeight: String(row.fontWeight ?? defaults.fontWeight),
    position: row.position ?? defaults.position,
    animation: row.animation ?? defaults.animation,
    mobileSize: row.mobileSize ?? defaults.mobileSize,
    mobilePosition: (() => {
      try {
        const mp = JSON.parse(row.mobilePositionJson || "[]");
        return Array.isArray(mp) && mp.length ? mp : defaults.mobilePosition;
      } catch { return defaults.mobilePosition; }
    })(),
    titleColor: row.titleColor ?? defaults.titleColor,
    bgColor: row.bgColor ?? defaults.bgColor,
    msgColor: row.msgColor ?? defaults.msgColor,
    rounded: row.rounded ?? defaults.rounded,
    durationSeconds: row.durationSeconds ?? defaults.durationSeconds,
    alternateSeconds: row.alternateSeconds ?? defaults.alternateSeconds,
    iconKey: row.iconKey ?? defaults.iconKey,
    ctaBgColor: row.ctaBgColor ?? defaults.ctaBgColor,
  };

  return json({ key: KEY, title: "Flash Sale Bars", data });
}

/** ---------- ACTION ---------- */
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  const { form } = await request.json();

  const titles = Array.isArray(form.titlesList) ? form.titlesList : [];
  const locs   = Array.isArray(form.locationsList) ? form.locationsList : [];
  const names  = Array.isArray(form.namesList) ? form.namesList : [];

  if (!(titles.length && titles.length===locs.length && locs.length===names.length)) {
    return json({ success:false, message:`Counts must match. Now ${titles.length}/${locs.length}/${names.length}` }, { status: 400 });
  }

  const existing = await prisma.notificationConfig.findFirst({
    where: { shop, key: KEY },
    orderBy: { id: "desc" },
    select: { id: true }
  });

  const data = {
    shop, key: KEY,
    enabled: !!(form.enabled||[]).includes("enabled"),
    showType: form.showType ?? null,

    messageTitlesJson: JSON.stringify(titles),
    locationsJson: JSON.stringify(locs),
    namesJson: JSON.stringify(names),
    selectedProductsJson: null,
    mobilePositionJson: JSON.stringify(Array.isArray(form.mobilePosition) ? form.mobilePosition : ["top"]),

    messageText: form.messageText ?? names[0] ?? null,
    fontFamily: form.fontFamily ?? null,
    fontWeight: form.fontWeight != null ? Number(form.fontWeight) : null,
    position: form.position ?? null,
    animation: form.animation ?? null,
    mobileSize: form.mobileSize ?? null,
    titleColor: form.titleColor ?? null,
    bgColor: form.bgColor ?? null,
    msgColor: form.msgColor ?? null,
    ctaBgColor: form.ctaBgColor ?? null,
    rounded: form.rounded != null ? Number(form.rounded) : null,
    durationSeconds: form.durationSeconds != null ? Number(form.durationSeconds) : null,
    alternateSeconds: form.alternateSeconds != null ? Number(form.alternateSeconds) : null,
    iconKey: form.iconKey ?? null,
    iconSvg: null,
  };

  if (existing?.id) {
    await prisma.notificationConfig.update({ where: { id: existing.id }, data });
  } else {
    await prisma.notificationConfig.create({ data });
  }

  return json({ success:true });
}

/** ---------- token input ---------- */
function TokenInput({ label, items, setItems, placeholder }) {
  const [draft, setDraft] = useState("");
  return (
    <BlockStack gap="150">
      <div
        onKeyDownCapture={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const parts = draft.split(",").map(s=>s.trim()).filter(Boolean);
            if (parts.length) setItems(prev => [...prev, ...parts]);
            setDraft("");
          }
        }}
      >
        <TextField
          label={label}
          value={draft}
          onChange={setDraft}
          onBlur={() => {
            const parts = draft.split(",").map(s=>s.trim()).filter(Boolean);
            if (parts.length) setItems(prev => [...prev, ...parts]);
            setDraft("");
          }}
          autoComplete="off"
          placeholder={placeholder}
        />
      </div>
      <InlineStack gap="150" wrap>
        {items.map((t, i) => (
          <Tag key={`${t}-${i}`} onRemove={() => setItems(prev => prev.filter((_,idx)=>idx!==i))}>
            {t}
          </Tag>
        ))}
      </InlineStack>
    </BlockStack>
  );
}

/** ---------- PAGE ---------- */
export default function FlashEditPage() {
  const { title, data } = useLoaderData();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, error: false, msg: "" });

  const [enabled, setEnabled] = useState(data.enabled);
  const [showType, setShowType] = useState(data.showType);

  const [titlesList, setTitlesList] = useState(data.titlesList);
  const [locationsList, setLocationsList] = useState(data.locationsList);
  const [namesList, setNamesList] = useState(data.namesList);

  const [messageText, setMessageText] = useState(data.messageText);
  const [fontFamily, setFontFamily] = useState(data.fontFamily);
  const [fontWeight, setFontWeight] = useState(data.fontWeight);
  const [position, setPosition] = useState(data.position);
  const [animation, setAnimation] = useState(data.animation);
  const [mobileSize, setMobileSize] = useState(data.mobileSize);
  const [mobilePosition, setMobilePosition] = useState(data.mobilePosition);
  const [titleColor, setTitleColor] = useState(data.titleColor);
  const [bgColor, setBgColor] = useState(data.bgColor);
  const [msgColor, setMsgColor] = useState(data.msgColor);
  const [rounded, setRounded] = useState(String(data.rounded));
  const [durationSeconds, setDurationSeconds] = useState(String(data.durationSeconds));
  const [alternateSeconds, setAlternateSeconds] = useState(String(data.alternateSeconds));
  const [iconKey, setIconKey] = useState(data.iconKey);

  const countsMatch = useMemo(() =>
    titlesList.length && titlesList.length === locationsList.length &&
    locationsList.length === namesList.length, [titlesList, locationsList, namesList]
  );

  const save = async () => {
    try {
      if (!countsMatch) {
        setToast({ open: true, error: true, msg: "Counts must match (Banner Title / Notification Name / Banner Text)." });
        return;
      }
      setSaving(true);
      const form = {
        enabled, showType,
        titlesList, locationsList, namesList,
        messageText, fontFamily, fontWeight, position, animation,
        mobileSize, mobilePosition, titleColor, bgColor, msgColor,
        rounded, durationSeconds, alternateSeconds, iconKey,
        ctaBgColor: null,
      };
      const res = await fetch("/app/notification/flash/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ form }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Save failed");
      setToast({ open: true, error: false, msg: "Saved" });
      setTimeout(() => navigate("/app/dashboard"), 600);
    } catch (e) {
      setToast({ open: true, error: true, msg: String(e.message || e) });
    } finally { setSaving(false); }
  };

  return (
    <Frame>
      {saving && <Loading />}
      <Page
        title={`Edit – ${title}`}
        backAction={{ content: "Back", onAction: () => navigate("/app/dashboard") }}
        primaryAction={{ content: "Save", onAction: save, loading: saving, disabled: saving }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Display</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <ChoiceList
                        title="Show Popup"
                        alignment="horizontal"
                        selected={enabled}
                        onChange={setEnabled}
                        choices={[{ label: "Enabled", value: "enabled" }, { label: "Disabled", value: "disabled" }]}
                      />
                    </Box>
                    <Box width="50%">
                      <Select label="Show Type" options={pageOptions} value={showType} onChange={setShowType} />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="350">
                  <Text as="h3" variant="headingMd">Message (multi)</Text>
                  <TokenInput
                    label="Banner Title (multiple)"
                    items={titlesList}
                    setItems={setTitlesList}
                    placeholder="Flash Sale, Flash Sale 2 … (Enter)"
                  />
                  <TokenInput
                    label="Notification Name (multiple)"
                    items={locationsList}
                    setItems={setLocationsList}
                    placeholder="Flash Sale 10% OFF, Flash Sale 20% OFF … (Enter)"
                  />
                  <TokenInput
                    label="Banner Text (multiple)"
                    items={namesList}
                    setItems={setNamesList}
                    placeholder="ends in 01:15 hours, ends in 02:15 hours … (Enter)"
                  />
                  <TextField
                    label="Message Body (fallback)"
                    value={messageText}
                    onChange={setMessageText}
                    autoComplete="off"
                  />
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="350">
                  <Text as="h3" variant="headingMd">Style</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><TextField label="Title Color" value={titleColor} onChange={setTitleColor} /></Box>
                    <Box width="50%"><TextField label="Background Color" value={bgColor} onChange={setBgColor} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><TextField label="Message Color" value={msgColor} onChange={setMsgColor} /></Box>
                    <Box width="50%"><TextField label="Font Family" value={fontFamily} onChange={setFontFamily} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><TextField type="number" label="Font Weight" value={fontWeight} onChange={setFontWeight} /></Box>
                    <Box width="50%"><TextField type="number" label="Font Size (px)" value={rounded} onChange={setRounded} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><TextField type="number" label="Display seconds" value={durationSeconds} onChange={setDurationSeconds} /></Box>
                    <Box width="50%"><TextField type="number" label="Alternate seconds" value={alternateSeconds} onChange={setAlternateSeconds} /></Box>
                  </InlineStack>

                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <Select
                        label="Mobile Position"
                        options={[{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]}
                        value={Array.isArray(mobilePosition) ? (mobilePosition[0] || "top") : mobilePosition}
                        onChange={(v) => setMobilePosition([v])}
                      />
                    </Box>
                    <Box width="50%">
                      <Select
                        label="Icon"
                        options={svgOptions}
                        value={iconKey}
                        onChange={setIconKey}
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>

      {toast.open && (
        <Toast content={toast.msg} error={toast.error} onDismiss={() => setToast(t => ({ ...t, open: false }))} duration={2000} />
      )}
    </Frame>
  );
}
