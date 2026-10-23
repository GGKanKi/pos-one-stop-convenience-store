import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, CheckCircle2, ListChecks, X, Check, ArrowLeft } from "lucide-react";

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

      const mappedProducts: Product[] = rawList.map((item: Record<string, unknown>) => ({
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
      alert("Input the Actual Stock first");
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
        "Are you sure you want to complete the inventory check without confirming any products? This will discard all entered counts."
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
      className="flex h-screen bg-[#b0c7ff] font-sans text-gray-800 antialiased overflow-hidden p-6"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <main className="p-0 flex flex-col gap-4 max-w-[1400px] mx-auto text-left w-full h-full overflow-hidden">

        {/* Header */}
        <header className="bg-[#122b68] text-white p-3.5 px-6 rounded-2xl shadow-md shrink-0 flex items-center justify-between">
          <button
            onClick={() => navigate("/pos")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs font-extrabold uppercase transition-all shadow-xs"
          >
            <ArrowLeft size={16} />
            <span>POS Terminal</span>
          </button>

          <h1 className="text-lg font-black uppercase tracking-wider text-center flex-1 pr-28 text-white">
            INVENTORY CHECK
          </h1>
        </header>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shrink-0">
            {error}
          </div>
        )}

        {/* Search & Actions Bar - Matching Periwinkle Control Panel Style */}
        <div className="bg-[#adbde6] p-2.5 px-4 rounded-2xl shadow-xs flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search or Scan barcode to find products"
              className="w-full pl-11 pr-10 py-2 bg-white rounded-xl text-gray-900 font-extrabold text-xs outline-none focus:ring-2 focus:ring-blue-600 transition-all"
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

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-extrabold text-xs uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all"
            >
              <ListChecks size={16} />
              Checked Results ({checkedProducts.length})
            </button>

            <button
              onClick={handleComplete}
              type="button"
              className="flex items-center gap-2 px-6 py-2 rounded-xl font-extrabold text-xs uppercase bg-[#122b68] hover:bg-[#1a3880] text-white shadow-xs active:scale-95 transition-all"
            >
              <FileText size={16} /> Complete Check
            </button>
          </div>
        </div>

        {/* Table Container - Solid Navy Banner with White Card Layout */}
        <div className="flex-1 bg-white rounded-2xl shadow-md overflow-hidden min-h-0 flex flex-col">
          <div className="w-full h-full overflow-y-auto overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="bg-[#122b68] text-white font-extrabold uppercase text-[11px] tracking-wider sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Barcode</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6 text-center pr-8">Actual Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-bold text-gray-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-extrabold">
                      Loading products from database...
                    </td>
                  </tr>
                ) : displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-extrabold">
                      {searchTerm
                        ? `No products found matching "${searchTerm}".`
                        : "No products available in inventory."}
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item) => {
                    const isDone = confirmedBarcodes.includes(item.barcode);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isDone
                            ? "bg-emerald-50/60 hover:bg-emerald-50"
                            : "hover:bg-blue-50/80"
                        }`}
                      >
                        <td className="py-3.5 px-6 font-extrabold text-[#122b68]">
                          {item.productName}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-xs font-bold text-gray-600">
                          {item.barcode}
                        </td>
                        <td className="py-3.5 px-6 text-gray-500 font-medium">
                          {item.description || "—"}
                        </td>
                        <td className="py-3.5 px-6 font-extrabold text-gray-800">{item.category}</td>
                        <td className="py-3.5 px-6 font-black text-gray-900 whitespace-nowrap">
                          ₱ {Number(item.sellingPrice).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-6 pr-8">
                          <div className="flex items-center justify-center gap-3">
                            <input
                              type="number"
                              min="0"
                              value={actualStocks[item.barcode] || ""}
                              onChange={(e) =>
                                handleStockChange(item.barcode, e.target.value)
                              }
                              placeholder="Enter count"
                              className={`w-[120px] h-[36px] px-3 rounded-full border-2 text-center text-[#122b68] font-black outline-none transition-all text-xs placeholder:text-gray-300 ${
                                isDone
                                  ? "border-emerald-500 bg-white ring-2 ring-emerald-100"
                                  : "border-blue-200 bg-gray-50/50 focus:border-blue-600 focus:bg-white"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleMarkDone(item.barcode)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase transition-all shadow-xs active:scale-95 ${
                                isDone
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                  : "bg-[#122b68] text-white hover:bg-[#1a3880]"
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

        {/* SUMMARY MODAL - MATCHING THEME */}
        {showSummaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1e47]/70 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2 text-[#122b68]">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                  <h2 className="font-black text-lg uppercase tracking-wide">Checked Products Summary</h2>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#122b68] text-white font-extrabold uppercase text-[11px] sticky top-0">
                    <tr>
                      <th className="p-3 pl-4">Product Name</th>
                      <th className="p-3">Barcode</th>
                      <th className="p-3 text-center">Expected</th>
                      <th className="p-3 text-center">Actual Count</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
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
                            <td className="p-3 pl-4 font-extrabold text-[#122b68]">
                              {prod.productName}
                            </td>
                            <td className="p-3 font-mono text-gray-500">
                              {prod.barcode}
                            </td>
                            <td className="p-3 text-center text-gray-800 font-extrabold">
                              {expected}
                            </td>
                            <td className="p-3 text-center text-[#122b68] font-black">
                              {actual}
                            </td>
                            <td className="p-3 text-center">
                              {isMatch ? (
                                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  MATCHED
                                </span>
                              ) : (
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${
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

              <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-xs font-extrabold text-gray-600">
                <span>
                  Total Checked Items:{" "}
                  <strong className="text-gray-900">{checkedProducts.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="px-6 py-2 bg-[#122b68] text-white text-xs font-black rounded-xl hover:bg-[#1a3880] transition uppercase"
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
