// import { flatRoutes } from "@remix-run/fs-routes";

// export default flatRoutes();
// app/routes.js
// app/routes.js
// import { flatRoutes } from "@remix-run/fs-routes";
// export default flatRoutes("routes");

// app/routes.js

/** @type {import('@remix-run/dev').RouteConfig} */
export default [
  // Root layout (required)
  { id: "root", file: "root.jsx" },

  // Parent /app route (your AppProvider + <Outlet/> lives here)
  {
    path: "app",
    file: "routes/app.jsx",
    children: [
      // 👉 Uncomment ONLY if the file exists in repo:
      // { path: "", file: "routes/app._index.jsx" },                  // /app
      // { path: "dashboard", file: "routes/app.dashboard.jsx" },      // /app/dashboard
      // { path: "notification", file: "routes/app.notification.jsx" },// /app/notification
      // { path: "notification/:key/edit/:id", file: "routes/app.notification.$key.edit.$id.jsx" },
      // { path: "theme-embed", file: "routes/app.theme-embed.jsx" },  // /app/theme-embed
      // { path: "documents", file: "routes/app.documents.jsx" },      // /app/documents
      // { path: "help", file: "routes/app.help.jsx" },                // /app/help
    ],
  },

  // Optional site index if you have routes/_index.jsx
  // { path: "", file: "routes/_index.jsx" },
];
