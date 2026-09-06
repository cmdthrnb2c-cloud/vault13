"use client";

import { useState } from "react";

const products = [
  {
    name: "ROLEX GMT-MASTER II PEPSI",
    category: "WATCHES",
    price: "250,000₮",
    image:
      "https://www.idwx.co/cdn/shop/products/PEPSIJub_1024x.jpg?v=1668766409",
  },
  {
    name: "ROLEX SUBMARINER",
    category: "WATCHES",
    price: "250,000₮",
    image: "/products/SUBMARINER.PNG",
  },
  {
    name: "ROLEX YACHT-MASTER ROSE GOLD",
    category: "WATCHES",
    price: "250,000₮",
    image: "/products/YACHT-MASTER.PNG",
  },
];
export default function Home() {
  const [cart, setCart] = useState(0);
  const [cartItems, setCartItems] = useState<any[]>(() => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("vault13-cart");
  return saved ? JSON.parse(saved) : [];
});
const [selectedProduct, setSelectedProduct] = useState<any>(null);
const [cartOpen, setCartOpen] = useState(false);
const [checkoutOpen, setCheckoutOpen] = useState(false);
const [customerName, setCustomerName] = useState("");
const [customerPhone, setCustomerPhone] = useState("");
const [customerAddress, setCustomerAddress] = useState("");
const [paymentMethod, setPaymentMethod] = useState("");
return (
    <main className="min-h-screen bg-black text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="text-2xl font-black tracking-[0.3em]">
            VAULT 13
          </div>

          <div className="hidden gap-10 text-sm tracking-widest md:flex">
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
            className="border border-white px-4 py-2 text-xs tracking-widest hover:bg-white hover:text-black"
          >
            CART ({cart})
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
              "url('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1800&q=85')",
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
            ХЭВ МАЯГТАД
          </h1>
ЗОРИУЛАВ.
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
          <span>ЦАГ</span>
          <span>ХУВЦАС</span>
          <span>ГУТАЛ</span>
          <span>АКСЕССУАР</span>
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
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
  {products.map((product, index) => (
    <div
      key={index}
      className="group cursor-pointer"
      onClick={() => setSelectedProduct(product)}
    >
      <div className="aspect-square bg-zinc-900 overflow-hidden">
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
  className="absolute inset-0 m-auto h-12 w-40 bg-white text-black font-bold opacity-0 group-hover:opacity-100 transition"
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

        <p className="text-gray-400 mt-2">
          {product.price}
      </p>  <button
  onClick={(e) => {
    e.stopPropagation();
    setCart((prev) => prev + 1);
    setCartItems((prev) => [...prev, product]);
  }}
  className="w-full border border-white mt-5 py-3"
>
  САГСАНД НЭМЭХ
</button>
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
        <p>• Чанартай хийцтэй</p>
        <p>• Усны хамгаалалттай</p>
        <p>• Өдөр тутам хэрэглэхэд тохиромжтой</p>
      </div>

      <button
onClick={() => {
  if (selectedProduct) {
    setCart((prev) => prev + 1);
    setCartItems((prev) => [...prev, selectedProduct]);
  }
  setSelectedProduct(null);
  setCheckoutOpen(true);
}}
        className="w-full bg-white text-black mt-6 py-4 font-bold"
      >
        ХУДАЛДАН АВАХ
      </button>

      <div className="border border-white/20 mt-6 p-5">
        <p className="text-sm tracking-widest text-gray-400">
          ТӨЛБӨР
        </p>

        <button className="w-full border border-white mt-4 py-3">
          QPAY
        </button>

        <button className="w-full border border-white/30 mt-3 py-3">
          ХААН БАНК
        </button>
      </div>
    </div>
  </div>
)}{cartOpen && (
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
        <div key={index} className="flex gap-4 border-b border-white/10 pb-4">
          <img
            src={item.image}
            alt={item.name}
            className="w-20 h-20 object-cover"
          />

          <div>
            <p className="font-semibold">{item.name}</p>
            <p className="text-gray-400 mt-1">{item.price}</p>
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

    <input
  type="text"
  placeholder="Нэр"
  value={customerName}
  onChange={(e) => setCustomerName(e.target.value)}
  className="w-full bg-transparent border border-white/20 p-4 mt-6"
/>
<input
  type="tel"
  placeholder="Утасны дугаар"
  value={customerPhone}
  onChange={(e) => setCustomerPhone(e.target.value)}
  className="w-full bg-transparent border border-white/20 p-4 mt-3"
/>
      <input
  type="text"
  placeholder="Хүргэлтийн хаяг"
  value={customerAddress}
  onChange={(e) => setCustomerAddress(e.target.value)}
  className="w-full bg-transparent border border-white/20 p-4 mt-3"
/>
        <p className="text-sm text-gray-400 mt-6">
  Төлбөрийн хэлбэр
</p>

      <p className="text-sm text-gray-400 mt-6">
        Төлбөрийн хэлбэр
      </p>

      <button onClick={() => setPaymentMethod("QPAY")}className="w-full border border-white mt-3 py-4">
        QPAY
      </button>

      <button 
        onClick={() => setPaymentMethod("ХААН БАНК")}
        className="w-full border border-white/20 mt-3 py-4">
        ХААН БАНК
      </button>

      <button
   onClick={() => {
  alert(
  "Захиалга амжилттай бүртгэгдлээ.\n\n" +
  "Нэр: " + customerName + "\n" +
  "Утас: " + customerPhone + "\n" +
  "Хаяг: " + customerAddress + "\n" +
  "Төлбөрийн хэлбэр: " + paymentMethod + "\n" +
  "Нийт дүн: " +
  cartItems.reduce((total, item) => {
    return total + Number(String(item.price).replace(/[^\d]/g, ""));
  }, 0).toLocaleString() +
  "₮"
);

    setCheckoutOpen(false);
   setCart(0);
  }}
  className="w-full bg-white text-black mt-6 py-4 font-bold"
>
        ЗАХИАЛГА БАТАЛГААЖУУЛАХ
      </button>
    </div>
  </div>
)}
  </main>
  );
}