import React, { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { Search, Upload } from "lucide-react";

const API_BASE = "http://localhost/One-Convenience/backend/api";

interface Product {
  id: number;
  productName: string;
  barcode: string;
  description: string | null;
  stockQuantity: number;
  costPrice: number | string;
  sellingPrice: number | string;
  category: string;
  supplier: string | null;
  expirationDate: string | null;
  threshold: number;
}

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
}) => {
  const inputId = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
      <label htmlFor={inputId} className="text-sm font-semibold text-gray-700 ml-1">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={type === "date" ? "YYYY-MM-DD" : placeholder}
        required={["productName", "barcode", "stockQuantity", "costPrice", "sellingPrice", "category"].includes(name)}
        min={type === "number" ? "0" : undefined}
        step={name === "costPrice" || name === "sellingPrice" ? "0.01" : undefined}
        className="w-full h-12 px-5 border border-gray-400 rounded-[1.2rem] outline-none transition duration-150 placeholder:text-gray-400 text-gray-700 focus:border-blue-600 focus:ring-1 focus:ring-blue-200"
      />
    </div>
  );
};

const emptyForm = {
  productName: "",
  barcode: "",
  description: "",
  stockQuantity: "0",
  costPrice: "0.00",
  sellingPrice: "0.00",
  category: "",
  supplier: "",
  expirationDate: "",
  threshold: "5",
};

export default function Inventory() {
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<"list" | "check">("list");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/getproducts.php`);
      const data = await response.json();

      if (!response.ok || data.success !== true || !Array.isArray(data.products)) {
        throw new Error(data.message || "Could not load products from the database.");
      }

      setProducts(data.products);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Make sure Laragon Apache/MySQL are running and the API URL is correct.`
          : "Could not connect to the products API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.productName, product.barcode, product.category, product.description ?? ""]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_BASE}/addproduct.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          stockQuantity: Number(formData.stockQuantity),
          costPrice: Number(formData.costPrice),
          sellingPrice: Number(formData.sellingPrice),
          threshold: Number(formData.threshold || 5),
          expirationDate: formData.expirationDate || null,
          supplier: formData.supplier || null,
          description: formData.description || null,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.success !== true) {
        throw new Error(data.message || "Could not save the product.");
      }

      setNotice("Product added successfully.");
      setFormData(emptyForm);
      setShowAdd(false);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="flex min-h-screen bg-[#cfdcfc] font-sans text-gray-800"
      style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}
    >
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto text-left">
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Inventory Management</h1>
          <button
            onClick={() => void loadProducts()}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
            type="button"
          >
            Refresh
          </button>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notice}
          </div>
        )}

        <div className="bg-white p-3 rounded-[1rem] shadow-sm flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, barcode, or category"
              className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {view === "list" ? (
              <>
                <button
                  type="button"
                  onClick={() => setNotice("Excel import is not connected yet. We can add it after confirming this database connection works in the page.")}
                  className="px-6 py-2 rounded-xl font-bold text-xs uppercase bg-[#17347a] text-white shadow-md hover:bg-[#0f2456] active:scale-95 transition-all flex items-center gap-2"
                >
                  <Upload size={14} />
                  Import Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setNotice("");
                    setFormData(emptyForm);
                    setShowAdd(true);
                  }}
                  className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Add Product
                </button>
                <button
                  type="button"
                  onClick={() => setView("check")}
                  className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-yellow-500 text-white shadow-md hover:bg-yellow-600 active:scale-95 transition-all"
                >
                  Manual Count Log
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-gray-400 text-white shadow-md hover:bg-gray-500 active:scale-95 transition-all"
              >
                Back to List
              </button>
            )}
          </div>
        </div>

        {showAdd && view === "list" && (
          <form onSubmit={handleAddProduct} className="bg-[#ECECEC] p-8 rounded-[1.5rem] border border-gray-400 shadow-sm w-full">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-6">
                <InputField label="Product Name" name="productName" value={formData.productName} onChange={handleChange} />
                <InputField label="Barcode" name="barcode" value={formData.barcode} onChange={handleChange} />
                <InputField label="Description" name="description" value={formData.description} onChange={handleChange} />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField label="Stock Quantity" name="stockQuantity" type="number" value={formData.stockQuantity} onChange={handleChange} />
                <InputField label="Cost Price" name="costPrice" type="number" value={formData.costPrice} onChange={handleChange} />
                <InputField label="Selling Price" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleChange} />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField label="Category" name="category" value={formData.category} onChange={handleChange} />
                <InputField label="Supplier" name="supplier" value={formData.supplier} onChange={handleChange} />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField label="Expiration Date" name="expirationDate" type="date" value={formData.expirationDate} onChange={handleChange} />
                <InputField label="Low Stock Threshold for Replenishment" name="threshold" type="number" value={formData.threshold} onChange={handleChange} />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button
                type="submit"
                disabled={saving}
                className="h-12 px-10 rounded-[1rem] font-bold text-white bg-[#2D44E1] shadow-md hover:bg-blue-800 transition active:scale-95 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add a Product"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="h-12 px-10 rounded-[1rem] font-bold text-gray-900 bg-white border border-gray-400 shadow-md hover:bg-gray-100 transition active:scale-95"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!showAdd && (
          <div className="bg-white rounded-[1rem] shadow-sm border-2 border-gray-50 overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-[#17347a] text-white font-bold uppercase text-[13px]">
                <tr>
                  <th className="p-5">Product</th>
                  <th className="p-5">Barcode</th>
                  <th className="p-5">Category</th>
                  <th className="p-5">Price</th>
                  <th className="p-5 text-center">{view === "check" ? "Expected Stock" : "Stock / Threshold"}</th>
                  <th className="p-5 text-center">{view === "check" ? "Actual Count" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50 font-bold text-gray-700">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading products from database...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No products found.</td></tr>
                ) : (
                  filteredProducts.map((item) => {
                    const lowStock = Number(item.stockQuantity) <= Number(item.threshold);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5">
                          <div>{item.productName}</div>
                          {item.description && <div className="mt-1 text-xs font-normal text-gray-500">{item.description}</div>}
                        </td>
                        <td className="p-5 font-mono text-xs">{item.barcode}</td>
                        <td className="p-5">{item.category}</td>
                        <td className="p-5 whitespace-nowrap">₱ {Number(item.sellingPrice).toFixed(2)}</td>
                        <td className="p-5 text-center">{Number(item.stockQuantity)} / {Number(item.threshold)}</td>
                        <td className="p-5 text-center">
                          {view === "check" ? (
                            <span className="text-gray-500 font-medium">Not counted yet</span>
                          ) : (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs ${lowStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {lowStock ? "Low Stock" : "In Stock"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="px-5 py-3 text-xs text-gray-500 border-t">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
