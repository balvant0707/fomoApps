// app/routes/app.dashboard.logs.jsx
import { defer } from "@remix-run/node";
import { Await, Link, useLoaderData } from "@remix-run/react";
import {
  Card,
  Frame,
  Page,
  SkeletonBodyText,
  Text,
} from "@shopify/polaris";
import React, { Suspense } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

const LogsTable = React.lazy(
  () => import("../components/dashboard/LogsTable")
);

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  const logsPromise = prisma.notificationconfig.findMany({
    where: { shop },
    orderBy: { id: "desc" },
    take: 30,
  });

  return defer({ logs: logsPromise });
}

function LogsSkeleton() {
  return (
    <Card>
      <div style={{ padding: 16 }}>
        <SkeletonBodyText lines={8} />
      </div>
    </Card>
  );
}

export default function DashboardLogsPage() {
  const { logs } = useLoaderData();

  return (
    <Frame>
      <Page
        title="Dashboard Logs"
        backAction={{ content: "Back", url: "/app/dashboard" }}
      >
        <Text as="p" tone="subdued">
          This page loads only when requested to keep the main dashboard fast.
        </Text>
        <Suspense fallback={<LogsSkeleton />}>
          <Await resolve={logs} errorElement={<LogsSkeleton />}>
            {(data) => (
              <Suspense fallback={<LogsSkeleton />}>
                <LogsTable items={data} />
              </Suspense>
            )}
          </Await>
        </Suspense>
        <div style={{ marginTop: 16 }}>
          <Link to="/app/dashboard" prefetch="intent">
            Back to Dashboard
          </Link>
        </div>
      </Page>
    </Frame>
  );
}
