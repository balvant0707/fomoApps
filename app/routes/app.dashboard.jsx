// app/routes/app.dashboard.jsx
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
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
  BlockStack,
  ButtonGroup,
  Spinner,
  Pagination,
} from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { prisma } from "../db.server";

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

// pretty fallback
function pretty(str) {
  return String(str || "")
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// -------------------- Loader --------------------
export async function loader({ request }) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "all";
  const status = url.searchParams.get("status") || "all";
  const q = (url.searchParams.get("q") || "").trim();

  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "10", 10);
  const pageSize = [10, 25, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;

  const where = {};
  if (type !== "all") where.key = type;
  if (status === "enabled") where.enabled = true;
  if (status === "disabled") where.enabled = false;

  // search on visible columns
  if (q) {
    where.OR = [
      { messageTitlesJson: { contains: q } },
      { messageText: { contains: q } },
      { key: { contains: q } },
      { showType: { contains: q } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [rows, total] = await prisma.$transaction([
    prisma.notificationConfig.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take,
    }),
    prisma.notificationConfig.count({ where }),
  ]);

  return json({
    rows,
    total,
    page,
    pageSize,
    filters: { type, status, q },
  });
}

// -------------------- Action --------------------
export async function action({ request }) {
  const url = new URL(request.url);
  const search = url.search;

  const form = await request.formData();
  const _action = form.get("_action");

  if (_action === "delete") {
    const id = Number(form.get("id"));
    if (id) await prisma.notificationConfig.delete({ where: { id } });
    return redirect(`/app/dashboard${search}`);
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
    return redirect(`/app/dashboard${search}`);
  }

  // toggle enabled/disabled
  if (_action === "toggle-enabled") {
    const id = Number(form.get("id"));
    const enabled = form.get("enabled") === "on";
    if (id) {
      await prisma.notificationConfig.update({
        where: { id },
        data: { enabled },
      });
    }
    return redirect(`/app/dashboard${search}`);
  }

  return null;
}

// -------------------- Component --------------------
export default function NotificationList() {
  const { rows, total, page, pageSize, filters } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isBusy = navigation.state !== "idle";

  // Edit modal state
  const [editing, setEditing] = useState(null);
  const openEdit = useCallback((row) => setEditing(row), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  // Delete confirm state
  const [delRow, setDelRow] = useState(null);
  const openDelete = useCallback((row) => setDelRow(row), []);
  const closeDelete = useCallback(() => setDelRow(null), []);
  const confirmDelete = useCallback(() => {
    if (!delRow) return;
    const fd = new FormData();
    fd.set("_action", "delete");
    fd.set("id", String(delRow.id));
    submit(fd, { method: "post" });
  }, [delRow, submit]);

  // Modal form local state
  const [eTitle, setETitle] = useState("");
  const [eText, setEText] = useState("");
  const [eShowType, setEShowType] = useState("all");
  const [eEnabled, setEEnabled] = useState(true);

  useMemo(() => {
    if (editing) {
      setETitle(editing.messageTitle || "");
      setEText(editing.messageText || "");
      setEShowType(editing.showType || "all");
      setEEnabled(!!editing.enabled);
    }
  }, [editing]);

  // ----- styles -----
  const styles = `
    .col-title, .col-text { white-space: pre-line !important; word-break: break-word; }
    .col-title .Polaris-Text, .col-text .Polaris-Text { display: block; }

    .Polaris-IndexTable__TableRow { border-bottom: 1px solid rgba(0,0,0,0.08); }

    .rk-table-wrap { position: relative; }
    .rk-table-wrap.rk-busy .Polaris-IndexTable__TableRow {
      background: rgba(255,255,255,0.7);
    }
    .rk-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.06);
      backdrop-filter: blur(1px);
      border-radius: 8px;
      z-index: 2;
    }
    .rk-table-loader {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 3;
      background: rgba(255,255,255,0.85);
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 999px;
      padding: 6px 10px;
      text-align: center;
      backdrop-filter: blur(2px);
    }

    /* toggle switch */
    .rk-switch {
      width: 42px; height: 24px; border-radius: 999px;
      background: rgba(0,0,0,0.2); border: none; padding: 0;
      position: relative; cursor: pointer; transition: background .15s;
    }
    .rk-switch .knob {
      position: absolute; top: 2px; left: 2px;
      width: 20px; height: 20px; border-radius: 999px;
      background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2);
      transition: left .15s;
    }
    .rk-switch.is-on { background: #22c55e; }
    .rk-switch.is-on .knob { left: 20px; }
    .rk-switch:disabled { opacity: .5; cursor: not-allowed; }
  `;

  // ----- filters -----
  const typeOptions = [
    { label: "Show All", value: "all" },
    ...Object.keys(TITLES).map((k) => ({ label: TITLES[k] || pretty(k), value: k })),
  ];
  const statusTabs = [
    { label: "Show All", value: "all" },
    { label: "Active", value: "enabled" },
    { label: "Inactive", value: "disabled" },
  ];

  const currentType = filters?.type || "all";
  const currentStatus = filters?.status || "all";
  const initialQ = filters?.q || "";

  // search: debounce 300ms
  const [query, setQuery] = useState(initialQ);
  const tRef = useRef(null);
  useEffect(() => setQuery(initialQ), [initialQ]);

  // paging
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const baseIndex = (page - 1) * pageSize;
  const showingStart = total === 0 ? 0 : baseIndex + 1;
  const showingEnd = baseIndex + rows.length;

  // helper submit preserving params
  const submitWith = (params) => {
    const fd = new FormData();
    fd.set("type", params.type ?? currentType);
    fd.set("status", params.status ?? currentStatus);
    fd.set("q", params.q ?? query);
    fd.set("page", String(params.page ?? page));
    fd.set("pageSize", String(params.pageSize ?? pageSize));
    submit(fd, { method: "get", replace: true });
  };

  // array-JSON → lines, or commas → newline
  const formatLines = (val) => {
    if (val == null) return "";
    if (Array.isArray(val)) return val.join(",\n");
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr)) return arr.join(",\n");
    } catch { }
    return String(val).replace(/,\s*/g, ",\n");
  };

  return (
    <Page title="Dashboard" fullWidth>
      <style>{styles}</style>

      {/* ===== Toolbar ===== */}
      <Card>
        <BlockStack gap="400">
          <Form method="get" id="filtersForm">
            <InlineStack gap="400" align="center" wrap>
              <Select
                label="Notification Type"
                labelHidden
                name="type"
                options={typeOptions}
                value={currentType}
                onChange={(val) => submitWith({ type: val, page: 1 })}
              />

              <ButtonGroup segmented>
                {statusTabs.map((t) => (
                  <Button
                    key={t.value}
                    pressed={currentStatus === t.value}
                    onClick={() => submitWith({ status: t.value, page: 1 })}
                  >
                    {t.label}
                  </Button>
                ))}
              </ButtonGroup>

              <div style={{ minWidth: 280, flex: "1 1 280px" }}>
                <TextField
                  label="Search notifications"
                  labelHidden
                  placeholder="Search notifications..."
                  value={query}
                  onChange={(val) => {
                    setQuery(val);
                    if (tRef.current) clearTimeout(tRef.current);
                    tRef.current = setTimeout(() => submitWith({ q: val, page: 1 }), 300);
                  }}
                  onBlur={() => submitWith({ q: query, page: 1 })}
                  autoComplete="off"
                />
              </div>

              <Select
                label="Page size"
                labelHidden
                options={[
                  { label: "10 / page", value: "10" },
                  { label: "25 / page", value: "25" },
                  { label: "50 / page", value: "50" },
                ]}
                value={String(pageSize)}
                onChange={(val) => submitWith({ pageSize: Number(val), page: 1 })}
              />

              <Button primary url="/app/notifications/new">
                + New Notification
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  submitWith({ type: "all", status: "all", q: "", page: 1 });
                }}
              >
                Clear Filters
              </Button>
            </InlineStack>
          </Form>
        </BlockStack>
      </Card>

      {/* ===== Table (overlay while loading) ===== */}
      <Card>
        <div className={`rk-table-wrap ${isBusy ? "rk-busy" : ""}`}>
          {isBusy && <div className="rk-overlay" />}
          {isBusy && (
            <div className="rk-table-loader">
              <Spinner size="small" accessibilityLabel="Loading table" />
            </div>
          )}

          <IndexTable
            selectable={false}
            resourceName={{ singular: "config", plural: "configs" }}
            itemCount={rows.length}
            headings={[
              { title: "#" },
              { title: "Message Title" },
              { title: "Message Text" },
              { title: "Notification Type" },
              { title: "Show Type" },
              { title: "Enabled" },
              { title: "Actions" },
            ]}
            stickyHeader
          >
            {rows.map((row, index) => {
              const titleDisplay = formatLines(row.messageTitlesJson);
              const textDisplay =
                row.key === "flash"
                  ? formatLines(row.locationsJson)
                  : formatLines(row.messageText);
              const nextEnabled = !row.enabled;

              return (
                <IndexTable.Row id={String(row.id)} key={row.id} position={index}>
                  <IndexTable.Cell style={{ width: 64 }}>
                    <Text as="span">{baseIndex + index + 1}</Text>
                  </IndexTable.Cell>

                  <IndexTable.Cell className="col-title">
                    <Text as="p" breakWord>{titleDisplay}</Text>
                  </IndexTable.Cell>

                  <IndexTable.Cell className="col-text">
                    <Text as="p" breakWord>{textDisplay}</Text>
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    {TITLES[row.key] || pretty(row.key)}
                  </IndexTable.Cell>

                  <IndexTable.Cell>{row.showType}</IndexTable.Cell>

                  {/* Enabled toggle switch */}
                  <IndexTable.Cell>
                    <Form method="post">
                      <input type="hidden" name="_action" value="toggle-enabled" />
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="enabled" value={nextEnabled ? "on" : ""} />
                      <button
                        type="submit"
                        className={`rk-switch ${row.enabled ? "is-on" : ""}`}
                        aria-label={row.enabled ? "Enabled" : "Disabled"}
                        disabled={isBusy}
                        title={row.enabled ? "Click to disable" : "Click to enable"}
                      >
                        <span className="knob" />
                      </button>
                    </Form>
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    <InlineStack align="start" gap="200">
                      {/* EDIT → POST id & key then redirect to key-wise edit page */}
                      <Form method="post" action={`/app/notification/${row.key}/edit`}>
                        <input type="hidden" name="_action" value="start" />
                        <input type="hidden" name="id" value={row.id} />
                        <Button submit>Edit</Button>
                      </Form>


                      {/* DELETE — (તારો confirm popup flow જેમ છે એમ જ) */}
                      <Button tone="critical" variant="secondary" onClick={() => openDelete(row)}>
                        Delete
                      </Button>
                    </InlineStack>
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>
        </div>
      </Card>

      {/* ===== Pagination bar ===== */}
      <Card>
        <InlineStack align="space-between" blockAlign="center" padding="400">
          <Text as="span" tone="subdued">
            {total === 0
              ? "No results"
              : `Showing ${showingStart}–${showingEnd} of ${total}`}
          </Text>

          <InlineStack gap="200" align="center">
            <Pagination
              hasPrevious={hasPrev}
              onPrevious={() => submitWith({ page: page - 1 })}
              hasNext={hasNext}
              onNext={() => submitWith({ page: page + 1 })}
            />
          </InlineStack>
        </InlineStack>
      </Card>

      {/* ===== Delete Confirm Modal ===== */}
      <Modal
        open={!!delRow}
        onClose={closeDelete}
        title={delRow ? `Delete ID ${delRow.id}?` : "Delete"}
        primaryAction={{
          content: "Yes, delete",
          destructive: true,
          onAction: confirmDelete,
          disabled: isBusy,
        }}
        secondaryActions={[
          { content: "No", onAction: closeDelete, disabled: isBusy },
        ]}
      >
        <Modal.Section>
          {delRow && (
            <div style={{ display: "grid", gap: 8 }}>
              <Text as="p">
                Are you sure you want to delete this notification?
              </Text>
              <Text as="p" tone="subdued">
                <b>Type:</b> {TITLES[delRow.key] || pretty(delRow.key)}
              </Text>
              <Text as="p" tone="subdued">
                <b>Title(s):</b>{" "}
                {(() => {
                  try {
                    const arr = JSON.parse(delRow.messageTitlesJson || "[]");
                    return Array.isArray(arr) ? arr.join(", ") : String(delRow.messageTitlesJson || "");
                  } catch {
                    return String(delRow.messageTitlesJson || "");
                  }
                })()}
              </Text>
              <Text as="p" tone="critical">This action cannot be undone.</Text>
            </div>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
