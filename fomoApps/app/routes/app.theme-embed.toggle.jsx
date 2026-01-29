// app/routes/app.theme-embed.toggle.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { toggleEmbed } from "../lib/theme-embed.server";
import { prisma } from "../db.server";

export const action = async ({ request }) => {
  const { rest, session } = await authenticate.admin(request);

  if (!rest?.get) {
    return json({ ok: false, error: "Session not ready" }, { status: 428 });
  }

  try {
    const form = await request.formData();
    const enable = form.get("enable") === "true";
    const out = await toggleEmbed(rest, enable);
    if (out?.needs_activation) return json(out, { status: 409 });

    await prisma.shop.update({
      where: { shop: session.shop.toLowerCase() },
      data: { onboardedAt: new Date() },
    });

    return json(out || { ok: false }, { status: 200 });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
};
