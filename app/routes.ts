import type { RouteConfig } from "@remix-run/dev";

export default [
  { id: "root", file: "root.jsx" },
  { path: "app", file: "routes/app.jsx" }
] satisfies RouteConfig;
