// app/routes/app.dashboard.jsx
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useNavigation,
  useSubmit,
  useNavigate,
  useLocation,
  useFetcher,
  useRevalidator,
} from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Button,
  Modal,
  TextField,
  Select,
  InlineStack,
  BlockStack,
  ButtonGroup,
  Spinner,
  Pagination,
  Frame,
  Toast,
  EmptyState,
} from "@shopify/polaris";
import { useCallback, useEffect, useRef, useState } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

/* -------------------- Titles Mapping -------------------- */
const TITLES = {
  recent: "Recent Purchases",
  flash: "Flash Sale Bars",
};

const pageOptions = [
  { label: "All Pages", value: "allpage" },
  { label: "Home Page", value: "home" },
  { label: "Product Page", value: "product" },
  { label: "Collection Page", value: "collection" },
  { label: "Pages", value: "pages" },
  { label: "Cart Page", value: "cart" },
];

const getAdminQS = () => {
  try {
    return typeof window !== "undefined" ? window.location.search || "" : "";
  } catch {
    return "";
  }
};
const appendQS = (url) => {
  const qs = getAdminQS();
  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs.slice(1)}` : `${url}${qs}`;
};
function pretty(str) {
  return String(str || "")
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
function showTypeLabel(val) {
  const found = pageOptions.find((o) => o.value === val);
  return found?.label || pretty(val);
}

/* -------------------- Helpers -------------------- */
/** Array/JSON-array/object → clean multi-line string */
function formatLines(val) {
  if (val == null) return "";

  // If already array => each item on a new line
  if (Array.isArray(val)) {
    return val
      .map((x) => (x == null ? "" : String(x).trim()))
      .filter(Boolean)
      .join("\n");
  }

  // Try parsing when it's a string that might be JSON
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return "";

    try {
      const maybe = JSON.parse(s);
      if (Array.isArray(maybe)) {
        return maybe
          .map((x) => (x == null ? "" : String(x).trim()))
          .filter(Boolean)
          .join("\n");
      }
      if (typeof maybe === "object" && maybe !== null) {
        return Object.entries(maybe)
          .map(([k, v]) => `${k}: ${v ?? ""}`.trim())
          .filter(Boolean)
          .join("\n");
      }
      // Primitive JSON (string/number/bool)
      return String(maybe);
    } catch {
      // Not JSON → treat commas/newlines as separators
      return s.split(/\r?\n|,/).map(t => t.trim()).filter(Boolean).join("\n");
    }
  }

  // Plain object → key: value per line
  if (typeof val === "object") {
    try {
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${v ?? ""}`.trim())
        .filter(Boolean)
        .join("\n");
    } catch {
      return String(val);
    }
  }

  // number/boolean etc.
  return String(val);
}

/* -------------------- Loader -------------------- */
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "all";
  const status = url.searchParams.get("status") || "all";
  const q = (url.searchParams.get("q") || "").trim();

  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "10", 10);
  const pageSize = [10, 25, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;

  const where = { shop };
  if (type !== "all") where.key = type;
  if (status === "enabled") where.enabled = true;
  if (status === "disabled") where.enabled = false;

  if (q) {
    // Search across actual columns present in your model
    where.OR = [
      { messageText: { contains: q, mode: "insensitive" } },
      { showType: { contains: q, mode: "insensitive" } },
      { key: { contains: q, mode: "insensitive" } },
      { messageTitlesJson: { contains: q, mode: "insensitive" } },
      { locationsJson: { contains: q, mode: "insensitive" } },
      { namesJson: { contains: q, mode: "insensitive" } },
      { selectedProductsJson: { contains: q, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  try {
    if (!prisma?.notificationconfig?.findMany) {
      throw new Error("Prisma not initialized or model missing");
    }

    const [rows, total] = await prisma.$transaction([
      prisma.notificationconfig.findMany({
        where,
        orderBy: { id: "desc" },
        skip,
        take,
      }),
      prisma.notificationconfig.count({ where }),
    ]);

    return json({
      rows,
      total,
      page,
      pageSize,
      filters: { type, status, q },
    });
  } catch (e) {
    console.error("[dashboard.loader] Prisma error:", e);
    // Always return JSON
    return json(
      {
        rows: [],
        total: 0,
        page,
        pageSize,
        filters: { type, status, q },
        error: "Failed to load dashboard data.",
      },
      { status: 200 }
    );
  }
}

/* -------------------- Action -------------------- */
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop;
  if (!shop) throw new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const search = new URLSearchParams(url.search);
  const form = await request.formData();
  const _action = form.get("_action");
  const isFetch = request.headers.get("X-Remix-Request") === "yes";

  const safeJson = (data, init = {}) => json(data, init);

  if (_action === "delete") {
    const id = Number(form.get("id"));
    try {
      if (id && prisma?.notificationconfig?.deleteMany) {
        await prisma.notificationconfig.deleteMany({ where: { id, shop } });
      }
      if (isFetch) return safeJson({ ok: true });
      search.set("deleted", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    } catch (e) {
      console.error("[dashboard.action:delete] error:", e);
      if (isFetch) return safeJson({ ok: false, error: "Delete failed" }, { status: 500 });
      search.set("error", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    }
  }

  if (_action === "update") {
    const id = Number(form.get("id"));
    // Only update columns that exist in your model/schema
    const messageText = form.get("messageText")?.toString() ?? "";
    const showType = form.get("showType")?.toString() ?? "allpage";
    const enabled = form.get("enabled") === "on";

    try {
      if (id && prisma?.notificationconfig?.updateMany) {
        await prisma.notificationconfig.updateMany({
          where: { id, shop },
          data: { messageText, showType, enabled },
        });
      }
      if (isFetch) return safeJson({ ok: true, saved: true });
      search.set("saved", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    } catch (e) {
      console.error("[dashboard.action:update] error:", e);
      if (isFetch) return safeJson({ ok: false, error: "Update failed" }, { status: 500 });
      search.set("error", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    }
  }

  if (_action === "toggle-enabled") {
    const id = Number(form.get("id"));
    const enabled = form.get("enabled") === "on";
    try {
      if (id && prisma?.notificationconfig?.updateMany) {
        await prisma.notificationconfig.updateMany({
          where: { id, shop },
          data: { enabled },
        });
      }
      if (isFetch) return safeJson({ ok: true });
      return redirect(`/app/dashboard?${search.toString()}`);
    } catch (e) {
      console.error("[dashboard.action:toggle] error:", e);
      if (isFetch) return safeJson({ ok: false, error: "Toggle failed" }, { status: 500 });
      search.set("error", "1");
      return redirect(`/app/dashboard?${search.toString()}`);
    }
  }

  return safeJson({ ok: false, error: "Unknown action" }, { status: 400 });
}

/* -------------------- Component -------------------- */
export default function NotificationList() {
  const { rows, total, page, pageSize, filters } = useLoaderData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const navigate = useNavigate();
  const location = useLocation();
  const delFetcher = useFetcher();
  const { revalidate } = useRevalidator();

  const isBusy = navigation.state !== "idle";

  const [showSaved, setShowSaved] = useState(() => {
    try { return new URLSearchParams(location.search).get("saved") === "1"; }
    catch { return false; }
  });
  useEffect(() => {
    if (showSaved) {
      const sp = new URLSearchParams(location.search);
      sp.delete("saved");
      navigate(`${location.pathname}?${sp.toString()}`, { replace: true });
    }
  }, [showSaved, location.pathname, location.search, navigate]);

  const [showDeleted, setShowDeleted] = useState(() => {
    try { return new URLSearchParams(location.search).get("deleted") === "1"; }
    catch { return false; }
  });
  useEffect(() => {
    if (showDeleted) {
      const sp = new URLSearchParams(location.search);
      sp.delete("deleted");
      navigate(`${location.pathname}?${sp.toString()}`, { replace: true });
    }
  }, [showDeleted, location.pathname, location.search, navigate]);

  const [deletedIds, setDeletedIds] = useState(new Set());
  useEffect(() => {
    if (delFetcher.state === "idle" && delFetcher.data?.ok) {
      revalidate();
    }
  }, [delFetcher.state, delFetcher.data, revalidate]);

  const [delRow, setDelRow] = useState(null);
  const openDelete = useCallback((row) => setDelRow(row), []);
  const closeDelete = useCallback(() => setDelRow(null), []);
  const confirmDelete = useCallback(() => {
    if (!delRow) return;
    const id = delRow.id;
    setDelRow(null);
    setShowDeleted(true);
    setDeletedIds((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    const fd = new FormData();
    fd.set("_action", "delete");
    fd.set("id", String(id));
    delFetcher.submit(fd, { method: "post" });
  }, [delRow, delFetcher]);

  const styles = `
    .col-title, .col-text { white-space: pre-line !important; word-break: break-word; }
    .col-title .Polaris-Text, .col-text .Polaris-Text { display: block; }
    .Polaris-IndexTable__TableRow { border-bottom: 1px solid rgba(0,0,0,0.08); }
    .rk-table-wrap { position: relative; }
    .rk-table-wrap.rk-busy .Polaris-IndexTable__TableRow { background: rgba(255,255,255,0.7); }
    .rk-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.06); backdrop-filter: blur(1px); border-radius: 8px; z-index: 2; }
    .rk-table-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 3; background: rgba(255,255,255,0.85);
      border: 1px solid rgba(0,0,0,0.05); border-radius: 999px; padding: 6px 10px; text-align: center; backdrop-filter: blur(2px); }
    .rk-switch { width: 42px; height: 24px; border-radius: 999px; background: rgba(0,0,0,0.2); border: none; padding: 0; position: relative; cursor: pointer; transition: background .15s; }
    .rk-switch .knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: left .15s; }
    .rk-switch.is-on { background: #4f0d4dff; }
    .rk-switch.is-on .knob { left: 20px; }
    .rk-switch:disabled { opacity: .5; cursor: not-allowed; }
  `;

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

  const [query, setQuery] = useState(initialQ);
  const tRef = useRef(null);
  useEffect(() => setQuery(initialQ), [initialQ]);

  const submitWith = (params) => {
    const fd = new FormData();
    fd.set("type", params.type ?? currentType);
    fd.set("status", params.status ?? currentStatus);
    fd.set("q", params.q ?? query);
    fd.set("page", String(params.page ?? page));
    fd.set("pageSize", String(params.pageSize ?? pageSize));
    submit(fd, { method: "get", replace: true });
  };

  const visibleRows = rows.filter((r) => !deletedIds.has(r.id));

  return (
    <Frame>
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

                <Button primary url="/app/notification">
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

            {visibleRows.length === 0 ? (
              <EmptyState
                heading="No notifications found"
                action={{ content: "Create notification", url: "/app/notification" }}
                secondaryAction={{ content: "Clear filters", onAction: () => submitWith({ type: "all", status: "all", q: "", page: 1 }) }}
                image=""
              >
                <p>Try adjusting your filters or create a new one.</p>
              </EmptyState>
            ) : (
              <IndexTable
                selectable={false}
                resourceName={{ singular: "config", plural: "configs" }}
                itemCount={total}
                headings={[
                  { title: "No" },
                  { title: "Popup Title" },
                  { title: "Notification Message" },
                  { title: "Popup Type" },
                  { title: "Show On Pages" },
                  { title: "Status" },
                  { title: "Actions" },
                ]}
                stickyHeader
              >
                {visibleRows.map((row, index) => {
                  /* ---------- Title ----------
                     ✅ Change: if recent → static "Recent Order Popup" */
                  const titleDisplay =
                    row.key === "recent"
                      ? "Recent Order Popup"
                      : ((row.messageTitle && row.messageTitle.trim?.()) ||
                         row.messageTitlesJson ||
                         "");

                  /* ---------- Message ----------
                     For flash: location string else locationsJson array else name/namesJson else messageText
                     For others: messageText else namesJson else locationsJson */
                  const flashVal =
                    (row.location && row.location.trim?.()) ||
                    row.locationsJson ||
                    (row.name && row.name.trim?.()) ||
                    row.namesJson ||
                    row.messageText ||
                    "";

                  const nonFlashVal =
                    (row.messageText && row.messageText.trim?.()) ||
                    row.namesJson ||
                    row.locationsJson ||
                    "";

                  const textDisplay = row.key === "flash" ? flashVal : nonFlashVal;

                  const nextEnabled = !row.enabled;

                  return (
                    <IndexTable.Row id={String(row.id)} key={row.id} position={index}>
                      <IndexTable.Cell style={{ width: 64 }}>
                        <Text as="span">{(page - 1) * pageSize + index + 1}</Text>
                      </IndexTable.Cell>

                      <IndexTable.Cell className="col-title">
                        <Text as="p" breakWord>{formatLines(titleDisplay)}</Text>
                      </IndexTable.Cell>

                      <IndexTable.Cell className="col-text">
                        <Text as="p" breakWord>{formatLines(textDisplay)}</Text>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        {TITLES[row.key] || pretty(row.key)}
                      </IndexTable.Cell>

                      <IndexTable.Cell>{showTypeLabel(row.showType)}</IndexTable.Cell>

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
                          <Button onClick={() => navigate(appendQS(`/app/notification/${row.key}/edit/${row.id}`))}>
                            Edit
                          </Button>
                          <Button tone="critical" variant="secondary" onClick={() => openDelete(row)}>
                            Delete
                          </Button>
                        </InlineStack>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  );
                })}
              </IndexTable>
            )}
          </div>
        </Card>

        {/* ===== Pagination bar ===== */}
        <Card>
          <InlineStack align="space-between" blockAlign="center" padding="400">
            <Text as="span" tone="subdued">
              {total === 0
                ? "No results"
                : `Showing ${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + visibleRows.length} of ${total}`}
            </Text>

            <InlineStack gap="200" align="center">
              <Pagination
                hasPrevious={page > 1}
                onPrevious={() => submitWith({ page: page - 1 })}
                hasNext={page < Math.max(Math.ceil(total / pageSize), 1)}
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
            disabled: isBusy || delFetcher.state !== "idle",
          }}
          secondaryActions={[{ content: "No", onAction: closeDelete, disabled: isBusy }]}
        >
          <Modal.Section>
            {delRow && (
              <div style={{ display: "grid", gap: 8 }}>
                <Text as="p">Are you sure you want to delete this notification?</Text>
                <Text as="p" tone="subdued">
                  <b>Type:</b> {TITLES[delRow.key] || pretty(delRow.key)}
                </Text>
                <Text as="p" tone="critical">This action cannot be undone.</Text>
              </div>
            )}
          </Modal.Section>
        </Modal>
      </Page>

      {/* ✅ Toasts */}
      {showSaved && (
        <Toast content="Saved successfully" duration={2200} onDismiss={() => setShowSaved(false)} />
      )}
      {showDeleted && (
        <Toast content="Deleted successfully" duration={2200} onDismiss={() => setShowDeleted(false)} />
      )}
    </Frame>
  );
}
