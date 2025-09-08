document.addEventListener("DOMContentLoaded", function () {
  var shop = (window.Shopify && Shopify.shop) || "";
  if (!shop) return;

  // Proxy endpoint (shopify storefront URL)
  var ENDPOINT = `/apps/fomo/popup?shop=${shop}`;

  fetch(ENDPOINT, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      if (!data || !data.showPopup || !data.messageText) return;
      setTimeout(function () {
        var el = document.createElement("div");
        el.className = "m2-fomo-popup";
        el.textContent = data.messageText;
        document.body.appendChild(el);
      }, data.popupDelay || 3000);
    })
    .catch((err) => {
      console.error("[FOMO] proxy fetch error:", err);
    });
});
