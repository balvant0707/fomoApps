// app/routes/app.notification.$key.edit.$id.jsx
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const EDITABLE_KEYS = new Set([
  "recent",
  "flash",
  "visitor",
  "lowstock",
  "addtocart",
  "review",
]);

const buildEditorRedirect = (request, params) => {
  const key = String(params?.key || "").toLowerCase();
  if (!EDITABLE_KEYS.has(key)) {
    throw new Response("Not Found", { status: 404 });
  }

  const idNum = Number(params?.id);
  const hasValidId = Number.isInteger(idNum) && idNum > 0;
  const url = new URL(request.url);
  const sp = new URLSearchParams(url.search);
  sp.delete("editId");
  if (hasValidId) {
    sp.set("id", String(idNum));
  } else {
    sp.delete("id");
  }

  const search = sp.toString();
  return `/app/notification/${key}${search ? `?${search}` : ""}`;
};

export const loader = async ({ request, params }) => {
  await authenticate.admin(request);
  return redirect(buildEditorRedirect(request, params));
};

export const action = async ({ request, params }) => {
  await authenticate.admin(request);
  return redirect(buildEditorRedirect(request, params));
};

export default function DeprecatedEditRoute() {
  return null;
}
