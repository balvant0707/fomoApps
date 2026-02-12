// app/routes/app.notification.$key.edit.$id.jsx
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  await authenticate.admin(request);
  const key = String(params?.key || "").toLowerCase();
  const url = new URL(request.url);
  const search = url.search || "";
  if (key === "recent" || key === "flash") {
    return redirect(`/app/notification/${key}${search}`);
  }
  throw new Response("Not Found", { status: 404 });
};

export const action = async ({ request, params }) => {
  await authenticate.admin(request);
  const key = String(params?.key || "").toLowerCase();
  const url = new URL(request.url);
  const search = url.search || "";
  if (key === "recent" || key === "flash") {
    return redirect(`/app/notification/${key}${search}`);
  }
  throw new Response("Not Found", { status: 404 });
};

export default function DeprecatedEditRoute() {
  return null;
}
