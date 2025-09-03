import shopify from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic } = await shopify.webhooks.process(request);

  if (topic === "APP_UNINSTALLED") {
    await prisma.shop.update({
      where: { shop },
      data: {
        installed: false,
        accessToken: null,
      },
    });
  }

  return new Response("ok", { status: 200 });
};
