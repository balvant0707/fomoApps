import prisma from "../db.server";

const EMBED_ON_WINDOW_MS = 10 * 60 * 1000;

const embedPingModel = () => prisma.embedPing || prisma.embedping || null;

export async function getEmbedPingStatus(shopDomain) {
  const now = new Date();
  const shop = String(shopDomain || "").trim().toLowerCase();

  const fallback = {
    isOn: false,
    lastPingAt: null,
    checkedAt: now.toISOString(),
  };

  if (!shop) return fallback;

  const model = embedPingModel();
  if (!model?.findUnique) return fallback;

  try {
    const row = await model.findUnique({
      where: { shop },
      select: { lastPingAt: true },
    });
    const lastPingAt = row?.lastPingAt ? new Date(row.lastPingAt) : null;
    const isOn =
      Boolean(lastPingAt) &&
      now.getTime() - lastPingAt.getTime() <= EMBED_ON_WINDOW_MS;

    return {
      isOn,
      lastPingAt: lastPingAt ? lastPingAt.toISOString() : null,
      checkedAt: now.toISOString(),
    };
  } catch (error) {
    console.error("[embed-ping] status lookup failed:", error);
    return fallback;
  }
}
