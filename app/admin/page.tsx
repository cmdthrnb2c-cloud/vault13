"use client";

import { useState, useEffect } from "react";
import { normalizeAvailability, PREORDER_ORDER_STATUSES } from "@/lib/commerce";

type MetaInsight = {
  date_start?: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
};

type MetaAlert = {
  metric: "spend" | "ctr" | "cpc";
  direction: "above" | "below";
  actual: number;
  threshold: number;
  dateStart?: string;
  dateStop?: string;
};

type ProductVariant = {
  color: string;
  price?: number;
  images: string[];
  availability: "IN_STOCK" | "PREORDER";
  sizes: { size: string; stock: number }[];
};

type AdminProduct = {
  id: number;
  name: string;
  category: string;
  price: string | number;
  image: string;
  images?: string[];
  videos?: string[];
  store?: "watches" | "culture";
  stock: number;
  availability?: string | null;
  description?: string | null;
  variants?: ProductVariant[];
};

type AdminOrder = {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  payment_status?: string;
  order_status?: string;
  inventory_issue?: boolean;
  has_preorder?: boolean;
  expected_arrival_at?: string | null;
  is_overdue?: boolean;
  items: Array<{
    id?: number;
    product_id?: number;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
  total: number | string;
  created_at: string;
};

const formatInsightValue = (value?: string, fractionDigits = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(number);
};



export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [storefrontMedia, setStorefrontMedia] = useState<Record<string, string>>({});
  const [storefrontFiles, setStorefrontFiles] = useState<Record<string, File | null>>({});
  const [storefrontSaving, setStorefrontSaving] = useState<string | null>(null);
  const [storefrontMessage, setStorefrontMessage] = useState("");

  const [productImageFiles, setProductImageFiles] = useState<File[]>([]);
  const [productVideoFiles, setProductVideoFiles] = useState<File[]>([]);
  const [variantImageFiles, setVariantImageFiles] = useState<Record<number, File[]>>({});
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [productForm, setProductForm] = useState({
    name: "",
    store: "watches" as "watches" | "culture",
    category: "WATCHES",
    price: "",
    stock: "0",
    availability: "IN_STOCK",
    description: "",
    image: "",
    images: [] as string[],
    videos: [] as string[],
    variants: [] as ProductVariant[],
  });
const [products, setProducts] = useState<AdminProduct[]>([]);
const [orders, setOrders] = useState<AdminOrder[]>([]);
const [orderSearch, setOrderSearch] = useState("");
const [orderDateFilter, setOrderDateFilter] = useState("");
const [metaInsights, setMetaInsights] = useState<MetaInsight[]>([]);
const [metaAlerts, setMetaAlerts] = useState<MetaAlert[]>([]);
const [metaAlertThresholdsConfigured, setMetaAlertThresholdsConfigured] = useState(false);
const [metaInsightsLoading, setMetaInsightsLoading] = useState(false);
const [metaInsightsError, setMetaInsightsError] = useState("");
const [metaInsightsRefreshCount, setMetaInsightsRefreshCount] = useState(0);
const [metaInsightsUpdatedAt, setMetaInsightsUpdatedAt] = useState<Date | null>(null);

const filteredOrders = orders.filter((order) => {
  const query = orderSearch.trim().toLowerCase();

  const matchesSearch =
    !query ||
    [order.id, order.customer_name, order.customer_phone].some(
      (value) => String(value ?? "").toLowerCase().includes(query)
    );

  const matchesDate =
    !orderDateFilter ||
    String(order.created_at ?? "").slice(0, 10) === orderDateFilter;

  return matchesSearch && matchesDate;
});

useEffect(() => {
 let cancelled = false;
 fetch("/api/admin/auth", { cache: "no-store" })
   .then(async (response) => {
     const result = await response.json();
     if (!cancelled) setLoggedIn(response.ok && result.authenticated === true);
   })
   .catch(() => {
     if (!cancelled) setAdminMessage("Админы нэвтрэлтийг шалгаж чадсангүй.");
   })
   .finally(() => {
     if (!cancelled) setAuthChecked(true);
   });

 return () => {
   cancelled = true;
 };
}, []);

useEffect(() => {
 if (!loggedIn) return;
 let cancelled = false;
 const loadAdminData = async () => {
   const [productsResponse, ordersResponse] = await Promise.all([
     fetch("/api/admin/products", { cache: "no-store" }),
     fetch("/api/admin/orders", { cache: "no-store" }),
   ]);
   const [productsResult, ordersResult] = await Promise.all([
     productsResponse.json(),
     ordersResponse.json(),
   ]);

   if (cancelled) return;
  if (!productsResponse.ok) {
  setAdminMessage(productsResult.error || "Бараа ачаалж чадсангүй.");
  return;
}

setProducts(productsResult.products ?? []);

if (!ordersResponse.ok) {
  setAdminMessage(ordersResult.error || "Захиалга ачаалж чадсангүй.");
  return;
}

setOrders(ordersResult.orders ?? []);
 };

 void loadAdminData().catch(() => {
   if (!cancelled) setAdminMessage("Админы мэдээлэл ачаалж чадсангүй.");
 });
 return () => {
   cancelled = true;
 };
}, [loggedIn]);


const storefrontImageItems = [
  { key: "watch_hero", label: "WATCHES HERO" },
  { key: "culture_hero", label: "CULTURE HERO" },
  { key: "culture_music_merch", label: "MUSIC & BAND MERCH" },
  { key: "culture_footwear", label: "FOOTWEAR" },
  { key: "culture_clothing", label: "CLOTHING" },
  { key: "culture_film_cinema", label: "FILM & CINEMA" },
  { key: "culture_music_vinyl", label: "MUSIC & VINYL" },
  { key: "culture_accessories", label: "ACCESSORIES" },
];

const saveStorefrontImage = async (key: string) => {
  const file = storefrontFiles[key];
  if (!file) {
    setStorefrontMessage("Эхлээд зураг сонгоно уу.");
    return;
  }

  setStorefrontSaving(key);
  setStorefrontMessage("");

  try {
    const uploaded = await uploadMediaFiles([file]);
    const response = await fetch("/api/storefront-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, url: uploaded[0] }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Зургийг хадгалж чадсангүй.");
    }

    setStorefrontMedia((current) => ({ ...current, [key]: uploaded[0] }));
    setStorefrontFiles((current) => ({ ...current, [key]: null }));
    setStorefrontMessage("Зураг амжилттай хадгалагдлаа.");
  } catch (error) {
    setStorefrontMessage(error instanceof Error ? error.message : "Алдаа гарлаа.");
  } finally {
    setStorefrontSaving(null);
  }
};

useEffect(() => {
  if (!loggedIn) return;
  fetch("/api/storefront-media", { cache: "no-store" })
    .then(async (response) => {
      const result = await response.json();
      setStorefrontMedia(result.media ?? {});
    })
    .catch(() => setStorefrontMessage("Storefront зургуудыг ачаалж чадсангүй."));
}, [loggedIn]);

const resetProductForm = () => {
 setEditingProductId(null);
 setProductImageFiles([]);
 setProductVideoFiles([]);
 setVariantImageFiles({});
 setProductForm({
   name: "",
   store: "watches",
   category: "WATCHES",
   price: "",
   stock: "0",
   availability: "IN_STOCK",
   description: "",
   image: "",
   images: [],
   videos: [],
   variants: [],
 });
};

const editProduct = (product: AdminProduct) => {
 setEditingProductId(Number(product.id));
 setProductImageFiles([]);
 setProductVideoFiles([]);
 setVariantImageFiles({});
 const existingImages = Array.isArray(product.images) && product.images.length
   ? product.images
   : product.image ? [product.image] : [];
 setProductForm({
   name: String(product.name ?? ""),
   store: product.store === "culture" ? "culture" : "watches",
   category: String(product.category ?? "WATCHES"),
   price: String(product.price ?? ""),
   stock: String(product.stock ?? 0),
   availability: normalizeAvailability(product.availability),
   description: String(product.description ?? ""),
   image: String(product.image ?? existingImages[0] ?? ""),
   images: existingImages,
   videos: Array.isArray(product.videos) ? product.videos : [],
   variants: Array.isArray(product.variants) ? product.variants : [],
 });
};

const uploadMediaFiles = async (files: File[]) => {
 const uploaded: string[] = [];
 for (const file of files) {
   const formData = new FormData();
   formData.append("file", file);
   const response = await fetch("/api/admin/upload", {
     method: "POST",
     body: formData,
   });
   const result = await response.json();
   if (!response.ok || !result.url) {
     throw new Error(result.error || `Файл upload хийхэд алдаа гарлаа: ${file.name}`);
   }
   uploaded.push(String(result.url));
 }
 return uploaded;
};

const saveProduct = async () => {
 setAdminMessage("");
 if (!productForm.name.trim() || !productForm.price) {
   setAdminMessage("Барааны нэр болон үнийг оруулна уу.");
   return;
 }

 setIsSavingProduct(true);
 try {
   if (productImageFiles.length + (productForm.images?.length ?? 0) > 12) {
     throw new Error("Нэг бараанд хамгийн ихдээ 12 зураг оруулна уу.");
   }
   if (productVideoFiles.length + (productForm.videos?.length ?? 0) > 5) {
     throw new Error("Нэг бараанд хамгийн ихдээ 5 видео оруулна уу.");
   }
   const uploadedImages = await uploadMediaFiles(productImageFiles);
   const uploadedVideos = await uploadMediaFiles(productVideoFiles);
   const existingImages = Array.isArray(productForm.images) ? productForm.images : [];
   const images = [...existingImages, ...uploadedImages];
   const videos = [...(Array.isArray(productForm.videos) ? productForm.videos : []), ...uploadedVideos];
   const image = images[0] || productForm.image.trim();

   const variants = await Promise.all(
     (productForm.variants ?? []).map(async (variant, index) => {
       const files = variantImageFiles[index] ?? [];
       if (variant.images.length + files.length > 12) {
         throw new Error(`${variant.color || `Өнгө ${index + 1}`} өнгөнд хамгийн ихдээ 12 зураг оруулна уу.`);
       }
       const uploadedVariantImages = await uploadMediaFiles(files);
       return {
         ...variant,
         images: [...variant.images, ...uploadedVariantImages],
       };
     })
   );

   if (!image) {
     throw new Error("Дор хаяж нэг зураг эсвэл зургийн URL оруулна уу.");
   }

   const response = await fetch("/api/admin/products", {
     method: editingProductId === null ? "POST" : "PATCH",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       id: editingProductId,
       name: productForm.name.trim(),
       store: productForm.store,
       category: productForm.category,
       price: Number(productForm.price.replace(/[^\d]/g, "")),
       stock: Number(productForm.stock),
       availability: productForm.availability,
       description: productForm.description,
       image,
       images,
       videos,
       variants: ["CLOTHING", "FOOTWEAR"].includes(productForm.category)
         ? variants
         : [],
     }),
   });
   const result = await response.json();
   if (!response.ok) throw new Error(result.error || "Бараа хадгалж чадсангүй.");

   setProducts((current) => editingProductId === null
     ? [...current, result.product]
     : current.map((item) => item.id === result.product.id ? result.product : item));
   resetProductForm();
   setAdminMessage("Барааны мэдээлэл амжилттай хадгалагдлаа.");
 } catch (error) {
   setAdminMessage(error instanceof Error ? error.message : "Бараа хадгалж чадсангүй.");
 } finally {
   setIsSavingProduct(false);
 }
};

const deleteProduct = async () => {
 if (editingProductId === null) {
   setAdminMessage("Устгах барааг эхлээд сонгоно уу.");
   return;
 }
 const product = products.find((item) => Number(item.id) === editingProductId);
 if (!product || !confirm(`"${product.name}" барааг устгах уу?`)) return;

 const response = await fetch("/api/admin/products", {
   method: "DELETE",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ id: editingProductId }),
 });
 const result = await response.json();
 if (!response.ok) {
   setAdminMessage(result.error || "Бараа устгаж чадсангүй.");
   return;
 }
 setProducts((current) => current.filter((item) => Number(item.id) !== editingProductId));
 resetProductForm();
 setAdminMessage("Бараа амжилттай устгагдлаа.");
};
useEffect(() => {
  if (!loggedIn) return;

  let cancelled = false;

  const fetchMetaInsights = async () => {
    setMetaInsightsLoading(true);
    setMetaInsightsError("");

    try {
      const response = await fetch("/api/meta-insights", { cache: "no-store" });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        insights?: MetaInsight[];
        alerts?: MetaAlert[];
        thresholdsConfigured?: boolean;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Meta Ads report could not be loaded.");
      }

      if (!cancelled) {
        setMetaInsights(result.insights ?? []);
        setMetaAlerts(result.alerts ?? []);
        setMetaAlertThresholdsConfigured(result.thresholdsConfigured ?? false);
        setMetaInsightsUpdatedAt(new Date());
      }
    } catch (error) {
      if (!cancelled) {
        setMetaInsightsError(
          error instanceof Error ? error.message : "Meta Ads report could not be loaded."
        );
      }
    } finally {
      if (!cancelled) setMetaInsightsLoading(false);
    }
  };

  void fetchMetaInsights();
  return () => {
    cancelled = true;
  };
}, [loggedIn, metaInsightsRefreshCount]);

const latestMetaInsight = metaInsights[0];
const metaInsightsDateRange = latestMetaInsight?.date_start && latestMetaInsight.date_stop
  ? `${latestMetaInsight.date_start} to ${latestMetaInsight.date_stop}`
  : "Meta last 7 days";
const metaPerformanceSummary = latestMetaInsight
  ? `The account delivered ${formatInsightValue(latestMetaInsight.impressions)} impressions and ${formatInsightValue(latestMetaInsight.clicks)} clicks at ${formatInsightValue(latestMetaInsight.ctr, 2)}% CTR. Spend was ${formatInsightValue(latestMetaInsight.spend, 2)}, with ${formatInsightValue(latestMetaInsight.cpc, 2)} average CPC and ${formatInsightValue(latestMetaInsight.cpm, 2)} CPM.`
  : "No account insights are available for this reporting period.";

if (!loggedIn) {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          VAULT 13 ADMIN
        </h1>
        {!authChecked ? (
          <p className="text-gray-400">Нэвтрэлтийг шалгаж байна...</p>
        ) : (
          <>
        <p className="text-gray-400 mb-4">
          ADMIN PANEL
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Нууц үг"
          className="w-full border border-white bg-black p-4 mb-4"
        />

        <button
          onClick={async () => {
            setAdminMessage("");
            const response = await fetch("/api/admin/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const result = await response.json();
            if (!response.ok) {
              setAdminMessage(result.error || "Нэвтрэхэд алдаа гарлаа.");
              return;
            }
            setPassword("");
            setLoggedIn(true);
          }}
          className="w-full border border-white py-4"
        >
          НЭВТРЭХ
        </button>
          </>
        )}
        {adminMessage && <p className="mt-4 text-amber-300" role="alert">{adminMessage}</p>}
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold tracking-[0.2em]">
          VAULT 13 ADMIN
        </h1>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/admin/auth", { method: "DELETE" });
            setLoggedIn(false);
            setProducts([]);
            setOrders([]);
          }}
          className="mt-4 border border-white/30 px-4 py-2 text-sm"
        >
          ГАРАХ
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          <div className="border border-white/20 p-6">
            <p className="text-gray-500">БҮТЭЭГДЭХҮҮН</p>
            <p className="text-3xl font-bold mt-3">{products.length}</p>
          </div>

          <div className="border border-white/20 p-6">
            <p className="text-gray-500">ЗАХИАЛГА</p>
            <p className="text-3xl font-bold mt-3">{orders.length}</p>
          </div>

          <div className="border border-white/20 p-6">
            <p className="text-gray-500">БОРЛУУЛАЛТ</p>
            <p className="text-3xl font-bold mt-3">0₮</p>
          </div>
        </div>

        
<section className="mt-10 border border-white/20 p-6">
  <p className="text-xs tracking-[0.2em] text-gray-500">WEBSITE SETTINGS</p>
  <h2 className="mt-2 text-xl font-bold">STOREFRONT MEDIA</h2>
  <p className="mt-2 text-sm text-gray-400">
    Нүүр хуудасны 2 Hero болон Culture-ийн 6 ангиллын зургийг эндээс солино.
  </p>

  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
    {storefrontImageItems.map((item) => (
      <div key={item.key} className="min-w-0 border border-white/15 p-3">
        <p className="mb-3 text-xs font-semibold tracking-wider">{item.label}</p>
        {storefrontMedia[item.key] ? (
          <img
            src={storefrontMedia[item.key]}
            alt={item.label}
            className="mb-3 aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="mb-3 flex aspect-[4/3] items-center justify-center bg-white/5 text-xs text-gray-500">
            Зураг тохируулаагүй
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(event) =>
            setStorefrontFiles((current) => ({
              ...current,
              [item.key]: event.target.files?.[0] ?? null,
            }))
          }
          className="w-full text-xs text-gray-400 file:mr-2 file:border-0 file:bg-white file:px-3 file:py-2 file:text-black"
        />
        <button
          type="button"
          onClick={() => void saveStorefrontImage(item.key)}
          disabled={!storefrontFiles[item.key] || storefrontSaving === item.key}
          className="mt-3 w-full border border-white/30 px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          {storefrontSaving === item.key ? "UPLOAD ХИЙЖ БАЙНА..." : "ЗУРАГ СОЛИХ / ХАДГАЛАХ"}
        </button>
      </div>
    ))}
  </div>
  {storefrontMessage && (
    <p className="mt-4 text-sm text-amber-300" role="status">{storefrontMessage}</p>
  )}
</section>

<section aria-labelledby="meta-insights-title" className="mt-10 border border-white/20 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.2em] text-gray-500">META ADS</p>
              <h2 id="meta-insights-title" className="mt-2 text-xl font-bold">
                Account performance
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Reporting period: {metaInsightsDateRange}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMetaInsightsRefreshCount((count) => count + 1)}
              disabled={metaInsightsLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/30 px-4 text-sm font-semibold transition hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50"
              aria-label="Refresh Meta Ads insights"
            >
              <span aria-hidden="true">↻</span>
              {metaInsightsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {metaInsightsError ? (
            <div className="mt-6 flex flex-col gap-3 border-l-2 border-red-400 pl-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-300" role="alert">{metaInsightsError}</p>
              <button
                type="button"
                onClick={() => setMetaInsightsRefreshCount((count) => count + 1)}
                className="self-start text-sm underline underline-offset-4 hover:text-white sm:self-auto"
              >
                Try again
              </button>
            </div>
          ) : metaInsightsLoading && metaInsights.length === 0 ? (
            <p className="mt-6 text-sm text-gray-400" role="status">
              Loading Meta Ads insights...
            </p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
                {[
                  { label: "Spend", value: formatInsightValue(latestMetaInsight?.spend, 2) },
                  { label: "Impressions", value: formatInsightValue(latestMetaInsight?.impressions) },
                  { label: "Clicks", value: formatInsightValue(latestMetaInsight?.clicks) },
                  { label: "CTR", value: `${formatInsightValue(latestMetaInsight?.ctr, 2)}%` },
                  { label: "CPC", value: formatInsightValue(latestMetaInsight?.cpc, 2) },
                  { label: "CPM", value: formatInsightValue(latestMetaInsight?.cpm, 2) },
                ].map((metric) => (
                  <div key={metric.label} className="min-w-0 bg-black p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                      {metric.label}
                    </p>
                    <p className="mt-3 break-words text-xl font-semibold tabular-nums sm:text-2xl">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                  Performance summary
                </p>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-300">
                  {metaInsightsLoading ? "Refreshing report... " : ""}
                  {metaPerformanceSummary}
                </p>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
                  Threshold alerts
                </p>
                {!metaAlertThresholdsConfigured ? (
                  <p className="mt-2 text-sm text-gray-500">
                    Set META_ALERT_MAX_SPEND, META_ALERT_MIN_CTR, or META_ALERT_MAX_CPC in Vercel to enable alerts.
                  </p>
                ) : metaAlerts.length === 0 ? (
                  <p className="mt-2 text-sm text-emerald-300">
                    No configured thresholds were breached.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2" aria-live="polite">
                    {metaAlerts.map((alert, index) => (
                      <li
                        key={`${alert.metric}-${alert.dateStart ?? "period"}-${index}`}
                        className="border-l-2 border-amber-400 pl-3 text-sm text-amber-200"
                      >
                        {alert.metric.toUpperCase()} is {alert.direction} its threshold
                        ({formatInsightValue(String(alert.actual), 2)} vs {formatInsightValue(String(alert.threshold), 2)})
                        {alert.dateStart && alert.dateStop
                          ? ` for ${alert.dateStart} to ${alert.dateStop}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {metaInsightsUpdatedAt && (
                <p className="mt-3 text-xs text-gray-600" aria-live="polite">
                  Updated {metaInsightsUpdatedAt.toLocaleTimeString()}
                </p>
              )}
            </>
          )}
        </section>

        <section className="mt-10 border border-white/20 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">БҮТЭЭГДЭХҮҮН УДИРДАХ</h2>
            <button type="button" onClick={resetProductForm} className="border border-white/30 px-4 py-2">
              ШИНЭ БАРАА
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={editingProductId ?? ""}
              onChange={(event) => {
                const selected = products.find((item) => String(item.id) === event.target.value);
                if (selected) editProduct(selected);
                else resetProductForm();
              }}
              className="w-full border border-white/20 bg-black p-3"
            >
              <option value="">Шинэ бараа үүсгэх / засах бараа сонгох</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            {editingProductId !== null && (
              <button type="button" onClick={() => void deleteProduct()} className="border border-red-400 px-4 py-2 text-red-300">
                БАРАА УСТГАХ
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-gray-300">
              <span>Барааны нэр</span>
              <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} className="w-full border border-white/20 bg-black p-3" />
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              <span>Дэлгүүр</span>
              <select value={productForm.store} onChange={(event) => setProductForm({
                ...productForm,
                store: event.target.value as "watches" | "culture",
                category: event.target.value === "culture" ? "MUSIC_MERCH" : "WATCHES",
              })} className="w-full border border-white/20 bg-black p-3">
                <option value="watches">WATCHES</option>
                <option value="culture">CULTURE</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              <span>Ангилал</span>
              <select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} className="w-full border border-white/20 bg-black p-3">
                {productForm.store === "watches" ? (
                  <>
                    <option value="WATCHES">ЦАГ</option>
                    <option value="ACCESSORIES">АКСЕССУАР</option>
                  </>
                ) : (
                  <>
                    <option value="MUSIC_MERCH">MUSIC MERCH</option>
                    <option value="FOOTWEAR">FOOTWEAR</option>
                    <option value="CLOTHING">CLOTHING</option>
                    <option value="FILM_CINEMA">FILM / CINEMA</option>
                    <option value="MUSIC_VINYL">MUSIC / VINYL</option>
                    <option value="ACCESSORIES">ACCESSORIES</option>
                  </>
                )}
              </select>
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              <span>Үнэ (₮)</span>
              <input type="number" min="1" value={productForm.price.replace(/[^\d]/g, "")} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} className="w-full border border-white/20 bg-black p-3" />
            </label>
            <label className="space-y-2 text-sm text-gray-300">
              <span>Барааны боломж</span>
              <select value={productForm.availability} onChange={(event) => setProductForm({ ...productForm, availability: event.target.value })} className="w-full border border-white/20 bg-black p-3">
                <option value="IN_STOCK">In stock (Бэлэн байгаа)</option>
                <option value="PREORDER">Preorder (Урьдчилсан захиалга)</option>
              </select>
            </label>
            {productForm.availability === "IN_STOCK" ? (
              <label className="space-y-2 text-sm text-gray-300">
                <span>Үлдэгдэл</span>
                <input type="number" min="0" step="1" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} className="w-full border border-white/20 bg-black p-3" />
              </label>
            ) : (
              <p className="self-end border border-amber-300/30 p-3 text-sm text-amber-200">
                Урьдчилсан захиалга 6–9 хоногт ирнэ. Барааны биет үлдэгдлээс хасахгүй.
              </p>
            )}
            <div className="space-y-3 text-sm text-gray-300 md:col-span-2">
              <label className="block space-y-2">
                <span>Зургийн URL (эхний зураг)</span>
                <input value={productForm.image} onChange={(event) => setProductForm({
                  ...productForm,
                  image: event.target.value,
                  images: event.target.value.trim()
                    ? [event.target.value.trim(), ...(productForm.images ?? []).filter((url) => url !== productForm.image && url !== event.target.value.trim())]
                    : (productForm.images ?? []).filter((url) => url !== productForm.image),
                })} placeholder="Зургийн URL оруулах (сонголтоор)" className="w-full border border-white/20 bg-black p-3" />
              </label>
              <label className="block space-y-2">
                <span>Олон зураг upload хийх</span>
                <input type="file" accept="image/*" multiple onChange={(event) => setProductImageFiles(Array.from(event.target.files ?? []))} className="w-full border border-white/20 bg-black p-3" />
                <span className="block text-xs text-gray-500">Нэг зураг 15MB-аас бага байна. Одоо сонгосон: {productImageFiles.length}</span>
              </label>
              {((productForm.images ?? []).length > 0 || productImageFiles.length > 0) && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(productForm.images ?? []).map((url, index) => (
                    <div key={`${url}-${index}`} className="space-y-2 border border-white/15 p-2">
                      <img src={url} alt={`Барааны зураг ${index + 1}`} className="aspect-square w-full object-cover" />
                      <p className="text-xs text-gray-400">{index === 0 ? "Үндсэн зураг" : `Зураг ${index + 1}`}</p>
                      <button type="button" onClick={() => {
                        const next = (productForm.images ?? []).filter((_, imageIndex) => imageIndex !== index);
                        setProductForm({ ...productForm, images: next, image: next[0] ?? "" });
                      }} className="text-xs text-red-300 underline">Устгах</button>
                    </div>
                  ))}
                  {productImageFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="border border-white/15 p-2 text-xs text-gray-400">
                      {file.name}
                      <p className="mt-1">Шинэ зураг upload хийнэ</p>
                    </div>
                  ))}
                </div>
              )}
              <label className="block space-y-2">
                <span>Видео upload хийх (сонголтоор)</span>
                <input type="file" accept="video/*" multiple onChange={(event) => setProductVideoFiles(Array.from(event.target.files ?? []))} className="w-full border border-white/20 bg-black p-3" />
                <span className="block text-xs text-gray-500">Нэг видео 50MB-аас бага байна. Одоо сонгосон: {productVideoFiles.length}</span>
              </label>
              {(productForm.videos ?? []).length > 0 && (
                <div className="space-y-2">
                  {(productForm.videos ?? []).map((url, index) => (
                    <div key={`${url}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border border-white/15 p-3">
                      <a href={url} target="_blank" rel="noreferrer" className="break-all text-xs underline">Видео {index + 1} үзэх</a>
                      <button type="button" onClick={() => setProductForm({
                        ...productForm,
                        videos: (productForm.videos ?? []).filter((_, videoIndex) => videoIndex !== index),
                      })} className="text-xs text-red-300 underline">Устгах</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {["CLOTHING", "FOOTWEAR"].includes(productForm.category) && (
              <div className="space-y-4 border border-white/20 p-4 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold">ӨНГӨ, РАЗМЕР, ҮЛДЭГДЭЛ</h3>
                  <button
                    type="button"
                    onClick={() => setProductForm({
                      ...productForm,
                      variants: [
                        ...productForm.variants,
                        {
                          color: "",
                          price: undefined,
                          images: [],
                          availability: productForm.availability as "IN_STOCK" | "PREORDER",
                          sizes: [{ size: "", stock: 0 }],
                        },
                      ],
                    })}
                    className="border border-white/40 px-3 py-2 text-sm"
                  >
                    + ӨНГӨ НЭМЭХ
                  </button>
                </div>

                {(productForm.variants ?? []).map((variant, variantIndex) => (
                  <div key={variantIndex} className="space-y-3 border border-white/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <strong>Өнгө {variantIndex + 1}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          setProductForm({
                            ...productForm,
                            variants: productForm.variants.filter((_, i) => i !== variantIndex),
                          });
                          setVariantImageFiles((current) => {
                            const next = { ...current };
                            delete next[variantIndex];
                            return next;
                          });
                        }}
                        className="text-sm text-red-300 underline"
                      >
                        Устгах
                      </button>
                    </div>

                    <label className="block space-y-1 text-sm">
                      <span>Өнгөний нэр</span>
                      <input
                        value={variant.color}
                        onChange={(event) => {
                          const variants = [...productForm.variants];
                          variants[variantIndex] = { ...variant, color: event.target.value };
                          setProductForm({ ...productForm, variants });
                        }}
                        placeholder="Жишээ: Vintage Grey, Washed Black, Cream"
                        className="w-full border border-white/20 bg-black p-3"
                      />
                    </label>

                    <label className="block space-y-1 text-sm">
                      <span>Энэ өнгөний үнэ (₮) — хоосон бол үндсэн үнэ</span>
                      <input
                        type="number"
                        min="1"
                        value={variant.price ?? ""}
                        onChange={(event) => {
                          const variants = [...productForm.variants];
                          variants[variantIndex] = {
                            ...variant,
                            price: event.target.value ? Number(event.target.value) : undefined,
                          };
                          setProductForm({ ...productForm, variants });
                        }}
                        className="w-full border border-white/20 bg-black p-3"
                      />
                    </label>

                    <label className="block space-y-1 text-sm">
                      <span>Барааны боломж</span>
                      <select
                        value={variant.availability}
                        onChange={(event) => {
                          const variants = [...productForm.variants];
                          variants[variantIndex] = {
                            ...variant,
                            availability: event.target.value as "IN_STOCK" | "PREORDER",
                          };
                          setProductForm({ ...productForm, variants });
                        }}
                        className="w-full border border-white/20 bg-black p-3"
                      >
                        <option value="IN_STOCK">Бэлэн байгаа</option>
                        <option value="PREORDER">Урьдчилсан захиалга</option>
                      </select>
                    </label>

                    <div className="space-y-2">
                      <span className="text-sm">Энэ өнгөний зураг</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => setVariantImageFiles((current) => ({
                          ...current,
                          [variantIndex]: Array.from(event.target.files ?? []),
                        }))}
                        className="w-full border border-white/20 bg-black p-3 text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Сонгосон шинэ зураг: {(variantImageFiles[variantIndex] ?? []).length}
                      </p>
                      {variant.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {variant.images.map((url, imageIndex) => (
                            <div key={`${url}-${imageIndex}`} className="space-y-1">
                              <img src={url} alt={`${variant.color} зураг ${imageIndex + 1}`} className="aspect-square w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  const variants = [...productForm.variants];
                                  variants[variantIndex] = {
                                    ...variant,
                                    images: variant.images.filter((_, i) => i !== imageIndex),
                                  };
                                  setProductForm({ ...productForm, variants });
                                }}
                                className="text-xs text-red-300 underline"
                              >
                                Зураг устгах
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">Размер ба үлдэгдэл</span>
                        <button
                          type="button"
                          onClick={() => {
                            const variants = [...productForm.variants];
                            variants[variantIndex] = {
                              ...variant,
                              sizes: [...variant.sizes, { size: "", stock: 0 }],
                            };
                            setProductForm({ ...productForm, variants });
                          }}
                          className="text-sm underline"
                        >
                          + Размер нэмэх
                        </button>
                      </div>

                      {variant.sizes.map((sizeItem, sizeIndex) => (
                        <div key={sizeIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <input
                            value={sizeItem.size}
                            onChange={(event) => {
                              const variants = [...productForm.variants];
                              const sizes = [...variant.sizes];
                              sizes[sizeIndex] = { ...sizeItem, size: event.target.value };
                              variants[variantIndex] = { ...variant, sizes };
                              setProductForm({ ...productForm, variants });
                            }}
                            placeholder="Размер: S, M, L, 42..."
                            className="min-w-0 border border-white/20 bg-black p-2 text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={sizeItem.stock}
                            onChange={(event) => {
                              const variants = [...productForm.variants];
                              const sizes = [...variant.sizes];
                              sizes[sizeIndex] = {
                                ...sizeItem,
                                stock: Math.max(0, Number(event.target.value)),
                              };
                              variants[variantIndex] = { ...variant, sizes };
                              setProductForm({ ...productForm, variants });
                            }}
                            disabled={variant.availability === "PREORDER"}
                            placeholder="Үлдэгдэл"
                            className="min-w-0 border border-white/20 bg-black p-2 text-sm disabled:opacity-40"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const variants = [...productForm.variants];
                              variants[variantIndex] = {
                                ...variant,
                                sizes: variant.sizes.filter((_, i) => i !== sizeIndex),
                              };
                              setProductForm({ ...productForm, variants });
                            }}
                            className="px-2 text-red-300"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {variant.availability === "PREORDER" && (
                        <p className="text-xs text-amber-200">
                          Урьдчилсан захиалга: размер сонгох боломжтой, биет үлдэгдэл хасахгүй.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="space-y-2 text-sm text-gray-300 md:col-span-2">
              <span>Тайлбар</span>
              <textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} rows={3} className="w-full border border-white/20 bg-black p-3" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveProduct()} disabled={isSavingProduct} className="border border-white px-6 py-3 disabled:opacity-50">
              {isSavingProduct ? "ХАДГАЛЖ БАЙНА..." : editingProductId === null ? "БАРАА НЭМЭХ" : "ӨӨРЧЛӨЛТ ХАДГАЛАХ"}
            </button>
            {adminMessage && <p className="self-center text-sm text-amber-200" role="status">{adminMessage}</p>}
          </div>
        </section>

   <div className="mt-6 border border-white/20 p-6">
  <h2 className="text-xl font-bold">ЗАХИАЛГУУД</h2>

<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
  <input
    type="text"
    value={orderSearch}
    onChange={(e) => setOrderSearch(e.target.value)}
    placeholder="Нэр, утас эсвэл захиалгын дугаар..."
    className="w-full border border-white/20 bg-black p-3 text-white"
  />
  <input
    type="date"
    value={orderDateFilter}
    onChange={(e) => setOrderDateFilter(e.target.value)}
    className="w-full border border-white/20 bg-black p-3 text-white"
  />
</div>


{filteredOrders.length === 0 ? (
  <p className="text-gray-500 mt-4">
    Одоогоор захиалга байхгүй.
  </p>
) : (
  <div className="mt-6 space-y-4">
    {filteredOrders.map((order) => (
      <div
        key={order.id}
        className="border border-white/20 p-5"
      >
        <p>
          <strong>Нэр:</strong> {order.customer_name}
        </p>
        <p>
          <strong>Утас:</strong> {order.customer_phone}
        </p>
        <p>
          <strong>Хаяг:</strong> {order.customer_address}
        </p>
       
<p>
  <strong>Төлбөр:</strong> {order.payment_method}
</p>
<p className="mt-1">
  <strong>Төлбөрийн төлөв:</strong> {order.payment_status === "PAID" ? "Төлбөр баталгаажсан" : "Төлбөр хүлээгдэж байна"}
</p>
{order.inventory_issue && (
  <p className="mt-2 border border-red-400/40 p-3 text-red-200" role="alert">
    Төлбөр баталгаажсан боловч үлдэгдэл хүрэлцээгүй байна. Нийлүүлэгч/нөөцийг яаралтай шалгана уу.
  </p>
)}
{order.has_preorder && (
  <div className="mt-3 space-y-1">
    <p className="text-amber-200">УРЬДЧИЛСАН ЗАХИАЛГА — 6–9 хоног</p>
    {order.expected_arrival_at && (
      <p className="text-sm text-gray-400">
        Тооцоолсон хугацаа: {new Date(order.expected_arrival_at).toLocaleDateString("mn-MN")}
      </p>
    )}
    {order.is_overdue &&
      !["Хүргэгдсэн", "Цуцлагдсан"].includes(order.order_status ?? "") && (
        <p className="font-semibold text-red-300" role="status">
          ХУГАЦАА ХЭТРЭВ — Админ шалгах шаардлагатай
        </p>
      )}
  </div>
)}
<label className="mt-3 flex flex-col gap-2 text-sm">
  <span><strong>Захиалгын төлөв:</strong></span>
  <select
    value={order.order_status ?? "Төлбөр хүлээгдэж байна"}
    onChange={async (event) => {
      const orderStatus = event.target.value;
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, orderStatus }),
      });
      const result = await response.json();
      if (!response.ok) {
        setAdminMessage(result.error || "Захиалгын төлөв шинэчилж чадсангүй.");
        return;
      }
      setOrders((current) => current.map((item) => item.id === order.id ? result.order : item));
      setAdminMessage("");
    }}
    className="w-full border border-white/20 bg-black p-3 sm:max-w-sm"
  >
    {PREORDER_ORDER_STATUSES.map((status) => (
      <option
        key={status}
        value={status}
        disabled={status === "Төлбөр баталгаажсан" && order.payment_status !== "PAID"}
      >
        {status}
      </option>
    ))}
  </select>
</label>

<div className="mt-3">
  <strong>Захиалсан бараа:</strong>
  <ul className="mt-2 space-y-2">
    {Array.isArray(order.items) &&
      order.items.map((item, index: number) => (
        <li key={`${item.id ?? item.name ?? "item"}-${index}`} className="text-gray-300">
          {item.name ?? "Нэргүй бараа"} — {Number(item.price ?? 0).toLocaleString()}₮ × {Number(item.quantity ?? 1)}
        </li>
      ))}
  </ul>
</div>

<p>
  <strong>Нийт:</strong>{" "}
  {Number(order.total).toLocaleString()}₮
</p>

        
        <p className="text-gray-500 text-sm mt-2">
          {new Date(order.created_at).toLocaleString("mn-MN")}
        </p>
      </div>
    ))}
  </div>
)}
  </div>
</div>
    </main>
  );
}