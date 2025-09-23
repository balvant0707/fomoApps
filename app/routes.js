import { flatRoutes } from "@remix-run/fs-routes";

// export default flatRoutes();
// app/routes.js
// app/routes.js
// import { flatRoutes } from "@remix-run/fs-routes";
// export default flatRoutes("routes");

// app/routes.js
// ✅ Do NOT import flatRoutes here.
// ✅ This MUST export a plain array of route objects.

export default [
  // Root route (app/root.jsx હોવું જ જોઇએ)
  { id: "root", file: "root.jsx" },

  // Parent /app (app/routes/app.jsx તમે પહેલેથી રાખો છો)
  { path: "app", file: "routes/app.jsx" },
];
