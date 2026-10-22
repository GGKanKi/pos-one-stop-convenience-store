import React, { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { Search, Upload, Edit3, X, Calendar, Plus, Trash2, FileText } from "lucide-react";

const API_BASE = "http://localhost/One-Convenience/backend/api";

interface ExpiryBatch {
  date: string;
  qty: number;
}

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
  expiryBatches: ExpiryBatch[];
  threshold: number;
  actualCount?: number | string | null;
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [originalStock, setOriginalStock] = useState<number>(0);
  const [editExpiryBatches, setEditExpiryBatches] = useState<ExpiryBatch[]>([]);
  const [expiryModalProduct, setExpiryModalProduct] = useState<Product | null>(null);
  const [view, setView] = useState<"list" | "check">("list");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  // States for Stock Adjustment Reason Modal
  const [stockReasonModalOpen, setStockReasonModalOpen] = useState(false);
  const [stockChangeReason, setStockChangeReason] = useState("");

  useEffect(() => {
    const fontId = "google-font-inter";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/getproducts.php`);
      const data = await response.json();

      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data.products)
        ? data.products
        : [];

      const savedCountsRaw = localStorage.getItem("inventory_actual_counts");
      const savedConfirmedRaw = localStorage.getItem("inventory_confirmed_barcodes");
      const savedCounts: Record<string, string> = savedCountsRaw ? JSON.parse(savedCountsRaw) : {};
      const savedConfirmed: string[] = savedConfirmedRaw ? JSON.parse(savedConfirmedRaw) : [];

      const mappedProducts: Product[] = rawList.map((item: any) => {
        const rawExpiry = item.expirationDate || item.expiration_date || null;
        const currentStock = Number(item.stockQuantity ?? item.stock ?? 0);
        const barcode = String(item.barcode || item.code || "").trim();

        let defaultBatches: ExpiryBatch[] = [];
        if (Array.isArray(item.expiryBatches) && item.expiryBatches.length > 0) {
          defaultBatches = item.expiryBatches;
        } else if (rawExpiry) {
          defaultBatches = [{ date: String(rawExpiry), qty: currentStock }];
        }

        const actualVal =
          savedConfirmed.includes(barcode) && savedCounts[barcode] !== undefined
            ? Number(savedCounts[barcode])
            : null;

        return {
          id: Number(item.id),
          productName: String(item.productName || item.name || "").trim(),
          barcode: barcode,
          description: item.description ? String(item.description).trim() : null,
          stockQuantity: currentStock,
          costPrice: Number(item.costPrice || item.cost_price || 0),
          sellingPrice: Number(item.sellingPrice || item.price || 0),
          category: String(item.category || "Uncategorized").trim(),
          supplier: item.supplier ? String(item.supplier).trim() : null,
          expirationDate: rawExpiry,
          expiryBatches: defaultBatches,
          threshold: Number(item.threshold || 5),
          actualCount: actualVal,
        };
      });

      setProducts(mappedProducts);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(
        err instanceof Error
          ? `${err.message} Siguraduhing tumatakbo ang Laragon Apache/MySQL.`
          : "Could not connect to the products API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts, view]);

  const displayedItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const pName = product.productName.toLowerCase();
      const pBarcode = product.barcode.toLowerCase();
      const pCategory = product.category.toLowerCase();
      const pSupplier = (product.supplier || "").toLowerCase();
      const pDesc = (product.description || "").toLowerCase();

      return (
        pName.includes(query) ||
        pBarcode.includes(query) ||
        pCategory.includes(query) ||
        pSupplier.includes(query) ||
        pDesc.includes(query)
      );
    });
  }, [products, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          actor: (() => {
            try {
              const user = JSON.parse(localStorage.getItem("user") || "{}");
              return { id: user.id || null, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Unknown" };
            } catch { return { name: "Unknown" }; }
          })(),
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

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setOriginalStock(Number(product.stockQuantity));
    setEditExpiryBatches(
      product.expiryBatches && product.expiryBatches.length > 0
        ? [...product.expiryBatches]
        : product.expirationDate
        ? [{ date: product.expirationDate, qty: product.stockQuantity }]
        : []
    );
    setFormData({
      productName: product.productName,
      barcode: product.barcode,
      description: product.description || "",
      stockQuantity: String(product.stockQuantity),
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      category: product.category,
      supplier: product.supplier || "",
      expirationDate: product.expirationDate || "",
      threshold: String(product.threshold),
    });
  };

  const handleAddBatch = () => {
    setEditExpiryBatches((prev) => [...prev, { date: "", qty: 0 }]);
  };

  const handleRemoveBatch = (index: number) => {
    setEditExpiryBatches((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchChange = (
    index: number,
    field: "date" | "qty",
    value: string | number
  ) => {
    setEditExpiryBatches((prev) =>
      prev.map((batch, i) =>
        i === index ? { ...batch, [field]: value } : batch
      )
    );
  };

  // Called when user clicks "Save Changes" on Edit Form
  const handlePreSaveEditProduct = () => {
    if (!editingProduct) return;

    const newStock = Number(formData.stockQuantity);
    // If stock quantity has changed, open reason prompt modal first
    if (newStock !== originalStock) {
      setStockChangeReason("");
      setStockReasonModalOpen(true);
    } else {
      void handleSaveEditProduct();
    }
  };

  const handleSaveEditProduct = async () => {
    if (!editingProduct) return;

    const primaryExpiry =
      editExpiryBatches[0]?.date || formData.expirationDate || null;
    const newStock = Number(formData.stockQuantity);

    const updatedProductData = {
      id: editingProduct.id,
      productName: formData.productName,
      barcode: formData.barcode,
      stockQuantity: newStock,
      costPrice: Number(formData.costPrice),
      sellingPrice: Number(formData.sellingPrice),
      category: formData.category,
      supplier: formData.supplier || null,
      description: formData.description || null,
      threshold: Number(formData.threshold),
      expirationDate: primaryExpiry,
      expiryBatches: editExpiryBatches,
      stockChangeReason: newStock !== originalStock ? stockChangeReason : null,
      actor: (() => {
        try {
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          return { id: user.id || null, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Unknown" };
        } catch { return { name: "Unknown" }; }
      })(),
    };

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/updateproduct.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProductData),
      });
      const data = await response.json();
      if (!response.ok || data.success !== true) throw new Error(data.message || "Failed to update product details.");
      setNotice("Product details updated successfully.");
      setEditingProduct(null);
      setStockReasonModalOpen(false);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product details.");
    } finally {
      setSaving(false);
    }
  };
  const isSearching = Boolean(searchTerm.trim());

  const modalBatchesToDisplay = useMemo(() => {
    if (!expiryModalProduct) return [];
    if (
      expiryModalProduct.expiryBatches &&
      expiryModalProduct.expiryBatches.length > 0
    ) {
      return expiryModalProduct.expiryBatches;
    }
    if (expiryModalProduct.expirationDate) {
      return [
        {
          date: expiryModalProduct.expirationDate,
          qty: expiryModalProduct.stockQuantity,
        },
      ];
    }
    return [];
  }, [expiryModalProduct]);

  return (
    <div
      className="flex min-h-screen bg-[#cfdcfc] text-gray-800 antialiased"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto text-left">
        {/* HEADER */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider">
            {view === "check" ? "Manual Count Log" : "Inventory Management"}
          </h1>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
          >
            {notice}
          </div>
        )}

        {/* SEARCH & ACTIONS BAR */}
        <div className="bg-white p-3 rounded-[1rem] shadow-sm flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name, barcode, category, or supplier..."
              className="w-full pl-10 pr-10 py-2 border rounded-xl outline-none focus:border-blue-500 text-sm font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear Search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {view === "list" ? (
              <>
                <button
                  type="button"
                  onClick={() => setNotice("Excel import feature ready.")}
                  className="px-6 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-[#17347a] text-white shadow-md hover:bg-[#0f2456] active:scale-95 transition-all flex items-center gap-2"
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
                  className="px-8 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Add Product
                </button>

                <button
                  type="button"
                  onClick={() => setView("check")}
                  className="px-8 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-yellow-500 text-white shadow-md hover:bg-yellow-600 active:scale-95 transition-all"
                >
                  Manual Count Log
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-8 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gray-400 text-white shadow-md hover:bg-gray-500 active:scale-95 transition-all"
              >
                Back to List
              </button>
            )}
          </div>
        </div>

        {/* ADD PRODUCT FORM */}
        {showAdd && view === "list" && (
          <form
            onSubmit={handleAddProduct}
            className="bg-[#ECECEC] p-8 rounded-[1.5rem] border border-gray-400 shadow-sm w-full"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-6">
                <InputField
                  label="Product Name"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField
                  label="Stock Quantity"
                  name="stockQuantity"
                  type="number"
                  value={formData.stockQuantity}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Cost Price"
                  name="costPrice"
                  type="number"
                  value={formData.costPrice}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Selling Price"
                  name="sellingPrice"
                  type="number"
                  value={formData.sellingPrice}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField
                  label="Expiration Date"
                  name="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Low Stock Threshold for Replenishment"
                  name="threshold"
                  type="number"
                  value={formData.threshold}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button
                type="submit"
                disabled={saving}
                className="h-12 px-10 rounded-[1rem] font-extrabold text-white tracking-wider bg-[#2D44E1] shadow-md hover:bg-blue-800 transition active:scale-95 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add a Product"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="h-12 px-10 rounded-[1rem] font-extrabold text-gray-900 tracking-wider bg-white border border-gray-400 shadow-md hover:bg-gray-100 transition active:scale-95"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* EXPIRY DATES VIEW MODAL */}
        {expiryModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-[1.5rem] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2 text-[#17347a]">
                  <Calendar size={18} />
                  <h2 className="font-extrabold text-base">
                    Expiration Dates Batch
                  </h2>
                </div>
                <button
                  onClick={() => setExpiryModalProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <p className="font-extrabold text-sm text-[#0284C7]">
                  {expiryModalProduct.productName}
                </p>
                <p className="text-xs font-mono text-gray-500 mt-0.5">
                  Barcode: {expiryModalProduct.barcode}
                </p>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#17347a] text-white font-extrabold uppercase">
                    <tr>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3 text-right">Batch Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {modalBatchesToDisplay.length > 0 ? (
                      modalBatchesToDisplay.map((batch, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3 font-mono">
                            {batch.date || "No Expiry Date"}
                          </td>
                          <td className="p-3 text-right font-bold text-gray-900">
                            {batch.qty} pcs
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="p-4 text-center text-gray-400"
                        >
                          No expiration dates recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setExpiryModalProduct(null)}
                  className="px-6 py-2 bg-[#17347a] text-white text-xs font-extrabold rounded-xl hover:bg-[#0f2456] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-[1.5rem] p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="font-extrabold text-[#17347a] text-lg">
                  Edit Product Details
                </h2>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Product Name"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Stock Quantity"
                  name="stockQuantity"
                  type="number"
                  value={formData.stockQuantity}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Cost Price"
                  name="costPrice"
                  type="number"
                  value={formData.costPrice}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Selling Price"
                  name="sellingPrice"
                  type="number"
                  value={formData.sellingPrice}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                />
                <InputField
                  label="Threshold"
                  name="threshold"
                  type="number"
                  value={formData.threshold}
                  onChange={handleInputChange}
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                    <Calendar size={16} className="text-[#17347a]" /> Multiple
                    Expiration Dates & Batches
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBatch}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Plus size={14} /> Add Expiry Date
                  </button>
                </div>

                {editExpiryBatches.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No expiry date batches assigned yet. Click "Add Expiry
                    Date" to add one.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {editExpiryBatches.map((batch, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200"
                      >
                        <div className="flex-1">
                          <label className="text-[11px] font-bold text-gray-500 block mb-0.5">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={batch.date}
                            onChange={(e) =>
                              handleBatchChange(index, "date", e.target.value)
                            }
                            className="w-full px-3 py-1.5 text-xs border rounded-lg outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div className="w-28">
                          <label className="text-[11px] font-bold text-gray-500 block mb-0.5">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={batch.qty}
                            onChange={(e) =>
                              handleBatchChange(
                                index,
                                "qty",
                                Number(e.target.value)
                              )
                            }
                            className="w-full px-3 py-1.5 text-xs border rounded-lg outline-none focus:border-blue-500 font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBatch(index)}
                          className="text-red-500 hover:text-red-700 p-2 mt-4 transition"
                          title="Remove batch"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-6 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePreSaveEditProduct}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REASON / DESCRIPTION MODAL FOR STOCK ADJUSTMENT */}
        {stockReasonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-[1.5rem] p-9 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2 text-[#17347a]">
                  <FileText size={28} />
                  <h2 className="font-extrabold text-base">
                    Reason for Stock Change
                  </h2>
                </div>
                <button
                  onClick={() => setStockReasonModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-[17px] font-bold text-gray-600">
                  Stock quantity for <span className="text-[#0284C7] font-extrabold">{editingProduct?.productName}</span> changed from{" "}
                  <span className="font-extrabold text-red-600">{originalStock}</span> to{" "}
                  <span className="font-extrabold text-green-600">{formData.stockQuantity}</span>.
                </p>
                <label className="text-[12px] font-semibold text-gray-700 block">
                  Please enter a reason or description for this stock adjustment:
                </label>
                <textarea
                  rows={5}
                  value={stockChangeReason}
                  onChange={(e) => setStockChangeReason(e.target.value)}
                  placeholder="e.g. Received new shipment, Damaged stock removal, Inventory correction..."
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setStockReasonModalOpen(false)}
                  className="px-5 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!stockChangeReason.trim() || saving}
                  onClick={handleSaveEditProduct}
                  className="px-5 py-2 bg-[#17347a] text-white text-xs font-extrabold rounded-xl hover:bg-[#0f2456] transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN DATA TABLE */}
        {!showAdd && (
          <div className="bg-white rounded-[1rem] shadow-sm border-2 border-gray-100 overflow-hidden w-full max-w-full flex flex-col">
            <div
              className="max-h-[500px] overflow-y-auto overflow-x-auto w-full"
              style={{ scrollbarGutter: "stable" }}
            >
              <table className="w-full text-left min-w-[950px] border-collapse">
                <thead className="bg-[#17347a] text-white font-extrabold uppercase text-[12px] tracking-wider sticky top-0 z-20 shadow-xs">
                  {view === "list" ? (
                    <tr>
                      <th className="p-5 w-[24%] bg-[#17347a]">Product</th>
                      <th className="p-5 w-[14%] bg-[#17347a]">Barcode</th>
                      <th className="p-5 w-[16%] bg-[#17347a]">Category</th>
                      <th className="p-5 w-[10%] bg-[#17347a]">Cost Price</th>
                      <th className="p-5 w-[10%] bg-[#17347a]">Selling Price</th>
                      <th className="p-5 w-[11%] bg-[#17347a] text-center">
                        Stock / Threshold
                      </th>
                      <th className="p-5 w-[9%] bg-[#17347a] text-center">
                        Expiry Dates
                      </th>
                      <th className="p-5 w-[6%] bg-[#17347a] text-center">
                        Action
                      </th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="p-5 w-[24%] bg-[#17347a]">Product</th>
                      <th className="p-5 w-[14%] bg-[#17347a]">Barcode</th>
                      <th className="p-5 w-[16%] bg-[#17347a]">Category</th>
                      <th className="p-5 w-[10%] bg-[#17347a]">Cost Price</th>
                      <th className="p-5 w-[10%] bg-[#17347a]">Selling Price</th>
                      <th className="p-5 w-[12%] bg-[#17347a] text-center">
                        Expected Stock
                      </th>
                      <th className="p-5 w-[14%] bg-[#17347a] text-center">
                        Actual Count
                      </th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm font-semibold text-gray-700">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={view === "list" ? 8 : 7}
                        className="p-8 text-center text-gray-500 font-bold"
                      >
                        Loading products from database...
                      </td>
                    </tr>
                  ) : displayedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={view === "list" ? 8 : 7}
                        className="p-8 text-center text-gray-500 font-bold"
                      >
                        {isSearching
                          ? `No products found matching "${searchTerm}".`
                          : "No products available in inventory."}
                      </td>
                    </tr>
                  ) : (
                    displayedItems.map((item, index) => {
                      const isEven = index % 2 === 0;
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isEven ? "bg-[#F8FAFC]" : "bg-white"
                          } hover:bg-blue-50/60`}
                        >
                          <td className="p-5 w-[24%]">
                            <div className="font-extrabold text-[#0284C7] text-[15px] tracking-tight leading-snug break-words">
                              {item.productName}
                            </div>
                            {item.description && (
                              <div className="mt-0.5 text-xs font-normal text-gray-500 break-words leading-tight">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="p-5 w-[14%] font-mono text-xs font-bold text-gray-700 tracking-wider break-all">
                            {item.barcode}
                          </td>
                          <td className="p-5 w-[16%] font-bold text-gray-800 break-words">
                            {item.category}
                          </td>
                          <td className="p-5 w-[10%] font-extrabold text-gray-600 whitespace-nowrap">
                            ₱ {Number(item.costPrice).toFixed(2)}
                          </td>
                          <td className="p-5 w-[10%] font-extrabold text-gray-900 whitespace-nowrap">
                            ₱ {Number(item.sellingPrice).toFixed(2)}
                          </td>

                          {view === "list" ? (
                            <>
                              <td className="p-5 w-[11%] text-center font-bold whitespace-nowrap">
                                {Number(item.stockQuantity)} /{" "}
                                {Number(item.threshold)}
                              </td>
                              <td className="p-5 w-[9%] text-center whitespace-nowrap">
                                <button
                                  onClick={() => setExpiryModalProduct(item)}
                                  className="inline-flex items-center gap-0.3 px-3 py-1 rounded-lg text-xs font-extrabold text-[#17347a] bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-xs"
                                >
                                  <Calendar size={13} /> View Dates
                                </button>
                              </td>
                              <td className="p-5 w-[6%] text-center whitespace-nowrap">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold text-[#17347a] bg-blue-50 hover:bg-blue-100 transition-colors"
                                >
                                  <Edit3 size={13} /> Edit
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-5 w-[12%] text-center font-bold whitespace-nowrap">
                                {Number(item.stockQuantity)}
                              </td>
                              <td className="p-5 w-[14%] text-center whitespace-nowrap text-gray-500 font-normal">
                                {item.actualCount !== null &&
                                item.actualCount !== undefined ? (
                                  <span className="font-extrabold text-[#17347a] bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 text-sm">
                                    {item.actualCount}
                                  </span>
                                ) : (
                                  <div className="leading-tight text-gray-400 font-medium">
                                    Not counted<br />yet
                                  </div>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}