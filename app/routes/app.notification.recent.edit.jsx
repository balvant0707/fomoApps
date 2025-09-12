// app/routes/app.notification.recent.edit.jsx
import React, {useMemo, useState, useEffect, useCallback} from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, Frame, Loading, Layout,
  Modal, IndexTable, Thumbnail, Badge, Pagination, Divider, Icon,
  Tag, Popover, ColorPicker, ButtonGroup
} from "@shopify/polaris";
import {SearchIcon} from "@shopify/polaris-icons";
import {useLoaderData, useNavigate, useFetcher, Form, useNavigation} from "@remix-run/react";
import {json, redirect, createCookie} from "@remix-run/node";
import {authenticate} from "../shopify.server";
import {prisma} from "../db.server";

/* ───────────────── constants ──────────────── */
const KEY = "recent";
const PAGES = [
  { label: "All Pages", value: "allpage" },
  { label: "Home Page", value: "home" },
  { label: "Product Page", value: "product" },
  { label: "Collection Page", value: "collection" },
  { label: "Pages", value: "pages" },
  { label: "Cart Page", value: "cart" },
];

/* ───────────────── helpers ──────────────── */
const parseArr = (s) => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const toJson  = (a) => JSON.stringify(Array.isArray(a) ? a : []);
const nullIfBlank = (v) => (v == null || String(v).trim() === "" ? null : String(v));
const intOrNull = (v, min=null, max=null) => {
  if (v == null || String(v).trim() === "") return null;
  let n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (min != null) n = Math.max(min, n);
  if (max != null) n = Math.min(max, n);
  return n;
};

/** Preserve Shopify Admin params across redirects (prevents "Shop domain" login box) */
function redirectWithAdminParams(request, pathname, headers) {
  const url = new URL(request.url);
  const dest = new URL(pathname, url.origin);
  const host = url.searchParams.get("host");
  const shop = url.searchParams.get("shop");
  const embedded = url.searchParams.get("embedded");
  if (host) dest.searchParams.set("host", host);
  if (shop) dest.searchParams.set("shop", shop);
  if (embedded) dest.searchParams.set("embedded", embedded);
  return redirect(dest.toString(), headers ? { headers } : undefined);
}

// cookie to carry edit-id (URL clean)
const editCookie = createCookie(`editId_${KEY}`, {
  path: `/app/notification/${KEY}`,
  httpOnly: true,
  sameSite: "none",
  secure: true,
  maxAge: 60 * 15,
});

/* ───────────────── loader ──────────────── */
export async function loader({request}) {
  const {session} = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", {status: 401});

  const url = new URL(request.url);
  const cookieHeader = request.headers.get("Cookie");
  let editId = await editCookie.parse(cookieHeader);

  // Allow deep-link via ?rid=123 and then clean-redirect (preserving admin params)
  if (!editId) {
    const rid = Number(url.searchParams.get("rid"));
    if (Number.isFinite(rid) && rid > 0) {
      const probe = await prisma.notificationConfig.findFirst({
        where: { id: rid, shop, key: KEY },
        select: { id: true },
      });
      if (probe) {
        const headers = new Headers();
        headers.append("Set-Cookie", await editCookie.serialize(rid));
        return redirectWithAdminParams(request, `/app/notification/${KEY}/edit`, headers);
      }
    }
  }

  if (!editId) {
    return json({
      ok: false,
      reason: "missing-id",
      message: "Dashboard māthī Edit dabāvo, athvā URL par ?rid=ID aapo.",
    });
  }

  const row = await prisma.notificationConfig.findFirst({
    where: { id: Number(editId), shop, key: KEY },
  });

  if (!row) {
    return json({
      ok: false,
      reason: "not-found",
      message: "Record nathi mālyo (shop/key/id mismatch).",
    });
  }

  const data = {
    id: row.id,
    key: KEY,
    enabled: row.enabled ? ["enabled"] : ["disabled"],
    showType: row.showType ?? "allpage",

    messageTitles: parseArr(row.messageTitlesJson),
    locations: parseArr(row.locationsJson),
    names: parseArr(row.namesJson),
    selectedProducts: parseArr(row.selectedProductsJson), // handles

    messageText: row.messageText ?? "bought this product recently",
    fontFamily: row.fontFamily ?? "System",
    position: row.position ?? "bottom-left",
    animation: row.animation ?? "fade",
    mobileSize: row.mobileSize ?? "compact",
    mobilePosition: (() => {
      try { const v = JSON.parse(row.mobilePositionJson || "null"); if (Array.isArray(v)) return v; } catch {}
      return row.mobilePositionJson ? [String(row.mobilePositionJson)] : ["bottom"];
    })(),

    titleColor: row.titleColor ?? "#6E62FF",
    bgColor: row.bgColor ?? "#FFFFFF",
    msgColor: row.msgColor ?? "#111111",
    ctaBgColor: row.ctaBgColor ?? "#244E89",

    rounded: row.rounded ?? 14,
    durationSeconds: row.durationSeconds ?? 8,
    alternateSeconds: row.alternateSeconds ?? 10,
    fontWeight: row.fontWeight ?? 600,

    iconKey: row.iconKey ?? "",
    iconSvg: row.iconSvg ?? "",
  };

  return json({ ok: true, data, pageTitle: "Recent Purchases" });
}

/* ───────────────── action ──────────────── */
export async function action({request}) {
  const {session} = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", {status: 401});

  const cookieHeader = request.headers.get("Cookie");
  const form = await request.formData();
  const intent = form.get("_action");

  // Dashboard → Edit (set cookie + redirect, preserving admin params)
  if (intent === "start") {
    const id = Number(form.get("id"));
    if (!id) throw new Response("Bad id", {status: 400});
    const exists = await prisma.notificationConfig.findFirst({
      where: { id, shop, key: KEY }, select: { id: true }
    });
    if (!exists) return json({ ok:false, message:"Record not found." }, { status:404 });

    const headers = new Headers();
    headers.append("Set-Cookie", await editCookie.serialize(id));
    return redirectWithAdminParams(request, `/app/notification/${KEY}/edit`, headers);
  }

  // Save
  if (intent === "save") {
    const editId = await editCookie.parse(cookieHeader);
    if (!editId) throw new Response("Missing edit id", {status: 400});

    const enabled = form.get("enabled") === "enabled";
    const showType = form.get("showType")?.toString() || "allpage";
    const messageText = form.get("messageText")?.toString() || "";

    const messageTitles   = form.getAll("messageTitles").map(s => String(s).trim()).filter(Boolean);
    const locations       = form.getAll("locations").map(s => String(s).trim()).filter(Boolean);
    const names           = form.getAll("names").map(s => String(s).trim()).filter(Boolean);
    const selectedProducts= form.getAll("selectedProducts").map(s => String(s).trim()).filter(Boolean);

    if (!(messageTitles.length && messageTitles.length === locations.length && locations.length === names.length)) {
      return json({ok:false, message:"Counts must match (names/locations/times)."}, {status:400});
    }

    const payload = {
      enabled,
      showType,
      messageText,

      messageTitlesJson: toJson(messageTitles),
      locationsJson: toJson(locations),
      namesJson: toJson(names),
      selectedProductsJson: selectedProducts.length ? JSON.stringify(selectedProducts) : null,

      fontFamily: nullIfBlank(form.get("fontFamily")),
      position: nullIfBlank(form.get("position")),
      animation: nullIfBlank(form.get("animation")),
      mobileSize: nullIfBlank(form.get("mobileSize")),
      mobilePositionJson: JSON.stringify(form.getAll("mobilePosition")),

      titleColor: nullIfBlank(form.get("titleColor")),
      bgColor: nullIfBlank(form.get("bgColor")),
      msgColor: nullIfBlank(form.get("msgColor")),
      ctaBgColor: nullIfBlank(form.get("ctaBgColor")),

      rounded: intOrNull(form.get("rounded"), 10, 72),
      durationSeconds: intOrNull(form.get("durationSeconds"), 1, 60),
      alternateSeconds: intOrNull(form.get("alternateSeconds"), 0, 3600),
      fontWeight: intOrNull(form.get("fontWeight"), 100, 900),

      iconKey: nullIfBlank(form.get("iconKey")),
      iconSvg: nullIfBlank(form.get("iconSvg")),
    };

    await prisma.notificationConfig.update({
      where: { id: Number(editId) },
      data: payload,
    });

    return json({ok:true});
  }

  return json({ok:false, message:"Unknown action"}, {status:400});
}

/* ───────────────── ColorInput ──────────────── */
const hex6 = (v) => /^#[0-9A-F]{6}$/i.test(String(v || ""));
function hexToRgb(hex){const c=hex.replace("#","");const n=parseInt(c,16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255}}
function rgbToHsv({r,g,b}){r/=255;g/=255;b/=255;const m=Math.max(r,g,b),n=Math.min(r,g,b),d=m-n;let h=0;if(d){switch(m){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h*=60}const s=m?d/m:0;return{hue:h,saturation:s,brightness:m}}
function hsvToRgb({hue:h,saturation:s,brightness:v}){const c=v*s,x=c*(1-Math.abs(((h/60)%2)-1)),m=v-c;let R=0,G=0,B=0;if(0<=h&&h<60)[R,G,B]=[c,x,0];else if(60<=h&&h<120)[R,G,B]=[x,c,0];else if(120<=h&&h<180)[R,G,B]=[0,c,x];else if(180<=h&&h<240)[R,G,B]=[0,x,c];else[R,G,B]=[x,0,c];return{r:Math.round((R+m)*255),g:Math.round((G+m)*255),b:Math.round((B+m)*255)}}
const rgbToHex = ({r,g,b})=>`#${[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")}`.toUpperCase();
const hexToHSB=(hex)=>rgbToHsv(hexToRgb(hex)); const hsbToHEX=(hsb)=>rgbToHex(hsvToRgb(hsb));

function ColorInput({label, value, onChange, placeholder="#244E89"}) {
  const [open,setOpen]=useState(false);
  const [hsb,setHsb]=useState(hex6(value)?hexToHSB(value):{hue:212,saturation:0.7,brightness:0.55});
  useEffect(()=>{ if(hex6(value)) setHsb(hexToHSB(value)); },[value]);

  const swatch=(<div onClick={()=>setOpen(true)} style={{width:28,height:28,borderRadius:10,cursor:"pointer",border:"1px solid rgba(0,0,0,0.08)",background:hex6(value)?value:"#ffffff"}} />);

  return (
    <Popover active={open} onClose={()=>setOpen(false)} preferredAlignment="right"
      activator={
        <TextField label={label} value={value} onChange={(v)=>{const next=v.toUpperCase();onChange(next);if(hex6(next))setHsb(hexToHSB(next));}}
          autoComplete="off" placeholder={placeholder} suffix={swatch} onFocus={()=>setOpen(true)} />
      }>
      <Box padding="300" minWidth="260px">
        <ColorPicker color={hsb} onChange={(c)=>{setHsb(c);onChange(hsbToHEX(c));}} allowAlpha={false}/>
      </Box>
    </Popover>
  );
}

/* ───────────────── token helper ──────────────── */
function useTokenInput(listKey, form, setForm) {
  const [draft,setDraft]=useState("");
  const add = useCallback((val)=>{
    const v=String(val||"").trim(); if(!v) return;
    setForm(f=>{ const arr=[...(f[listKey]||[])]; if(!arr.includes(v)) arr.push(v); return {...f,[listKey]:arr}; });
  },[listKey,setForm]);
  const removeAt = useCallback((idx)=>{
    setForm(f=>{ const arr=[...(f[listKey]||[])]; arr.splice(idx,1); return {...f,[listKey]:arr}; });
  },[listKey,setForm]);
  const onChange = useCallback((v)=>setDraft(v),[]);
  const commitDraft = useCallback(()=>{
    const parts=String(draft).split(",").map(p=>p.trim()).filter(Boolean);
    if(parts.length) parts.forEach(add);
    setDraft("");
  },[draft,add]);
  return {draft,setDraft,add,removeAt,onChange,commitDraft};
}

/* ───────────────── preview ──────────────── */
const mobileSizeToWidth = (size)=> (size==="compact"?300:size==="large"?360:330);
const mobileSizeScale = (size)=> (size==="compact"?0.92:size==="large"?1.06:1);
const posToFlex = (pos)=>({
  justifyContent: ["top-left","top-right"].includes(pos) ? "flex-start":"flex-start",
  alignItems:    pos?.includes("top") ? "flex-start":"flex-end",
});
const mobilePosToFlex = (pos)=>({justifyContent:"center", alignItems: pos==="top"?"flex-start":"flex-end"});
const getAnimationStyle = (a)=> a==="slide"
  ? { transform:"translateY(8px)", animation:"notif-slide-in 240ms ease-out"}
  : a==="bounce" ? { animation:"notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" }
  : a==="zoom"   ? { transform:"scale(0.96)", animation:"notif-zoom-in 200ms ease-out forwards" }
  : { opacity:0, animation:"notif-fade-in 220ms ease-out forwards" };

function NotificationBubble({form,isMobile=false,drafts={}}){
  const animStyle = useMemo(()=>getAnimationStyle(form.animation),[form.animation]);
  const firstTitle=(form?.messageTitles||[])[0] || "Someone";
  const firstLoc  =(form?.locations||[])[0]      || "Ahmedabad Gujarat";
  const firstName =(form?.names||[])[0]          || "12 hours ago";

  const displayTitle = (drafts.title||"").trim() || firstTitle;
  const displayLoc   = (drafts.location||"").trim() || firstLoc;
  const displayName  = (drafts.name||"").trim() || firstName;

  const base = Number(form?.rounded ?? 14) || 14;
  const size = Math.max(10, Math.min(28, Math.round(base * (isMobile?mobileSizeScale(form?.mobileSize):1))));

  return (
    <div style={{
      display:"flex",alignItems:"center",gap:"0.5rem",
      fontFamily: form?.fontFamily==="System" ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" : form?.fontFamily,
      background:form?.bgColor,color:form?.msgColor,borderRadius:14,
      boxShadow:"0 8px 24px rgba(0,0,0,0.12)",padding:10,border:"1px solid rgba(17,24,39,0.06)",
      maxWidth:isMobile?mobileSizeToWidth(form?.mobileSize):560, ...animStyle
    }}>
      <div style={{width:60,height:60,borderRadius:6,background:"#f4f4f5",display:'grid',placeItems:'center',color:'#111'}}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 7L12 2L21 7V17L12 22L3 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
      </div>
      <div>
        <p style={{margin:0}}>
          <span style={{margin:0,marginBottom:6,color:form?.titleColor,fontSize:size,fontWeight:Number(form?.fontWeight)||600,lineHeight:1.2}}>{displayTitle}</span>
          <span style={{fontSize:size}}>{" "}from</span>
          <span style={{margin:0,marginBottom:6,color:form?.titleColor,fontSize:size,fontWeight:Number(form?.fontWeight)||600,lineHeight:1.2}}> {" "}{displayLoc}</span><br/>
          <span style={{margin:0,fontSize:size}}>{form?.messageText || "bought this product recently"}</span><br/>
          <span style={{fontSize:size,opacity:0.9,display:'block',textAlign:'end'}}><small>{displayName}</small></span>
        </p>
      </div>
    </div>
  );
}

function DesktopPreview({form,drafts}) {
  const flex = posToFlex(form?.position);
  return (
    <div style={{width:"100%",maxWidth:900,minHeight:320,height:400,borderRadius:12,border:"1px solid #e5e7eb",
      background:"linear-gradient(180deg,#fafafa 0%,#f5f5f5 100%)",overflow:"hidden",position:"relative",display:"flex",padding:18,boxSizing:"border-box",...flex}}>
      <NotificationBubble form={form} isMobile={false} drafts={drafts}/>
    </div>
  );
}
function MobilePreview({form,drafts}) {
  const flex = mobilePosToFlex((form?.mobilePosition && form.mobilePosition[0]) || "bottom");
  return (
    <div style={{display:"flex",justifyContent:"center"}}>
      <div style={{width:380,height:400,borderRadius:40,border:"1px solid #e5e7eb",background:"linear-gradient(180deg,#fcfcfd 0%,#f5f5f6 100%)",
        boxShadow:"0 14px 40px rgba(0,0,0,0.12)",position:"relative",overflow:"hidden",padding:14,display:"flex",...flex}}>
        <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",width:120,height:18,borderRadius:10,background:"#0f172a0f"}}/>
        <div style={{padding:8}}><NotificationBubble form={form} isMobile drafts={drafts}/></div>
      </div>
    </div>
  );
}
function LivePreview({form,drafts}) {
  const [mode,setMode]=useState("desktop");
  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingMd">Live Preview</Text>
        <ButtonGroup segmented>
          <Button pressed={mode==="desktop"} onClick={()=>setMode("desktop")}>Desktop</Button>
          <Button pressed={mode==="mobile"} onClick={()=>setMode("mobile")}>Mobile</Button>
          <Button pressed={mode==="both"} onClick={()=>setMode("both")}>Both</Button>
        </ButtonGroup>
      </InlineStack>
      {mode==="desktop" && <DesktopPreview form={form} drafts={drafts}/>}
      {mode==="mobile"  && <MobilePreview form={form} drafts={drafts}/>}
      {mode==="both"    && (
        <InlineStack gap="400" align="space-between" wrap>
          <Box width="58%"><DesktopPreview form={form} drafts={drafts}/></Box>
          <Box width="40%"><MobilePreview form={form} drafts={drafts}/></Box>
        </InlineStack>
      )}
      <Text as="p" variant="bodySm" tone="subdued">
        Desktop preview follows the Desktop position. Mobile follows the Mobile Position & size.
      </Text>
    </BlockStack>
  );
}

/* ───────────────── utility: shape form ──────────────── */
function shapeForm(d){
  return {
    enabled: d.enabled ?? ["enabled"],
    showType: d.showType ?? "allpage",

    messageTitles: [...(d.messageTitles || [])],
    locations:     [...(d.locations || [])],
    names:         [...(d.names || [])],
    selectedProducts: [...(d.selectedProducts || [])],

    messageText: d.messageText ?? "",
    fontFamily:  d.fontFamily ?? "System",
    position:    d.position ?? "bottom-left",
    animation:   d.animation ?? "fade",
    mobileSize:  d.mobileSize ?? "compact",
    mobilePosition: (Array.isArray(d.mobilePosition) && d.mobilePosition.length) ? d.mobilePosition : ["bottom"],

    titleColor: d.titleColor ?? "#6E62FF",
    bgColor:    d.bgColor ?? "#FFFFFF",
    msgColor:   d.msgColor ?? "#111111",
    ctaBgColor: d.ctaBgColor ?? "#244E89",

    rounded: String(d.rounded ?? 14),
    durationSeconds: Number.isFinite(d.durationSeconds) ? d.durationSeconds : 8,
    alternateSeconds: Number.isFinite(d.alternateSeconds) ? d.alternateSeconds : 10,
    fontWeight: String(d.fontWeight ?? 600),

    iconKey: d.iconKey ?? "",
    iconSvg: d.iconSvg ?? "",
  };
}

/* ───────────────── page ──────────────── */
export default function RecentEditPage() {
  const loader = useLoaderData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const busy = navigation.state !== "idle";

  if (!loader.ok) {
    return (
      <Page title="Edit – Recent Purchases">
        <Card>
          <Box padding="4">
            <BlockStack gap="300">
              <Text tone="critical">{loader.message}</Text>
              <Button onClick={()=>navigate("/app/dashboard")}>Back to Dashboard</Button>
            </BlockStack>
          </Box>
        </Card>
      </Page>
    );
  }

  const {data, pageTitle} = loader;

  // init + sync from loader
  const [form, setForm] = useState(()=>shapeForm(data));
  useEffect(()=>{ 
    console.log("[recent.edit] loader.data →", data);
    setForm(shapeForm(data));
  }, [data]);

  // product picker
  const [pickerOpen,setPickerOpen]=useState(false);
  const [search,setSearch]=useState("");
  const [page,setPage]=useState(1);
  const isLoadingList = fetcher.state !== "idle";
  const items = fetcher.data?.items || [];
  const hasNextPage = !!fetcher.data?.hasNextPage;

  useEffect(()=>{
    if(!pickerOpen) return;
    const params = new URLSearchParams();
    if(search) params.set("q", search);
    params.set("page", String(page));
    fetcher.load(`/app/products-picker?${params.toString()}`);
  }, [pickerOpen,search,page]);

  const toggleHandle = (handle)=>{
    setForm(f=>{
      const set = new Set(f.selectedProducts || []);
      if(set.has(handle)) set.delete(handle); else set.add(handle);
      return {...f, selectedProducts: Array.from(set)};
    });
  };

  // token inputs
  const titlesInput = useTokenInput("messageTitles", form, setForm);
  const locationsInput = useTokenInput("locations", form, setForm);
  const namesInput = useTokenInput("names", form, setForm);

  const countsOk = useMemo(() =>
    (form.messageTitles?.length || 0) &&
    form.messageTitles.length === form.locations.length &&
    form.locations.length === form.names.length
  , [form]);

  const onField = (k)=> (v)=> setForm(f=>({...f,[k]:v}));
  const doSave = ()=> document.getElementById("recent-edit-save")?.requestSubmit();

  const fontOptions = [
    { label: "System", value: "System" },
    { label: "Inter", value: "Inter" },
    { label: "Roboto", value: "Roboto" },
    { label: "Montserrat", value: "Montserrat" },
    { label: "Poppins", value: "Poppins" },
  ];
  const positionOptions = [
    { label: "Top Left", value: "top-left" },
    { label: "Top Right", value: "top-right" },
    { label: "Bottom Left", value: "bottom-left" },
    { label: "Bottom Right", value: "bottom-right" },
  ];
  const animationOptions = [
    { label: "Fade", value: "fade" },
    { label: "Slide", value: "slide" },
    { label: "Bounce", value: "bounce" },
    { label: "Zoom", value: "zoom" },
  ];
  const mobileSizeOptions = [
    { label: "Compact", value: "compact" },
    { label: "Comfortable", value: "comfortable" },
    { label: "Large", value: "large" },
  ];
  const weightOptions = [
    { label: "100 - Thin", value: "100" }, { label: "200 - Extra Light", value: "200" },
    { label: "300 - Light", value: "300" }, { label: "400 - Normal", value: "400" },
    { label: "500 - Medium", value: "500" }, { label: "600 - Semi Bold", value: "600" },
    { label: "700 - Bold", value: "700" },
  ];

  return (
    <Frame>
      {busy && <Loading />}

      <Page
        title={`Edit – ${pageTitle}`}
        backAction={{content:"Back", onAction:()=>navigate("/app/dashboard")}}
        primaryAction={{content:"Save", onAction:doSave, loading:busy, disabled:busy || !countsOk}}
      >
        <Layout>
          {/* Preview */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <LivePreview
                  form={form}
                  drafts={{title:titlesInput.draft, location:locationsInput.draft, name:namesInput.draft}}
                />
              </Box>
            </Card>
          </Layout.Section>

          {/* Display */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Display</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <ChoiceList
                        title="Show Popup"
                        choices={[{label:"Enabled", value:"enabled"}, {label:"Disabled", value:"disabled"}]}
                        selected={form.enabled}
                        onChange={onField("enabled")}
                        alignment="horizontal"
                      />
                    </Box>
                    <Box width="50%">
                      <Select label="Show Type" options={PAGES} value={form.showType} onChange={onField("showType")} />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%">
                      <TextField label="Display notification for" type="number"
                        value={String(form.durationSeconds)}
                        onChange={(v)=>setForm(f=>({...f, durationSeconds: intOrNull(v,1,60) ?? 1}))}
                        suffix="S" min={1} max={60} step={1} autoComplete="off"/>
                    </Box>
                    <Box width="50%">
                      <TextField label="Alternate time" type="number"
                        value={String(form.alternateSeconds)}
                        onChange={(v)=>setForm(f=>({...f, alternateSeconds: intOrNull(v,0,3600) ?? 0}))}
                        suffix="S" min={0} max={3600} step={1} autoComplete="off"/>
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Message */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Message</Text>

                  {/* Titles */}
                  <div onKeyDownCapture={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); titlesInput.commitDraft(); }}}>
                    <TextField
                      label="Customer Name (add multiple)"
                      value={titlesInput.draft}
                      onChange={titlesInput.onChange}
                      onBlur={titlesInput.commitDraft}
                      autoComplete="off"
                      placeholder="Name1, Name2 … then press Enter to add"
                    />
                  </div>
                  <InlineStack gap="150" wrap>
                    {(form.messageTitles||[]).map((t,i)=>(
                      <Tag key={`t-${i}`} onRemove={()=>titlesInput.removeAt(i)}>{t}</Tag>
                    ))}
                  </InlineStack>

                  {/* Body */}
                  <TextField label="Message Body" value={form.messageText} onChange={onField("messageText")} multiline={1} autoComplete="off" />

                  {/* Locations */}
                  <div onKeyDownCapture={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); locationsInput.commitDraft(); }}}>
                    <TextField
                      label="Location (add multiple)"
                      value={locationsInput.draft}
                      onChange={locationsInput.onChange}
                      onBlur={locationsInput.commitDraft}
                      autoComplete="off"
                      placeholder="Ahmedabad, Surat … then press Enter to add"
                    />
                  </div>
                  <InlineStack gap="150" wrap>
                    {(form.locations||[]).map((t,i)=>(
                      <Tag key={`l-${i}`} onRemove={()=>locationsInput.removeAt(i)}>{t}</Tag>
                    ))}
                  </InlineStack>

                  {/* Times */}
                  <div onKeyDownCapture={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); namesInput.commitDraft(); }}}>
                    <TextField
                      label="Times (add multiple)"
                      value={namesInput.draft}
                      onChange={namesInput.onChange}
                      onBlur={namesInput.commitDraft}
                      autoComplete="off"
                      placeholder="12 hours ago, 2 hours ago … then press Enter to add"
                    />
                  </div>
                  <InlineStack gap="150" wrap>
                    {(form.names||[]).map((t,i)=>(
                      <Tag key={`n-${i}`} onRemove={()=>namesInput.removeAt(i)}>{t}</Tag>
                    ))}
                  </InlineStack>

                  {!countsOk && <Text tone="critical">Counts must match (names / locations / times).</Text>}
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Products – handles only */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Products</Text>
                  <InlineStack gap="200">
                    <Button onClick={()=>{ setPickerOpen(true); setPage(1); fetcher.load(`/app/products-picker?page=1`); }}>
                      Pick products
                    </Button>
                    {!!(form.selectedProducts?.length) && (
                      <Text variant="bodySm" tone="subdued">{form.selectedProducts.length} selected</Text>
                    )}
                  </InlineStack>
                  {!!(form.selectedProducts?.length) && (
                    <InlineStack gap="150" wrap>
                      {form.selectedProducts.map((h,i)=>(
                        <Tag key={`handle-${i}`} onRemove={()=>toggleHandle(h)}>@{h}</Tag>
                      ))}
                    </InlineStack>
                  )}
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Customize */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Customize</Text>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Font Family" options={fontOptions} value={form.fontFamily} onChange={onField("fontFamily")} /></Box>
                    <Box width="50%"><Select label="Font weight" options={weightOptions} value={form.fontWeight} onChange={onField("fontWeight")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Desktop position" options={positionOptions} value={form.position} onChange={onField("position")} /></Box>
                    <Box width="50%"><Select label="Notification animation" options={animationOptions} value={form.animation} onChange={onField("animation")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><Select label="Notification size on mobile" options={mobileSizeOptions} value={form.mobileSize} onChange={onField("mobileSize")} /></Box>
                    <Box width="50%">
                      <Select
                        label="Mobile Position"
                        options={[{label:"Top",value:"top"},{label:"Bottom",value:"bottom"}]}
                        value={(form.mobilePosition && form.mobilePosition[0]) || "bottom"}
                        onChange={(v)=>setForm(f=>({...f, mobilePosition:[v]}))}
                      />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><TextField type="number" label="Font Size (px) (Name & Location Only)" value={String(form.rounded)} onChange={onField("rounded")} autoComplete="off"/></Box>
                    <Box width="50%"><ColorInput label="Title Color" value={form.titleColor} onChange={(v)=>setForm(f=>({...f, titleColor:v}))}/></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false}>
                    <Box width="50%"><ColorInput label="Background Color" value={form.bgColor} onChange={(v)=>setForm(f=>({...f, bgColor:v}))}/></Box>
                    <Box width="50%"><ColorInput label="Message Color" value={form.msgColor} onChange={(v)=>setForm(f=>({...f, msgColor:v}))}/></Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Hidden Save form */}
          <Form method="post" id="recent-edit-save" replace>
            <input type="hidden" name="_action" value="save" />
            <input type="hidden" name="enabled" value={form.enabled.includes("enabled") ? "enabled" : "disabled"} />
            <input type="hidden" name="showType" value={form.showType} />
            <input type="hidden" name="messageText" value={form.messageText} />
            <input type="hidden" name="fontFamily" value={form.fontFamily} />
            <input type="hidden" name="position" value={form.position} />
            <input type="hidden" name="animation" value={form.animation} />
            <input type="hidden" name="mobileSize" value={form.mobileSize} />
            {(form.mobilePosition||[]).map((v,i)=>(<input key={`mp-${i}`} type="hidden" name="mobilePosition" value={v}/>))}
            <input type="hidden" name="titleColor" value={form.titleColor} />
            <input type="hidden" name="bgColor" value={form.bgColor} />
            <input type="hidden" name="msgColor" value={form.msgColor} />
            <input type="hidden" name="ctaBgColor" value={form.ctaBgColor || ""} />
            <input type="hidden" name="rounded" value={form.rounded} />
            <input type="hidden" name="durationSeconds" value={form.durationSeconds} />
            <input type="hidden" name="alternateSeconds" value={form.alternateSeconds} />
            <input type="hidden" name="fontWeight" value={form.fontWeight} />
            <input type="hidden" name="iconKey" value={form.iconKey || ""} />
            <input type="hidden" name="iconSvg" value={form.iconSvg || ""} />
            {(form.messageTitles||[]).map((v,i)=>(<input key={`t-h-${i}`} type="hidden" name="messageTitles" value={v}/>))}
            {(form.locations||[]).map((v,i)=>(<input key={`l-h-${i}`} type="hidden" name="locations" value={v}/>))}
            {(form.names||[]).map((v,i)=>(<input key={`n-h-${i}`} type="hidden" name="names" value={v}/>))}
            {(form.selectedProducts||[]).map((h,i)=>(<input key={`sp-${i}`} type="hidden" name="selectedProducts" value={h}/>))}
          </Form>
        </Layout>
      </Page>

      {/* Product picker modal */}
      <Modal open={pickerOpen} onClose={()=>setPickerOpen(false)} title="Select products"
             secondaryActions={[{content:"Close", onAction:()=>setPickerOpen(false)}]} large>
        <Modal.Section>
          <BlockStack gap="300">
            <TextField label="Search" placeholder="Type to search by product title" value={search} onChange={setSearch}
              autoComplete="off" prefix={<Icon source={SearchIcon} tone="base" />}/>
            <Divider />
            <IndexTable resourceName={{singular:"product", plural:"products"}} itemCount={items.length}
                        selectable={false} headings={[{title:"Action"},{title:"Product"},{title:"Status"}]}
                        loading={isLoadingList}>
              {items.map((item,index)=>{
                const picked = (form.selectedProducts||[]).includes(item.handle);
                return (
                  <IndexTable.Row id={item.id} key={item.id} position={index}>
                    <IndexTable.Cell>
                      <Button size="slim" onClick={()=>toggleHandle(item.handle)} variant={picked?"primary":undefined}>
                        {picked ? "Remove" : "Add"}
                      </Button>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="200" blockAlign="center">
                        <Thumbnail source={item.featuredImage || ""} alt={item.title} size="small" />
                        <BlockStack gap="050">
                          <Text as="span" variant="bodyMd">{item.title}</Text>
                          {item.handle ? <Text as="span" variant="bodySm" tone="subdued">@{item.handle}</Text> : null}
                        </BlockStack>
                      </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone={item.status === "ACTIVE" ? "success" : "attention"}>{item.status?.toLowerCase()}</Badge>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                );
              })}
            </IndexTable>

            {!isLoadingList && items.length === 0 && (
              <Box padding="4"><Text tone="subdued">No products found. Try a different search.</Text></Box>
            )}

            <InlineStack align="center">
              <Pagination hasPrevious={page>1} onPrevious={()=>setPage(p=>Math.max(1,p-1))}
                          hasNext={hasNextPage} onNext={()=>setPage(p=>p+1)} />
            </InlineStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Frame>
  );
}
