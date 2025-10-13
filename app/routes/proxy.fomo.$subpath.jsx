import { json } from "@remix-run/node";
import { prisma } from "../db.server";

export const loader = async ({ request, params }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const subpath = params.subpath;

    if (!shop) {
      return json({ error: "Missing shop" }, { status: 400 });
    }

    // Normalize shop name (remove protocol if present)
    const normalizedShop = shop.replace(/^https?:\/\//, "");

    if (subpath === "session") {
      // Check session readiness for theme extension
      const shopRecord = await prisma.shop.findUnique({
        where: { shop: normalizedShop },
        select: {
          shop: true,
          installed: true,
          accessToken: true,
          themeExtensionEnabled: true
        }
      });

      if (!shopRecord) {
        return json({
          sessionReady: false,
          shop: normalizedShop,
          installed: false,
          error: "Shop not found",
          timestamp: Date.now()
        });
      }

      const sessionReady = shopRecord.installed && !!shopRecord.accessToken && shopRecord.themeExtensionEnabled;

      return json({
        sessionReady,
        shop: normalizedShop,
        installed: shopRecord.installed,
        hasAccessToken: !!shopRecord.accessToken,
        themeExtensionEnabled: shopRecord.themeExtensionEnabled,
        timestamp: Date.now()
      });
    }

    if (subpath === "popup") {
      // First check session
      const shopRecord = await prisma.shop.findUnique({
        where: { shop: normalizedShop },
        select: {
          installed: true,
          accessToken: true,
          themeExtensionEnabled: true
        }
      });

      if (!shopRecord || !shopRecord.installed || !shopRecord.accessToken || !shopRecord.themeExtensionEnabled) {
        return json({
          showPopup: false,
          sessionReady: false,
          error: "Session not ready",
          shop: normalizedShop,
          timestamp: Date.now()
        });
      }

      const configs = await prisma.notificationConfig.findMany({
        where: { shop: normalizedShop },
        orderBy: { id: "desc" }, // optional: latest first
      });

      if (!configs || configs.length === 0) {
        return json({
          showPopup: false,
          sessionReady: true,
          shop: normalizedShop,
          timestamp: Date.now()
        });
      }

      return json({
        showPopup: true,
        sessionReady: true,
        records: configs, // returns full objects for all records
        shop: normalizedShop,
        timestamp: Date.now()
      });
    }

    return json({ error: "Unknown proxy path" }, { status: 404 });

  } catch (err) {
    console.error("[FOMO Loader Error]:", err);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
};
