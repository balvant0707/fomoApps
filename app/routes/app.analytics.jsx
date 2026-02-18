// app/routes/app.dashboard.jsx
import { defer, json, redirect } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";
import {
  Frame,
  Page,
} from "@shopify/polaris";
import React, { Suspense } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { getOrSetCache } from "../utils/serverCache.server";

const StatsPanel = React.lazy(
  () => import("../components/dashboard/StatsPanel")
);


const EMPTY_ANALYTICS = {
  visitors: 0,
  clicks: 0,
  orders: 0,
  days: 30,
  breakdown: [],
  series: { labels: [], visitors: [], clicks: [], orders: [] },
};

const PRESET_DAY_OPTIONS = [7, 15, 30, 60, 90, 365];
const MAX_CUSTOM_RANGE_DAYS = 366;
const TYPE_DEFINITIONS = [
  { key: "order", label: "Order", sourceTypes: ["recent", "orders"] },
  { key: "addtocart", label: "AddToCart", sourceTypes: ["addtocart"] },
  { key: "visitor", label: "Visitor", sourceTypes: ["visitor"] },
  { key: "lowstock", label: "LowStock", sourceTypes: ["lowstock"] },
  { key: "discount", label: "Discount", sourceTypes: ["flash", "discount"] },
  { key: "review", label: "Reviews", sourceTypes: ["review", "reviews"] },
];

const normalizePopupType = (value) =>
  String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

const SOURCE_TYPE_TO_KEY = TYPE_DEFINITIONS.reduce((acc, def) => {
  for (const sourceType of def.sourceTypes) {
    acc[normalizePopupType(sourceType)] = def.key;
  }
  return acc;
}, {});

const closeRatePercent = (clicks, orders) => {
  const base = Number(clicks || 0);
  if (!base) return 0;
  return Math.round((Number(orders || 0) / base) * 100);
};

const createEmptyBreakdown = () =>
  TYPE_DEFINITIONS.map((def) => ({
    key: def.key,
    label: def.label,
    totalImpressions: 0,
    totalClicks: 0,
    totalOrders: 0,
    closeRate: 0,
    details: [],
  }));

const formatDateKey = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDateKey = (value) => {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const dt = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return formatDateKey(dt) === raw ? raw : null;
};

const buildDayList = (startKey, endKey) => {
  const out = [];
  const start = new Date(`${startKey}T00:00:00Z`);
  const end = new Date(`${endKey}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  if (start > end) return out;
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
};

const pickPresetDays = (value, fallback = 7) => {
  const n = Number(value);
  if (PRESET_DAY_OPTIONS.includes(n)) return n;
  return fallback;
};

function resolveAnalyticsFilter(url) {
  const rangeRaw = String(url.searchParams.get("range") || "").toLowerCase();
  const startRaw = parseDateKey(url.searchParams.get("start"));
  const endRaw = parseDateKey(url.searchParams.get("end"));

  if (rangeRaw === "custom" && startRaw && endRaw && startRaw <= endRaw) {
    const customDays = buildDayList(startRaw, endRaw).length;
    if (customDays >= 1 && customDays <= MAX_CUSTOM_RANGE_DAYS) {
      return {
        range: "custom",
        days: customDays,
        startDate: startRaw,
        endDate: endRaw,
      };
    }
  }

  const legacyDays = Number(url.searchParams.get("days"));
  const rangeDaysMatch = rangeRaw.match(/^(\d{1,3})d$/);
  const rangeDays = rangeDaysMatch ? Number(rangeDaysMatch[1]) : Number.NaN;
  const days = pickPresetDays(
    Number.isFinite(rangeDays) ? rangeDays : legacyDays,
    7
  );
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return {
    range: `${days}d`,
    days,
    startDate: formatDateKey(start),
    endDate: formatDateKey(end),
  };
}

function buildStats(rows, analytics = EMPTY_ANALYTICS, analyticsFilter = null) {
  const total = rows.length;
  const enabled = rows.filter((r) => r.enabled).length;
  const disabled = total - enabled;
  const byType = rows.reduce((acc, row) => {
    acc[row.key] = (acc[row.key] || 0) + 1;
    return acc;
  }, {});
  return { total, enabled, disabled, byType, analytics, analyticsFilter };
}

async function fetchRows(shop) {
  const hasMissingColumnError = (error) => {
    const code = String(error?.code || "").toUpperCase();
    const msg = String(error?.message || "").toLowerCase();
    return (
      code === "P2022" ||
      msg.includes("unknown column") ||
      (msg.includes("column") && msg.includes("does not exist"))
    );
  };

  const tableModel = (key) => {
    switch (key) {
      case "recent":
        return prisma.recentpopupconfig || prisma.recentPopupConfig || null;
      case "flash":
        return prisma.flashpopupconfig || prisma.flashPopupConfig || null;
      case "visitor":
        return prisma.visitorpopupconfig || prisma.visitorPopupConfig || null;
      case "lowstock":
        return prisma.lowstockpopupconfig || prisma.lowStockPopupConfig || null;
      case "addtocart":
        return prisma.addtocartpopupconfig || prisma.addToCartPopupConfig || null;
      case "review":
        return prisma.reviewpopupconfig || prisma.reviewPopupConfig || null;
      default:
        return null;
    }
  };

  const keys = ["recent", "flash", "visitor", "lowstock", "addtocart", "review"];
  const legacySelectByKey = {
    recent: { id: true, enabled: true, showType: true, messageText: true },
    flash: {
      id: true,
      enabled: true,
      showType: true,
      messageTitle: true,
      name: true,
      messageText: true,
    },
    visitor: {
      id: true,
      enabled: true,
      showHome: true,
      showProduct: true,
      showCollectionList: true,
      showCollection: true,
      showCart: true,
      message: true,
      timestamp: true,
    },
    lowstock: {
      id: true,
      enabled: true,
      showHome: true,
      showProduct: true,
      showCollectionList: true,
      showCollection: true,
      showCart: true,
      message: true,
    },
    addtocart: {
      id: true,
      enabled: true,
      showHome: true,
      showProduct: true,
      showCollectionList: true,
      showCollection: true,
      showCart: true,
      message: true,
      timestamp: true,
    },
    review: {
      id: true,
      enabled: true,
      showHome: true,
      showProduct: true,
      showCollectionList: true,
      showCollection: true,
      showCart: true,
      message: true,
      timestamp: true,
    },
  };
  const rows = [];
  for (const key of keys) {
    const model = tableModel(key);
    if (!model?.findFirst) continue;
    try {
      const row = await model.findFirst({
        where: { shop },
        orderBy: { id: "desc" },
      });
      if (row) {
        rows.push({
          ...row,
          key,
          enabled:
            row.enabled === true ||
            row.enabled === 1 ||
            row.enabled === "1",
        });
      }
    } catch (e) {
      if (!hasMissingColumnError(e)) {
        console.error(`[dashboard.loader] ${key} fetch failed:`, e);
        continue;
      }
      try {
        const select = legacySelectByKey[key];
        if (!select) continue;
        const row = await model.findFirst({
          where: { shop },
          orderBy: { id: "desc" },
          select,
        });
        if (!row) continue;
        rows.push({
          ...row,
          key,
          enabled:
            row.enabled === true ||
            row.enabled === 1 ||
            row.enabled === "1",
        });
      } catch (retryError) {
        console.error(`[dashboard.loader] ${key} legacy fetch failed:`, retryError);
      }
    }
  }

  return { rows, total: rows.length };
}

async function fetchAnalytics(shop, filter) {
  const model = prisma.popupAnalyticsEvent || prisma.popupanalyticsevent;
  const fallback = {
    ...EMPTY_ANALYTICS,
    days: filter.days,
    startDate: filter.startDate,
    endDate: filter.endDate,
    breakdown: createEmptyBreakdown(),
  };
  if (!model) return fallback;

  const dayList = buildDayList(filter.startDate, filter.endDate);
  if (!dayList.length) return fallback;

  const startAt = new Date(`${filter.startDate}T00:00:00.000Z`);
  const endAt = new Date(`${filter.endDate}T23:59:59.999Z`);
  const where = { shop, createdAt: { gte: startAt, lte: endAt } };

  try {
    const [clicks, orders, visitors, events] = await Promise.all([
      model.count({ where: { ...where, eventType: "click" } }),
      model.count({ where: { ...where, eventType: "order" } }),
      model.findMany({
        where: { ...where, eventType: "view", visitorId: { not: null } },
        select: { visitorId: true },
        distinct: ["visitorId"],
      }),
      model.findMany({
        where,
        select: { popupType: true, eventType: true, visitorId: true, createdAt: true },
      }),
    ]);

    const clicksByDay = new Map(dayList.map((k) => [k, 0]));
    const ordersByDay = new Map(dayList.map((k) => [k, 0]));
    const visitorsByDaySet = new Map(dayList.map((k) => [k, new Set()]));
    const typeStats = TYPE_DEFINITIONS.reduce((acc, def) => {
      acc[def.key] = {
        totalImpressions: 0,
        totalClicks: 0,
        totalOrders: 0,
        byDay: new Map(),
      };
      return acc;
    }, {});

    for (const ev of events || []) {
      const day = formatDateKey(new Date(ev.createdAt));
      const typeKey = SOURCE_TYPE_TO_KEY[normalizePopupType(ev.popupType)] || null;
      if (!clicksByDay.has(day)) continue;

      if (ev.eventType === "click") {
        clicksByDay.set(day, (clicksByDay.get(day) || 0) + 1);
      } else if (ev.eventType === "order") {
        ordersByDay.set(day, (ordersByDay.get(day) || 0) + 1);
      } else if (ev.eventType === "view" && ev.visitorId) {
        visitorsByDaySet.get(day)?.add(ev.visitorId);
      }

      if (!typeKey || !typeStats[typeKey]) continue;
      const statsByType = typeStats[typeKey];
      const dayStats = statsByType.byDay.get(day) || {
        date: day,
        impressions: 0,
        clicks: 0,
        orders: 0,
      };

      if (ev.eventType === "view") {
        statsByType.totalImpressions += 1;
        dayStats.impressions += 1;
      } else if (ev.eventType === "click") {
        statsByType.totalClicks += 1;
        dayStats.clicks += 1;
      } else if (ev.eventType === "order") {
        statsByType.totalOrders += 1;
        dayStats.orders += 1;
      }

      statsByType.byDay.set(day, dayStats);
    }

    const breakdown = TYPE_DEFINITIONS.map((def) => {
      const row = typeStats[def.key];
      const details = Array.from(row.byDay.values())
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((item) => ({
          startDate: item.date,
          endDate: item.date,
          impressions: item.impressions,
          clicks: item.clicks,
          orders: item.orders,
          closeRate: closeRatePercent(item.clicks, item.orders),
        }));

      return {
        key: def.key,
        label: def.label,
        totalImpressions: row.totalImpressions,
        totalClicks: row.totalClicks,
        totalOrders: row.totalOrders,
        closeRate: closeRatePercent(row.totalClicks, row.totalOrders),
        details,
      };
    });

    return {
      visitors: visitors.length,
      clicks,
      orders,
      days: dayList.length,
      startDate: filter.startDate,
      endDate: filter.endDate,
      breakdown,
      series: {
        labels: dayList,
        visitors: dayList.map((k) => visitorsByDaySet.get(k)?.size || 0),
        clicks: dayList.map((k) => clicksByDay.get(k) || 0),
        orders: dayList.map((k) => ordersByDay.get(k) || 0),
      },
    };
  } catch (e) {
    console.error("[dashboard.analytics] query failed:", e);
    return fallback;
  }
}

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const analyticsFilter = resolveAnalyticsFilter(url);

  const cacheKey = `dashboard:rows:${shop}`;

  const rowsPromise = getOrSetCache(cacheKey, 10000, () => fetchRows(shop)).catch(
    (e) => {
      console.error("[dashboard.loader] Prisma error:", e);
      return {
        rows: [],
        total: 0,
        error: "Failed to load dashboard data.",
      };
    }
  );

  const analyticsPromise = getOrSetCache(
    `dashboard:analytics:${shop}:${analyticsFilter.startDate}:${analyticsFilter.endDate}`,
    15000,
    () => fetchAnalytics(shop, analyticsFilter)
  ).catch(() => EMPTY_ANALYTICS);

  const statsPromise = Promise.all([rowsPromise, analyticsPromise]).then(
    ([data, analytics]) => buildStats(data.rows || [], analytics, analyticsFilter)
  );

  return defer({
    stats: statsPromise,
  });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const form = await request.formData();
  const _action = form.get("_action");
  const isFetch = request.headers.get("X-Remix-Request") === "yes";

  const safeJson = (data, init = {}) => json(data, init);

  if (_action === "delete") {
    const id = Number(form.get("id"));
    const key = String(form.get("key") || "").toLowerCase();
    try {
      const model =
        key === "recent"
          ? prisma.recentpopupconfig || prisma.recentPopupConfig
          : key === "flash"
            ? prisma.flashpopupconfig || prisma.flashPopupConfig
            : key === "visitor"
              ? prisma.visitorpopupconfig || prisma.visitorPopupConfig
              : key === "lowstock"
                ? prisma.lowstockpopupconfig || prisma.lowStockPopupConfig
                : key === "addtocart"
                  ? prisma.addtocartpopupconfig || prisma.addToCartPopupConfig
                  : key === "review"
                    ? prisma.reviewpopupconfig || prisma.reviewPopupConfig
                    : null;
      if (id && model?.deleteMany) {
        await model.deleteMany({ where: { id, shop } });
      }
      if (isFetch) return safeJson({ ok: true });
      search.set("deleted", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    } catch (e) {
      console.error("[dashboard.action:delete] error:", e);
      if (isFetch) {
        return safeJson({ ok: false, error: "Delete failed" }, { status: 500 });
      }
      search.set("error", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    }
  }

  if (_action === "update") {
    const id = Number(form.get("id"));
    const key = String(form.get("key") || "").toLowerCase();
    const messageText = form.get("messageText")?.toString() ?? "";
    const showType = form.get("showType")?.toString() ?? "allpage";
    const enabled = form.get("enabled") === "on";

    try {
      const model =
        key === "recent"
          ? prisma.recentpopupconfig || prisma.recentPopupConfig
          : key === "flash"
            ? prisma.flashpopupconfig || prisma.flashPopupConfig
            : null;
      if (id && model?.updateMany) {
        await model.updateMany({
          where: { id, shop },
          data: { messageText, showType, enabled },
        });
      }
      if (isFetch) return safeJson({ ok: true, saved: true });
      search.set("saved", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    } catch (e) {
      console.error("[dashboard.action:update] error:", e);
      if (isFetch) {
        return safeJson({ ok: false, error: "Update failed" }, { status: 500 });
      }
      search.set("error", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    }
  }

  if (_action === "toggle-enabled") {
    const id = Number(form.get("id"));
    const key = String(form.get("key") || "").toLowerCase();
    const enabled = form.get("enabled") === "on";
    try {
      const model =
        key === "recent"
          ? prisma.recentpopupconfig || prisma.recentPopupConfig
          : key === "flash"
            ? prisma.flashpopupconfig || prisma.flashPopupConfig
            : key === "visitor"
              ? prisma.visitorpopupconfig || prisma.visitorPopupConfig
              : key === "lowstock"
                ? prisma.lowstockpopupconfig || prisma.lowStockPopupConfig
                : key === "addtocart"
                  ? prisma.addtocartpopupconfig || prisma.addToCartPopupConfig
                  : key === "review"
                    ? prisma.reviewpopupconfig || prisma.reviewPopupConfig
                    : null;
      if (id && model?.updateMany) {
        await model.updateMany({
          where: { id, shop },
          data: { enabled },
        });
      }
      if (isFetch) return safeJson({ ok: true });
      return redirect(`/app/dashboard?${search.toString()}`);
    } catch (e) {
      console.error("[dashboard.action:toggle] error:", e);
      if (isFetch) {
        return safeJson({ ok: false, error: "Toggle failed" }, { status: 500 });
      }
      search.set("error", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    }
  }

  return safeJson({ ok: false, error: "Unknown action" }, { status: 400 });
}

export default function NotificationList() {
  const { stats } = useLoaderData();

  return (
    <Frame>
      <Page title="Analytics" fullWidth>
        <Suspense fallback={null}>
          <Await resolve={stats} errorElement={null}>
            {(data) => (
              <Suspense fallback={null}>
                <StatsPanel stats={data} />
              </Suspense>
            )}
          </Await>
        </Suspense>
      </Page>
    </Frame>
  );
}
