"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
type Product = {
  name: string;
  category: string;
  price: string;
  stock: number;
  image: string;
  images?: string[];
  videos?: string[];
  availability?: string;
  store?: string;
};

const preorderDescription =
  "100% урьдчилгаа төлбөртэй. Захиалга баталгаажсан өдрөөс хойш 6–9 хоногт ирнэ.";

const isPreorderProduct = (product: Product) =>
  ["PREORDER", "ЗАХИАЛГААР"].includes(
    String(product.availability ?? "").trim().toUpperCase()
  );

const formatPrice = (value: string | number) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "Үнэ тодорхойгүй";
  if (/[₮$€¥]/.test(raw)) return raw;
  const amount = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount > 0
    ? `${Math.round(amount).toLocaleString("en-US")}₮`
    : raw;
};

type QPayUrl = {
  name: string;
  link: string;
};const initialProducts = [
  {
    name: "ROLEX GMT-MASTER II PEPSI",
    category: "WATCHES",
    price: "250,000₮",
    image:
       "/products/ROLEX-GMT-PEPSI.jpg",
      stock: 5,
  },
  {
    name: "ROLEX SUBMARINER",
    category: "WATCHES",
    price: "250,000₮",
    stock: 5,
    image: "/products/SUBMARINER.PNG",
  },  {
    name: "TISSOT PRX POWERMATIC 80 LIGHT BLUE",
    category: "WATCHES",
    price: "350,000₮",
    stock: 5,
    image: "/products/TISSOT-PRX-LIGHTBLUE.jpg",
  },
  {
    name: "TISSOT PRX POWERMATIC 80 BLACK",
    category: "WATCHES",
    price: "350,000₮",
    stock: 5,
    image: "/products/TISSOT-PRX-BLACK.jpg",
  },
  {
    name: "TISSOT PRX POWERMATIC 80 BLUE",
    category: "WATCHES",
    price: "350,000₮",
    stock: 5,
    image: "/products/TISSOT-PRX-BLUE.jpg",
  },
  {
    name: "OMEGA SEAMASTER",
    category: "WATCHES",
    price: "3,000,000₮",
    stock: 5,
    image: "/products/OMEGA-SEAMASTER.jpg",
  },
  {
    name: "ROLEX DATEJUST",
    category: "WATCHES",
    price: "250,000₮",
    stock: 5,
    image: "/products/ROLEX-DATEJUST.jpg",
  },
  {
    name: "ROLEX YACHT-MASTER ROSE GOLD",
    category: "WATCHES",
    price: "250,000₮",
    stock: 5,
    image: "/products/YACHT-MASTER.PNG",
  },
];
export function Storefront({ store }: { store: "watches" | "culture" }) {
const [products, setProducts] = useState<Product[]>(initialProducts);
const [storefrontMedia, setStorefrontMedia] = useState<Record<string, string>>({});
 useEffect(() => {
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Products load error:", error);
      return;
    }

    if (data) {
    setProducts(data);
    }
  };

  fetchProducts();
  fetch("/api/storefront-media", { cache: "no-store" })
    .then((response) => response.json())
    .then((result) => setStorefrontMedia(result.media ?? {}))
    .catch((error) => console.error("Storefront media load error:", error));
}, []);
const [selectedCategory, setSelectedCategory] = useState("ALL");
const [cart, setCart] = useState(0);
const [cartItems, setCartItems] = useState<Product[]>(() => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("vault13-cart");
  return saved ? JSON.parse(saved) : [];
});
useEffect(() => {
  setCart(cartItems.length);
  localStorage.setItem("vault13-cart", JSON.stringify(cartItems));
}, [cartItems]);
const [cartAddedNotice, setCartAddedNotice] = useState(false);
const cartAddedNoticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
const showCartAddedNotice = () => {
  setCartAddedNotice(true);
  if (cartAddedNoticeTimeout.current) clearTimeout(cartAddedNoticeTimeout.current);
  cartAddedNoticeTimeout.current = setTimeout(() => {
    setCartAddedNotice(false);
    cartAddedNoticeTimeout.current = null;
  }, 2000);
};
useEffect(
  () => () => {
    if (cartAddedNoticeTimeout.current) clearTimeout(cartAddedNoticeTimeout.current);
  },
  []
);
 const [paymentMethod, setPaymentMethod] = useState("");
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
const [activeProductImage, setActiveProductImage] = useState("");
useEffect(() => {
  if (!selectedProduct) return;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  setActiveProductImage(selectedProduct.image);
  return () => {
    document.body.style.overflow = previousOverflow;
  };
}, [selectedProduct]);
const [cartOpen, setCartOpen] = useState(false);
const [checkoutOpen, setCheckoutOpen] = useState(false);
const [customerName, setCustomerName] = useState("");
const [checkoutStep, setCheckoutStep] = useState(1);
const [customerPhone, setCustomerPhone] = useState("");
const [customerAddress, setCustomerAddress] = useState("");
const [qpayUrls, setQpayUrls] = useState<QPayUrl[]>([]);
const [qpayInvoiceId, setQpayInvoiceId] = useState("");
const [isCreatingQpayInvoice, setIsCreatingQpayInvoice] = useState(false);
const qpayInvoiceRequestInFlight = useRef(false);
return (

 <main className="min-h-screen bg-[#0a0a0a] text-white">
      {cartAddedNotice && (
        <div
          role="status"
          className="pointer-events-none fixed left-1/2 top-24 z-[120] -translate-x-1/2 border border-white/20 bg-zinc-950 px-5 py-3 text-sm text-white shadow-lg"
        >
          Сагсанд амжилттай нэмэгдлээ
        </div>
      )}
      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#080808]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <a href="/" className="shrink-0 text-xl font-semibold tracking-[0.24em] sm:text-2xl">VAULT<span className="text-[#c9ad72]">13</span></a>
          <div className="hidden items-center gap-8 text-[11px] font-medium tracking-[0.16em] text-white/65 md:flex">
            <a href="/" className="transition hover:text-white">VAULT 13</a><a href="/watches" className={`transition hover:text-white ${store === "watches" ? "text-[#d7bd8d]" : ""}`}>WATCHES</a><a href="/culture" className={`transition hover:text-white ${store === "culture" ? "text-[#d7bd8d]" : ""}`}>CULTURE</a><a href="#shop" className="transition hover:text-white">ДЭЛГҮҮР</a><a href="#contact" className="transition hover:text-white">ХОЛБОО БАРИХ</a>
          </div>
          <button onClick={() => setCartOpen(true)} className="shrink-0 rounded-full border border-white/20 px-4 py-2.5 text-[10px] font-semibold tracking-[0.14em] transition hover:border-white/50 hover:bg-white hover:text-black sm:px-5">САГС ({cart})</button>
        </div>
        <div className="flex gap-6 overflow-x-auto border-t border-white/[0.06] px-5 py-3 text-[10px] tracking-[0.14em] text-white/55 md:hidden">
          <a href="/" className="shrink-0">VAULT 13</a><a href="/watches" className="shrink-0">WATCHES</a><a href="/culture" className="shrink-0">CULTURE</a><a href="#shop" className="shrink-0">ДЭЛГҮҮР</a><a href="#contact" className="shrink-0">ХОЛБОО БАРИХ</a>
        </div>
      </nav>

      {/* HERO */}
      <section id="home" className={`relative flex min-h-[76vh] items-end overflow-hidden bg-[#080808] pt-32 sm:min-h-[84vh] ${store === "culture" ? "border-b border-[#b99a63]/20" : ""}`}>
        {store === "watches" ? (
          <div className="absolute inset-0 bg-cover bg-[center_58%] opacity-80" style={{ backgroundImage: `url("${storefrontMedia.watch_hero || "/products/hero-watch.jpg"}")` }} />
        ) : (
          <>
            <div className="absolute inset-0 bg-cover bg-center opacity-65" style={{ backgroundImage: `url("${storefrontMedia.culture_hero || "/products/hero-culture.jpg"}")` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-14 sm:px-8 sm:pb-20">
          <p className="mb-3 text-[9px] font-semibold tracking-[0.32em] text-white/75 sm:text-[10px]">VAULT 13 · {store === "watches" ? "WATCHES" : "MUSIC · MERCH · STREETWEAR"}</p>
          <h1 className="max-w-2xl text-[2.65rem] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">{store === "watches" ? <>ЦАГНЫ<br /><span className="text-[#d7bd8d]">СОНГОЛТ.</span></> : <>MUSIC.<br /><span className="text-[#d7bd8d]">MERCH.</span><br />CULTURE.</>}</h1>
          <p className="mt-4 max-w-sm text-xs leading-6 text-white/75 sm:text-sm">{store === "watches" ? "Таны хэв маягийг илэрхийлэх онцгой сонголтууд." : "Хөгжим, merch болон streetwear соёлыг нэг дороос."}</p>
        </div>
      </section>

      {/* CATEGORIES */}
      {store === "culture" ? (
        <section className="border-b border-white/10 bg-[#080808] px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold tracking-[0.25em] text-[#c9ad72]">EXPLORE CULTURE</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">Ангиллаар үзэх</h2>
              </div>
              <button onClick={() => setSelectedCategory("ALL")} className="shrink-0 text-[10px] font-semibold tracking-[0.15em] text-white/50 transition hover:text-[#d7bd8d]">БҮГДИЙГ ҮЗЭХ ↗</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
              {[
                ["MUSIC & BAND MERCH", "MUSIC / MERCH", "culture-music-merch.jpg", "MUSIC_MERCH", "culture_music_merch"],
                ["FOOTWEAR", "SNEAKERS / BOOTS", "culture-footwear.jpg", "FOOTWEAR", "culture_footwear"],
                ["CLOTHING", "HOODIE / T-SHIRT", "culture-clothing.jpg", "CLOTHING", "culture_clothing"],
                ["FILM & CINEMA", "POSTERS / COLLECTIBLES", "culture-film-cinema.jpg", "FILM_CINEMA", "culture_film_cinema"],
                ["MUSIC & VINYL", "VINYL / CD / CASSETTE", "culture-vinyl.jpg", "MUSIC_VINYL", "culture_music_vinyl"],
                ["ACCESSORIES", "CAPS / BAGS / MORE", "culture-accessories.jpg", "ACCESSORIES", "culture_accessories"],
              ].map(([title, subtitle, image, value, assetKey]) => (
                <button
                  key={value}
                  onClick={() => setSelectedCategory(value)}
                  className="group relative flex aspect-[4/5] min-h-[150px] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-[#151515] p-4 text-left transition hover:-translate-y-1 hover:border-[#c9ad72]/60 sm:p-5"
                  style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.94), rgba(0,0,0,.08)), url("${storefrontMedia[assetKey] || `/products/${image}`}")`, backgroundPosition: "center", backgroundSize: "cover" }}
                >
                  <span className="absolute inset-0 bg-black/15 transition group-hover:bg-black/0" />
                  <span className="relative text-[11px] font-bold leading-4 tracking-[0.08em] text-white sm:text-xs">{title}</span>
                  <span className="relative mt-2 text-[8px] tracking-[0.12em] text-white/55">{subtitle}</span>
                  <span className="relative mt-4 text-[10px] text-[#d7bd8d]">ҮЗЭХ ↗</span>
                </button>
              ))}
            </div>
            <div className="mt-7 flex gap-3 overflow-x-auto pb-1">
              {["ALL", "MUSIC_MERCH", "FOOTWEAR", "CLOTHING", "FILM_CINEMA", "MUSIC_VINYL", "ACCESSORIES"].map((value, index) => {
                const labels = ["БҮГД", "BAND MERCH", "FOOTWEAR", "CLOTHING", "FILM", "VINYL", "ACCESSORIES"];
                return (
                  <button key={value} onClick={() => setSelectedCategory(value)} className={`shrink-0 rounded-full px-4 py-2.5 text-[9px] font-semibold tracking-[0.12em] transition ${selectedCategory === value ? "bg-white text-black" : "border border-white/10 text-white/55 hover:border-white/30 hover:text-white"}`}>
                    {labels[index]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-white/10 bg-[#080808] py-5">
          <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-5 sm:px-8">
            {[["ALL", "БҮГД"], ["WATCHES", "ЦАГ"]].map(([value, label]) => (
              <button key={value} onClick={() => setSelectedCategory(value)} className={`shrink-0 rounded-full px-5 py-3 text-[10px] font-semibold tracking-[0.13em] transition ${selectedCategory === value ? "bg-white text-black" : "border border-white/10 text-white/55 hover:border-white/30 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PRODUCTS */}
      <section id="shop" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div><p className="mb-2 text-[10px] font-semibold tracking-[0.25em] text-[#c9ad72]">VAULT 13 / {store === "watches" ? "WATCHES" : "CULTURE"}</p><h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{store === "watches" ? "Сонгогдсон цагнууд" : selectedCategory === "ALL" ? "ALL PRODUCTS" : "Сонгосон ангилал"}</h2></div>
          <span className="pb-1 text-[10px] tracking-[0.16em] text-white/35">V13</span>
        </div>
      </section>

      {/* ABOUT moved to footer */}

      {/* FOOTER */}{/* PRODUCTS */}
<div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
  {products
  .filter((product) => {
    const explicitStore = String(product.store ?? "").trim().toLowerCase();
    const category = String(product.category ?? "").trim().toUpperCase();
    const isWatch = explicitStore
      ? ["watch", "watches"].includes(explicitStore)
      : ["WATCH", "WATCHES", "ЦАГ"].includes(category);
    const belongsToStore = store === "watches" ? isWatch : !isWatch;
    const categoryGroups: Record<string, string[]> = {
      MUSIC_MERCH: ["MUSIC", "MERCH", "BAND MERCH", "MUSIC MERCH", "BAND"],
      FOOTWEAR: ["SHOES", "FOOTWEAR", "SNEAKERS", "BOOTS", "GUTAL"],
      CLOTHING: ["HOODIE", "HOODIES", "T-SHIRT", "TSHIRT", "T-SHIRTS", "TSHIRTS", "CLOTHING", "JACKET", "PANTS"],
      FILM_CINEMA: ["FILM", "CINEMA", "MOVIE", "POSTER", "COLLECTIBLES"],
      MUSIC_VINYL: ["VINYL", "CD", "CASSETTE", "MUSIC"],
      ACCESSORIES: ["ACCESSORIES", "CAP", "CAPS", "BEANIE", "BAG", "BAGS"],
    };
    const matchesCategory = selectedCategory === "ALL" ||
      category === selectedCategory ||
      (categoryGroups[selectedCategory]?.includes(category) ?? false);
    return belongsToStore && matchesCategory;
  })
  .map((product, index) => {
    const canAddToCart = isPreorderProduct(product) || product.stock > 0;

    return (
    <div
      key={index}
      className="group cursor-pointer overflow-hidden rounded-3xl border border-white/[0.07] bg-[#101010] p-2 transition duration-300 hover:-translate-y-1 hover:border-white/50/35 sm:p-3"
      onClick={() => setSelectedProduct(product)}
    >
    <div className="relative aspect-[4/5] overflow-hidden bg-[#151515]">
        <img

  src={product.image}
  alt={product.name}
  onClick={() => setSelectedProduct(product)}
  className="h-full w-full cursor-pointer object-cover transition duration-700 group-hover:scale-[1.04]"
/><button
  onClick={(e) => {
    e.stopPropagation();
    setSelectedProduct(product);
  }}
  className="pointer-events-none absolute inset-0 m-auto h-12 w-40 bg-white text-black font-bold opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100"
>
  ДЭЛГЭРЭНГҮЙ
</button>

      </div>

      <div className="px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4">
        <p className="text-xs tracking-widest text-gray-500">
          {product.category}
        </p>

        <h3 className="mt-2 line-clamp-2 min-h-[3rem] text-sm font-semibold leading-6 tracking-tight sm:text-base">
          {product.name}
        </h3>

<div className="mt-3">
  {isPreorderProduct(product) ? (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#f26a35]/15 bg-[#3a1e12] px-3 py-1.5 text-[9px] font-semibold tracking-[0.08em] text-[#ff713d]"><span aria-hidden="true">◷</span><span className="truncate">УРЬДЧИЛСАН ЗАХИАЛГА</span></span>
  ) : product.stock > 0 ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#18b957]/15 bg-[#092b1b] px-3 py-1.5 text-[9px] font-semibold tracking-[0.08em] text-[#20c866]"><span className="h-2 w-2 rounded-full bg-[#18c65b]" />БЭЛЭН</span>
  ) : (
    <span className="inline-flex rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-red-300">ДУУССАН</span>
  )}
</div>

{canAddToCart ? (
  <button
    type="button"
onClick={(e) => {
  e.stopPropagation();

  setCart((prev) => prev + 1);
  setCartItems((prev) => [...prev, product]);
  showCartAddedNotice();

  if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
    (window as any).fbq("track", "AddToCart", {
      content_name: product.name,
      content_ids: [String(product.name)],
      content_type: "product",
    });
  }
}}

    className="mt-5 w-full rounded-full border border-white/20 py-3 text-[10px] font-semibold tracking-[0.14em] transition hover:border-white hover:bg-white hover:text-black"
  >
    САГСАНД НЭМЭХ
  </button>
) : (
  <button
    disabled
    className="mt-5 w-full cursor-not-allowed rounded-full bg-white/10 py-3 text-[10px] font-bold tracking-[0.14em] text-white/40"
  >
    SOLD OUT
  </button>
)}
      </div>
    </div>
  );
})}
</div>
      <footer id="contact" className="mt-20 border-t border-white/10 bg-[#080808] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div id="about">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-[#c9ad72]">ABOUT VAULT 13</p>
            <h2 className="mt-5 max-w-lg text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Сонголт бүрт өөрийн өнгө төрх.</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/50">VAULT 13 — цаг, хувцас болон өдөр тутмын хэрэглээний бүтээгдэхүүнийг нэг дороос.</p>
          </div>
          <div className="md:justify-self-end md:text-right">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-white/35">ХОЛБОО БАРИХ</p>
            <a href="tel:97078707" className="mt-4 inline-block text-3xl font-semibold tracking-tight text-white transition hover:text-[#d7bd8d] sm:text-4xl">9707 8707</a>
            <p className="mt-3 text-xs text-white/45">Улаанбаатар, Монгол</p><p className="mt-2 text-xs text-white/45">Instagram: @vault13</p>
          </div>
        </div>
        <div className="mx-auto mt-14 flex max-w-7xl flex-col justify-between gap-3 border-t border-white/10 pt-6 text-[10px] tracking-[0.12em] text-white/30 sm:flex-row"><span>VAULT 13</span><span>© 2026 ALL RIGHTS RESERVED</span></div>
      </footer>
  {selectedProduct && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/90 p-0 backdrop-blur-sm sm:p-4"
      onClick={() => setSelectedProduct(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${selectedProduct.name} дэлгэрэнгүй`}
        className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden border border-[#b99a63]/20 bg-[#050505] shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky modal header: close control stays visible while content scrolls */}
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#050505]/95 px-5 backdrop-blur sm:h-16 sm:px-7">
          <span className="text-[9px] font-semibold tracking-[0.28em] text-white/40">VAULT 13 / PRODUCT</span>
          <button
            type="button"
            onClick={() => setSelectedProduct(null)}
            aria-label="Хаах"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/[0.06] text-2xl leading-none text-white transition hover:border-[#d7bd8d] hover:bg-[#b58a3a] hover:text-black"
          >
            ×
          </button>
        </div>

        {/* Only this region scrolls; the page behind the modal is locked */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid md:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-[#101010] md:sticky md:top-0 md:self-start">
              <div className="relative flex h-[42dvh] min-h-[270px] max-h-[430px] items-center justify-center overflow-hidden bg-white sm:h-[48dvh] sm:max-h-[520px] md:h-[min(72vh,720px)] md:max-h-none">
                <img
                  src={activeProductImage || selectedProduct.image}
                  alt={selectedProduct.name}
                  className="h-full w-full object-contain"
                />
                <div className="pointer-events-none absolute left-4 top-4 border border-black/10 bg-white/80 px-3 py-2 text-[9px] font-semibold tracking-[0.22em] text-black/65 backdrop-blur">
                  VAULT 13
                </div>
              </div>

              {Array.isArray(selectedProduct.images) && selectedProduct.images.filter(Boolean).length > 1 && (
                <div className="flex gap-2 overflow-x-auto bg-[#101010] p-3 sm:p-4">
                  {[...new Set([selectedProduct.image, ...selectedProduct.images].filter(Boolean))].map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveProductImage(image)}
                      aria-label={`Зураг ${index + 1}`}
                      aria-pressed={activeProductImage === image}
                      className={`h-16 w-16 shrink-0 overflow-hidden border bg-white transition sm:h-20 sm:w-20 ${activeProductImage === image ? "border-[#d7bd8d]" : "border-white/15 opacity-65 hover:opacity-100"}`}
                    >
                      <img src={image} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {Array.isArray(selectedProduct.videos) && selectedProduct.videos.filter(Boolean).length > 0 && (
                <div className="space-y-3 bg-[#101010] p-3 sm:p-4">
                  {selectedProduct.videos.filter(Boolean).map((video: string, index: number) => (
                    <video key={`${video}-${index}`} src={video} controls playsInline preload="metadata" className="max-h-[420px] w-full bg-black" />
                  ))}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col px-5 pb-8 pt-7 sm:px-8 sm:pb-10 sm:pt-9 md:px-10 md:py-10">
              <div className="mb-6 flex items-center gap-3 pr-2">
                <span className="text-[10px] tracking-[0.3em] text-white/45">{selectedProduct.category}</span>
                <span className="h-px flex-1 bg-white/15" />
                <span className="text-[10px] tracking-[0.2em] text-white/45">V13</span>
              </div>

              <h2 className="max-w-xl break-words text-2xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-3xl lg:text-[2.5rem]">
                {selectedProduct.name}
              </h2>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#b99a63]/25 pb-6">
                <p className="text-2xl font-medium tracking-tight text-[#d8b76e] sm:text-3xl">
                  {formatPrice(selectedProduct.price)}
                </p>
                {isPreorderProduct(selectedProduct) ? (
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#f26a35]/15 bg-[#3a1e12] px-3 py-2 text-[9px] font-semibold tracking-[0.06em] text-[#ff713d] sm:px-4 sm:text-[10px]">
                    <span aria-hidden="true">◷</span><span>УРЬДЧИЛСАН ЗАХИАЛГА</span>
                  </span>
                ) : selectedProduct.stock > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#18b957]/15 bg-[#092b1b] px-4 py-2 text-[10px] font-semibold tracking-[0.08em] text-[#20c866]">
                    <span className="h-2 w-2 rounded-full bg-[#18c65b]" />БЭЛЭН
                  </span>
                ) : (
                  <span className="border border-red-400/30 px-3 py-2 text-[10px] tracking-[0.18em] text-red-300">SOLD OUT</span>
                )}
              </div>

              <div className="mt-6 rounded-xl border border-[#b99a63]/25 bg-[#c9a45c]/[0.045] p-4 sm:mt-7 sm:p-5">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#d7bd8d]">БҮТЭЭГДЭХҮҮНИЙ ТАЙЛБАР</p>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  VAULT 13-ын сонгосон загвар. Өдөр тутмын хэрэглээ болон хувийн хэв маягт тань нийцэх бүтээгдэхүүн.
                </p>
              </div>

              <div className="mt-6 border-y border-[#b99a63]/20 py-4 sm:mt-7 sm:py-5">
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-xs text-white/45">Ангилал</span>
                  <span className="text-xs tracking-wider text-white/85">{selectedProduct.category}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-xs text-white/45">Үлдэгдэл</span>
                  <span className="text-xs text-white/85">
                    {isPreorderProduct(selectedProduct)
                      ? "Захиалгаар"
                      : selectedProduct.stock > 0
                        ? `${selectedProduct.stock} ширхэг`
                        : "Дууссан"}
                  </span>
                </div>
                {isPreorderProduct(selectedProduct) && (
                  <div className="mt-4 rounded-xl border border-[#b99a63]/30 bg-[#b99a63]/[0.08] p-4">
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[#d7bd8d]">УРЬДЧИЛСАН ЗАХИАЛГЫН НӨХЦӨЛ</p>
                    <p className="mt-2 text-sm leading-6 text-white/80">{preorderDescription}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 md:mt-auto md:pt-8">
                <button
                  type="button"
                  disabled={!isPreorderProduct(selectedProduct) && selectedProduct.stock <= 0}
                  onClick={() => {
                    setCart((prev) => prev + 1);
                    setCartItems((prev) => [...prev, selectedProduct]);
                    showCartAddedNotice();
                    setSelectedProduct(null);
                  }}
                  className="w-full border border-[#b99a63]/70 px-5 py-4 text-[11px] font-semibold tracking-[0.16em] text-[#d7bd8d] transition hover:bg-[#b99a63]/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  САГСАНД НЭМЭХ
                </button>
                <button
                  type="button"
                  disabled={!isPreorderProduct(selectedProduct) && selectedProduct.stock <= 0}
                  onClick={() => {
                    setCart((prev) => prev + 1);
                    setCartItems((prev) => [...prev, selectedProduct]);
                    setSelectedProduct(null);
                    setCheckoutStep(1);
                    setCheckoutOpen(true);
                  }}
                  className="w-full bg-[#b58a3a] px-5 py-4 text-[11px] font-semibold tracking-[0.16em] text-[#100d08] transition hover:bg-[#c49b50] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ХУДАЛДАН АВАХ
                </button>
              </div>
              <p className="mt-5 text-center text-[9px] tracking-[0.2em] text-white/30">VAULT 13 — CURATED FOR MODERN LIFE</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

{cartOpen && (

  <div
    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
    onClick={() => setCartOpen(false)}
  >
    <div
      className="w-full max-w-md bg-zinc-950 border border-white/20 p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setCartOpen(false)}
        className="float-right text-2xl"
      >
        ×
      </button>

      <p className="text-xs tracking-widest text-gray-500 mt-4">
        ТАНЫ САГС
      </p>

      <h2 className="text-2xl font-bold mt-2">
        САГС
      </h2>

      <div className="border-t border-white/20 mt-6 pt-6">
  {cartItems.length === 0 ? (
    <p className="text-gray-400">Таны сагс хоосон байна.</p>
  ) : (
    <div className="space-y-4">
      {cartItems.map((item, index) => (
        <div key={index} className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex gap-4">
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover"
            />

            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-gray-400 mt-1">{formatPrice(item.price)}</p>
              {isPreorderProduct(item) && (
                <p className="mt-2 text-sm text-gray-400">
                  УРЬДЧИЛСАН ЗАХИАЛГА<br />
                  {preorderDescription}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={qpayInvoiceId !== ""}
            aria-label={`${item.name} барааг сагснаас хасах`}
            onClick={() => {
              const updatedItems = cartItems.filter((_, itemIndex) => itemIndex !== index);
              setCartItems(updatedItems);
              setCart(updatedItems.length);
            }}
            className="shrink-0 border border-red-400/60 px-3 py-1 text-sm font-semibold text-red-300 hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            УСТГАХ
          </button>
        </div>
      ))}
    </div>
  )}
</div>
<div className="border-t border-white/10 pt-4 mt-4">
  <div className="flex justify-between font-bold">
    <span>НИЙТ</span>
 <span>
  {cartItems.reduce((total, item) => {
  const price = parseInt(String(item.price).replace(/\D/g, ""), 10);
  return total + price;
}, 0).toLocaleString()}₮
    </span>
  </div>
</div>
      <button
        onClick={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
        className="w-full bg-white text-black mt-6 py-4 font-bold"
      >
        ТӨЛБӨР ТӨЛӨХ
      </button>
    </div>
  </div>
)}{checkoutOpen && (
  <div
    className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
    onClick={() => setCheckoutOpen(false)}
  >
    <div
      className="w-full max-w-md bg-zinc-950 border border-white/20 p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setCheckoutOpen(false)}
        className="float-right text-2xl"
      >
        ×
      </button>

      <p className="text-xs tracking-widest text-gray-500 mt-4">
        CHECKOUT
      </p>

      <h2 className="text-2xl font-bold mt-2">
        ЗАХИАЛГА
      </h2>

 {checkoutStep === 1 ? (
  <div className="space-y-3 mt-6">
    <input
      type="text"
      placeholder="Нэр"
      value={customerName}
      onChange={(e) => setCustomerName(e.target.value)}
      className="w-full bg-transparent border border-white/20 p-4"
    />
    <input
      type="tel"
      placeholder="Утасны дугаар"
      value={customerPhone}
      onChange={(e) => setCustomerPhone(e.target.value)}
      className="w-full bg-transparent border border-white/20 p-4"
    />
    <input
      type="text"
      placeholder="Хүргэлтийн хаяг"
      value={customerAddress}
      onChange={(e) => setCustomerAddress(e.target.value)}
      className="w-full bg-transparent border border-white/20 p-4"
    />
    <button
      onClick={() => {
        if (
          !customerName.trim() ||
          !customerPhone.trim() ||
          !customerAddress.trim()
        ) {
          alert("Нэр, утас, хүргэлтийн хаягаа бүрэн бөглөнө үү.");
          return;
        }
        setCheckoutStep(2);
      }}
      className="w-full bg-white text-black mt-4 py-4 font-bold"
    >
      ҮРГЭЛЖЛҮҮЛЭХ
    </button>
  </div>
) : (


    <div className="min-h-0 flex-1 overflow-y-auto space-y-3">
  <p className="text-sm text-gray-400 mt-6">
    Төлбөрийн хэлбэр
  </p>

<button
  type="button"
  disabled={isCreatingQpayInvoice}
  aria-busy={isCreatingQpayInvoice}
  onClick={async () => {
    if (qpayInvoiceRequestInFlight.current) return;

    const total = cartItems.reduce((sum, item) => {
      return sum + Number(String(item.price).replace(/[^\d]/g, ""));
    }, 0);

    if (total <= 0) {
      alert("Сагсны төлбөрийн дүн 0 байна.");
      return;
    }

    qpayInvoiceRequestInFlight.current = true;
    setIsCreatingQpayInvoice(true);
    setQpayUrls([]);
    setQpayInvoiceId("");
    const requestStartedAt = performance.now();

    try {
      const response = await fetch("/api/qpay/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          orderId: `ORDER-${Date.now()}`,
        }),
      });

      const data = await response.json();
      console.info(
        `QPay invoice API response time: ${Math.round(performance.now() - requestStartedAt)} ms`
      );

      if (!response.ok) {
        alert(data.error || "QPay нэхэмжлэл үүссэнгүй");
        return;
      }

      setPaymentMethod("QPAY");
      setQpayUrls(data.urls || []);
      setQpayInvoiceId(data.invoice_id || "");
    } catch {
      alert("QPay сервертэй холбогдож чадсангүй.");
    } finally {
      qpayInvoiceRequestInFlight.current = false;
      setIsCreatingQpayInvoice(false);
    }
  }}
  className="w-full border border-white/20 mt-3 py-4 disabled:cursor-wait disabled:opacity-60"
>
  {isCreatingQpayInvoice ? "Нэхэмжлэл үүсгэж байна..." : "QPAY"}
</button>
{qpayUrls.length > 0 && (
  <div className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto overscroll-contain touch-pan-y">
    <p className="text-center text-white">
      Төлбөр төлөх банкаа сонгоно уу
    </p>

    {qpayUrls.map((bank: { name: string; link: string }, index: number) => (
      <button
        key={`${bank.name}-${index}`}
        onClick={() => {
          window.location.href = bank.link;
        }}
        className="w-full border border-white/20 mt-3 py-4"
      >
        {bank.name} — Төлөх
      </button>
    ))}
  </div>
)}
<button
  type="button"
  onClick={async () => {
    try {
      if (!qpayInvoiceId) {
        alert("Эхлээд QPay нэхэмжлэл үүсгэнэ үү.");
        return;
      }

      const total = cartItems.reduce((sum, item) => {
        return sum + Number(String(item.price).replace(/[^\d]/g, ""));
      }, 0);
      const paymentCheck = await fetch("/api/qpay/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: qpayInvoiceId }),
      });
      const paymentData = await paymentCheck.json();

      if (
        !paymentCheck.ok ||
        !paymentData.paid ||
        Number(paymentData.paidAmount) < total
      ) {
        alert("Төлбөр бүрэн баталгаажаагүй байна. QPay төлбөрөө шалгана уу.");
        return;
      }

      const { error } = await supabase.from("orders").insert([
        {
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          payment_method: paymentMethod,
          items: cartItems,
          total,
        },
      ]);

      if (error) {
        alert("Захиалга хадгалахад алдаа гарлаа: " + error.message);
        return;
      }

      alert(
        "Захиалга амжилттай бүртгэгдлээ.\n\n" +
          "Нэр: " + customerName + "\n" +
          "Утас: " + customerPhone + "\n" +
          "Хаяг: " + customerAddress + "\n" +
          "Төлбөрийн хэлбэр: " + paymentMethod + "\n" +
          "Нийт дүн: " + total.toLocaleString() + "₮"
      );

      setCheckoutOpen(false);
      setProducts((prevProducts) =>
        prevProducts.map((product) => {
          const orderedCount = cartItems.filter(
            (item) => item.name === product.name
          ).length;

          return {
            ...product,
            stock: Math.max(0, product.stock - orderedCount),
          };
        })
      );
      setCart(0);
      setCartItems([]);
    } catch (error) {
      console.error("Төлбөр шалгахад алдаа:", error);
      alert("Төлбөр шалгахад алдаа гарлаа. Дахин оролдоно уу.");
    }
  }}
  className="w-full bg-white text-black mt-3 py-4 font-bold"
>
  ТӨЛБӨР ШАЛГАХ
</button>
    </div>
)}
    </div>
  </div>
)}
  </main>
  );
}
