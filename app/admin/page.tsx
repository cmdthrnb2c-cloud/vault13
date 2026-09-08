"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);



export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
    const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("WATCHES");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productStock, setProductStock] = useState("0");
const [products, setProducts] = useState<any[]>([]);
  const addProduct = async () => {
    const name = prompt("Барааны нэр:");
    if (!name) return;

    const category = prompt("Ангилал:", "WATCHES");
    if (!category) return;

    const price = prompt("Үнэ:");
    if (!price) return;

    const image = prompt("Зургийн URL:");
    if (!image) return;

    const stock = prompt("Үлдэгдэл:", "5");
    if (!stock) return;

    const { error } = await supabase.from("products").insert([
      {
        name,
        category,
        price: Number(price),
        image,
        stock: Number(stock),
      },
    ]);

    if (error) {
      alert("Бараа нэмэхэд алдаа гарлаа: " + error.message);
      return;
    }

    alert("Бараа амжилттай нэмэгдлээ.");
    window.location.reload();
  };
useEffect(() => {
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Products error:", error);
      return;
    }

    if (data) {
      setProducts(data);
    }
  };

  fetchProducts();
}, []);
  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-[0.3em] text-center">
            VAULT 13
          </h1>

          <p className="text-gray-500 text-center mt-3 tracking-widest">
            ADMIN PANEL
          </p>

          <input
            type="password"
            placeholder="ADMIN PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-white/30 px-4 py-4 mt-10 outline-none"
          />

       <button
  onClick={() => {
    if (password === "04f0a1034451A?") {
      setLoggedIn(true);
    } else {
      alert("Нууц үг буруу");
    }
  }}
  className="w-full border border-white py-3 mt-4"
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
            <p className="text-3xl font-bold mt-3">6</p>
          </div>

          <div className="border border-white/20 p-6">
            <p className="text-gray-500">ЗАХИАЛГА</p>
            <p className="text-3xl font-bold mt-3">0</p>
          </div>

          <div className="border border-white/20 p-6">
            <p className="text-gray-500">БОРЛУУЛАЛТ</p>
            <p className="text-3xl font-bold mt-3">0₮</p>
          </div>
        </div>

        <div className="mt-10 border border-white/20 p-6">
          <h2 className="text-xl font-bold">БҮТЭЭГДЭХҮҮН УДИРДАХ</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <button 
             onClick={addProduct}
            className="border border-white py-4">
              БАРАА НЭМЭХ
            </button>

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

          <p className="text-gray-500 mt-4">
            Одоогоор захиалга байхгүй.
          </p>
        </div>
      </div>
    </main>
  );
}