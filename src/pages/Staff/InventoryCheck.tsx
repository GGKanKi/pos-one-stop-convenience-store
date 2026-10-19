import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, CheckCircle2, ListChecks, X, Check } from "lucide-react";

const API_BASE = "http://localhost/One-Convenience/backend/api";

interface Product {
  id: number;
  productName: string;
  barcode: string;
  description: string | null;
  stockQuantity: number;
  sellingPrice: number | string;
  category: string;
}

export default function InventoryCheck() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [actualStocks, setActualStocks] = useState<Record<string, string>>({});
  const [confirmedBarcodes, setConfirmedBarcodes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSummaryModal, setShowSummaryModal] = useState(false);

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

    // Load existing saved counts if available
    const savedCounts = localStorage.getItem("inventory_actual_counts");
    const savedConfirmed = localStorage.getItem("inventory_confirmed_barcodes");
    if (savedCounts) setActualStocks(JSON.parse(savedCounts));
    if (savedConfirmed) setConfirmedBarcodes(JSON.parse(savedConfirmed));
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

      const mappedProducts: Product[] = rawList.map((item: any) => ({
        id: Number(item.id),
        productName: String(item.productName || item.name || "").trim(),
        barcode: String(item.barcode || item.code || "").trim(),
        description: item.description ? String(item.description).trim() : null,
        stockQuantity: Number(item.stockQuantity ?? item.stock ?? 0),
        sellingPrice: Number(item.sellingPrice || item.price || 0),
        category: String(item.category || "Uncategorized").trim(),
      }));

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
  }, [loadProducts]);

  const displayedItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const pName = product.productName.toLowerCase();
      const pBarcode = product.barcode.toLowerCase();
      const pCategory = product.category.toLowerCase();
      const pDesc = (product.description || "").toLowerCase();

      return (
        pName.includes(query) ||
        pBarcode.includes(query) ||
        pCategory.includes(query) ||
        pDesc.includes(query)
      );
    });
  }, [products, searchTerm]);

  const checkedProducts = useMemo(() => {
    return products.filter((p) => confirmedBarcodes.includes(p.barcode));
  }, [products, confirmedBarcodes]);

  const handleStockChange = (barcode: string, value: string) => {
    const updated = { ...actualStocks, [barcode]: value };
    setActualStocks(updated);
    const updatedConfirmed = confirmedBarcodes.filter((b) => b !== barcode);
    setConfirmedBarcodes(updatedConfirmed);

    localStorage.setItem("inventory_actual_counts", JSON.stringify(updated));
    localStorage.setItem("inventory_confirmed_barcodes", JSON.stringify(updatedConfirmed));
  };

  const handleMarkDone = (barcode: string) => {
    const countVal = actualStocks[barcode];
    if (countVal === undefined || countVal === "") {
      alert("Mangyaring maglagay ng bilang sa Actual Stock bago ipindot ang Done.");
      return;
    }

    if (!confirmedBarcodes.includes(barcode)) {
      const updatedConfirmed = [...confirmedBarcodes, barcode];
      setConfirmedBarcodes(updatedConfirmed);
      localStorage.setItem("inventory_confirmed_barcodes", JSON.stringify(updatedConfirmed));
    }
  };

  const handleComplete = () => {
    if (confirmedBarcodes.length === 0) {
      alert(
        "Mangyaring maglagay ng count at pindutin ang 'Done' para sa kahit isang produkto bago mag-complete."
      );
      return;
    }

    const isConfirmed = window.confirm(
      "Are you sure you want to confirm and go back to POS?"
    );

    if (isConfirmed) {
      navigate("/pos");
    }
  };

  return (
    <div
      className="flex min-h-screen bg-[#cfdcfc] font-sans text-gray-800 antialiased"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <main className="p-6 flex flex-col gap-6 max-w-[1400px] mx-auto text-left w-full">
        <header className="bg-[#17347a] text-white p-3.5 rounded-xl shadow-md border-b-4 border-blue-900">
          <h1 className="text-lg font-extrabold uppercase tracking-wide text-center">
            Inventory Check
          </h1>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white p-4 rounded-[1rem] shadow-sm flex items-center gap-6 border-2 border-gray-100">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search or Scan barcode to find products"
              className="w-full pl-14 pr-10 py-3 bg-gray-50 rounded-full border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all font-medium text-gray-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear Search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-extrabold text-xs uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all"
            >
              <ListChecks size={18} />
              Checked Results ({checkedProducts.length})
            </button>

            <button
              onClick={handleComplete}
              type="button"
              className="flex items-center gap-2 px-9 py-3 rounded-full font-extrabold text-xs uppercase bg-[#17347a] text-white shadow-lg hover:bg-blue-800 active:scale-95 transition-all"
            >
              <FileText size={16} /> Complete Check
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[1rem] shadow-md border-2 border-gray-100 overflow-hidden">
          <div
            className="max-h-[550px] overflow-y-auto overflow-x-auto w-full"
            style={{ scrollbarGutter: "stable" }}
          >
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="bg-[#17347a] text-white font-extrabold uppercase text-[12px] tracking-wider sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="p-5 pl-10 bg-[#17347a]">Product</th>
                  <th className="p-5 bg-[#17347a]">Barcode</th>
                  <th className="p-5 bg-[#17347a]">Description</th>
                  <th className="p-5 bg-[#17347a]">Category</th>
                  <th className="p-5 bg-[#17347a]">Price</th>
                  <th className="p-5 text-center pr-10 bg-[#17347a]">Actual Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50 font-semibold text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                      Loading products from database...
                    </td>
                  </tr>
                ) : displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                      {searchTerm
                        ? `No products found matching "${searchTerm}".`
                        : "No products available in inventory."}
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item, index) => {
                    const isEven = index % 2 === 0;
                    const isDone = confirmedBarcodes.includes(item.barcode);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isDone
                            ? "bg-emerald-50/50 hover:bg-emerald-50"
                            : isEven
                            ? "bg-[#F8FAFC]"
                            : "bg-white"
                        } hover:bg-blue-50/40`}
                      >
                        <td className="p-5 pl-10 font-extrabold text-[#17347a] text-[15px] leading-snug">
                          {item.productName}
                        </td>
                        <td className="p-5 font-mono text-xs font-bold text-blue-900 tracking-wider">
                          {item.barcode}
                        </td>
                        <td className="p-5 text-gray-500 font-medium">
                          {item.description || "—"}
                        </td>
                        <td className="p-5 font-bold text-gray-800">{item.category}</td>
                        <td className="p-5 font-extrabold text-gray-900 whitespace-nowrap">
                          ₱ {Number(item.sellingPrice).toFixed(2)}
                        </td>
                        <td className="p-5 pr-10">
                          <div className="flex items-center justify-center gap-3">
                            <input
                              type="number"
                              min="0"
                              value={actualStocks[item.barcode] || ""}
                              onChange={(e) =>
                                handleStockChange(item.barcode, e.target.value)
                              }
                              placeholder="Enter count"
                              className={`w-[140px] h-[46px] px-4 py-2 rounded-full border-2 text-center text-blue-800 font-bold outline-none transition-all placeholder:text-gray-300 shadow-inner ${
                                isDone
                                  ? "border-emerald-500 bg-white ring-2 ring-emerald-100"
                                  : "border-blue-200 bg-gray-50/50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleMarkDone(item.barcode)}
                              className={`flex items-center gap-1 px-4 py-2.5 rounded-full text-xs font-extrabold uppercase transition-all shadow-sm active:scale-95 ${
                                isDone
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-[#17347a] text-white hover:bg-blue-800"
                              }`}
                            >
                              <Check size={14} />
                              {isDone ? "Done" : "Done"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL / RESULT LIST FOR OKAY / CHECKED PRODUCTS */}
        {showSummaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-[1.5rem] p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2 text-[#17347a]">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                  <h2 className="font-extrabold text-lg">Checked Products Summary</h2>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 border rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#17347a] text-white font-extrabold uppercase sticky top-0">
                    <tr>
                      <th className="p-3 pl-4">Product Name</th>
                      <th className="p-3">Barcode</th>
                      <th className="p-3 text-center">Expected</th>
                      <th className="p-3 text-center">Actual Count</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {checkedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 italic font-medium">
                          No actual count has been entered for any product yet.
                        </td>
                      </tr>
                    ) : (
                      checkedProducts.map((prod) => {
                        const actual = Number(actualStocks[prod.barcode] || 0);
                        const expected = prod.stockQuantity;
                        const isMatch = actual === expected;
                        const diff = actual - expected;

                        return (
                          <tr key={prod.id} className="hover:bg-gray-50">
                            <td className="p-3 pl-4 font-bold text-[#17347a]">
                              {prod.productName}
                            </td>
                            <td className="p-3 font-mono text-gray-500">
                              {prod.barcode}
                            </td>
                            <td className="p-3 text-center text-gray-800 font-bold">
                              {expected}
                            </td>
                            <td className="p-3 text-center text-blue-900 font-black">
                              {actual}
                            </td>
                            <td className="p-3 text-center">
                              {isMatch ? (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  MATCHED
                                </span>
                              ) : (
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black ${
                                    diff < 0
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {diff < 0 ? `SHORT (${diff})` : `OVER (+${diff})`}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t text-xs font-bold text-gray-600">
                <span>
                  Total Checked Items:{" "}
                  <strong className="text-gray-900">{checkedProducts.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="px-6 py-2 bg-[#17347a] text-white text-xs font-extrabold rounded-full hover:bg-blue-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}