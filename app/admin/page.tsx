"use client";

import { useState, useEffect } from "react";
import { PREORDER_ORDER_STATUSES } from "@/lib/commerce";

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
  const [authLoading, setAuthLoading] = useState(true);
useEffect(() => {
  let cancelled = false;

  fetch("/api/admin/auth", { cache: "no-store" })
    .then(async (response) => {
      const data = await response.json();
      if (!cancelled) {
        setLoggedIn(response.ok && data.authenticated === true);
        setAuthLoading(false);
      }
    })
    .catch(() => {
      if (!cancelled) {
        setLoggedIn(false);
        setAuthLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, []);

  const [password, setPassword] = useState("");
    const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("WATCHES");
  const [productPrice, setProductPrice] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productStock, setProductStock] = useState("0");
  const [availability, setAvailability] = useState("БЭЛЭН");
const [products, setProducts] = useState<any[]>([]);
const [orders, setOrders] = useState<any[]>([]);
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

 const addProduct = async () => {
  const name = prompt("Барааны нэр:");
  if (!name) return;

  const description = prompt("Барааны тайлбар:") || "";

  const categoryChoice = prompt(
    "Ангилал сонгоно уу:\n1. ЦАГ\n2. ХУВЦАС\n3. ГУТАЛ\n4. АКСЕССУАР",
    "1"
  );

  if (!categoryChoice) return;


const categoryMap: Record<string, string> = {
  "1": "WATCHES",
  "2": "CLOTHING",
  "3": "SHOES",
  "4": "ACCESSORIES",
};

const category = categoryMap[categoryChoice.trim()];

if (!category) {
  alert("1, 2, 3 эсвэл 4 гэж сонгоно уу.");
  return;
}

    if (!category) return;

    const price = prompt("Үнэ:");
    if (!price) return;

const stock = prompt("Үлдэгдэл:", "5");
if (!stock) return;

const availability = prompt(
  "Барааны төлөв: БЭЛЭН эсвэл ЗАХИАЛГААР",
  "БЭЛЭН"
);
if (!availability) return;
  if (!productImageFile) {
  alert("Эхлээд зураг сонгоно уу.");
  return;
}

const imageForm = new FormData();
imageForm.set("file", productImageFile);
const uploadResponse = await fetch("/api/admin/upload", {
  method: "POST",
  body: imageForm,
});
const uploadResult = await uploadResponse.json();

if (!uploadResponse.ok) {
  alert(uploadResult.error || "Зураг upload хийхэд алдаа гарлаа.");
  return;
}

const image = uploadResult.image;
const createResponse = await fetch("/api/admin/products", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    category,
    price: Number(price),
    image,
    stock: Number(stock),
    availability,
    description,
  }),
});
const createResult = await createResponse.json();

    if (!createResponse.ok) {
      alert("Бараа нэмэхэд алдаа гарлаа: " + createResult.error);
      return;
    }

    alert("Бараа амжилттай нэмэгдлээ.");
    window.location.reload();
  };
  const deleteProduct = async () => {
  if (products.length === 0) {
    alert("Устгах бараа байхгүй байна.");
    return;
  }

  const list = products
    .map((item, index) => `${index + 1}. ${item.name}`)
    .join("\n");

  const choice = prompt(
    "Устгах бараагаа сонгоно уу:\n\n" +
      list +
      "\n\nДугаар оруулна уу:"
  );

  if (choice === null) return;

  const index = Number(choice) - 1;

  if (index < 0 || index >= products.length) {
    alert("Буруу дугаар.");
    return;
  }

  const product = products[index];

  if (!confirm(`"${product.name}" барааг устгах уу?`)) return;

  const deleteResponse = await fetch("/api/admin/products", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: Number(product.id) }),
  });
  const deleteResult = await deleteResponse.json();

  if (!deleteResponse.ok) {
    alert("Бараа устгахад алдаа гарлаа: " + deleteResult.error);
    return;
  }

  alert("Бараа амжилттай устгагдлаа.");
  window.location.reload();
};
useEffect(() => {
  if (!loggedIn) return;

  const fetchProducts = async () => {
    const response = await fetch("/api/admin/products", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      console.error("Products error:", result.error);
      return;
    }
    setProducts(result.products ?? []);
  };

  void fetchProducts();
}, [loggedIn]);
useEffect(() => {
  if (!loggedIn) return;

  const fetchOrders = async () => {
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      console.error("Orders error:", result.error);
      return;
    }
    setOrders(result.orders ?? []);
  };

  void fetchOrders();
}, [loggedIn]);
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(
    (order: any) => new Date(order.created_at) >= todayStart
  );

  const todayRevenue = todayOrders.reduce(
    (sum: number, order: any) => sum + Number(order.total || 0),
    0
  );

  const totalRevenue = orders.reduce(
    (sum: number, order: any) => sum + Number(order.total || 0),
    0
  );

if (authLoading) {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <p role="status">Нэвтрэлтийг шалгаж байна...</p>
    </main>
  );
}

if (!loggedIn) {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          VAULT 13 ADMIN
        </h1>
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
            try {
              const response = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              const data = await response.json();

              if (!response.ok || !data.authenticated) {
                alert(data.error || "Нэвтрэхэд алдаа гарлаа.");
                return;
              }

              const verification = await fetch("/api/admin/auth", { cache: "no-store" });
              const verified = await verification.json();
              setLoggedIn(verification.ok && verified.authenticated === true);
            } catch {
              alert("Сервертэй холбогдож чадсангүй.");
            }
          }}
          className="w-full border border-white py-4"
        >
          НЭВТРЭХ
        </button>
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

        <div className="mt-10 border border-white/20 p-6">
          <h2 className="text-xl font-bold">БҮТЭЭГДЭХҮҮН УДИРДАХ</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
  <button
    onClick={addProduct}
    className="border border-white py-4"
  >
    БАРАА НЭМЭХ
  </button>

  <button
    onClick={deleteProduct}
    className="border border-white py-4"
  >
    БАРАА УСТГАХ
  </button>
</div>
<input
  type="file"
  accept="image/*"
  onChange={(e) => {
    setProductImageFile(e.target.files?.[0] || null);
  }}
  className="border border-white py-3 px-4"
/>
    <button
  onClick={async () => {
  if (products.length === 0) {
    alert("Бараа байхгүй байна.");
    return;
  }

  const list = products
    .map((item, index) => `${index + 1}. ${item.name}`)
    .join("\n");

  const choice = prompt(
    "Засах бараагаа сонгоно уу:\n\n" +
    list +
    "\n\nДугаар оруулна уу:"
  );

  if (choice === null) return;

  const index = Number(choice) - 1;

  if (index < 0 || index >= products.length) {
    alert("Буруу дугаар.");
    return;
  }

  const product = products[index];

  const name = prompt("Шинэ нэр:", product.name);
  if (name === null) return;

  const price = prompt("Шинэ үнэ:", String(product.price));
  if (price === null) return;

  const categoryChoice = prompt(
    "Ангилал: 1. ЦАГ  2. ХУВЦАС  3. ГУТАЛ  4. АКСЕССУАР",
    product.category === "WATCHES" ? "1" : product.category === "CLOTHING" ? "2" : product.category === "SHOES" ? "3" : "4"
  );
  if (categoryChoice === null) return;
  const categoryMap: Record<string, string> = {
    "1": "WATCHES",
    "2": "CLOTHING",
    "3": "SHOES",
    "4": "ACCESSORIES",
  };
  const category = categoryMap[categoryChoice.trim()];
  if (!category) {
    alert("1, 2, 3 эсвэл 4 гэж сонгоно уу.");
    return;
  }

  const availability = prompt(
    "Барааны төлөв: IN_STOCK эсвэл PREORDER",
    product.availability ?? "IN_STOCK"
  );
  if (availability === null) return;

  const description = prompt("Шинэ тайлбар:", product.description ?? "");
  if (description === null) return;

  const image = prompt("Шинэ зургийн URL:", product.image);
  if (image === null) return;

  const response = await fetch("/api/admin/products", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: Number(product.id),
      updates: {
        name,
        price: Number(price),
        category,
        availability,
        description,
        image,
      },
    }),
  });
  const result = await response.json();

  if (!response.ok) {
    alert("Бараа засахад алдаа гарлаа: " + result.error);
    return;
  }

  alert("Бараа амжилттай засагдлаа.");
  window.location.reload();
}}
  className="w-full border border-white py-3"
>
  БАРАА ЗАСАХ
</button>

          <button
  onClick={async () => {
  if (products.length === 0) {
    alert("Бараа байхгүй байна.");
    return;
  }

  const list = products
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} — Үлдэгдэл: ${item.stock}`
    )
    .join("\n");

  const choice = prompt(
    "Үлдэгдэл засах бараагаа сонгоно уу:\n\n" +
      list +
      "\n\nДугаар оруулна уу:"
  );

  if (choice === null) return;

  const index = Number(choice) - 1;

  if (index < 0 || index >= products.length) {
    alert("Буруу дугаар.");
    return;
  }

  const product = products[index];

  const stock = prompt(
    "Шинэ үлдэгдэл:",
    String(product.stock)
  );

  if (stock === null) return;

  const response = await fetch("/api/admin/products", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: Number(product.id),
      updates: { stock: Number(stock) },
    }),
  });
  const result = await response.json();

  if (!response.ok) {
    alert("Үлдэгдэл засахад алдаа гарлаа: " + result.error);
    return;
  }

  alert("Үлдэгдэл амжилттай шинэчлэгдлээ.");
  window.location.reload();
}}
  className="w-full border border-white py-3"
>
  ҮЛДЭГДЭЛ ЗАСАХ
</button>
          </div>
        </div>

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
    Төлбөр баталгаажсан боловч үлдэгдэл хүрэлцээгүй байна. Нөөцийг шалгана уу.
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
    {order.is_overdue && !["Хүргэгдсэн", "Цуцлагдсан"].includes(order.order_status ?? "") && (
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
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, orderStatus: event.target.value }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("Order status update failed:", result.error);
        return;
      }
      setOrders((current) => current.map((item) => item.id === order.id ? result.order : item));
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
      order.items.map((item: any, index: number) => (
        <li key={`${item.id ?? item.name ?? "item"}-${index}`} className="text-gray-300">
          {item.name ?? "Нэргүй бараа"} —{" "}
          {Number(item.price ?? 0).toLocaleString()}₮
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