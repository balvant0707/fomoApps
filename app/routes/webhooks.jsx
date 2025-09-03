import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, body } = await authenticate.webhook(request);

  if (topic === "APP_UNINSTALLED") {
    await prisma.session.deleteMany({
      where: { shop },
    });
    console.log(`✅ ${shop} uninstalled — sessions deleted.`);
  }

  return new Response("OK");
};
