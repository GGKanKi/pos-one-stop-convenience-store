import { useEffect, useState, useCallback } from "react";
import {
  type LucideIcon,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Award,
  ArrowLeft,
  Clock,
  RefreshCw,
  ChevronRight,
  ShoppingCart,
  CheckCircle2,
  Package,
  X,
  Calendar,
  Square,
  CheckSquare,
  Search,
  Plus,
  WalletCards,
  Truck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import StaffAttendanceControl from "../../components/StaffAttendanceControl";
import { getActiveStaffUser } from "../../services/authSession";
import { apiRequest } from "../../services/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost/One-Convenience/backend/api";

type LowStockItem = {
  id: number;
  name: string;
  barcode: string;
  stockQuantity: number;
  threshold: number;
};

type AllProductItem = {
  id: number;
  name: string;
  barcode: string;
  stockQuantity: number;
  threshold: number;
};

type ApprovedRestockItem = {
  id: number;
  product_id: number;
  productName: string;
  barcode: string;
  approvedQty: number;
  approvedAt: string;
};

type DashboardData = {
  grossSales: number;
  netProfit: number;
  profitEstimated: boolean;
  salesTrend: { date: string; sales: number }[];
  bestSeller: { id: number; name: string; quantity: number } | null;
  topProducts: { id: number; name: string; quantity: number }[];
  lowStock: LowStockItem[];
  approvedRestocks?: ApprovedRestockItem[];
  latestInventoryTransactions: { id: number; action: string; product: string; description: string; user: string; date: string }[];
};

function localDateValue(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const money = (amount: number) => `₱${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const timeLabel = (value: string) => new Date(value.replace(" ", "T")).toLocaleString([], { dateStyle: "short", timeStyle: "short" });

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const isFullScreen = location.state?.fullScreen;
  const isStaffView = location.state?.staffView === true;
  const currentUser = getActiveStaffUser();
  const hasStaffAttendance = Boolean(currentUser.id);

  const role = currentUser.role?.toLowerCase() || "";
  const isAdmin = role === "admin" || role === "manager" || (!isStaffView && !isFullScreen && role !== "staff");
  const hideSidebar = !isAdmin || isFullScreen || isStaffView;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [refreshKey, setRefreshKey] = useState(0);

  const [restockSearch, setRestockSearch] = useState("");
  const [approvedSearch, setApprovedSearch] = useState("");

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [allProductsList, setAllProductsList] = useState<AllProductItem[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [loadingAllProducts, setLoadingAllProducts] = useState(false);

  const [restockQuantities, setRestockQuantities] = useState<Record<number, number>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const [selectedApprovedIds, setSelectedApprovedIds] = useState<number[]>([]);
  const [receivingBulk, setReceivingBulk] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<number, number>>({});
  const [itemExpirationDates, setItemExpirationDates] = useState<Record<number, string>>({});

  // TWO-STEP MODAL STATES & BATCH / RECEIPT NO
  const [isBulkReceiveModalOpen, setIsBulkReceiveModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [deliverySource, setDeliverySource] = useState("");
  const [receiptNo, setReceiptNo] = useState(""); // <--- for receipt
  const [receiptTotal, setReceiptTotal] = useState("");

  useEffect(() => {
    const fontId = "google-font-inter";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE}/getdashboard.php?date=${localDateValue()}&trendDays=${trendDays}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load dashboard data.");
        
        const dashboardResult = result as DashboardData;
        setData(dashboardResult);

        const initialQtyMap: Record<number, number> = {};
        (dashboardResult.lowStock || []).forEach((item) => {
          const defaultReorder = Math.max(1, item.threshold - item.stockQuantity);
          initialQtyMap[item.id] = defaultReorder;
        });
        setRestockQuantities(initialQtyMap);

        const initialReceivedMap: Record<number, number> = {};
        (dashboardResult.approvedRestocks || []).forEach((item) => {
          initialReceivedMap[item.id] = item.approvedQty;
        });
        setReceivedQuantities(initialReceivedMap);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadDashboard();
    return () => controller.abort();
  }, [trendDays, refreshKey]);

  const fetchAllInventoryProducts = useCallback(async () => {
    setLoadingAllProducts(true);
    try {
      const response = await fetch(`${API_BASE}/getproducts.php`);
      const result = await response.json();
      const productArray = Array.isArray(result) ? result : (result.products || result.data || []);
      setAllProductsList(
        productArray.map((p: any) => ({
          id: Number(p.id),
          name: p.productName || p.name,
          barcode: p.barcode || p.code || "",
          stockQuantity: Number(p.stockQuantity ?? p.stock ?? 0),
          threshold: Number(p.threshold ?? 10),
        }))
      );
    } catch (err) {
      console.error("Failed to load inventory products:", err);
    } finally {
      setLoadingAllProducts(false);
    }
  }, []);

  const handleOpenSearchModal = () => {
    setIsSearchModalOpen(true);
    if (allProductsList.length === 0) {
      void fetchAllInventoryProducts();
    }
  };

  const handleAddProductToRestockList = (product: AllProductItem) => {
    if (!data) return;
    const exists = data.lowStock.some((item) => item.id === product.id);
    if (!exists) {
      setData({
        ...data,
        lowStock: [product, ...data.lowStock],
      });
      setRestockQuantities((prev) => ({
        ...prev,
        [product.id]: Math.max(1, product.threshold - product.stockQuantity || 10),
      }));
      setNotice(`Added "${product.name}" to the restock attention list.`);
    } else {
      setNotice(`"${product.name}" is already in the restock list.`);
    }
    setIsSearchModalOpen(false);
  };

  const filteredLowStock = (data?.lowStock || []).filter((item) =>
    item.name.toLowerCase().includes(restockSearch.toLowerCase()) ||
    item.barcode.toLowerCase().includes(restockSearch.toLowerCase())
  );

  const filteredApprovedRestocks = (data?.approvedRestocks || []).filter((item) =>
    item.productName.toLowerCase().includes(approvedSearch.toLowerCase()) ||
    item.barcode.toLowerCase().includes(approvedSearch.toLowerCase())
  );

  const filteredAllProducts = allProductsList.filter((item) =>
    item.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
    item.barcode.toLowerCase().includes(modalSearchTerm.toLowerCase())
  );

  const toggleSelectAllRestock = () => {
    if (!filteredLowStock.length) return;
    const filteredIds = filteredLowStock.map((item) => item.id);
    const allSelected = filteredIds.every((id) => selectedItemIds.includes(id));
    if (allSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectRestockItem = (id: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkRequestRestock = async () => {
    if (selectedItemIds.length === 0 || !data?.lowStock) return;
    setSubmittingBulk(true);
    setError("");
    setNotice("");
    try {
      const user = getActiveStaffUser();
      const actor = { id: user.id || null, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Staff" };
      const selectedProducts = data.lowStock.filter((p) => selectedItemIds.includes(p.id));
      
      for (const product of selectedProducts) {
        const qtyToBuy = restockQuantities[product.id] || Math.max(1, product.threshold - product.stockQuantity);
        await apiRequest("/submitinventorychange.php", "POST", {
          action: "restock",
          product: {
            id: product.id,
            productName: product.name,
            barcode: product.barcode,
            stockQuantity: product.stockQuantity,
            restockQty: qtyToBuy,
            actor,
          },
        });
      }

      setNotice(`Successfully submitted restock requests for ${selectedProducts.length} items!`);
      setSelectedItemIds([]);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit bulk restock requests.");
    } finally {
      setSubmittingBulk(false);
    }
  };

  const toggleSelectAllApproved = () => {
    if (!filteredApprovedRestocks.length) return;
    const filteredIds = filteredApprovedRestocks.map((item) => item.id);
    const allSelected = filteredIds.every((id) => selectedApprovedIds.includes(id));
    if (allSelected) {
      setSelectedApprovedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedApprovedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectApprovedItem = (id: number) => {
    setSelectedApprovedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // STEP 1 PROCEED TO SOURCE MODAL
  const handleProceedToSourceModal = () => {
    if (selectedApprovedIds.length === 0) return;
    setIsBulkReceiveModalOpen(false);
    setDeliverySource("");
    setReceiptNo("");
    setReceiptTotal("");
    setIsSourceModalOpen(true);
  };

  // STEP 2 FINAL SUBMIT TO INVENTORY & DELIVERY
  const handleFinalReceiveRestock = async () => {
    if (!deliverySource.trim() || !receiptTotal) {
      setError("Please provide the delivery source and receipt total.");
      return;
    }

    setReceivingBulk(true);
    setIsSourceModalOpen(false);
    setError("");
    setNotice("");

    try {
      const user = getActiveStaffUser();
      const staffName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Staff";
      const selectedOrders = data?.approvedRestocks?.filter((o) => selectedApprovedIds.includes(o.id)) || [];

      const payloadItems = selectedOrders.map((order) => ({
        request_id: order.id,
        actual_qty: receivedQuantities[order.id] ?? order.approvedQty,
        expiration_date: itemExpirationDates[order.id] || null,
      }));

      await apiRequest("/receiverestock.php", "POST", {
        items: payloadItems,
        source: deliverySource,
        receipt_no: receiptNo, // <--- Isinama ang receipt number/batch ID
        receipt_total: Number(receiptTotal),
        staff_name: staffName,
      });

      setNotice(`Successfully received ${selectedOrders.length} items into inventory and recorded delivery!`);
      setSelectedApprovedIds([]);
      setReceiptNo("");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive selected restock orders.");
    } finally {
      setReceivingBulk(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#cfdcfc] text-slate-800 antialiased relative" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {!hideSidebar && <Sidebar />}

      <main className="flex-1 p-6 flex flex-col gap-5 text-left overflow-x-hidden">
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            {!isAdmin ? "Store Analytics" : "Dashboard"}
          </h1>

          <div className="flex items-center gap-2 mr-1">
            <button
              type="button"
              onClick={() => navigate("/admin/inventory")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md cursor-pointer"
            >
              <Package size={14} />
              <span className="hidden sm:inline">Inventory</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/payouts", { state: { fullScreen: true } })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md cursor-pointer"
            >
              <WalletCards size={14} />
              <span className="hidden sm:inline">Payout</span>
            </button>

            <button 
              type="button" 
              onClick={() => setRefreshKey((key) => key + 1)} 
              disabled={loading} 
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md disabled:opacity-60 cursor-pointer" 
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> 
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {(isFullScreen || isStaffView) && (
              <button 
                onClick={() => navigate("/pos")} 
                className="flex items-center gap-2 rounded-full bg-white text-[#17347a] px-4 py-1.5 text-xs font-bold hover:bg-gray-100 transition shadow-sm active:scale-95 cursor-pointer" 
                type="button"
              >
                <ArrowLeft size={14} /> BACK TO POS
              </button>
            )}
          </div>
        </header>

        {hasStaffAttendance && <StaffAttendanceControl />}

        {notice && <div role="status" className="bg-green-50 text-green-800 border border-green-200 rounded-xl px-4 py-3 text-xs font-bold shadow-xs">{notice}</div>}
        {error && <div role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold shadow-xs">{error}</div>}

        {/* RESTOCK ATTENTION SECTION */}
        <section className="bg-white rounded-2xl shadow-md border border-red-200 overflow-hidden">
          <div className="bg-red-700 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-800 text-red-100">
                <AlertCircle size={18} />
              </span>
              <div>
                <h2 className="font-extrabold tracking-tight text-white text-sm uppercase">Restock Attention</h2>
                <p className="text-[11px] text-red-100 font-medium">
                  {isAdmin ? "Products at or below their restock threshold" : "Select items using checkboxes and submit restock orders."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-800/60" />
                <input
                  type="text"
                  placeholder="Search product or barcode..."
                  value={restockSearch}
                  onChange={(e) => setRestockSearch(e.target.value)}
                  className="w-full bg-white text-gray-800 text-xs font-bold pl-8 pr-7 py-1.5 rounded-lg border border-red-600 shadow-inner"
                />
              </div>

              {!isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenSearchModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white text-red-800 hover:bg-red-50 px-3 py-1.5 text-xs font-extrabold uppercase transition shadow-md cursor-pointer"
                >
                  <Plus size={14} /> Search & Add Product
                </button>
              )}

              {!isAdmin && selectedItemIds.length > 0 && (
                <button
                  type="button"
                  disabled={submittingBulk}
                  onClick={() => void handleBulkRequestRestock()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-extrabold uppercase transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  <ShoppingCart size={13} />
                  {submittingBulk ? "Requesting..." : `Request Selected (${selectedItemIds.length})`}
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {loading ? (
              <p className="py-8 text-center text-xs text-gray-400 italic">Checking stock levels…</p>
            ) : filteredLowStock.length === 0 ? (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-8 text-center text-xs text-gray-500 italic">
                No low stock products match your search.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-700 font-extrabold uppercase text-[11px] sticky top-0 border-b z-10">
                    <tr>
                      {!isAdmin && (
                        <th className="py-3 px-3 w-10 text-center">
                          <button type="button" onClick={toggleSelectAllRestock} className="cursor-pointer">
                            {filteredLowStock.length > 0 && filteredLowStock.every((item) => selectedItemIds.includes(item.id)) ? (
                              <CheckSquare size={16} className="text-red-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-3">Barcode</th>
                      <th className="py-3 px-3 text-center">Current Stock</th>
                      <th className="py-3 px-3 text-center">Min Threshold</th>
                      {!isAdmin && <th className="py-3 px-3 text-center w-32">Qty to Buy</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {filteredLowStock.map((product) => {
                      const isSelected = selectedItemIds.includes(product.id);
                      const currentBuyQty = restockQuantities[product.id] ?? Math.max(1, product.threshold - product.stockQuantity);
                      return (
                        <tr key={product.id} className={`hover:bg-red-50/40 transition ${isSelected ? "bg-red-50/60" : ""}`}>
                          {!isAdmin && (
                            <td className="py-3 px-3 text-center">
                              <button type="button" onClick={() => toggleSelectRestockItem(product.id)} className="cursor-pointer">
                                {isSelected ? <CheckSquare size={16} className="text-red-600" /> : <Square size={16} />}
                              </button>
                            </td>
                          )}
                          <td className="py-3 px-4 font-bold text-gray-900">{product.name}</td>
                          <td className="py-3 px-3 font-mono text-gray-500 text-[11px]">{product.barcode}</td>
                          <td className="py-3 px-3 text-center font-black text-red-600">{product.stockQuantity}</td>
                          <td className="py-3 px-3 text-center font-semibold text-gray-500">{product.threshold}</td>
                          {!isAdmin && (
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={currentBuyQty}
                                onChange={(e) =>
                                  setRestockQuantities((prev) => ({
                                    ...prev,
                                    [product.id]: Math.max(1, Number(e.target.value)),
                                  }))
                                }
                                className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-xs font-bold text-center bg-white shadow-inner"
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* APPROVED RESTOCK ORDERS */}
        {data?.approvedRestocks && data.approvedRestocks.length > 0 && (
          <section className="bg-white rounded-2xl shadow-md border border-emerald-200 overflow-hidden">
            <div className="bg-emerald-700 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-800 text-emerald-100">
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <h2 className="font-extrabold tracking-tight text-white text-sm uppercase">Approved Restock Orders (To Be Bought)</h2>
                  <p className="text-[11px] text-emerald-100 font-medium">Select received items and click receive to add into inventory</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/60" />
                  <input
                    type="text"
                    placeholder="Search approved product..."
                    value={approvedSearch}
                    onChange={(e) => setApprovedSearch(e.target.value)}
                    className="w-full bg-white text-gray-800 text-xs font-bold pl-8 pr-7 py-1.5 rounded-lg border border-emerald-600 shadow-inner"
                  />
                </div>

                {!isAdmin && (
                  <button
                    type="button"
                    disabled={receivingBulk || selectedApprovedIds.length === 0}
                    onClick={() => setIsBulkReceiveModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white text-emerald-800 hover:bg-emerald-50 px-3.5 py-1.5 text-xs font-extrabold uppercase transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    {receivingBulk ? "Receiving..." : `Receive Selected (${selectedApprovedIds.length})`}
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-700 font-extrabold uppercase text-[11px] sticky top-0 border-b z-10">
                    <tr>
                      {!isAdmin && (
                        <th className="py-3 px-3 w-10 text-center">
                          <button type="button" onClick={toggleSelectAllApproved} className="cursor-pointer">
                            {filteredApprovedRestocks.length > 0 && filteredApprovedRestocks.every((item) => selectedApprovedIds.includes(item.id)) ? (
                              <CheckSquare size={16} className="text-emerald-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-3">Barcode</th>
                      <th className="py-3 px-3 text-center">Approved Qty</th>
                      {!isAdmin && <th className="py-3 px-3 text-center w-36">Received Qty</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {filteredApprovedRestocks.map((item) => {
                      const isSelected = selectedApprovedIds.includes(item.id);
                      const currentReceivedQty = receivedQuantities[item.id] ?? item.approvedQty;
                      return (
                        <tr key={item.id} className={`hover:bg-emerald-50/40 transition ${isSelected ? "bg-emerald-50/60" : ""}`}>
                          {!isAdmin && (
                            <td className="py-3 px-3 text-center">
                              <button type="button" onClick={() => toggleSelectApprovedItem(item.id)} className="cursor-pointer">
                                {isSelected ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                              </button>
                            </td>
                          )}
                          <td className="py-3 px-4 font-bold text-gray-900">{item.productName}</td>
                          <td className="py-3 px-3 font-mono text-gray-500 text-[11px]">{item.barcode}</td>
                          <td className="py-3 px-3 text-center font-black text-emerald-700">{item.approvedQty} pcs</td>
                          {!isAdmin && (
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={currentReceivedQty}
                                onChange={(e) =>
                                  setReceivedQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: Math.max(1, Number(e.target.value)),
                                  }))
                                }
                                className="w-20 px-2 py-1 border border-emerald-300 rounded-lg text-xs font-bold text-center bg-white shadow-inner"
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* STAT CARDS */}
        <section>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatCard label="Gross Sales" value={loading ? "—" : money(data?.grossSales || 0)} Icon={TrendingUp} tone="red" />
            <StatCard label="Net Profit" value={loading ? "—" : money(data?.netProfit || 0)} detail={data?.profitEstimated ? "Older sales use current product cost" : "After product costs"} Icon={DollarSign} tone="sky" />
            <StatCard label="Best Seller" value={loading ? "—" : data?.bestSeller?.name || "No sales yet"} detail={data?.bestSeller ? `${data.bestSeller.quantity} units sold today` : "No completed sales yet"} Icon={Award} tone="amber" />
          </div>
        </section>

        {/* SALES TREND SECTION */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-[#17347a] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-sm uppercase tracking-wider">Sales Trend</h2>
              <p className="text-[11px] text-blue-200">Gross sales overview by day</p>
            </div>
            <div className="inline-flex rounded-xl bg-[#132a63] p-1 border border-white/10" role="group" aria-label="Sales trend range">
              {([7, 30] as const).map((days) => (
                <button 
                  key={days} 
                  type="button" 
                  onClick={() => setTrendDays(days)} 
                  aria-pressed={trendDays === days} 
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${trendDays === days ? "bg-white text-[#17347a] shadow-md" : "text-blue-200 hover:text-white"}`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <p className="py-12 text-center text-xs text-gray-400 italic">Loading sales trend…</p>
            ) : data?.salesTrend?.length ? (
              <SalesTrendChart points={data.salesTrend} />
            ) : (
              <p className="py-12 text-center text-xs text-gray-400 italic">No sales data available</p>
            )}
          </div>
        </section>

        {/* BOTTOM GRID */}
        <div className="grid grid-cols-1 gap-5 pb-6 xl:grid-cols-2">
          <section className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-[#17347a] text-white px-5 py-3 border-b border-blue-900">
              <h3 className="font-extrabold text-xs uppercase tracking-wider">Top Selling Products</h3>
              <p className="text-[10px] text-blue-200">Ranked by units sold today</p>
            </div>
            <div className="min-h-36 p-4">
              {loading ? (
                <p className="p-8 text-center text-xs text-gray-400 italic">Loading sales…</p>
              ) : !data?.topProducts.length ? (
                <p className="p-8 text-center text-xs text-gray-400 italic">No products sold today</p>
              ) : (
                <TopProductsChart products={data.topProducts} />
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-[#17347a] text-white px-5 py-3 border-b border-blue-900">
              <h3 className="font-extrabold text-xs uppercase tracking-wider">Recent Inventory Activity</h3>
              <p className="text-[10px] text-blue-200">Latest recorded stock changes</p>
            </div>
            <div className="min-h-36">
              {loading ? (
                <p className="p-8 text-center text-xs text-gray-400 italic">Loading inventory activity…</p>
              ) : !data?.latestInventoryTransactions.length ? (
                <p className="p-8 text-center text-xs text-gray-400 italic">No inventory changes recorded yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data.latestInventoryTransactions.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-1 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between hover:bg-blue-50/40 transition">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-800" title={entry.description}>{entry.description}</p>
                        <p className="text-[11px] text-gray-500">{entry.action} <span className="px-1 text-gray-300">·</span> {entry.user}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-gray-400">
                        <Clock size={12} />{timeLabel(entry.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* SEARCH AND ADD PRODUCT MODAL */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 text-left relative flex flex-col max-h-[85vh]">
            <button onClick={() => setIsSearchModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer" type="button">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Search size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Search Product to Restock</h3>
                <p className="text-xs text-gray-500 font-medium">Select any product from inventory to add to restock list</p>
              </div>
            </div>

            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search inventory by name or barcode..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                className="w-full bg-gray-50 text-gray-800 text-xs font-bold pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 shadow-inner"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl max-h-[360px] divide-y divide-gray-100">
              {loadingAllProducts ? (
                <p className="py-12 text-center text-xs text-gray-400 italic">Loading inventory products...</p>
              ) : filteredAllProducts.length === 0 ? (
                <p className="py-12 text-center text-xs text-gray-400 italic">No products found matching "{modalSearchTerm}".</p>
              ) : (
                filteredAllProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 hover:bg-red-50/50 transition">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
                      <p className="text-[11px] text-gray-500 font-mono">{product.barcode} · Stock: <span className="font-bold text-red-700">{product.stockQuantity}</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddProductToRestockList(product)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-[11px] font-extrabold uppercase cursor-pointer shadow-xs shrink-0"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-gray-100 flex justify-end">
              <button type="button" onClick={() => setIsSearchModalOpen(false)} className="px-4 py-2 rounded-xl border bg-white text-xs font-bold cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EXPIRATION DATE & QUANTITY PER ITEM */}
      {isBulkReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full p-6 text-left relative flex flex-col max-h-[85vh]">
            <button onClick={() => setIsBulkReceiveModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer" type="button">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Step 1: Expiry & Quantities</h3>
                <p className="text-xs text-gray-500 font-medium">Set expiration dates for {selectedApprovedIds.length} selected item(s)</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-3 max-h-[420px] pr-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Products & Expiration Dates:</label>
              {data?.approvedRestocks?.filter((item) => selectedApprovedIds.includes(item.id)).map((item) => {
                const qty = receivedQuantities[item.id] ?? item.approvedQty;
                return (
                  <div key={item.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.productName}</p>
                      <p className="text-[11px] text-emerald-700 font-black mt-0.5">Quantity: {qty} pcs</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          value={itemExpirationDates[item.id] || ""}
                          onChange={(e) => setItemExpirationDates((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono bg-white shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setIsBulkReceiveModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border bg-white text-xs font-bold cursor-pointer">Cancel</button>
              <button type="button" onClick={handleProceedToSourceModal} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer shadow-md">Next: Source & Total</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: WHERE PRODUCT CAME FROM (SOURCE), RECEIPT NO & RECEIPT TOTAL */}
      {isSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 text-left relative flex flex-col">
            <button onClick={() => setIsSourceModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer" type="button">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Truck size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Step 2: Delivery Details</h3>
                <p className="text-xs text-gray-500 font-medium">Provide supplier source, batch/receipt no., and total</p>
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Where did the product come from? (Supplier / Source)</label>
                <input
                  type="text"
                  placeholder="e.g. Puregold Distributor, Mega Warehouse"
                  value={deliverySource}
                  onChange={(e) => setDeliverySource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Receipt No. (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 1234567890"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white shadow-inner font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Total Amount from Receipt (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={receiptTotal}
                  onChange={(e) => setReceiptTotal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white shadow-inner font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setIsSourceModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border bg-white text-xs font-bold cursor-pointer">Back</button>
              <button type="button" onClick={() => void handleFinalReceiveRestock()} className="flex-1 px-4 py-2.5 rounded-xl bg-[#17347a] hover:bg-blue-800 text-white text-xs font-extrabold cursor-pointer shadow-md">Confirm & Save to Delivery</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, Icon, tone }: { label: string; value: string; detail?: string; Icon: LucideIcon; tone: "red" | "sky" | "amber" }) {
  const textColor = tone === "red" ? "text-red-400" : tone === "sky" ? "text-sky-400" : "text-amber-400";
  return (
    <div className="bg-[#17347a] text-white p-5 rounded-2xl flex items-center justify-between shadow-lg border border-white/10">
      <div className="min-w-0 text-left">
        <p className="text-[11px] uppercase font-extrabold text-blue-200 tracking-wider">{label}</p>
        <h3 className={`text-2xl font-black mt-1 ${textColor}`} title={value}>{value}</h3>
        <p className="mt-1 text-[10px] text-blue-300 font-medium truncate">{detail || " "}</p>
      </div>
      <div className="bg-[#1a3e7a] p-3 rounded-xl border border-white/10 shrink-0">
        <Icon size={24} className={textColor} />
      </div>
    </div>
  );
}

function SalesTrendChart({ points }: { points: DashboardData["salesTrend"] }) {
  const width = 760;
  const height = 230;
  const left = 54;
  const right = 18;
  const top = 18;
  const bottom = 46;
  const chartHeight = height - top - bottom;
  const maxSales = Math.max(...points.map((point) => Number(point.sales)), 1);
  const coordinates = points.map((point, index) => ({
    ...point,
    x: left + (points.length <= 1 ? 0 : index * (width - left - right) / (points.length - 1)),
    y: top + chartHeight - Number(point.sales) / maxSales * chartHeight,
  }));
  const line = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const lastX = coordinates[coordinates.length - 1]?.x ?? (width - right);
  const area = `${line} L ${lastX} ${top + chartHeight} L ${left} ${top + chartHeight} Z`;
  const formatAxis = (amount: number) => amount >= 1000 ? `₱${(amount / 1000).toFixed(1)}k` : `₱${Math.round(amount)}`;

  return (
    <div className="w-full overflow-x-auto" role="img" aria-label={`Gross sales for each of the last ${points.length} days`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[520px] h-auto" aria-hidden="true">
        {[0, 0.5, 1].map((fraction) => {
          const y = top + chartHeight * fraction;
          const value = maxSales * (1 - fraction);
          return (
            <g key={fraction}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />
              <text x={left - 9} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11" fontWeight="600">{formatAxis(value)}</text>
            </g>
          );
        })}
        <path d={area} fill="#2563eb" fillOpacity="0.1" />
        <path d={line} fill="none" stroke="#17347a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point, index) => {
          const showLabel = points.length <= 7 || index % 5 === 0 || index === points.length - 1;
          const date = new Date(`${point.date}T00:00:00`);
          const label = points.length <= 7 ? date.toLocaleDateString(undefined, { weekday: "short" }) : date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
          return (
            <g key={point.date}>
              <circle cx={point.x} cy={point.y} r={points.length > 7 ? 3 : 5} fill="#fff" stroke="#17347a" strokeWidth="3" tabIndex={0} className="outline-none focus:stroke-blue-500">
                <title>{`${point.date}: ${money(Number(point.sales))}`}</title>
              </circle>
              {showLabel && <text x={point.x} y={height - 15} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700">{label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TopProductsChart({ products }: { products: DashboardData["topProducts"] }) {
  const highestQuantity = Math.max(...products.map((product) => Number(product.quantity)), 1);
  return (
    <div className="space-y-3.5 p-2" role="img" aria-label="Top selling products ranked by units sold today">
      {products.map((product, index) => {
        const quantity = Number(product.quantity);
        const width = Math.max(quantity > 0 ? 6 : 0, (quantity / highestQuantity) * 100);
        return (
          <div key={`${product.id}-${product.name}`}>
            <div className="mb-1 flex items-start justify-between gap-3 text-xs">
              <span className="min-w-0 font-bold text-gray-800 break-words">
                <span className="mr-2 text-xs font-black text-blue-900">{index + 1}.</span>
                {product.name}
              </span>
              <span className="shrink-0 font-extrabold text-[#17347a]">{quantity} sold</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-blue-50 border border-blue-100">
              <div 
                title={`${quantity} units sold`} 
                className={`h-full rounded-full transition-all duration-500 ${index === 0 ? "bg-[#17347a]" : "bg-blue-500"}`} 
                style={{ width: `${width}%` }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}