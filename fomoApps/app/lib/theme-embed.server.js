// app/lib/theme-embed.server.js
import { APP_HANDLE, EMBED_HANDLE } from "./theme-embed.constants.js";

function decodeAsset(asset) {
  if (!asset?.asset) return "";
  if (asset.asset.value) return asset.asset.value;
  if (asset.asset.attachment) {
    return Buffer.from(asset.asset.attachment, "base64").toString("utf8");
  }
  return "";
}

export async function getMainTheme(rest) {
  if (!rest?.get) throw new Error("Admin REST client missing.");
  const res = await rest.get({ path: "themes" });
  const main = res.data.themes.find((t) => t.role === "main");
  if (!main) throw new Error("MAIN theme not found");
  return main;
}

export async function safeReadSettingsData(rest, themeId) {
  try {
    const res = await rest.get({
      path: `themes/${themeId}/assets`,
      query: { "asset[key]": "config/settings_data.json" },
    });
    const raw = decodeAsset(res.data);
    if (!raw) return { current: { blocks: {} } };
    return JSON.parse(raw);
  } catch {
    return { current: { blocks: {} } };
  }
}

export function findEmbedBlockKey(json) {
  const blocks = json?.current?.blocks || {};
  const prefix = `shopify://apps/${APP_HANDLE}/blocks/${EMBED_HANDLE}/`;
  for (const [k, v] of Object.entries(blocks)) {
    if (typeof v?.type === "string" && v.type.startsWith(prefix)) return k;
  }
  return null;
}

export async function writeSettingsData(rest, themeId, json) {
  await rest.put({
    path: `themes/${themeId}/assets`,
    data: { asset: { key: "config/settings_data.json", value: JSON.stringify(json, null, 2) } },
  });
}

export async function readEmbedStatus(rest) {
  const theme = await getMainTheme(rest);
  const data = await safeReadSettingsData(rest, theme.id);
  const key = findEmbedBlockKey(data);
  if (!key) return { exists: false, enabled: false, themeId: theme.id };
  const disabled = !!data.current.blocks[key].disabled;
  return { exists: true, enabled: !disabled, themeId: theme.id, blockKey: key, data };
}

export async function toggleEmbed(rest, enable) {
  const theme = await getMainTheme(rest);
  const data = await safeReadSettingsData(rest, theme.id);
  const key = findEmbedBlockKey(data);
  if (!key) {
    return {
      ok: false,
      needs_activation: true,
      activate_url: `/admin/themes/current/editor?context=apps&activateAppId=${process.env.SHOPIFY_API_KEY}/${EMBED_HANDLE}`,
    };
  }
  data.current.blocks[key].disabled = !enable;
  await writeSettingsData(rest, theme.id, data);
  return { ok: true, enabled: enable };
}
