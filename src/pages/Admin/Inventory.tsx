import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { getAuthToken, getAuthUser } from "../../services/authSession";
import { Search, Upload, Edit3, X, Calendar, Plus, Trash2, FileText, ArrowLeft, ClipboardCheck, BarChart2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost/One-Convenience/backend/api";

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
      <label htmlFor={inputId} className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">
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
        className="w-full h-11 px-4 bg-white border border-gray-300 rounded-xl outline-none transition duration-150 placeholder:text-gray-400 text-gray-800 text-xs font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner"
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

function getSessionUser(): { id?: number | string; role?: string; first_name?: string; last_name?: string; email?: string } {
  return getAuthUser();
}

function getInventoryActor(): { id?: number | string; role?: string; first_name?: string; last_name?: string; email?: string } {
  const user = getSessionUser();
  if (Number(sessionStorage.getItem("staffToolsUnlockUntil") || 0) > Date.now()) {
    try {
      const verifiedStaff = JSON.parse(sessionStorage.getItem("staffToolsUser") || "{}");
      if (verifiedStaff.id && verifiedStaff.role === "staff") return verifiedStaff;
    } catch { /* Fall back to the signed-in user. */ }
  }
  return user;
}

function getInventoryAuthToken(): string | undefined {
  if (Number(sessionStorage.getItem("staffToolsUnlockUntil") || 0) > Date.now()) {
    try {
      const verifiedStaff = JSON.parse(sessionStorage.getItem("staffToolsUser") || "{}");
      if (verifiedStaff.role === "staff" && verifiedStaff.id) return sessionStorage.getItem("staffToolsToken") || getAuthToken();
    } catch { /* Use the signed-in account token. */ }
  }
  return getAuthToken();
}

export default function Inventory() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getInventoryActor();
  const currentUserRole = currentUser.role;
  const canEditInventory = currentUserRole === "staff" || currentUserRole === "admin" || currentUserRole === "manager";

  const isFullScreen = location.state?.fullScreen === true;
  const isStaffView = location.state?.staffView === true;
  const hideSidebar = isFullScreen || isStaffView;

  // Enforce staff mode if user is staff or operating under staff views
  const isStaffMode = currentUserRole === "staff" || hideSidebar || isStaffView;

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

  const [stockReasonModalOpen, setStockReasonModalOpen] = useState(false);
  const [stockChangeReason, setStockChangeReason] = useState("");

  // ==========================================
  // HARDWARE SCANNER LISTENER (D-Tech MP6300IR)
  // ==========================================
  const barcodeBufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleGlobalScanKeypress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA") {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = ""; 
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode.length > 1) {
          e.preventDefault();
          setSearchTerm(scannedCode);
        }
        barcodeBufferRef.current = "";
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalScanKeypress, true);
    return () => window.removeEventListener('keydown', handleGlobalScanKeypress, true);
  }, []);

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

      const mappedProducts: Product[] = rawList.map((item: Record<string, unknown>) => {
        const rawExpiry = item.expirationDate || item.expiration_date || null;
        const currentStock = Number(item.stockQuantity ?? item.stock ?? 0);
        const barcode = String(item.barcode || item.code || "").trim();

        let defaultBatches: ExpiryBatch[] = [];
        const batches = item.expiryBatches;
        if (Array.isArray(batches) && batches.every((batch): batch is ExpiryBatch =>
          typeof batch === "object" && batch !== null && "date" in batch && "qty" in batch
        ) && batches.length > 0) {
          defaultBatches = batches;
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
      const user = getInventoryActor();
      const productData = {
        ...formData,
        stockQuantity: Number(formData.stockQuantity),
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        threshold: Number(formData.threshold || 5),
        expirationDate: formData.expirationDate || null,
        supplier: formData.supplier || null,
        description: formData.description || null,
        actor: { 
          id: user.id || null, 
          name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Staff", 
          role: user.role || "staff" 
        },
      };
      
      const token = getInventoryAuthToken();
      const endpoint = isStaffMode ? "submitinventorychange.php" : "addproduct.php";
      const payload = isStaffMode ? { action: "add", product: productData } : productData;

      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
      });

      const data = await response.json();
      if (!response.ok || data.success !== true) {
        throw new Error(data.message || "Could not save the product request.");
      }

      setNotice(
        isStaffMode 
          ? "Product request submitted for Admin approval. It will appear on the Inventory Approvals screen." 
          : "Product added successfully."
      );
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

  const handlePreSaveEditProduct = () => {
    if (!editingProduct) return;

    const newStock = Number(formData.stockQuantity);
    if (newStock !== originalStock) {
      setStockChangeReason("");
      setStockReasonModalOpen(true);
    } else {
      void handleSaveEditProduct();
    }
  };

  const handleSaveEditProduct = async () => {
    if (!editingProduct) return;

    const primaryExpiry = editExpiryBatches[0]?.date || formData.expirationDate || null;
    const newStock = Number(formData.stockQuantity);
    const user = getInventoryActor();

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
      actor: { 
        id: user.id || null, 
        name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Staff", 
        role: user.role || "staff" 
      },
    };

    setSaving(true);
    setError("");
    try {
      const token = getInventoryAuthToken();

      const endpoint = isStaffMode ? "submitinventorychange.php" : "updateproduct.php";
      const payload = isStaffMode
        ? { action: "update", product: updatedProductData }
        : updatedProductData;

      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
      });

      const data = await response.json();
      if (!response.ok || data.success !== true) throw new Error(data.message || "Failed to update product details.");

      setNotice(
        isStaffMode
          ? "Stock change request sent to Admin for approval. It will appear on the Inventory Approvals screen."
          : "Product details updated successfully."
      );
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
      {!hideSidebar && <Sidebar />}

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto text-left">
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            {view === "check" ? "Manual Count Log" : "Inventory Management"}
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                navigate("/admin/dashboard", {
                  state: { fullScreen: isFullScreen, staffView: isStaffView },
                })
              }
              className="flex items-center gap-2 rounded-full bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-emerald-500 transition shadow-sm active:scale-95 cursor-pointer"
            >
              <BarChart2 size={14} /> STORE ANALYTICS
            </button>

            {hideSidebar && (
              <button
                type="button"
                onClick={() => navigate("/pos")}
                className="flex items-center gap-2 rounded-full bg-white text-[#17347a] px-4 py-1.5 text-xs font-bold hover:bg-gray-100 transition shadow-sm active:scale-95 cursor-pointer"
              >
                <ArrowLeft size={14} /> BACK TO POS
              </button>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 shadow-xs">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-xs font-bold text-green-700 shadow-xs">
            {notice}
          </div>
        )}
        {isStaffMode && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 shadow-xs">
            Notice: You are operating in Staff mode. All stock changes and product additions will be submitted to Admin for approval.
          </div>
        )}

        <div className="bg-[#b0c8fa] p-4 rounded-2xl shadow-lg border border-black/10 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Scan barcode with scanner or search product name..."
              className="w-full pl-9 pr-8 py-2 bg-white text-gray-800 text-xs font-medium rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {view === "list" ? (
              <>
                <button
                  type="button"
                  onClick={() => setNotice("Excel import feature ready.")}
                  className="px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-[#17347a] text-white shadow-md hover:bg-[#0f2456] active:scale-95 transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <Upload size={14} />
                  Import Product
                </button>

                {canEditInventory && (
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setNotice("");
                      setFormData(emptyForm);
                      setShowAdd(true);
                    }}
                    className="px-5 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-blue-600 text-white shadow-md hover:bg-blue-500 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    Add Product
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    navigate("/staff/inventorycheck", {
                      state: { fullScreen: isFullScreen, staffView: isStaffView },
                    })
                  }
                  className="px-5 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-emerald-600 text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ClipboardCheck size={14} />
                  Inventory Check
                </button>

                <button
                  type="button"
                  onClick={() => setView("check")}
                  className="px-5 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-amber-500 text-white shadow-md hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={14} />
                  Manual Count Log
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-5 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-[#17347a] text-white shadow-md hover:bg-[#0f2456] active:scale-95 transition-all cursor-pointer"
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
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md w-full flex flex-col gap-5"
          >
            <div className="bg-[#17347a] text-white px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-between">
              <span>Create New Inventory Record</span>
              <button type="button" onClick={() => setShowAdd(false)} className="text-blue-200 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                <InputField label="Product Name" name="productName" value={formData.productName} onChange={handleInputChange} />
                <InputField label="Barcode" name="barcode" value={formData.barcode} onChange={handleInputChange} />
                <InputField label="Description" name="description" value={formData.description} onChange={handleInputChange} />
              </div>
              <div className="flex flex-wrap gap-4">
                <InputField label="Stock Quantity" name="stockQuantity" type="number" value={formData.stockQuantity} onChange={handleInputChange} />
                <InputField label="Cost Price" name="costPrice" type="number" value={formData.costPrice} onChange={handleInputChange} />
                <InputField label="Selling Price" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} />
              </div>
              <div className="flex flex-wrap gap-4">
                <InputField label="Category" name="category" value={formData.category} onChange={handleInputChange} />
                <InputField label="Supplier" name="supplier" value={formData.supplier} onChange={handleInputChange} />
              </div>
              <div className="flex flex-wrap gap-4">
                <InputField label="Expiration Date" name="expirationDate" type="date" value={formData.expirationDate} onChange={handleInputChange} />
                <InputField label="Low Stock Threshold for Replenishment" name="threshold" type="number" value={formData.threshold} onChange={handleInputChange} />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-6 py-2 rounded-xl font-bold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 transition active:scale-95 border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-xl font-extrabold text-xs text-white uppercase tracking-wider bg-blue-600 hover:bg-blue-500 shadow-md transition active:scale-95 disabled:opacity-60"
              >
                {saving ? "Submitting..." : isStaffMode ? "Submit for Approval" : "Add Product"}
              </button>
            </div>
          </form>
        )}

        {/* EXPIRY DATES VIEW MODAL */}
        {expiryModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2 text-[#17347a]">
                  <Calendar size={18} />
                  <h2 className="font-extrabold text-sm uppercase tracking-wider">
                    Expiration Dates Batch
                  </h2>
                </div>
                <button onClick={() => setExpiryModalProduct(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div>
                <p className="font-extrabold text-sm text-[#17347a]">{expiryModalProduct.productName}</p>
                <p className="text-[11px] font-mono text-gray-500 mt-0.5">Barcode: {expiryModalProduct.barcode}</p>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#17347a] text-white font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2.5">Expiry Date</th>
                      <th className="p-2.5 text-right">Batch Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {modalBatchesToDisplay.length > 0 ? (
                      modalBatchesToDisplay.map((batch, i) => (
                        <tr key={i} className="hover:bg-blue-50/40">
                          <td className="p-2.5 font-mono text-gray-600">{batch.date || "No Expiry Date"}</td>
                          <td className="p-2.5 text-right font-extrabold text-gray-900">{batch.qty} pcs</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-gray-400 italic">No expiration dates recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setExpiryModalProduct(null)}
                  className="px-5 py-1.5 bg-[#17347a] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition active:scale-95"
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
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                <h2 className="font-extrabold text-[#17347a] text-sm uppercase tracking-wider flex items-center gap-2">
                  <Edit3 size={16} /> Edit Product Details
                </h2>
                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <InputField label="Product Name" name="productName" value={formData.productName} onChange={handleInputChange} />
                <InputField label="Barcode" name="barcode" value={formData.barcode} onChange={handleInputChange} />
                <InputField label="Cost Price" name="costPrice" type="number" value={formData.costPrice} onChange={handleInputChange} />
                <InputField label="Selling Price" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} />
                <InputField label="Category" name="category" value={formData.category} onChange={handleInputChange} />
                <InputField label="Threshold" name="threshold" type="number" value={formData.threshold} onChange={handleInputChange} />
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleAddBatch}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-200"
                  >
                    <Plus size={13} /> Add Expiry Date
                  </button>
                </div>

                {editExpiryBatches.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No expiry date batches assigned yet. Click "Add Expiry Date" to add one.</p>
                ) : (
                  <div className="space-y-2">
                    {editExpiryBatches.map((batch, index) => (
                      <div key={index} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                        <div className="flex-1">
                          <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-0.5">Expiry Date</label>
                          <input
                            type="date"
                            value={batch.date}
                            onChange={(e) => handleBatchChange(index, "date", e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border rounded-lg outline-none focus:border-blue-500 font-mono bg-white"
                          />
                        </div>
                        <div className="w-28">
                          <label className="text-[10px] font-extrabold uppercase text-gray-500 block mb-0.5">Quantity</label>
                          <input
                            type="number"
                            min="0"
                            value={batch.qty}
                            onChange={(e) => handleBatchChange(index, "qty", Number(e.target.value))}
                            className="w-full px-2.5 py-1 text-xs border rounded-lg outline-none focus:border-blue-500 font-bold bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBatch(index)}
                          className="text-red-500 hover:text-red-700 p-1.5 mt-3 transition"
                          title="Remove batch"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-1.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-50 transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePreSaveEditProduct}
                  className="px-5 py-1.5 bg-blue-600 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-blue-500 shadow-md transition active:scale-95"
                >
                  {isStaffMode ? "Submit for Approval" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REASON MODAL FOR STOCK ADJUSTMENT */}
        {stockReasonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2 text-[#17347a]">
                  <FileText size={20} />
                  <h2 className="font-extrabold text-xs uppercase tracking-wider">Reason for Stock Change</h2>
                </div>
                <button onClick={() => setStockReasonModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700">
                  Stock quantity for <span className="text-blue-700 font-extrabold">{editingProduct?.productName}</span> changed from{" "}
                  <span className="font-extrabold text-red-600">{originalStock}</span> to{" "}
                  <span className="font-extrabold text-emerald-600">{formData.stockQuantity}</span>.
                </p>
                <label className="text-[11px] font-semibold text-gray-600 block">
                  Please enter a reason or description for this stock adjustment:
                </label>
                <textarea
                  rows={4}
                  value={stockChangeReason}
                  onChange={(e) => setStockChangeReason(e.target.value)}
                  placeholder="e.g. Received new shipment, Damaged stock removal, Inventory correction..."
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200 font-medium"
                  required
                />
                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStockReasonModalOpen(false)}
                  className="px-4 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition active:scale-95"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!stockChangeReason.trim() || saving}
                  onClick={handleSaveEditProduct}
                  className="px-5 py-1.5 bg-[#17347a] text-white text-xs font-extrabold uppercase tracking-wider rounded-xl hover:bg-blue-900 shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Saving..." : isStaffMode ? "Confirm & Submit Request" : "Confirm & Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN DATA TABLE */}
        {!showAdd && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden w-full flex flex-col">
            <div className="max-h-[500px] overflow-y-auto overflow-x-auto w-full" style={{ scrollbarGutter: "stable" }}>
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#17347a] text-white font-bold uppercase text-[11px] tracking-wider sticky top-0 z-20 shadow-sm">
                  {view === "list" ? (
                    <tr>
                      <th className="py-3 px-4 border-b border-blue-900 w-[24%]">Product</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[14%]">Barcode</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[16%]">Category</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[10%]">Cost Price</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[10%]">Selling Price</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[11%] text-center">Stock / Threshold</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[9%] text-center">Expiry Dates</th>
                      {canEditInventory && <th className="py-3 px-4 border-b border-blue-900 w-[6%] text-center">Action</th>}
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-3 px-4 border-b border-blue-900 w-[24%]">Product</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[14%]">Barcode</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[16%]">Category</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[10%]">Cost Price</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[10%]">Selling Price</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[12%] text-center">Expected Stock</th>
                      <th className="py-3 px-4 border-b border-blue-900 w-[14%] text-center">Actual Count</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={view === "list" ? 8 : 7} className="p-12 text-center text-gray-400 italic">
                        Loading products from database...
                      </td>
                    </tr>
                  ) : displayedItems.length === 0 ? (
                    <tr>
                      <td colSpan={view === "list" ? 8 : 7} className="p-12 text-center text-gray-400 italic">
                        {isSearching ? `No products found matching "${searchTerm}".` : "No products available in inventory."}
                      </td>
                    </tr>
                  ) : (
                    displayedItems.map((item, index) => {
                      const isEven = index % 2 === 0;
                      return (
                        <tr key={item.id} className={`transition-colors ${isEven ? "bg-white" : "bg-blue-50/40"} hover:bg-blue-100/50`}>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-800 leading-snug break-words">{item.productName}</div>
                            {item.description && (
                              <div className="mt-0.5 text-[11px] text-gray-500 break-words leading-tight">{item.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-500 break-all">{item.barcode}</td>
                          <td className="py-3 px-4 font-semibold text-gray-800 break-words">{item.category}</td>
                          <td className="py-3 px-4 font-bold text-gray-600 whitespace-nowrap">₱ {Number(item.costPrice).toFixed(2)}</td>
                          <td className="py-3 px-4 font-bold text-gray-800 whitespace-nowrap">₱ {Number(item.sellingPrice).toFixed(2)}</td>

                          {view === "list" ? (
                            <>
                              <td className="py-3 px-4 text-center font-bold whitespace-nowrap">
                                <span className={Number(item.stockQuantity) <= Number(item.threshold) ? "text-red-600 font-black" : "text-gray-800"}>
                                  {Number(item.stockQuantity)}
                                </span>{" "}
                                / <span className="text-gray-400 font-semibold">{Number(item.threshold)}</span>
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <button
                                  onClick={() => setExpiryModalProduct(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition shadow-xs active:scale-95"
                                >
                                  <Calendar size={12} /> View Dates
                                </button>
                              </td>
                              {canEditInventory && (
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-[#17347a] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95"
                                  >
                                    <Edit3 size={12} /> Edit
                                  </button>
                                </td>
                              )}
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-4 text-center font-bold whitespace-nowrap">{Number(item.stockQuantity)}</td>
                              <td className="py-3 px-4 text-center whitespace-nowrap text-gray-500 font-normal">
                                {item.actualCount !== null && item.actualCount !== undefined ? (
                                  <span className="font-extrabold text-[#17347a] bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-300 text-xs">
                                    {item.actualCount}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-[11px]">Not counted</span>
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