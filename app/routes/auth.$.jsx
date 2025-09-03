import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  console.log("AUTH CALLBACK LOADED");
  console.log("Session:", session);

  try {
    await prisma.shop.upsert({
      where: { shop: session.shop },
      update: {
        accessToken: session.accessToken,
        installed: true,
      },
      create: {
        shop: session.shop,
        accessToken: session.accessToken,
        installed: true,
      },
    });
    console.log("Shop inserted/updated successfully!");
  } catch (err) {
    console.error("DB Error:", err);
  }

  return Response.redirect("/");
};
