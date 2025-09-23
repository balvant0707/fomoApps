// import { flatRoutes } from "@remix-run/fs-routes";

// export default flatRoutes();
// app/routes.js
// app/routes.js
// Explicit static route map (no fs-routes). Works reliably on Vercel.

export default [
    {
        id: "root",
        file: "root.jsx", // /app/root.jsx
        children: [
            // 👉 If you DON'T have routes/_index.jsx, delete the next line.
            { index: true, file: "routes/_index.jsx" },

            // /app
            { path: "app", file: "routes/app._index.jsx" },

            // /app/dashboard
            { path: "app/dashboard", file: "routes/app.dashboard.jsx" },

            // /app/products-picker
            { path: "app/products-picker", file: "routes/app.products-picker.jsx" },

            // /app/notification  and its children
            { path: "app/notification", file: "routes/app.notification.jsx" },
            { path: "app/notification/flash", file: "routes/app.notification.flash.jsx" },
            { path: "app/notification/recent", file: "routes/app.notification.recent.jsx" },
            { path: "app/notification/:key/edit/:id", file: "routes/app.notification.$key.edit.$id.jsx" },

            // /app/theme-embed (+ /app/theme-embed/toggle)
            { path: "app/theme-embed", file: "routes/app.theme-embed.jsx" },
            { path: "app/theme-embed/toggle", file: "routes/app.theme-embed.toggle.jsx" },

            // /auth/*  (splat)
            { path: "auth/*", file: "routes/auth.$.jsx" },

            // /proxy/fomo/:subpath
            { path: "proxy/fomo/:subpath", file: "routes/proxy.fomo.$subpath.jsx" },

            // /webhooks and /webhooks/* (catch-all)
            { path: "webhooks", file: "routes/webhooks.jsx" },
            { path: "webhooks/*", file: "routes/webhooks.$.jsx" },

            // /stats (if this file truly exists)
            { path: "stats", file: "routes/stats.js" }
        ]
    }
];


