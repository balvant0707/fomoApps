/** @type {import('@remix-run/dev').RouteConfig} */
export default [
  { id: "root", file: "root.jsx" },      // જો તમે app/root.tsx વાપરો છો તો "root.tsx" લખો
  { path: "app", file: "routes/app.jsx" } // જો app/routes/app.tsx હોય તો "app.tsx" લખો
];
