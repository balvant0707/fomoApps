import prisma from "../db.server";

const toStr = (v) => {
  const s = v === undefined || v === null ? "" : String(v).trim();
  return s === "" ? null : s;
};
const toInt = (v) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};
const toBool = (v, fallback = false) => {
  if (v === undefined) return fallback;
  return !!v;
};
const toJson = (v) => JSON.stringify(Array.isArray(v) ? v : []);
const stripUndefined = (data) => {
  Object.keys(data).forEach((k) => {
    if (data[k] === undefined) delete data[k];
  });
  return data;
};

async function upsertByShop(table, shop, data, modelName = "unknown") {
  const payload = stripUndefined({ ...data, shop });
  try {
    console.log("[PopupConfig] upsert start:", {
      model: modelName,
      shop,
      payload: payload,
    });

    const existing = await table.findFirst({
      where: { shop },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    if (existing?.id) {
      const result = await table.updateMany({
        where: { shop },
        data: payload,
      });
      console.log("[PopupConfig] updateMany result:", {
        model: modelName,
        shop,
        updatedCount: result?.count ?? null,
        id: existing.id,
      });
      const latest = await table.findFirst({
        where: { shop },
        orderBy: { id: "desc" },
      });
      console.log("[PopupConfig] updateMany latest:", {
        model: modelName,
        shop,
        id: latest?.id ?? null,
      });
      return latest;
    }

    const created = await table.create({ data: payload });
    console.log("[PopupConfig] create result:", {
      model: modelName,
      shop,
      id: created?.id ?? null,
    });
    return created;
  } catch (e) {
    console.error("[PopupConfig] upsert failed:", {
      model: modelName,
      shop,
      error: e?.message || e,
      code: e?.code || null,
    });
    throw e;
  }
}

export async function saveVisitorPopup(shop, form) {
  const table =
    prisma?.visitorpopupconfig || prisma?.visitorPopupConfig || null;
  if (!table) {
    throw new Error("Prisma model missing: visitorpopupconfig");
  }
  const data = {
    enabled: toBool(form?.enabled, true),

    notiType: toStr(form?.design?.notiType),
    layout: toStr(form?.design?.layout),
    size: toInt(form?.design?.size),
    transparent: toInt(form?.design?.transparent),
    template: toStr(form?.design?.template),
    imageAppearance: toStr(form?.design?.imageAppearance),
    bgColor: toStr(form?.design?.bgColor),
    bgAlt: toStr(form?.design?.bgAlt),
    textColor: toStr(form?.design?.textColor),
    timestampColor: toStr(form?.design?.timestampColor),
    priceTagBg: toStr(form?.design?.priceTagBg),
    priceTagAlt: toStr(form?.design?.priceTagAlt),
    priceColor: toStr(form?.design?.priceColor),
    starColor: toStr(form?.design?.starColor),

    textSizeContent: toInt(form?.textSize?.content),
    textSizeCompareAt: toInt(form?.textSize?.compareAt),
    textSizePrice: toInt(form?.textSize?.price),

    message: toStr(form?.content?.message),
    timestamp: toStr(form?.content?.timestamp),
    avgTime: toStr(form?.content?.avgTime),
    avgUnit: toStr(form?.content?.avgUnit),

    productNameMode: toStr(form?.productNameMode),
    productNameLimit: toInt(form?.productNameLimit),

    directProductPage: toBool(form?.data?.directProductPage),
    showProductImage: toBool(form?.data?.showProductImage),
    showPriceTag: toBool(form?.data?.showPriceTag),
    showRating: toBool(form?.data?.showRating),
    ratingSource: toStr(form?.data?.ratingSource),
    customerInfo: toStr(form?.data?.customerInfo),

    showHome: toBool(form?.visibility?.showHome),
    showProduct: toBool(form?.visibility?.showProduct),
    productScope: toStr(form?.visibility?.productScope),
    showCollectionList: toBool(form?.visibility?.showCollectionList),
    showCollection: toBool(form?.visibility?.showCollection),
    collectionScope: toStr(form?.visibility?.collectionScope),
    showCart: toBool(form?.visibility?.showCart),
    position: toStr(form?.visibility?.position),

    showClose: toBool(form?.behavior?.showClose),
    hideOnMobile: toBool(form?.behavior?.hideOnMobile),
    delay: toInt(form?.behavior?.delay),
    duration: toInt(form?.behavior?.duration),
    interval: toInt(form?.behavior?.interval),
    intervalUnit: toStr(form?.behavior?.intervalUnit),
    randomize: toBool(form?.behavior?.randomize),

    selectedProductsJson: toJson(form?.selectedProducts),
    selectedCollectionsJson: toJson(form?.selectedCollections),
  };

  return upsertByShop(table, shop, data, "visitorpopupconfig");
}

export async function saveLowStockPopup(shop, form) {
  const data = {
    enabled: toBool(form?.enabled, true),

    layout: toStr(form?.design?.layout),
    size: toInt(form?.design?.size),
    transparent: toInt(form?.design?.transparent),
    template: toStr(form?.design?.template),
    imageAppearance: toStr(form?.design?.imageAppearance),
    bgColor: toStr(form?.design?.bgColor),
    bgAlt: toStr(form?.design?.bgAlt),
    textColor: toStr(form?.design?.textColor),
    numberColor: toStr(form?.design?.numberColor),
    priceTagBg: toStr(form?.design?.priceTagBg),
    priceTagAlt: toStr(form?.design?.priceTagAlt),
    priceColor: toStr(form?.design?.priceColor),
    starColor: toStr(form?.design?.starColor),

    textSizeContent: toInt(form?.textSize?.content),
    textSizeCompareAt: toInt(form?.textSize?.compareAt),
    textSizePrice: toInt(form?.textSize?.price),

    message: toStr(form?.content?.message),
    productNameMode: toStr(form?.productNameMode),
    productNameLimit: toInt(form?.productNameLimit),

    dataSource: toStr(form?.data?.dataSource),
    stockUnder: toInt(form?.data?.stockUnder),
    hideOutOfStock: toBool(form?.data?.hideOutOfStock),
    directProductPage: toBool(form?.data?.directProductPage),
    showProductImage: toBool(form?.data?.showProductImage),
    showPriceTag: toBool(form?.data?.showPriceTag),
    showRating: toBool(form?.data?.showRating),

    showHome: toBool(form?.visibility?.showHome),
    showProduct: toBool(form?.visibility?.showProduct),
    productScope: toStr(form?.visibility?.productScope),
    showCollectionList: toBool(form?.visibility?.showCollectionList),
    showCollection: toBool(form?.visibility?.showCollection),
    collectionScope: toStr(form?.visibility?.collectionScope),
    showCart: toBool(form?.visibility?.showCart),
    position: toStr(form?.visibility?.position),

    showClose: toBool(form?.behavior?.showClose),
    hideOnMobile: toBool(form?.behavior?.hideOnMobile),
    delay: toInt(form?.behavior?.delay),
    duration: toInt(form?.behavior?.duration),
    interval: toInt(form?.behavior?.interval),
    intervalUnit: toStr(form?.behavior?.intervalUnit),
    randomize: toBool(form?.behavior?.randomize),

    selectedProductsJson: toJson(form?.selectedProducts),
    selectedCollectionsJson: toJson(form?.selectedCollections),
  };

  return upsertByShop(prisma.lowstockpopupconfig, shop, data, "lowstockpopupconfig");
}

export async function saveAddToCartPopup(shop, form) {
  const data = {
    enabled: toBool(form?.enabled, true),

    layout: toStr(form?.design?.layout),
    size: toInt(form?.design?.size),
    transparent: toInt(form?.design?.transparent),
    template: toStr(form?.design?.template),
    bgColor: toStr(form?.design?.bgColor),
    bgAlt: toStr(form?.design?.bgAlt),
    textColor: toStr(form?.design?.textColor),
    timestampColor: toStr(form?.design?.timestampColor),
    priceTagBg: toStr(form?.design?.priceTagBg),
    priceTagAlt: toStr(form?.design?.priceTagAlt),
    priceColor: toStr(form?.design?.priceColor),
    starColor: toStr(form?.design?.starColor),

    textSizeContent: toInt(form?.textSize?.content),
    textSizeCompareAt: toInt(form?.textSize?.compareAt),
    textSizePrice: toInt(form?.textSize?.price),

    message: toStr(form?.content?.message),
    timestamp: toStr(form?.content?.timestamp),
    productNameMode: toStr(form?.productNameMode),
    productNameLimit: toInt(form?.productNameLimit),

    dataSource: toStr(form?.data?.dataSource),
    stockUnder: toInt(form?.data?.stockUnder),
    hideOutOfStock: toBool(form?.data?.hideOutOfStock),
    directProductPage: toBool(form?.data?.directProductPage),
    showProductImage: toBool(form?.data?.showProductImage),
    showPriceTag: toBool(form?.data?.showPriceTag),
    showRating: toBool(form?.data?.showRating),

    showHome: toBool(form?.visibility?.showHome),
    showProduct: toBool(form?.visibility?.showProduct),
    productScope: toStr(form?.visibility?.productScope),
    showCollectionList: toBool(form?.visibility?.showCollectionList),
    showCollection: toBool(form?.visibility?.showCollection),
    collectionScope: toStr(form?.visibility?.collectionScope),
    showCart: toBool(form?.visibility?.showCart),
    position: toStr(form?.visibility?.position),

    showClose: toBool(form?.behavior?.showClose),
    hideOnMobile: toBool(form?.behavior?.hideOnMobile),
    delay: toInt(form?.behavior?.delay),
    duration: toInt(form?.behavior?.duration),
    interval: toInt(form?.behavior?.interval),
    intervalUnit: toStr(form?.behavior?.intervalUnit),
    randomize: toBool(form?.behavior?.randomize),

    selectedProductsJson: toJson(form?.selectedProducts),
    selectedCollectionsJson: toJson(form?.selectedCollections),
  };

  return upsertByShop(prisma.addtocartpopupconfig, shop, data, "addtocartpopupconfig");
}

export async function saveReviewPopup(shop, form) {
  const data = {
    enabled: toBool(form?.enabled, true),

    reviewType: toStr(form?.design?.reviewType),
    template: toStr(form?.design?.template),
    imageAppearance: toStr(form?.design?.imageAppearance),
    bgColor: toStr(form?.design?.bgColor),
    bgAlt: toStr(form?.design?.bgAlt),
    textColor: toStr(form?.design?.textColor),
    timestampColor: toStr(form?.design?.timestampColor),
    priceTagBg: toStr(form?.design?.priceTagBg),
    priceTagAlt: toStr(form?.design?.priceTagAlt),
    priceColor: toStr(form?.design?.priceColor),
    starColor: toStr(form?.design?.starColor),

    textSizeContent: toInt(form?.textSize?.content),
    textSizeCompareAt: toInt(form?.textSize?.compareAt),
    textSizePrice: toInt(form?.textSize?.price),

    message: toStr(form?.content?.message),
    timestamp: toStr(form?.content?.timestamp),
    productNameMode: toStr(form?.productNameMode),
    productNameLimit: toInt(form?.productNameLimit),

    dataSource: toStr(form?.data?.dataSource),
    directProductPage: toBool(form?.data?.directProductPage),
    showProductImage: toBool(form?.data?.showProductImage),
    showPriceTag: toBool(form?.data?.showPriceTag),
    showRating: toBool(form?.data?.showRating),

    showHome: toBool(form?.visibility?.showHome),
    showProduct: toBool(form?.visibility?.showProduct),
    productScope: toStr(form?.visibility?.productScope),
    showCollectionList: toBool(form?.visibility?.showCollectionList),
    showCollection: toBool(form?.visibility?.showCollection),
    collectionScope: toStr(form?.visibility?.collectionScope),
    showCart: toBool(form?.visibility?.showCart),
    position: toStr(form?.visibility?.position),

    showClose: toBool(form?.behavior?.showClose),
    hideOnMobile: toBool(form?.behavior?.hideOnMobile),
    delay: toInt(form?.behavior?.delay),
    duration: toInt(form?.behavior?.duration),
    interval: toInt(form?.behavior?.interval),
    intervalUnit: toStr(form?.behavior?.intervalUnit),
    randomize: toBool(form?.behavior?.randomize),

    selectedProductsJson: toJson(form?.selectedProducts),
    selectedCollectionsJson: toJson(form?.selectedCollections),
  };

  return upsertByShop(prisma.reviewpopupconfig, shop, data, "reviewpopupconfig");
}

export async function saveRecentPopup(shop, form) {
  const data = {
    enabled: form?.enabled?.includes?.("enabled") ?? false,
    showType: toStr(form?.showType),
    messageText: toStr(form?.messageText),
    fontFamily: toStr(form?.fontFamily),
    position: toStr(form?.position),
    animation: toStr(form?.animation),
    mobileSize: toStr(form?.mobileSize),
    mobilePositionJson: JSON.stringify(form?.mobilePosition ?? []),

    template: toStr(form?.template),
    layout: toStr(form?.layout),
    imageAppearance: toStr(form?.imageAppearance),

    bgColor: toStr(form?.bgColor),
    bgAlt: toStr(form?.bgAlt),
    textColor: toStr(form?.textColor),
    numberColor: toStr(form?.numberColor),
    priceTagBg: toStr(form?.priceTagBg),
    priceTagAlt: toStr(form?.priceTagAlt),
    priceColor: toStr(form?.priceColor),
    starColor: toStr(form?.starColor),

    rounded: toInt(form?.rounded),
    firstDelaySeconds: toInt(form?.firstDelaySeconds),
    durationSeconds: toInt(form?.durationSeconds),
    alternateSeconds: toInt(form?.alternateSeconds),
    intervalUnit: toStr(form?.intervalUnit),
    fontWeight: toInt(form?.fontWeight),

    productNameMode: toStr(form?.productNameMode),
    productNameLimit: toInt(form?.productNameLimit),
    orderDays: toInt(form?.orderDays),
    createOrderTime: form?.createOrderTime ?? null,

    messageTitlesJson: JSON.stringify(form?.messageTitlesJson ?? []),
    locationsJson: JSON.stringify(form?.locationsJson ?? []),
    namesJson: JSON.stringify(form?.namesJson ?? []),
    selectedProductsJson: JSON.stringify(form?.selectedProductsJson ?? []),
  };

  return upsertByShop(prisma.recentpopupconfig, shop, data, "recentpopupconfig");
}

export async function saveFlashPopup(shop, form) {
  const data = {
    enabled: form?.enabled?.includes?.("enabled") ?? false,
    showType: toStr(form?.showType),

    messageTitle: toStr(form?.messageTitle),
    name: toStr(form?.name),
    messageText: toStr(form?.messageText),

    fontFamily: toStr(form?.fontFamily),
    fontWeight: toInt(form?.fontWeight),
    layout: toStr(form?.layout),
    imageAppearance: toStr(form?.imageAppearance),
    template: toStr(form?.template),
    position: toStr(form?.position),
    animation: toStr(form?.animation),
    mobileSize: toStr(form?.mobileSize),
    mobilePositionJson: JSON.stringify(form?.mobilePosition ?? []),

    bgColor: toStr(form?.bgColor),
    bgAlt: toStr(form?.bgAlt),
    textColor: toStr(form?.textColor),
    numberColor: toStr(form?.numberColor),
    priceTagBg: toStr(form?.priceTagBg),
    priceTagAlt: toStr(form?.priceTagAlt),
    priceColor: toStr(form?.priceColor),
    starColor: toStr(form?.starColor),

    rounded: toInt(form?.rounded),
    firstDelaySeconds: toInt(form?.firstDelaySeconds),
    durationSeconds: toInt(form?.durationSeconds),
    alternateSeconds: toInt(form?.alternateSeconds),
    intervalUnit: toStr(form?.intervalUnit),

    iconKey: toStr(form?.iconKey),
    iconSvg: toStr(form?.iconSvg),

    messageTitlesJson: JSON.stringify(form?.messageTitlesJson ?? []),
    locationsJson: JSON.stringify(form?.locationsJson ?? []),
    namesJson: JSON.stringify(form?.namesJson ?? []),
    selectedProductsJson: JSON.stringify(form?.selectedProductsJson ?? []),
  };

  return upsertByShop(prisma.flashpopupconfig, shop, data, "flashpopupconfig");
}
