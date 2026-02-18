import { getOrSetCache } from "./serverCache.server";
import { APP_EMBED_HANDLE } from "./themeEmbed.shared";

export const THEME_SETTINGS_DATA_KEY = "config/settings_data.json";
export { APP_EMBED_HANDLE };

const toLower = (value) => String(value || "").trim().toLowerCase();

async function fetchThemeSettingsData({ admin, themeId }) {
  const params = {
    session: admin.session,
    theme_id: themeId,
    asset: { key: THEME_SETTINGS_DATA_KEY },
  };

  try {
    const resp = await admin.rest.resources.Asset.all(params);
    const data = resp?.data;
    if (Array.isArray(data)) return data[0]?.value || "";
    if (data?.asset?.value) return data.asset.value;
    return data?.value || "";
  } catch (assetError) {
    if (!admin?.rest?.get) throw assetError;
    const fallbackResp = await admin.rest.get({
      path: `themes/${themeId}/assets`,
      query: { "asset[key]": THEME_SETTINGS_DATA_KEY },
    });
    const body = fallbackResp?.body || fallbackResp?.data || {};
    return body?.asset?.value || "";
  }
}

export async function getMainThemeId({ admin, shop }) {
  try {
    const cacheKey = `themes:main:${shop}`;
    const cached = await getOrSetCache(cacheKey, 60000, async () => {
      const resp = await admin.rest.resources.Theme.all({
        session: admin.session,
        fields: "id,role",
      });
      const themes = resp?.data || [];
      const live = themes.find((t) => t.role === "main");
      return live?.id ?? null;
    });
    return cached ?? null;
  } catch (error) {
    console.error("[theme-embed] theme list failed:", error);
    return null;
  }
}

export async function getThemeEmbedState({
  admin,
  shop,
  themeId,
  apiKey,
  extId,
  embedHandle = APP_EMBED_HANDLE,
}) {
  try {
    if (!themeId) return { enabled: false, found: false, checked: false };

    const settingsRaw = await getOrSetCache(
      `themes:settings:${shop}:${themeId}`,
      5000,
      () => fetchThemeSettingsData({ admin, themeId })
    );
    if (!settingsRaw) return { enabled: false, found: false, checked: false };

    let parsed = null;
    try {
      parsed = JSON.parse(settingsRaw);
    } catch {
      return { enabled: false, found: false, checked: false };
    }
    const blocks = parsed?.current?.blocks;
    if (!blocks || typeof blocks !== "object") {
      return { enabled: false, found: false, checked: false };
    }

    const handleToken = toLower(embedHandle);
    const appHandleNeedle = `/apps/${handleToken}/`;
    const blockHandleNeedle = `/blocks/${handleToken}/`;
    const extNeedle = toLower(extId);
    const apiNeedle = toLower(apiKey);

    let found = false;
    let enabled = false;

    for (const block of Object.values(blocks)) {
      const type = toLower(block?.type);
      if (!type) continue;

      const matchesHandle =
        type.includes(appHandleNeedle) || type.includes(blockHandleNeedle);
      const matchesExtension = extNeedle ? type.includes(extNeedle) : false;
      const matchesApiKey = apiNeedle ? type.includes(apiNeedle) : false;
      if (!matchesHandle && !matchesExtension && !matchesApiKey) continue;

      found = true;
      const isDisabled =
        block?.disabled === true || toLower(block?.disabled) === "true";
      if (!isDisabled) {
        enabled = true;
        break;
      }
    }

    return { enabled, found, checked: true };
  } catch (error) {
    console.error("[theme-embed] embed detect failed:", error);
    return { enabled: false, found: false, checked: false };
  }
}

export async function getAppEmbedContext({
  admin,
  shop,
  apiKey,
  extId,
  embedHandle = APP_EMBED_HANDLE,
}) {
  const themeId = await getMainThemeId({ admin, shop });
  const state = await getThemeEmbedState({
    admin,
    shop,
    themeId,
    apiKey,
    extId,
    embedHandle,
  });
  return {
    themeId: themeId ?? null,
    appEmbedEnabled: Boolean(state?.enabled),
    appEmbedFound: Boolean(state?.found),
    appEmbedChecked: Boolean(state?.checked),
  };
}
