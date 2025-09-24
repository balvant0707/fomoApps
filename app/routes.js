// routes.js (project root)
// import { flatRoutes } from "@remix-run/fs-routes";
// export default flatRoutes();
// routes.js (repo root)
import { flatRoutes } from "@remix-run/fs-routes";
export default function routes(defineRoutes) {
    return flatRoutes(defineRoutes);
}
