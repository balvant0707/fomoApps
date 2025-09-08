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

    if (subpath === "popup") {
      const configs = await prisma.notificationConfig.findMany({
        where: { shop },
        orderBy: { id: "desc" }, // optional: latest first
      });

      if (!configs || configs.length === 0) {
        return json({ showPopup: false });
      }

      return json({
        showPopup: true,
        records: configs, // returns full objects for all records
      });
    }

    return json({ error: "Unknown proxy path" }, { status: 404 });

  } catch (err) {
    console.error("[FOMO Loader Error]:", err);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
};
