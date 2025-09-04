// app/routes/app.products-picker.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * GET /app/products-picker?q=shirt&page=1
 * Returns paginated products for the picker modal
 */
export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = 20;

    const query = `
      query ProductsPicker($query: String, $first: Int!, $after: String) {
        products(first: $first, query: $query, after: $after, sortKey: TITLE) {
          edges {
            cursor
            node {
              id
              title
              handle
              status
              featuredImage { url altText }
              totalInventory
            }
          }
          pageInfo { hasNextPage hasPreviousPage }
        }
      }
    `;

    let after = null;
    let collected = [];
    let hasNextPage = true;

    // simple page→cursor advance
    for (let currentPage = 1; currentPage <= page && hasNextPage; currentPage++) {
      const res = await admin.graphql(query, {
        variables: {
          query: q ? `title:*${q}*` : null,
          first: pageSize,
          after,
        },
      });
      const data = await res.json();
      const edges = data?.data?.products?.edges || [];
      hasNextPage = data?.data?.products?.pageInfo?.hasNextPage || false;
      after = edges.length ? edges[edges.length - 1].cursor : null;

      if (currentPage === page) {
        collected = edges.map((e) => e.node);
        break;
      }
    }

    return json({
      items: collected.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        status: p.status,
        featuredImage: p.featuredImage?.url || null,
        totalInventory: p.totalInventory,
      })),
      page,
      pageSize,
      hasNextPage,
    });
  } catch (e) {
    return json(
      { items: [], error: e?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}
