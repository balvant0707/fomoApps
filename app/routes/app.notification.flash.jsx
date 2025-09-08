import React, { useMemo, useState } from "react";
import {
  Page, Card, Button, TextField, Select, ChoiceList, Box,
  BlockStack, InlineStack, Text, RangeSlider, ColorPicker, Frame, Toast, Loading, Layout
} from "@shopify/polaris";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

/* ───────── Loader & Action ───────── */
const KEY = "flash";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  // NO unique: use findFirst
  const existing = await prisma.notificationConfig.findFirst({
    where: { shop, key: KEY },
  });

  return json({ existing: existing ?? null, key: KEY, title: "Flash Sale Bars" });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Missing shop", { status: 400 });

  const { form } = await request.json();
  const enabled = form.enabled?.includes("enabled") ?? false;

  // normalize
  const fontWeightNum =
    form.fontWeight !== undefined && form.fontWeight !== null && form.fontWeight !== ""
      ? Number(form.fontWeight)
      : null;

  const iconKey = form.iconKey ?? null;
  const iconSvg = iconKey && SVGS[iconKey] ? SVGS[iconKey] : null;

  // NO upsert (needs unique). Do findFirst -> update OR create.
  const existing = await prisma.notificationConfig.findFirst({
    where: { shop, key: KEY },
    select: { id: true },
  });

  const data = {
    shop,            // kept in update too (harmless)
    key: KEY,        // kept in update too (harmless)
    enabled,
    showType: form.showType,
    messageTitle: form.messageTitle,
    messageText: form.messageText,
    fontFamily: form.fontFamily,
    fontWeight: isNaN(fontWeightNum) ? null : fontWeightNum, // Int?
    position: form.position,
    animation: form.animation,
    mobileSize: form.mobileSize,
    mobilePositionJson: form.mobilePosition ?? [],
    titleColor: form.titleColor,
    bgColor: form.bgColor,
    msgColor: form.msgColor,
    rounded: Number(form.rounded),
    name: form.name,
    durationSeconds: Number(form.durationSeconds),
    alternateSeconds: Number(form.alternateSeconds), // Int?
    iconKey,
    iconSvg,
  };

  let saved;
  if (existing?.id) {
    saved = await prisma.notificationConfig.update({
      where: { id: existing.id },
      data,
    });
  } else {
    saved = await prisma.notificationConfig.create({ data });
  }

  return json({ success: true, saved });
}

/* ───────── SVG options (template literals avoid escaping hell) ───────── */
const SVGS = {
  reshot: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 64 64">
  <g id="_06-Flash_sales" data-name="06-Flash sales">
    <path d="M38.719,63a17.825,17.825,0,0,0,7.422-1.5A14.41,14.41,0,0,0,55,48c0-9-2-11-5-17s0-12,0-12a10.819,10.819,0,0,0-6,4C44,2,30,1,30,1a15.091,15.091,0,0,1-2,14c-5,7-10,11-12,19,0,0-4-2-3-6,0,0-4,7-4,18,0,12.062,9.662,15.6,14.418,16.61a18.53,18.53,0,0,0,3.846.39Z" style="fill:#febd55"/>
    <path d="M24.842,63S14.526,59.132,14.526,47.526C14.526,34.632,23.474,30,23.474,30s-2.5,4.632.079,5.921c0,0,4.315-14.053,15.921-17.921,0,0-4.053,4.263-1.474,12s11.316,9.474,11.474,18v1a14.54,14.54,0,0,1-2.2,8.213C45.286,60.31,42.991,63,37.737,63Z" style="fill:#fc9e20"/>
    <path d="M26,63a13.024,13.024,0,0,1-8-12c0-10,5-14,5-14s0,4,2,5c0,0,2-14,11-17,0,0-3,2-1,8s11,8,11,18v.871a12.287,12.287,0,0,1-1.831,6.641A9.274,9.274,0,0,1,36,63Z" style="fill:#e03e3e"/>
    <path d="M10.174,42.088l-1.992-.177c-.059.663-.106,1.344-.137,2.045l2,.087C10.072,43.375,10.117,42.722,10.174,42.088Z"/>
    <path d="M12.44,31.768A7.317,7.317,0,0,0,15.553,34.9a1,1,0,0,0,1.417-.652c1.385-5.541,4.3-9.125,7.665-13.276,1.356-1.67,2.759-3.4,4.178-5.386A16.069,16.069,0,0,0,31.45,2.293c2.8.77,8.637,3.489,10.761,12.927l1.951-.44C41.048.944,30.181.01,30.071,0a1,1,0,0,0-.991,1.39,13.975,13.975,0,0,1-1.893,13.027c-1.385,1.938-2.768,3.641-4.105,5.288-3.241,3.992-6.076,7.483-7.67,12.675a4.04,4.04,0,0,1-1.442-4.139,1,1,0,0,0-1.838-.739,36.649,36.649,0,0,0-3.72,12.362l1.983.268A40.112,40.112,0,0,1,12.44,31.768Z"/>
    <path d="M52.276,33.212c-.431-.812-.893-1.682-1.381-2.659-2.731-5.461-.027-11.052,0-11.106a1,1,0,0,0-1.137-1.417,11.826,11.826,0,0,0-4.824,2.511c-.071-1.284-.2-2.52-.38-3.694l-1.977.306A38.39,38.39,0,0,1,43,23a1,1,0,0,0,1.83.558,9.836,9.836,0,0,1,3.483-2.874,14.847,14.847,0,0,0,.792,10.763c.5.993.966,1.878,1.405,2.7C52.687,38.251,54,40.727,54,48a13.458,13.458,0,0,1-8.275,12.59,14.922,14.922,0,0,1-2.838.938,11.536,11.536,0,0,0,2.124-2.476A13.259,13.259,0,0,0,47,51.871V51H45v.871a11.262,11.262,0,0,1-1.673,6.1A8.25,8.25,0,0,1,36,62H27.264c-.409,0-.8-.034-1.2-.06A11.861,11.861,0,0,1,19,51c0-6.017,1.9-9.755,3.269-11.661A5.025,5.025,0,0,0,24.553,42.9a1,1,0,0,0,1.437-.753c.017-.117,1.556-10.322,7.511-14.717a11,11,0,0,0,.551,5.891c.862,2.588,2.807,4.409,4.868,6.337a21,21,0,0,1,4.845,5.8l1.791-.89a22.864,22.864,0,0,0-5.27-6.366c-1.869-1.75-3.636-3.4-4.338-5.509-1.7-5.11.526-6.793.607-6.852a1,1,0,0,0-.871-1.781C28.353,26.5,25.429,35.457,24.441,39.666A9.122,9.122,0,0,1,24,37a1,1,0,0,0-1.625-.78C22.156,36.4,17,40.639,17,51a13.4,13.4,0,0,0,4.232,9.988C16.241,59.379,10,55.478,10,46H8C8,58.958,18.637,62.616,23.21,63.587a18.919,18.919,0,0,0,2.39.33l.048.02.007-.017c.531.041,1.064.08,1.609.08H38.719a18.737,18.737,0,0,0,7.838-1.59A15.389,15.389,0,0,0,56,48C56,40.229,54.519,37.438,52.276,33.212Z"/>
    <rect x="23.515" y="50" width="16.971" height="2" transform="translate(-26.69 37.565) rotate(-45)"/>
    <path d="M32,56a3,3,0,1,0,3-3A3,3,0,0,0,32,56Zm4,0a1,1,0,1,1-1-1A1,1,0,0,1,36,56Z"/>
    <path d="M32,46a3,3,0,1,0-3,3A3,3,0,0,0,32,46Zm-4,0a1,1,0,1,1,1,1A1,1,0,0,1,28,46Z"/>
    <path d="M46.862,48.868a13.991,13.991,0,0,0-.459-2.157l-1.916.57a12.126,12.126,0,0,1,.393,1.851Z"/>
  </g>
</svg>
`,
  reshotFlash: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 6.82666 6.82666">
  <defs>
    <style type="text/css"><![CDATA[
      .fil2 {fill:none}
      .fil1 {fill:#283593}
      .fil0 {fill:#3949AB}
      .fil4 {fill:#29B6F6;fill-rule:nonzero}
      .fil3 {fill:#81D4FA;fill-rule:nonzero}
    ]]></style>
    <clipPath id="id0">
      <path d="M3.41333 0c1.88514,0 3.41333,1.52819 3.41333,3.41333 0,1.88514 -1.52819,3.41333 -3.41333,3.41333 -1.88514,0 -3.41333,-1.52819 -3.41333,-3.41333 0,-1.88514 1.52819,-3.41333 3.41333,-3.41333z"/>
    </clipPath>
  </defs>
  <g>
    <path class="fil0" d="M3.41333 0c1.88514,0 3.41333,1.52819 3.41333,3.41333 0,1.88514 -1.52819,3.41333 -3.41333,3.41333 -1.88514,0 -3.41333,-1.52819 -3.41333,-3.41333 0,-1.88514 1.52819,-3.41333 3.41333,-3.41333z"/>
    <g style={{clipPath:"url(#id0)"}}>
      <!-- trimmed polys -->
      <polygon class="fil3" points="2.82094,3.56298 2.48625,3.56343 2.41006,3.56353 2.40948,3.48696 2.3952,1.62404 2.39461,1.54667 2.47197,1.54667 4.05295,1.54667 4.18926,1.54667 4.11889,1.66348 3.58319,2.55274 "/>
      <polygon class="fil4" points="2.8313,3.56296 2.82158,3.56298 2.82094,3.56298 3.58319,2.55274 3.57208,2.57117 3.47211,2.73713 4.2933,2.73713 4.43205,2.73713 4.35833,2.85485 2.98014,5.05561 2.83962,5.28 2.83833,5.01526 "/>
    </g>
    <path class="fil2" d="M3.41333 0c1.88514,0 3.41333,1.52819 3.41333,3.41333 0,1.88514 -1.52819,3.41333 -3.41333,3.41333 -1.88514,0 -3.41333,-1.52819 -3.41333,-3.41333 0,-1.88514 1.52819,-3.41333 3.41333,-3.41333z"/>
  </g>
</svg>
`,
  deadline: `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width ="60" height="60" version="1.1" id="Icon_Set" x="0px" y="0px" viewBox="0 0 64 64" style="enable-background:new 0 0 64 64;" xml:space="preserve">
<style type="text/css">
	.st0{fill:#40C4FF;}
	.st1{fill:#263238;}
	.st2{fill:#FFD740;}
	.st3{fill:#FF5252;}
	.st4{fill:#4DB6AC;}
	.st5{fill:#FFFFFF;}
	.st6{fill:#4FC3F7;}
	.st7{fill:#37474F;}
</style>
<g>
	<g>
		<path class="st1" d="M18,53.5c-0.276,0-0.5-0.224-0.5-0.5v-8.511c0-3.609,1.818-6.921,4.863-8.858L28.069,32l-5.706-3.631    c-3.045-1.938-4.863-5.249-4.863-8.858V11c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v8.511c0,3.266,1.645,6.262,4.4,8.015    l6.369,4.053C29.413,31.67,29.5,31.829,29.5,32s-0.087,0.33-0.231,0.422L22.9,36.475c-2.755,1.753-4.4,4.749-4.4,8.015V53    C18.5,53.276,18.276,53.5,18,53.5z"/>
	</g>
	<g>
		<path class="st1" d="M46,53.5c-0.276,0-0.5-0.224-0.5-0.5v-8.511c0-3.265-1.645-6.261-4.399-8.015l-6.369-4.053    C34.587,32.33,34.5,32.171,34.5,32s0.087-0.33,0.231-0.422l6.369-4.053c2.755-1.753,4.399-4.75,4.399-8.015V11    c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v8.511c0,3.609-1.817,6.92-4.862,8.858L35.932,32l5.706,3.631    c3.045,1.938,4.862,5.25,4.862,8.858V53C46.5,53.276,46.276,53.5,46,53.5z"/>
	</g>
	<g>
		<path class="st0" d="M47,5H17c-1.105,0-2,0.895-2,2c0,1.105,0.895,2,2,2h30c1.105,0,2-0.895,2-2C49,5.895,48.105,5,47,5z"/>
		<path class="st1" d="M47,9.5H17c-1.378,0-2.5-1.122-2.5-2.5s1.122-2.5,2.5-2.5h30c1.379,0,2.5,1.122,2.5,2.5S48.379,9.5,47,9.5z     M17,5.5c-0.827,0-1.5,0.673-1.5,1.5s0.673,1.5,1.5,1.5h30c0.827,0,1.5-0.673,1.5-1.5S47.827,5.5,47,5.5H17z"/>
	</g>
	<g>
		<path class="st0" d="M17,59h30c1.105,0,2-0.895,2-2v0c0-1.105-0.895-2-2-2H17c-1.105,0-2,0.895-2,2v0C15,58.105,15.895,59,17,59z"/>
		<path class="st1" d="M47,59.5H17c-1.378,0-2.5-1.122-2.5-2.5s1.122-2.5,2.5-2.5h30c1.379,0,2.5,1.122,2.5,2.5S48.379,59.5,47,59.5    z M17,55.5c-0.827,0-1.5,0.673-1.5,1.5s0.673,1.5,1.5,1.5h30c0.827,0,1.5-0.673,1.5-1.5s-0.673-1.5-1.5-1.5H17z"/>
	</g>
	<g>
		<path class="st2" d="M21,53l6.968-9.502c1.998-2.724,6.066-2.724,8.064,0L43,53"/>
		<path class="st1" d="M43,53.5c-0.153,0-0.306-0.071-0.403-0.204l-6.968-9.502c-0.857-1.169-2.18-1.839-3.629-1.839    s-2.771,0.67-3.628,1.839l-6.968,9.502c-0.164,0.223-0.476,0.271-0.699,0.107c-0.223-0.164-0.271-0.477-0.107-0.699l6.968-9.502    c1.047-1.428,2.664-2.247,4.435-2.247c1.772,0,3.388,0.819,4.436,2.247l6.968,9.502c0.163,0.223,0.115,0.536-0.107,0.699    C43.207,53.469,43.103,53.5,43,53.5z"/>
	</g>
	<g>
		<path class="st1" d="M32,30.388c-0.561,0-1.121-0.156-1.61-0.467l-7.342-4.672c-1.595-1.016-2.547-2.75-2.547-4.64v-1.275    c0-0.276,0.224-0.5,0.5-0.5h22c0.276,0,0.5,0.224,0.5,0.5v1.275c0,1.891-0.952,3.625-2.547,4.64l-7.343,4.672l-0.269-0.422    l0.269,0.422C33.121,30.232,32.561,30.388,32,30.388z M21.5,19.833v0.775c0,1.546,0.779,2.966,2.084,3.796l7.342,4.672    c0.653,0.416,1.495,0.415,2.147,0l7.343-4.672c1.305-0.831,2.084-2.25,2.084-3.796v-0.775H21.5z"/>
	</g>
	<g>
		<path class="st1" d="M56,32.5H46c-0.276,0-0.5-0.224-0.5-0.5s0.224-0.5,0.5-0.5h10c0.276,0,0.5,0.224,0.5,0.5S56.276,32.5,56,32.5    z"/>
	</g>
	<g>
		<path class="st1" d="M59,32.5h-1c-0.276,0-0.5-0.224-0.5-0.5s0.224-0.5,0.5-0.5h1c0.276,0,0.5,0.224,0.5,0.5S59.276,32.5,59,32.5z    "/>
	</g>
	<g>
		<path class="st1" d="M18,32.5H8c-0.276,0-0.5-0.224-0.5-0.5s0.224-0.5,0.5-0.5h10c0.276,0,0.5,0.224,0.5,0.5S18.276,32.5,18,32.5z    "/>
	</g>
	<g>
		<path class="st1" d="M6,32.5H5c-0.276,0-0.5-0.224-0.5-0.5s0.224-0.5,0.5-0.5h1c0.276,0,0.5,0.224,0.5,0.5S6.276,32.5,6,32.5z"/>
	</g>
	<g>
		<path class="st1" d="M59,17.5h-4c-0.276,0-0.5-0.224-0.5-0.5s0.224-0.5,0.5-0.5h4c0.276,0,0.5,0.224,0.5,0.5S59.276,17.5,59,17.5z    "/>
	</g>
	<g>
		<path class="st1" d="M57,19.5c-0.276,0-0.5-0.224-0.5-0.5v-4c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v4    C57.5,19.276,57.276,19.5,57,19.5z"/>
	</g>
	<g>
		<path class="st1" d="M54,24h-4c-0.276,0-0.5-0.224-0.5-0.5S49.724,23,50,23h4c0.276,0,0.5,0.224,0.5,0.5S54.276,24,54,24z"/>
	</g>
	<g>
		<path class="st1" d="M52,26c-0.276,0-0.5-0.224-0.5-0.5v-4c0-0.276,0.224-0.5,0.5-0.5s0.5,0.224,0.5,0.5v4    C52.5,25.776,52.276,26,52,26z"/>
	</g>
</g>
</svg>
`,
  reshotflashon: `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" width="60" height="60" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" viewBox="0 0 6.82666 6.82666">
 <defs>
  <style type="text/css">
   <![CDATA[
    .fil0 {fill:none}
    .fil1 {fill:#212121;fill-rule:nonzero}
    .fil2 {fill:#66BB6A;fill-rule:nonzero}
   ]]>
  </style>
 </defs>
 <g id="Layer_x0020_1">
  <metadata id="CorelCorpID_0Corel-Layer"/>
  <g id="_372410968">
   <rect id="_372411304" class="fil0" width="6.82666" height="6.82666"/>
   <rect id="_372411232" class="fil0" x="0.853331" y="0.853331" width="5.12" height="5.12"/>
  </g>
  <path class="fil1" d="M2.2782 3.43181l0.477831 -0.000645669 0.10574 -0.000145669 0.000511811 0.10598 0.00847638 1.74953 1.61087 -2.5723 -1.13312 0 -0.188642 0 0.0973898 -0.161669 0.895118 -1.48589 -1.8923 0 0.018126 2.36515zm0.372091 0.212l-0.477531 0.000645669 -0.105437 0.000141732 -0.000814961 -0.105976 -0.0197559 -2.57821 -0.000818898 -0.107087 0.107071 0 2.18801 0 0.188642 3.93701e-006 -0.0973898 0.161665 -0.895118 1.48589 1.1365 0 0.192024 0 -0.102024 0.162921 -1.90737 3.04577 -0.194476 0.310547 -0.00177559 -0.366382 -0.00974016 -2.00993z"/>
  <path class="fil2" d="M3.39739 1.49333l-0.151972 0 -0.555811 0 0.00803937 1.04871 0 0.525819 -0.011252 0.0186772 -0.194606 0.323055 -0.00289764 -0.377638 -0.0126063 -1.64488 -0.000818898 -0.107087 0.107071 0 1.0035 0 0.188642 0 -0.0973898 0.161669 -0.031126 0.0516693 -0.248768 0zm-0.110917 1.61484l7.87402e-006 0.000326772 -7.87402e-006 -0.000448819 0 0.000122047zm-0.212488 0.00449213l-7.87402e-006 0 -0.00173228 -0.0763622 -0.00246457 -0.108752 0.108717 0 0.725177 0 0.192024 0 -0.102024 0.162921 -0.718264 1.14696 -0.194472 0.310547 -0.00177953 -0.366382 -0.000192913 -0.0399173 0.210921 -0.327594 0 0.000295276 0.00684252 -0.0109252 0.113465 -0.176232c0.00487402,-0.00756693 0.00875984,-0.0154961 0.0117008,-0.0236378l0.289752 -0.462693 -0.330972 0c-0.00176378,-7.87402e-005 -0.00353543,-0.000125984 -0.0053189,-0.000125984l-0.301236 0 -0.000133858 -0.0280984z"/>
 </g>
</svg>
`,
};

const svgOptions = [
  { label: "Reshot", value: "reshot" },
  { label: "Reshot Flash", value: "reshotFlash" },
  { label: "Reshot Flash On", value: "reshotflashon" },
  { label: "Deadline", value: "deadline" },
];

function svgToDataUri(svg) {
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

/* ───────── color + preview helpers ───────── */
function hexToRgb(hex) { const c = hex.replace("#", ""); const b = parseInt(c.length === 3 ? c.split("").map(x => x + x).join("") : c, 16); return { r: (b >> 16) & 255, g: (b >> 8) & 255, b: b & 255 }; }
function rgbToHex({ r, g, b }) { const h = v => v.toString(16).padStart(2, "0"); return `#${h(r)}${h(g)}${h(b)}`.toUpperCase(); }
function rgbToHsv({ r, g, b }) { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; let h = 0; if (d) { switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break } h *= 60; } const s = max ? d / max : 0; return { h, s, v: max }; }
function hsvToRgb({ h, s, v }) { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; let R = 0, G = 0, B = 0; if (0 <= h && h < 60) [R, G, B] = [c, x, 0]; else if (60 <= h && h < 120) [R, G, B] = [x, c, 0]; else if (120 <= h && h < 180) [R, G, B] = [0, c, x]; else if (180 <= h && h < 240) [R, G, B] = [0, x, c]; else[R, G, B] = [c, 0, x]; return { r: Math.round((R + m) * 255), g: Math.round((G + m) * 255), b: Math.round((B + m) * 255) }; }
const hexToHsb = (hex) => { const { h, s, v } = rgbToHsv(hexToRgb(hex)); return { hue: h, saturation: s, brightness: v }; };
const hsbToHex = (hsb) => rgbToHex(hsvToRgb({ h: hsb.hue, s: hsb.saturation, v: hsb.brightness }));

const getAnimationStyle = (a) =>
  a === "slide" ? { transform: "translateY(8px)", animation: "notif-slide-in 240ms ease-out" } :
    a === "bounce" ? { animation: "notif-bounce-in 420ms cubic-bezier(.34,1.56,.64,1)" } :
      a === "zoom" ? { transform: "scale(0.96)", animation: "notif-zoom-in 200ms ease-out forwards" } :
        { opacity: 0, animation: "notif-fade-in 220ms ease-out forwards" };

function NotificationPreview({ form }) {
  const animStyle = useMemo(() => getAnimationStyle(form.animation), [form.animation]);
  const svgMarkup = useMemo(() => SVGS[form.iconKey] || "", [form.iconKey]);

  return (
    <div>
      <style>{`
        .Polaris-BlockStack.Polaris-BlockStack--listReset {
          display: flex; justify-content: start; flex-direction: row !important; gap: 2rem;
        }
        @keyframes notif-fade-in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes notif-slide-in { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes notif-zoom-in  { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: scale(1) } }
        @keyframes notif-bounce-in { 0% { transform: translateY(18px); opacity: 0 } 60% { transform: translateY(-6px); opacity: 1 } 100% { transform: translateY(0) } }
      `}</style>

      <div style={{ display: "flex" }}>
        <div style={{
          fontFamily: form.fontFamily === "System" ? "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto" : form.fontFamily,
          background: form.bgColor, color: form.msgColor, borderRadius: "14px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 14, border: "1px solid rgba(17,24,39,0.06)",
          maxWidth: 560, display: "flex", alignItems: "center", gap: 12, ...animStyle
        }}>
          {svgMarkup ? (
            <span aria-hidden="true" style={{ display: "block", flexShrink: 0 }}
              dangerouslySetInnerHTML={{ __html: svgMarkup.replace('width="60"', 'width="50"').replace('height="60"', 'height="50"') }}
            />
          ) : null}

          <div style={{ display: "grid", gap: 4 }}>
            <p style={{ margin: 0, color: form.titleColor, fontWeight: form.fontWeight ? Number(form.fontWeight) : 600, fontSize: form.rounded }}>
              {form.messageTitle || "Flash Sale"}
            </p>
            <p style={{ margin: 0, fontSize: form.rounded, lineHeight: 1.5 }}>
              <small>{form.messageText || "Flash Sale: 20% OFF — ends in 02:15"}
                {form.alternateSeconds ? ` (alt: ${form.alternateSeconds}s)` : ""}</small>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Page ───────── */
export default function FlashConfigPage() {
  const navigate = useNavigate();
  const { existing, title } = useLoaderData();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ active: false, error: false, msg: "" });

  const [form, setForm] = useState({
    enabled: existing?.enabled ? ["enabled"] : ["enabled"],
    showType: existing?.showType || "all",
    messageTitle: existing?.messageTitle || title,
    messageText: existing?.messageText || "",
    fontFamily: existing?.fontFamily || "System",
    fontWeight: existing?.fontWeight != null ? String(existing.fontWeight) : "600",
    position: existing?.position || "top-right",
    animation: existing?.animation || "slide",
    mobileSize: existing?.mobileSize || "compact",
    mobilePosition: existing?.mobilePositionJson || ["top"],
    titleColor: existing?.titleColor || "#111111",
    bgColor: existing?.bgColor || "#FFF8E1",
    msgColor: existing?.msgColor || "#111111",
    rounded: Number(existing?.rounded ?? 14),
    name: existing?.name || "Flash Sale Bar",
    durationSeconds: Number(existing?.durationSeconds ?? 10),
    alternateSeconds: Number(existing?.alternateSeconds ?? 5),
    iconKey: existing?.iconKey || "reshot",
  });

  const [titleHSB, setTitleHSB] = useState(hexToHsb(form.titleColor));
  const [bgHSB, setBgHSB] = useState(hexToHsb(form.bgColor));
  const [msgHSB, setMsgHSB] = useState(hexToHsb(form.msgColor));
  const onField = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const onText = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const onDurationChange = (val) => { const n = parseInt(val || "0", 10); const x = isNaN(n) ? 1 : Math.min(60, Math.max(1, n)); setForm(f => ({ ...f, durationSeconds: x })); };
  const onAlternateChange = (val) => { const n = parseInt(val || "0", 10); const x = isNaN(n) ? 0 : Math.min(3600, Math.max(0, n)); setForm(f => ({ ...f, alternateSeconds: x })); };

  const updateColorByHSB = (field, setHSB) => (hsb) => { setHSB(hsb); setForm(f => ({ ...f, [field]: hsbToHex(hsb) })); };
  const updateColorByHEX = (field, setHSB) => (val) => { const c = val.toUpperCase(); setForm(f => ({ ...f, [field]: c })); if (/^#[0-9A-F]{6}$/.test(c)) setHSB(hexToHsb(c)); };

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch("/app/notification/flash", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form }),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to save");
      setToast({ active: true, error: false, msg: "Saved successfully" });
      setTimeout(() => navigate("/app/dashboard"), 900);
    } catch (e) {
      setToast({ active: true, error: true, msg: e?.message || "Something went wrong" });
    } finally { setSaving(false); }
  };

  const pageOptions = [{ label: "All Pages", value: "all" }, { label: "Home Page", value: "home" }, { label: "Product Page", value: "product" }, { label: "Collection Page", value: "collection" }, { label: "Pages", value: "pages" }, { label: "Cart Page", value: "cart" }];
  const fontOptions = [{ label: "System", value: "System" }, { label: "Inter", value: "Inter" }, { label: "Roboto", value: "Roboto" }, { label: "Montserrat", value: "Montserrat" }, { label: "Poppins", value: "Poppins" }];

  const positionOptions = [{ label: "Top Left", value: "top-left" }, { label: "Top Right", value: "top-right" }, { label: "Bottom Left", value: "bottom-left" }, { label: "Bottom Right", value: "bottom-right" }];
  const animationOptions = [{ label: "Fade", value: "fade" }, { label: "Slide", value: "slide" }, { label: "Bounce", value: "bounce" }, { label: "Zoom", value: "zoom" }];
  const mobileSizeOptions = [{ label: "Compact", value: "compact" }, { label: "Comfortable", value: "comfortable" }, { label: "Large", value: "large" }];
  const FontweightOptions = [
    { label: "100 - Thin", value: "100" },
    { label: "200 - Extra Light", value: "200" },
    { label: "300 - Light", value: "300" },
    { label: "400 - Normal", value: "400" },
    { label: "500 - Medium", value: "500" },
    { label: "600 - Semi Bold", value: "600" },
    { label: "700 - Bold", value: "700" },
  ];

  const currentSvg = SVGS[form.iconKey] || "";
  const currentDataUri = useMemo(() => (currentSvg ? svgToDataUri(currentSvg) : ""), [currentSvg]);

  return (
    <Frame>
      {saving && <Loading />}
      <Page
        title="Configuration – Flash Sale Bars"
        backAction={{ content: "Back", onAction: () => navigate("/app/notification") }}
        primaryAction={{ content: "Save", onAction: save, loading: saving, disabled: saving }}
      >
        <Layout>
          {/* Preview */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Live Preview</Text>
                  <InlineStack gap="400" wrap>
                    <div style={{ width: 480, maxWidth: "100%" }}>
                      <NotificationPreview form={form} />
                    </div>
                    <div style={{ maxWidth: 520, opacity: .9 }}>
                      <Text as="p" variant="bodyMd">
                        Preview shows your bar style, animation and colors. Adjust as needed.
                      </Text>
                    </div>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Display */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Display</Text>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><ChoiceList title="Show Popup" choices={[{ label: "Enabled", value: "enabled" }, { label: "Disabled", value: "disabled" }]} selected={form.enabled} onChange={onField("enabled")} alignment="horizontal" /></Box>
                    <Box width="50%"><Select label="Show Type" options={pageOptions} value={form.showType} onChange={onField("showType")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><TextField label="Display notification for" type="number" value={String(form.durationSeconds)} onChange={onDurationChange} suffix="S" min={1} max={60} step={1} autoComplete="off" /></Box>
                    <Box width="50%"><TextField label="Alternate time" type="number" value={String(form.alternateSeconds)} onChange={onAlternateChange} suffix="S" min={0} max={3600} step={1} autoComplete="off" /></Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          {/* Message */}
          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Message</Text>
                  <TextField label="Banner Title" value={form.messageTitle} onChange={onText("messageTitle")} autoComplete="off" />
                  <TextField label="Banner Text" value={form.messageText} onChange={onText("messageText")} multiline={2} autoComplete="off" />
                  <TextField label="Notification Name" value={form.name} onChange={onText("name")} autoComplete="off" />
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
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%">
                      <Select label="Font Family" options={fontOptions} value={form.fontFamily} onChange={onField("fontFamily")} />
                    </Box>
                    <Box width="50%">
                      <Select label="Font Weight" options={FontweightOptions} value={form.fontWeight} onChange={onField("fontWeight")} />
                    </Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><Select label="Notification position" options={positionOptions} value={form.position} onChange={onField("position")} /></Box>
                    <Box width="50%"><Select label="Notification animation" options={animationOptions} value={form.animation} onChange={onField("animation")} /></Box>
                  </InlineStack>
                  <InlineStack gap="400" wrap={false} width="100%">
                    <Box width="50%"><Select label="Notification size on mobile" options={mobileSizeOptions} value={form.mobileSize} onChange={onField("mobileSize")} /></Box>
                    <Box width="50%"><ChoiceList title="Mobile Position" choices={[{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }]} selected={form.mobilePosition} onChange={onField("mobilePosition")} /></Box>
                  </InlineStack>

                  <InlineStack gap="400" wrap={false} width="100%" alignItems="center">
                    <Box width="50%">
                      <Select label="Choose Icon" options={svgOptions} value={form.iconKey} onChange={onField("iconKey")} />
                    </Box>
                    <Box width="50%">
                      <Text>Font Size(px): {form.rounded}</Text>
                      <RangeSlider min={0} max={24} value={form.rounded} onChange={(v) => setForm(f => ({ ...f, rounded: v }))} />
                    </Box>
                  </InlineStack>

                  <Text as="h4" variant="headingSm">Colors</Text>
                  <InlineStack gap="400" wrap>
                    <BlockStack gap="200">
                      <Text>Title Color</Text>
                      <ColorPicker color={hexToHsb(form.titleColor)} onChange={(hsb) => { setTitleHSB(hsb); setForm(f => ({ ...f, titleColor: hsbToHex(hsb) })) }} />
                      <TextField label="HEX" value={form.titleColor} onChange={(val) => { const c = val.toUpperCase(); setForm(f => ({ ...f, titleColor: c })) }} />
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text>Background Color</Text>
                      <ColorPicker color={hexToHsb(form.bgColor)} onChange={(hsb) => { setBgHSB(hsb); setForm(f => ({ ...f, bgColor: hsbToHex(hsb) })) }} />
                      <TextField label="HEX" value={form.bgColor} onChange={(val) => { const c = val.toUpperCase(); setForm(f => ({ ...f, bgColor: c })) }} />
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text>Message Color</Text>
                      <ColorPicker color={hexToHsb(form.msgColor)} onChange={(hsb) => { setMsgHSB(hsb); setForm(f => ({ ...f, msgColor: hsbToHex(hsb) })) }} />
                      <TextField label="HEX" value={form.msgColor} onChange={(val) => { const c = val.toUpperCase(); setForm(f => ({ ...f, msgColor: c })) }} />
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card>
              <Box padding="4">
                <BlockStack gap="400">
                  <InlineStack gap="200">
                    <Button onClick={() => navigate("/app/notification")}>Cancel</Button>
                    <Button primary onClick={save} loading={saving} disabled={saving}>Save</Button>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>

      {toast.active && <Toast content={toast.msg} error={toast.error} onDismiss={() => setToast(t => ({ ...t, active: false }))} duration={2000} />}
    </Frame>
  );
}
