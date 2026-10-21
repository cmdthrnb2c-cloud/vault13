"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { normalizeAvailability, parsePrice } from "@/lib/commerce";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
type Product = {
  id?: number | string;
  name: string;
  category: string;
  price: string | number;
  stock: number;
  image: string;
  availability?: string | null;
  description?: string | null;
};

type CartItem = Product & {
  quantity: number;
};

function restoreCart(value: unknown): CartItem[] | null {
  if (!Array.isArray(value)) return null;
  const restored: CartItem[] = [];

  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("name" in entry) ||
      typeof entry.name !== "string" ||
      !("category" in entry) ||
      typeof entry.category !== "string" ||
      !("price" in entry) ||
      (typeof entry.price !== "string" && typeof entry.price !== "number") ||
      !("image" in entry) ||
      typeof entry.image !== "string"
    ) {
      return null;
    }

    const quantity = "quantity" in entry ? Number(entry.quantity) : 1;
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return null;
    const product: Product = {
      id: "id" in entry && (typeof entry.id === "string" || typeof entry.id === "number")
        ? entry.id
        : undefined,
      name: entry.name,
      category: entry.category,
      price: entry.price,
      image: entry.image,
      stock: "stock" in entry && Number.isSafeInteger(Number(entry.stock))
        ? Number(entry.stock)
        : 0,
      availability: "availability" in entry && typeof entry.availability === "string"
        ? entry.availability
        : undefined,
      description: "description" in entry && typeof entry.description === "string"
        ? entry.description
        : undefined,
    };
    const key = String(product.id ?? product.name);
    const existing = restored.find((item) => String(item.id ?? item.name) === key);
    if (existing) existing.quantity += quantity;
    else restored.push({ ...product, quantity });
  }

  return restored;
}

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
export default function Home() {
const [products, setProducts] = useState<Product[]>(initialProducts);
 useEffect(() => {
  if (!supabase) return;
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
}, []);
const [selectedCategory, setSelectedCategory] = useState("ALL");
const [cartItems, setCartItems] = useState<CartItem[]>([]);
const [cartReady, setCartReady] = useState(false);
const [cartFeedback, setCartFeedback] = useState("");
const [paymentFeedback, setPaymentFeedback] = useState("");
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
const [cartOpen, setCartOpen] = useState(false);
const [checkoutOpen, setCheckoutOpen] = useState(false);
const [customerName, setCustomerName] = useState("");
const [checkoutStep, setCheckoutStep] = useState(1);
const [customerPhone, setCustomerPhone] = useState("");
const [customerAddress, setCustomerAddress] = useState("");
const [qpayUrls, setQpayUrls] = useState<QPayUrl[]>([]);
const [qpayInvoiceId, setQpayInvoiceId] = useState("");
const [qpayOrderId, setQpayOrderId] = useState<number | null>(null);
const [qpayOrderTotal, setQpayOrderTotal] = useState<number | null>(null);
const [qpayCheckoutToken, setQpayCheckoutToken] = useState("");
const [isCreatingQpayInvoice, setIsCreatingQpayInvoice] = useState(false);
const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
const qpayInvoiceRequestInFlight = useRef(false);
const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
const cartTotal = cartItems.reduce((total, item) => {
  return total + (parsePrice(item.price) ?? 0) * item.quantity;
}, 0);
const containsPreorder = cartItems.some(
  (item) => normalizeAvailability(item.availability) === "PREORDER"
);

useEffect(() => {
  const restoreSavedState = () => {
    const saved = localStorage.getItem("vault13-cart");
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        const restored = restoreCart(parsed);
        if (restored) {
          setCartItems(restored);
        } else {
          localStorage.removeItem("vault13-cart");
          setCartFeedback("Хадгалсан сагсны мэдээлэл буруу байсан тул цэвэрлэлээ.");
        }
      } catch {
        localStorage.removeItem("vault13-cart");
        setCartFeedback("Хадгалсан сагсыг уншиж чадсангүй. Сагс хоосон эхэллээ.");
      }
    }
    const pendingPayment = localStorage.getItem("vault13-pending-payment");
    if (pendingPayment) {
      try {
        const savedPayment: unknown = JSON.parse(pendingPayment);
        if (
          savedPayment &&
          typeof savedPayment === "object" &&
          "orderId" in savedPayment &&
          Number.isSafeInteger(Number(savedPayment.orderId)) &&
          Number(savedPayment.orderId) > 0 &&
          "invoiceId" in savedPayment &&
          typeof savedPayment.invoiceId === "string" &&
          "checkoutToken" in savedPayment &&
          typeof savedPayment.checkoutToken === "string"
        ) {
          setQpayOrderId(Number(savedPayment.orderId));
          setQpayInvoiceId(savedPayment.invoiceId);
          setQpayCheckoutToken(savedPayment.checkoutToken);
          if ("total" in savedPayment && Number.isSafeInteger(Number(savedPayment.total))) {
            setQpayOrderTotal(Number(savedPayment.total));
          }
          if (
            "urls" in savedPayment &&
            Array.isArray(savedPayment.urls) &&
            savedPayment.urls.every((url) =>
              url &&
              typeof url === "object" &&
              "name" in url &&
              typeof url.name === "string" &&
              "link" in url &&
              typeof url.link === "string"
            )
          ) {
            setQpayUrls(savedPayment.urls);
          }
          setCheckoutStep(2);
          setCheckoutOpen(true);
          setPaymentFeedback("Өмнөх захиалгын төлбөрийг үргэлжлүүлнэ үү.");
        }
      } catch {
        localStorage.removeItem("vault13-pending-payment");
        setCartFeedback("Хадгалсан төлбөрийн мэдээллийг уншиж чадсангүй.");
      }
    }

    setCartReady(true);
  };
  const frame = window.requestAnimationFrame(restoreSavedState);
  return () => window.cancelAnimationFrame(frame);
}, []);

useEffect(() => {
  if (!cartReady) return;
  localStorage.setItem("vault13-cart", JSON.stringify(cartItems));
  if (qpayOrderId !== null) {
    localStorage.setItem(
      "vault13-pending-payment",
      JSON.stringify({
        orderId: qpayOrderId,
        invoiceId: qpayInvoiceId,
        total: qpayOrderTotal,
        checkoutToken: qpayCheckoutToken,
        urls: qpayUrls,
      })
    );
  } else {
    localStorage.removeItem("vault13-pending-payment");
  }
}, [cartItems, cartReady, qpayCheckoutToken, qpayInvoiceId, qpayOrderId, qpayOrderTotal, qpayUrls]);

const addToCart = (product: Product, quantity = 1) => {
  if (!Number.isSafeInteger(Number(product.id)) || Number(product.id) <= 0) {
    setCartFeedback("Барааны мэдээлэл серверээс баталгаажаагүй байна. Дахин ачаалаад үзнэ үү.");
    return false;
  }
  if (qpayOrderId !== null) {
    setCartFeedback("Төлбөр хүлээгдэж буй захиалгыг дуусгахаас өмнө сагс өөрчлөх боломжгүй.");
    return false;
  }
  const key = String(product.id ?? product.name);
  const currentQuantity = cartItems.find(
    (item) => String(item.id ?? item.name) === key
  )?.quantity ?? 0;

  if (
    normalizeAvailability(product.availability) !== "PREORDER" &&
    currentQuantity + quantity > Number(product.stock)
  ) {
    setCartFeedback(`"${product.name}" барааны үлдэгдэл хүрэлцэхгүй байна.`);
    return false;
  }

  setCartItems((current) => {
    const existing = current.find((item) => String(item.id ?? item.name) === key);
    return existing
      ? current.map((item) =>
          String(item.id ?? item.name) === key
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      : [...current, { ...product, quantity }];
  });
  setCartFeedback(`${product.name} сагсанд нэмэгдлээ.`);
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "AddToCart", {
      content_name: product.name,
      content_ids: [String(product.id ?? product.name)],
      content_type: "product",
      quantity,
    });
  }
  return true;
};

const changeCartQuantity = (item: CartItem, quantity: number) => {
  if (qpayOrderId !== null) {
    setCartFeedback("Төлбөр хүлээгдэж буй захиалгыг дуусгахаас өмнө сагс өөрчлөх боломжгүй.");
    return;
  }
  if (quantity <= 0) {
    setCartItems((current) =>
      current.filter((line) => String(line.id ?? line.name) !== String(item.id ?? item.name))
    );
    return;
  }
  if (
    normalizeAvailability(item.availability) !== "PREORDER" &&
    quantity > Number(item.stock)
  ) {
    setCartFeedback(`"${item.name}" барааны үлдэгдэл ${item.stock} байна.`);
    return;
  }
  setCartItems((current) =>
    current.map((line) =>
      String(line.id ?? line.name) === String(item.id ?? item.name)
        ? { ...line, quantity }
        : line
    )
  );
  setCartFeedback("");
};
return (
  
 <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md backdrop-blur">
        <div className="mx-auto grid h-auto max-w-7xl grid-cols-[1fr_auto] grid-rows-[auto_auto] items-center gap-x-4 gap-y-3 px-6 py-3 md:flex md:h-20 md:justify-between md:py-0">
          <div className="text-xl font-black tracking-[0.3em] md:text-2xl">
            VAULT 13
          </div>

          <div className="col-span-2 row-start-2 flex min-w-0 gap-6 overflow-x-auto overscroll-x-contain whitespace-nowrap text-[11px] tracking-widest touch-pan-x md:gap-10 md:overflow-visible md:text-sm">
            <a href="#home" className="hover:text-gray-400">
              НҮҮР
            </a>
            <a href="#shop" className="hover:text-gray-400">
             ДЭЛГҮҮР
            </a>
            <a href="#about" className="hover:text-gray-400">
              БИДНИЙ ТУХАЙ
            </a>
            <a href="#contact" className="hover:text-gray-400">
              ХОЛБОО БАРИХ
            </a>
          </div>

          <button 
            onClick={() => setCartOpen(true)}
            aria-label={`Сагс нээх, ${cartCount} бараа`}
            className="col-start-2 row-start-1 inline-flex items-center gap-2 border border-white px-4 py-2 text-xs tracking-widest hover:bg-white hover:text-black"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
            CART ({cartCount})
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="home"
        className="relative flex min-h-screen items-center overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
  backgroundImage:
    "url('/products/hero-watch.jpg')"
}}
/>

<div className="absolute inset-0 bg-black/60" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pt-20">
          <p className="mb-5 text-sm tracking-[0.5em] text-gray-300">
            ЧАНАРТАЙ БҮТЭЭГДЭХҮҮН
          </p>

          <h1 className="max-w-4xl text-6xl font-black leading-none tracking-tight md:text-8xl">
 ТАНЫ
<br />
ХЭВ МАЯГТ
<br />
ЗОРИУЛАВ.
</h1>
          <p className="mt-8 max-w-xl text-gray-300">
            Цаг, хувцас, гутал болон аксессуарууд.
Өдөр тутмын орчин үеийн хэв маягт тохируулан сонгосон бүтээгдэхүүнүүд.
          </p>

          <a
            href="#shop"
            className="mt-10 inline-block bg-white px-8 py-4 text-sm font-bold tracking-widest text-black transition hover:bg-gray-300"
          >
           ОДОО ҮЗЭХ
          </a>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-y border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-10 px-6 text-xs tracking-[0.3em] text-gray-400">
      <button
  onClick={() => setSelectedCategory("WATCHES")}
  className={selectedCategory === "WATCHES" ? "text-white border-b border-white pb-2" : "text-gray-400"}
>
  ЦАГ
</button>

<button 
  onClick={() => setSelectedCategory("CLOTHES")} 
  className={selectedCategory === "CLOTHES" ? "text-white border-b border-white pb-2" : "text-gray-400"}
>
  ХУВЦАС
</button>
<button
  onClick={() => setSelectedCategory("SHOES")}
  className={selectedCategory === "SHOES" ? "text-white border-b border-white pb-2" : "text-gray-400 pb-2"}
>
  ГУТАЛ
</button>





<button
  onClick={() => setSelectedCategory("ACCESSORIES")}
  className={selectedCategory === "ACCESSORIES" ? "text-white border-b border-white pb-2" : "text-gray-400"}
>
  АКСЕССУАР
</button>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="shop" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-3 text-xs tracking-[0.4em] text-gray-500">
              SELECTED COLLECTION
            </p>
            <h2 className="text-4xl font-bold">ШИНЭ БҮТЭЭГДЭХҮҮН</h2>
          </div>

          <span className="hidden text-sm text-gray-500 md:block">
            01 — 04
          </span>
        </div>        
       </section>   

    {/* BANNER */}
      <section className="border-y border-white/10 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <p className="text-xs tracking-[0.5em] text-gray-500">
            VAULT 13
          </p>

          <h2 className="mt-5 text-4xl font-black md:text-6xl">
            LESS NOISE.
            <br />
            MORE STYLE.
          </h2>

          <p className="mx-auto mt-6 max-w-lg text-gray-400">
            Quality products. Clean design. Straight to you.
          </p>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="text-xs tracking-[0.4em] text-gray-500">
              ABOUT VAULT 13
            </p>

            <h2 className="mt-5 text-4xl font-bold">
              CURATED FOR
              <br />
              MODERN LIFE.
            </h2>
          </div>

          <div className="text-gray-400 leading-8">
            <p>
              VAULT 13 нь өдөр тутмын хэрэглээнд тохирох premium
              бүтээгдэхүүнүүдийг сонгон хүргэдэг онлайн дэлгүүр.
            </p>

            <p className="mt-5">
              Бид цаг, хувцас, гутал болон аксессуаруудыг нэг дор
              цуглуулж, энгийн бөгөөд premium shopping experience
              бий болгохыг зорьдог.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}{/* PRODUCTS */}
{cartFeedback && <p className="mb-6 text-sm text-amber-200" role="status">{cartFeedback}</p>}
<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-8">
  {products
  .filter((product) =>
    selectedCategory === "ALL" ||
    product.category === selectedCategory ||
    (selectedCategory === "CLOTHES" && product.category === "CLOTHING")
  )
.map((product, index) => (
    <div
      key={index}
      className="group cursor-pointer"
      onClick={() => setSelectedProduct(product)}
    >
    <div className="relative aspect-square bg-zinc-900 overflow-hidden rounded-2xl border border-white/30">
        <img
        
  src={product.image}
  alt={product.name}
  onClick={() => setSelectedProduct(product)}
  className="w-full h-full object-cover group-hover:scale-105 transition duration-500 cursor-pointer"
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

      <div className="pt-5">
        <p className="text-xs tracking-widest text-gray-500">
          {product.category}
        </p>

        <h3 className="text-lg mt-2 font-semibold">
          {product.name}
        </h3>

<p className="mt-2">
  {normalizeAvailability(product.availability) === "PREORDER" ? (
    <span className="inline-flex border border-amber-300/50 px-2 py-1 text-xs tracking-wide text-amber-200">
      УРЬДЧИЛСАН ЗАХИАЛГА
    </span>
  ) : Number(product.stock) > 0 ? (
    <span className="inline-flex border border-emerald-400/50 px-2 py-1 text-xs tracking-wide text-emerald-300">
      БЭЛЭН БАЙГАА · ҮЛДЭГДЭЛ: {product.stock}
    </span>
  ) : (
    <span className="text-sm text-gray-500">ДУУССАН</span>
  )}
</p>

{normalizeAvailability(product.availability) === "PREORDER" || Number(product.stock) > 0 ? (
  <button
onClick={(e) => {
  e.stopPropagation();
  addToCart(product);
}}

    className="w-full border border-white mt-5 py-3"
  >
    Сагсанд нэмэх
  </button>
) : (
  <button
    disabled
    className="w-full bg-red-600 text-white mt-5 py-3 font-bold cursor-not-allowed"
  >
    SOLD OUT
  </button>
)}
      </div>
    </div>
  ))}
</div>
      <footer
        id="contact"
        className="border-t border-white/10 px-6 py-12"
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row">
          <div>
            <div className="text-xl font-black tracking-[0.3em]">
              VAULT 13
            </div>

            <p className="mt-3 text-sm text-gray-500">
              ПРЕМИУМ ОНЛАЙН ДЭЛГҮҮР
            </p>
          </div>

          <div className="text-sm text-gray-500">
            <p>Ulaanbaatar, Mongolia</p>
            <p className="mt-2">Instagram: @vault13</p>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 text-xs text-gray-600">
          © 2026 VAULT 13. All rights reserved.
        </div>
      </footer>
  {selectedProduct && (
  <div
    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
    onClick={() => setSelectedProduct(null)}
  >
    <div
      className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950 border border-white/20 p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setSelectedProduct(null)}
        className="float-right text-2xl"
      >
        ×
      </button>

      <img
        src={selectedProduct.image}
        alt={selectedProduct.name}
        className="w-full aspect-square object-cover mt-4"
      />

      <p className="text-xs tracking-widest text-gray-500 mt-6">
        {selectedProduct.category}
      </p>

      <h2 className="text-2xl font-bold mt-2">
  {selectedProduct.name}
</h2>
      <p className="text-xl mt-4">
        {selectedProduct.price}
      </p>

   <div className="mt-6 text-sm text-gray-400 leading-7">
  {selectedProduct.description ? (
    <p>{selectedProduct.description}</p>
  ) : (
    <>
      <p>Чанартай хийцтэй</p>
      <p>Усны хамгаалалттай</p>
      <p>Өдөр тутам хэрэглэхэд тохиромжтой</p>
    </>
  )}
  {normalizeAvailability(selectedProduct.availability) === "PREORDER" ? (
    <p className="mt-3 text-amber-200">УРЬДЧИЛСАН ЗАХИАЛГА · 6–9 хоног</p>
  ) : Number(selectedProduct.stock) > 0 ? (
    <p className="mt-3 text-emerald-300">БЭЛЭН БАЙГАА</p>
  ) : (
    <p className="mt-3 text-gray-500">ДУУССАН</p>
  )}
</div>

      <button
onClick={() => {
  const added = addToCart(selectedProduct);
  if (added) {
    setSelectedProduct(null);
  }
}}
disabled={
  normalizeAvailability(selectedProduct.availability) !== "PREORDER" &&
  Number(selectedProduct.stock) <= 0
}
className="w-full bg-white text-black mt-6 py-4 font-bold"
      >
САГСАНД НЭМЭХ
      </button>
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
      {cartItems.map((item) => (
        <div key={String(item.id ?? item.name)} className="flex gap-4 border-b border-white/10 pb-4">
          <img
            src={item.image}
            alt={item.name}
            className="w-20 h-20 object-cover"
          />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">{item.name}</p>
            <p className="text-gray-400 mt-1">{(parsePrice(item.price) ?? 0).toLocaleString()}₮</p>
            {normalizeAvailability(item.availability) === "PREORDER" && (
              <p className="mt-1 text-xs text-amber-200">УРЬДЧИЛСАН ЗАХИАЛГА · 6–9 хоног</p>
            )}
            <div className="mt-2 flex items-center gap-3">
                  <button type="button" disabled={qpayOrderId !== null} onClick={() => changeCartQuantity(item, item.quantity - 1)} aria-label={`${item.name} тоо хасах`} className="h-8 w-8 border border-white/30 disabled:opacity-40">−</button>
              <span>{item.quantity}</span>
              <button type="button" disabled={qpayOrderId !== null} onClick={() => changeCartQuantity(item, item.quantity + 1)} aria-label={`${item.name} тоо нэмэх`} className="h-8 w-8 border border-white/30 disabled:opacity-40">+</button>
              <span className="ml-auto font-semibold">{((parsePrice(item.price) ?? 0) * item.quantity).toLocaleString()}₮</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
<div className="border-t border-white/10 pt-4 mt-4">
  <div className="flex justify-between font-bold">
    <span>НИЙТ</span>
 <span>
  {cartTotal.toLocaleString()}₮
    </span>
  </div>
</div>
      <button
        disabled={cartItems.length === 0}
        onClick={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
        className="w-full bg-white text-black mt-6 py-4 font-bold"
      >
        ТӨЛБӨР ТӨЛӨХ
      </button>
      {cartFeedback && <p className="mt-3 text-sm text-amber-200" role="status">{cartFeedback}</p>}
      {containsPreorder && (
        <p className="mt-3 border border-amber-300/30 p-3 text-sm text-amber-200">
          Урьдчилсан захиалга 100% урьдчилгаа төлбөртэй. Ирэх хугацаа: 6–9 хоног.
        </p>
      )}
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
  {containsPreorder && (
    <p className="mt-5 border border-amber-300/30 p-3 text-sm text-amber-200">
      Урьдчилсан захиалга 100% урьдчилгаа төлбөртэй. Ирэх хугацаа: 6–9 хоног.
    </p>
  )}
  <p className="mt-3 text-right font-semibold">Нийт: {(qpayOrderTotal ?? cartTotal).toLocaleString()}₮</p>
  <p className="text-sm text-gray-400 mt-6">
    Төлбөрийн хэлбэр
  </p>
   
<button
  type="button"
  disabled={isCreatingQpayInvoice || cartItems.length === 0 || Boolean(qpayInvoiceId)}
  aria-busy={isCreatingQpayInvoice}
  onClick={async () => {
    if (qpayInvoiceRequestInFlight.current) return;
    qpayInvoiceRequestInFlight.current = true;
    setIsCreatingQpayInvoice(true);
    setQpayUrls([]);
    setQpayInvoiceId("");
    setPaymentFeedback("");

    try {
      let orderId = qpayOrderId;
      let checkoutToken = qpayCheckoutToken;
      if (orderId === null) {
        const orderResponse = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName,
            customerPhone,
            customerAddress,
            items: cartItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
          }),
        });
        const orderData = await orderResponse.json();
        if (!orderResponse.ok) {
          throw new Error(orderData.error || "Захиалга үүсгэж чадсангүй.");
        }
        orderId = Number(orderData.orderId);
        checkoutToken = String(orderData.checkoutToken ?? "");
        if (!checkoutToken) throw new Error("Захиалгын баталгаажуулалт үүсгэсэнгүй.");
        setQpayCheckoutToken(checkoutToken);
        setQpayOrderTotal(Number(orderData.total));
        if (Array.isArray(orderData.items)) {
          setCartItems(
            orderData.items.map((item: {
              product_id: number;
              name: string;
              category: string;
              price: number;
              image: string;
              availability: string;
              quantity: number;
            }) => ({
              id: item.product_id,
              name: item.name,
              category: item.category,
              price: item.price,
              image: item.image,
              availability: item.availability,
              stock: 0,
              quantity: item.quantity,
            }))
          );
        }
        setQpayOrderId(orderId);
      }

      const response = await fetch("/api/qpay/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, checkoutToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "QPay нэхэмжлэл үүссэнгүй.");
      }

      setQpayUrls(data.urls || []);
      setQpayInvoiceId(String(data.invoice_id || ""));
    } catch (error) {
      setPaymentFeedback(error instanceof Error ? error.message : "QPay сервертэй холбогдож чадсангүй.");
    } finally {
      qpayInvoiceRequestInFlight.current = false;
      setIsCreatingQpayInvoice(false);
    }
  }}
  className="w-full border border-white/20 mt-3 py-4 disabled:cursor-wait disabled:opacity-60"
>
  {isCreatingQpayInvoice ? "Нэхэмжлэл үүсгэж байна..." : qpayInvoiceId ? "QPAY НЭХЭМЖЛЭЛ ҮҮССЭН" : "QPAY"}
</button>
{paymentFeedback && <p className="text-sm text-amber-200" role="alert">{paymentFeedback}</p>}
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
  disabled={!qpayInvoiceId || qpayOrderId === null || isVerifyingPayment}
  aria-busy={isVerifyingPayment}
  onClick={async () => {
    setPaymentFeedback("");
    setIsVerifyingPayment(true);
    try {
      const paymentCheck = await fetch("/api/qpay/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: qpayInvoiceId,
          orderId: qpayOrderId,
          checkoutToken: qpayCheckoutToken,
        }),
      });
      const paymentData = await paymentCheck.json();
      if (!paymentCheck.ok) {
        throw new Error(paymentData.error || "Төлбөр шалгаж чадсангүй.");
      }
      if (!paymentData.paid) {
        setPaymentFeedback("Төлбөр QPay-ээр хараахан баталгаажаагүй байна.");
        return;
      }

      setCheckoutOpen(false);
      setCartItems([]);
      setQpayOrderId(null);
      setQpayOrderTotal(null);
      setQpayCheckoutToken("");
      setQpayInvoiceId("");
      setQpayUrls([]);
      const confirmationMessage = paymentData.inventoryIssue
        ? "Төлбөр баталгаажлаа. Захиалгын нөөцийг админ шалгах шаардлагатай."
        : "Төлбөр баталгаажиж, захиалга бүртгэгдлээ.";
      setPaymentFeedback(confirmationMessage);
      setCartFeedback(confirmationMessage);
      if (supabase) {
        const { data } = await supabase.from("products").select("*").order("id", { ascending: true });
        if (data) setProducts(data);
      }
    } catch (error) {
      setPaymentFeedback(error instanceof Error ? error.message : "Төлбөр шалгахад алдаа гарлаа.");
    } finally {
      setIsVerifyingPayment(false);
    }
  }}
  className="w-full bg-white text-black mt-3 py-4 font-bold disabled:cursor-wait disabled:opacity-50"
>
  {isVerifyingPayment ? "ТӨЛБӨР ШАЛГАЖ БАЙНА..." : "ТӨЛБӨР ШАЛГАХ"}
</button>
    </div>
)}
    </div>
  </div>
)}
  </main>
  );
}
