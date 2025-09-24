import { flatRoutes } from "@remix-run/fs-routes";

export default flatRoutes();
export const handle = {
  id: "root",
};
export const unstable_shouldReload = () => false;
export const unstable_isRouteErrorResponse = () => false;
export const handleRouteError = () => null;
export const handleRouteChange = () => null;
export const handleRouteFocus = () => null;
export const handleRouteBlur = () => null;