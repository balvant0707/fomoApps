// app/routes/app.notification.jsx
import { Frame } from "@shopify/polaris";
import { Outlet } from "@remix-run/react";

export default function NotificationLayout() {
  // Parent layout for all /app/notification/* routes
  return (
    <Frame>
      <Outlet />  {/* renders: /app/notification (index), /recent, /flash */}
    </Frame>
  );
}
