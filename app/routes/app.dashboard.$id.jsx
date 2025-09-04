// app/routes/app.dashboard.$id.jsx
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { Page, Card, TextField, Button, Select, BlockStack, Checkbox } from "@shopify/polaris";
import { useState } from "react";

// 👇 path તમારા પ્રોજેક્ટ મુજબ સાચો રાખવો
import { prisma } from "../db.server";

export async function loader({ params }) {
  const id = Number(params.id);
  const record = await prisma.notificationConfig.findUnique({ where: { id } });
  if (!record) throw new Response("Not Found", { status: 404 });
  return json({ record });
}

export async function action({ request, params }) {
  const id = Number(params.id);
  const form = await request.formData();

  await prisma.notificationConfig.update({
    where: { id },
    data: {
      shop: String(form.get("shop")),
      key: String(form.get("key")),
      showType: String(form.get("showType")),
      enabled: form.get("enabled") === "on",
      messageTitle: form.get("messageTitle"),
      messageText: form.get("messageText"),
    },
  });

  // ✅ Update પછી Dashboard લિસ્ટ પર પાછાં
  return redirect("/app/dashboard");
}

export default function EditConfig() {
  const { record } = useLoaderData();
  const [shop, setShop] = useState(record.shop);
  const [key, setKey] = useState(record.key);
  const [showType, setShowType] = useState(record.showType);
  const [enabled, setEnabled] = useState(record.enabled);
  const [messageTitle, setMessageTitle] = useState(record.messageTitle || "");
  const [messageText, setMessageText] = useState(record.messageText || "");

  return (
    <Page title={`Edit Config #${record.id}`}>
      <Card>
        <Form method="post">
          <BlockStack gap="400">
            <TextField label="Shop" name="shop" value={shop} onChange={setShop} />
            <TextField label="Key" name="key" value={key} onChange={setKey} />
            <Select
              label="Show Type"
              name="showType"
              options={[
                { label: "Recent Purchase", value: "recent_purchase" },
                { label: "Flash Sale", value: "flash_sale" },
              ]}
              value={showType}
              onChange={setShowType}
            />
            <Checkbox
              label="Enabled"
              name="enabled"
              checked={enabled}
              onChange={setEnabled}
            />
            <TextField
              label="Message Title"
              name="messageTitle"
              value={messageTitle}
              onChange={setMessageTitle}
            />
            <TextField
              label="Message Text"
              name="messageText"
              value={messageText}
              onChange={setMessageText}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <Button submit variant="primary">Save</Button>
              <Button url="/app/dashboard" variant="secondary">Cancel</Button>
            </div>
          </BlockStack>
        </Form>
      </Card>
    </Page>
  );
}
