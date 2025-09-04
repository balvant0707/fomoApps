// app/routes/app.dashboard.jsx
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Button,
  Badge,
  Modal,
  TextField,
  Select,
  Checkbox,
  InlineStack,
} from "@shopify/polaris";
import { useCallback, useMemo, useState } from "react";
import { prisma } from "../db.server";

// -------------------- Loader --------------------
export async function loader() {
  const rows = await prisma.notificationConfig.findMany({
    orderBy: { id: "desc" },
  });
  return json({ rows });
}

// -------------------- Action --------------------
export async function action({ request }) {
  const form = await request.formData();
  const _action = form.get("_action");

  if (_action === "delete") {
    const id = Number(form.get("id"));
    if (id) {
      await prisma.notificationConfig.delete({ where: { id } });
    }
    return redirect("/app/dashboard");
  }

  if (_action === "update") {
    const id = Number(form.get("id"));
    const messageTitle = form.get("messageTitle")?.toString() ?? "";
    const messageText = form.get("messageText")?.toString() ?? "";
    const showType = form.get("showType")?.toString() ?? "all";
    const enabled = form.get("enabled") === "on";

    if (id) {
      await prisma.notificationConfig.update({
        where: { id },
        data: { messageTitle, messageText, showType, enabled },
      });
    }
    return redirect("/app/dashboard");
  }

  return null;
}

// -------------------- Titles Mapping --------------------
const TITLES = {
  recent: "Recent Purchases",
  visitors: "Live Visitor Count",
  stock: "Low Stock Alerts",
  reviews: "Product Reviews",
  cart: "Cart Activity",
  flash: "Flash Sale Bars",
  announcement: "Announcements",
  geo: "Geo Messaging",
};

// fallback pretty function if key not found
function pretty(str) {
  return str
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// -------------------- Component --------------------
export default function NotificationList() {
  const { rows } = useLoaderData();
  const navigation = useNavigation();

  // edit modal state
  const [editing, setEditing] = useState(null); // row or null
  const openEdit = useCallback((row) => setEditing(row), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  // form local state (derived when modal opens)
  const [eTitle, setETitle] = useState("");
  const [eText, setEText] = useState("");
  const [eShowType, setEShowType] = useState("all");
  const [eEnabled, setEEnabled] = useState(true);

  // when editing changes, seed fields
  useMemo(() => {
    if (editing) {
      setETitle(editing.messageTitle || "");
      setEText(editing.messageText || "");
      setEShowType(editing.showType || "all");
      setEEnabled(!!editing.enabled);
    }
  }, [editing]);

  const isSubmitting = navigation.state === "submitting";

  // --- Column styling (restrict width + ellipsis) ---
  const cellStyles = `
    .col-title, .col-text {
      max-width: 420px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (max-width: 1200px){
      .col-title, .col-text { max-width: 300px; }
    }
  `;

  return (
    <Page title="Notification Config (Dashboard)" fullWidth>
      <style>{cellStyles}</style>

      <Card>
        <IndexTable
          resourceName={{ singular: "config", plural: "configs" }}
          itemCount={rows.length}
          headings={[
            { title: "Message Title" },
            { title: "Message Text" },
            { title: "Notification Type" },
            { title: "Show Type" },
            { title: "Enabled" },
            { title: "Actions" },
          ]}
          stickyHeader
        >
          {rows.map((row, index) => (
            <IndexTable.Row id={String(row.id)} key={row.id} position={index}>
              {/* Title cell */}
              <IndexTable.Cell className="col-title">
                <Text as="span" truncate>{row.messageTitle}</Text>
              </IndexTable.Cell>

              {/* Text cell */}
              <IndexTable.Cell className="col-text">
                <Text as="span" truncate>{row.messageText}</Text>
              </IndexTable.Cell>

              {/* Human-friendly title based on row.key */}
              <IndexTable.Cell>
                {TITLES[row.key] || pretty(row.key)}
              </IndexTable.Cell>

              <IndexTable.Cell>{row.showType}</IndexTable.Cell>

              <IndexTable.Cell>
                {row.enabled ? (
                  <Badge tone="success">Yes</Badge>
                ) : (
                  <Badge tone="critical">No</Badge>
                )}
              </IndexTable.Cell>

              <IndexTable.Cell>
                <InlineStack align="start" gap="200">
                  {/* EDIT -> open modal */}
                  <Button onClick={() => openEdit(row)}>Edit</Button>

                  {/* DELETE -> same route POST */}
                  <Form method="post">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="_action" value="delete" />
                    <Button submit tone="critical" variant="secondary">
                      Delete
                    </Button>
                  </Form>
                </InlineStack>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>

      {/* Edit Modal (no route change) */}
      <Modal
        open={!!editing}
        onClose={closeEdit}
        title={
          editing
            ? `Edit: ${TITLES[editing.key] || pretty(editing.key)} (ID ${editing.id})`
            : "Edit"
        }
        primaryAction={{
          content: isSubmitting ? "Saving…" : "Save",
          onAction: () => {
            // submit handled by form submit button inside
            const submitBtn = document.getElementById("edit-submit");
            submitBtn?.click();
          },
          disabled: isSubmitting,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: closeEdit, disabled: isSubmitting },
        ]}
      >
        <Modal.Section>
          {editing && (
            <Form method="post">
              <input type="hidden" name="_action" value="update" />
              <input type="hidden" name="id" value={editing.id} />
              <div style={{ display: "grid", gap: 12 }}>
                <TextField
                  label="Message Title"
                  name="messageTitle"
                  value={eTitle}
                  onChange={setETitle}
                  autoComplete="off"
                />
                <TextField
                  multiline={3}
                  label="Message Text"
                  name="messageText"
                  value={eText}
                  onChange={setEText}
                  autoComplete="off"
                />
                <Select
                  label="Show Type"
                  name="showType"
                  options={[
                    { label: "All", value: "all" },
                    { label: "Desktop Only", value: "desktop" },
                    { label: "Mobile Only", value: "mobile" },
                  ]}
                  value={eShowType}
                  onChange={setEShowType}
                />
                <Checkbox
                  label="Enabled"
                  checked={eEnabled}
                  onChange={setEEnabled}
                />
                {/* Keep form values in sync with Polaris inputs */}
                <input type="hidden" name="enabled" value={eEnabled ? "on" : ""} />
                <input type="hidden" name="showType" value={eShowType} />
                <input type="hidden" name="messageTitle" value={eTitle} />
                <input type="hidden" name="messageText" value={eText} />
                {/* invisible submit used by modal primaryAction */}
                <button id="edit-submit" type="submit" style={{ display: "none" }} />
              </div>
            </Form>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
