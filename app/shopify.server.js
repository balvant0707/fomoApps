// app/shopify.server.js
import "@shopify/shopify-app-remix/server/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  DeliveryMethod,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";


const norm = (s) => (s || "").toLowerCase();

export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (process.env.SCOPES || "").split(",").filter(Boolean),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  distribution: AppDistribution.AppStore,
  sessionStorage: new PrismaSessionStorage(prisma),
  future: { unstable_newEmbeddedAuthStrategy: true, removeRest: true },

  // Register topics (handlers are in /webhooks routes via authenticate.webhook)
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    // ✅ GDPR (required for App Store)
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    // (optional but useful) if app scopes change
    APP_SCOPES_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
  },

  hooks: {
    // OAuth complete → save token, mark installed, and (re)register webhooks
    afterAuth: async ({ session }) => {
      const s = norm(session.shop);

      await prisma.shop.upsert({
        where: { shop: s },
        update: {
          accessToken: session.accessToken ?? null,
          installed: true,
          uninstalledAt: null,
        },
        create: {
          shop: s,
          accessToken: session.accessToken ?? null,
          installed: true,
        },
      });

      const reg = await shopify.registerWebhooks({ session });
      console.log("🔔 registerWebhooks:", JSON.stringify(reg, null, 2));
    },
  },
});

export default shopify;

// named exports used by routes
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
