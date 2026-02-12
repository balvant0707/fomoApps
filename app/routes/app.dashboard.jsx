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
  series: { labels: [], visitors: [], clicks: [], orders: [] },
};

function buildStats(rows, analytics = EMPTY_ANALYTICS) {
  const total = rows.length;
  const enabled = rows.filter((r) => r.enabled).length;
  const disabled = total - enabled;
  const byType = rows.reduce((acc, row) => {
    acc[row.key] = (acc[row.key] || 0) + 1;
    return acc;
  }, {});
  return { total, enabled, disabled, byType, analytics };
}

async function fetchRows(shop) {
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
      console.error(`[dashboard.loader] ${key} fetch failed:`, e);
    }
  }

  return { rows, total: rows.length };
}

async function fetchAnalytics(shop, days = 30) {
  const model = prisma.popupAnalyticsEvent || prisma.popupanalyticsevent;
  if (!model) return { ...EMPTY_ANALYTICS, days };

  const d = Number(days) || 30;
  const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const where = { shop, createdAt: { gte: since } };

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
        select: { eventType: true, visitorId: true, createdAt: true },
      }),
    ]);

    const dayList = [];
    for (let i = d - 1; i >= 0; i--) {
      const dt = new Date();
      dt.setHours(0, 0, 0, 0);
      dt.setDate(dt.getDate() - i);
      dayList.push(dt.toISOString().slice(0, 10));
    }

    const clicksByDay = new Map(dayList.map((k) => [k, 0]));
    const ordersByDay = new Map(dayList.map((k) => [k, 0]));
    const visitorsByDaySet = new Map(dayList.map((k) => [k, new Set()]));

    for (const ev of events || []) {
      const day = new Date(ev.createdAt).toISOString().slice(0, 10);
      if (!clicksByDay.has(day)) continue;
      if (ev.eventType === "click") {
        clicksByDay.set(day, (clicksByDay.get(day) || 0) + 1);
      } else if (ev.eventType === "order") {
        ordersByDay.set(day, (ordersByDay.get(day) || 0) + 1);
      } else if (ev.eventType === "view" && ev.visitorId) {
        visitorsByDaySet.get(day)?.add(ev.visitorId);
      }
    }

    return {
      visitors: visitors.length,
      clicks,
      orders,
      days: d,
      series: {
        labels: dayList,
        visitors: dayList.map((k) => visitorsByDaySet.get(k)?.size || 0),
        clicks: dayList.map((k) => clicksByDay.get(k) || 0),
        orders: dayList.map((k) => ordersByDay.get(k) || 0),
      },
    };
  } catch (e) {
    console.error("[dashboard.analytics] query failed:", e);
    return { ...EMPTY_ANALYTICS, days: d };
  }
}

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

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
    `dashboard:analytics:${shop}`,
    15000,
    () => fetchAnalytics(shop, 30)
  ).catch(() => EMPTY_ANALYTICS);

  const statsPromise = Promise.all([rowsPromise, analyticsPromise]).then(
    ([data, analytics]) => buildStats(data.rows || [], analytics)
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
      <Page title="Dashboard" fullWidth>
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
