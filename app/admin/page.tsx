"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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
useEffect(() => {
  setLoggedIn(sessionStorage.getItem("vault13_admin") === "true");
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

const fileExt = productImageFile.name.split(".").pop();
const fileName = `${Date.now()}.${fileExt}`;

const { error: uploadError } = await supabase.storage
  .from("product-images")
  .upload(fileName, productImageFile);

if (uploadError) {
  console.error("UPLOAD ERROR:", uploadError);
  alert("Зураг upload хийхэд алдаа гарлаа:\n" + JSON.stringify(uploadError, null, 2));
  return;
}

const { data: imageData } = supabase.storage
  .from("product-images")
  .getPublicUrl(fileName);

const image = imageData.publicUrl;

const { error } = await supabase.from("products").insert([
  {
    name,
    category,
    price: Number(price),
    image,
    stock: Number(stock),
    availability,
    description,
  },
]);

    if (error) {
      alert("Бараа нэмэхэд алдаа гарлаа: " + error.message);
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

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", Number(product.id));

  if (error) {
    alert("Бараа устгахад алдаа гарлаа: " + error.message);
    return;
  }

  alert("Бараа амжилттай устгагдлаа.");
  window.location.reload();
};
useEffect(() => {
 
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      alert("Supabase алдаа: " + error.message);
      console.error("Products error:", error);
      return;
    }

    setProducts(data ?? []);
  };

  fetchProducts();
}, []);
useEffect(() => {
const fetchOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Orders error:", error);
    return;
  }

  setOrders(data || []);
};

fetchOrders();
}, []);
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

if (!loggedIn) {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          VAULT 13 ADMIN
        </h1>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
    <div className="border border-white/20 p-6">
      <p className="text-gray-400">ӨНӨӨДРИЙН БОРЛУУЛАЛТ</p>
      <p className="text-3xl font-bold mt-3">
        {todayRevenue.toLocaleString("en-US")}₮
      </p>
    </div>

    <div className="border border-white/20 p-6">
      <p className="text-gray-400">ӨНӨӨДРИЙН ЗАХИАЛГА</p>
      <p className="text-3xl font-bold mt-3">
        {todayOrders.length}
      </p>
    </div>

    <div className="border border-white/20 p-6">
      <p className="text-gray-400">НИЙТ БОРЛУУЛАЛТ</p>
      <p className="text-3xl font-bold mt-3">
        {totalRevenue.toLocaleString("en-US")}₮
      </p>
    </div>
  </div>


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
          onClick={() => {
            sessionStorage.setItem("vault13_admin", "true");
            if (password === "04f0a1034451A?") {
              setLoggedIn(true);
            } else {
              alert("Нууц үг буруу");
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

  const image = prompt("Шинэ зургийн URL:", product.image);
  if (image === null) return;

  const { error } = await supabase
    .from("products")
    .update({
      name,
      price: Number(price),
      image,
    })
    .eq("id", Number(product.id));

  if (error) {
    alert("Бараа засахад алдаа гарлаа: " + error.message);
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

  const { error } = await supabase
    .from("products")
    .update({
      stock: Number(stock),
    })
    .eq("id", Number(product.id));

  if (error) {
    alert("Үлдэгдэл засахад алдаа гарлаа: " + error.message);
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