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


const EMPTY_ANALYTICS = { visitors: 0, clicks: 0, orders: 0, days: 30 };

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
  if (!prisma?.notificationconfig?.findMany) {
    throw new Error("Prisma not initialized or model missing");
  }

  const rows = await prisma.notificationconfig.findMany({
    where: { shop },
    orderBy: { id: "desc" },
  });

  return { rows, total: rows.length };
}

async function fetchAnalytics(shop, days = 30) {
  const model = prisma.popupAnalyticsEvent || prisma.popupanalyticsevent;
  if (!model) return { ...EMPTY_ANALYTICS, days };

  const d = Number(days) || 30;
  const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const where = { shop, createdAt: { gte: since } };

  try {
    const [clicks, orders, visitors] = await Promise.all([
      model.count({ where: { ...where, eventType: "click" } }),
      model.count({ where: { ...where, eventType: "order" } }),
      model.findMany({
        where: { ...where, eventType: "view", visitorId: { not: null } },
        select: { visitorId: true },
        distinct: ["visitorId"],
      }),
    ]);

    return {
      visitors: visitors.length,
      clicks,
      orders,
      days: d,
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
    try {
      if (id && prisma?.notificationconfig?.deleteMany) {
        await prisma.notificationconfig.deleteMany({ where: { id, shop } });
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
    const messageText = form.get("messageText")?.toString() ?? "";
    const showType = form.get("showType")?.toString() ?? "allpage";
    const enabled = form.get("enabled") === "on";

    try {
      if (id && prisma?.notificationconfig?.updateMany) {
        await prisma.notificationconfig.updateMany({
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
    const enabled = form.get("enabled") === "on";
    try {
      if (id && prisma?.notificationconfig?.updateMany) {
        await prisma.notificationconfig.updateMany({
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
