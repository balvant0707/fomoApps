import { TitleBar } from "@shopify/app-bridge-react";

export default function Settings() {
  return (
    <div style={{ padding: "2rem" }}>
      <TitleBar title="Settings" />
      <h2>Help Page</h2>
      <p>Configure your app help here.</p>
    </div>
  );
}