import { TitleBar } from "@shopify/app-bridge-react";

export default function Settings() {
  return (
    <div style={{ padding: "2rem" }}>
      <TitleBar title="Documents" />
      <h2>Settings Page</h2>
      <p>Configure your app settings here.</p>
    </div>
  );
}