import { useCallback, useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { apiRequest } from "../../services/api";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Tag,
  Barcode,
  Package,
  DollarSign,
  Building2,
  MessageSquare,
  AlertCircle,
  ShoppingCart,
  Edit3,
  PlusCircle,
  Square,
  CheckSquare,
  Search,
  X,
} from "lucide-react";

type ChangeRequest = {
  id: number;
  action_type: "add" | "update" | "restock";
  product_id: number | null;
  requested_by: number;
  requested_by_name?: string;
  staff_id?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  created_at: string;
  before_data: ProductSnapshot | string | null;
  requested_data: ProductSnapshot | string;
};

type ProductValue = string | number | null;
type ExpiryBatch = { date: string; qty: number };
type ProductSnapshot = {
  productName?: string;
  name?: string;
  barcode?: string;
  category?: string;
  stockQuantity?: ProductValue;
  restockQty?: number;
  costPrice?: ProductValue;
  sellingPrice?: ProductValue;
  supplier?: string | null;
  description?: string | null;
  stockChangeReason?: string;
  expiryBatches?: ExpiryBatch[];
};

function parseSnapshot(data: ProductSnapshot | string | null | undefined): ProductSnapshot {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

function getRequesterDisplayName(request: ChangeRequest): string {
  if (request.first_name || request.last_name) {
    return [request.first_name, request.last_name].filter(Boolean).join(" ");
  }
  if (request.requested_by_name) {
    return request.requested_by_name;
  }
  return `Staff #${request.requested_by || "Unknown"}`;
}

export default function InventoryApprovals() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [editedRestockQty, setEditedRestockQty] = useState<Record<number, number>>({});
  const [activeTab, setActiveTab] = useState<"new_products" | "inventory" | "restock">("new_products");
  const [searchTerm, setSearchTerm] = useState("");

  // CHECKLIST SELECTION STATES PER TAB
  const [selectedNewIds, setSelectedNewIds] = useState<number[]>([]);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([]);
  const [selectedRestockIds, setSelectedRestockIds] = useState<number[]>([]);

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

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest("/getinventorychanges.php");
      if (!response.success) throw new Error(response.message || "Unable to load approval requests.");
      
      const loadedRequests: ChangeRequest[] = response.data?.requests || response.requests || [];
      setRequests(loadedRequests);

      const initialQtyMap: Record<number, number> = {};
      loadedRequests.forEach((req) => {
        const proposed = parseSnapshot(req.requested_data);
        if (req.action_type === "restock" && proposed?.restockQty) {
          initialQtyMap[req.id] = proposed.restockQty;
        }
      });
      setEditedRestockQty(initialQtyMap);
      setError("");
    } catch (err) {
      setRequests([]);
      setError(err instanceof Error ? err.message : "Unable to load approval requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const newProductRequests = requests.filter((r) => r.action_type === "add");
  const inventoryChanges = requests.filter((r) => r.action_type === "update");
  const restockRequests = requests.filter((r) => r.action_type === "restock");
  const filterRequests = (list: ChangeRequest[]) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return list;
    return list.filter((request) => {
      const proposed = parseSnapshot(request.requested_data);
      const before = parseSnapshot(request.before_data);
      return [
        request.id,
        request.product_id,
        request.action_type,
        request.created_at,
        getRequesterDisplayName(request),
        request.staff_id,
        request.email,
        JSON.stringify(proposed),
        JSON.stringify(before),
      ].join(" ").toLowerCase().includes(query);
    });
  };
  const filteredNewProductRequests = filterRequests(newProductRequests);
  const filteredInventoryChanges = filterRequests(inventoryChanges);
  const filteredRestockRequests = filterRequests(restockRequests);
  const visibleRequests = activeTab === "new_products"
    ? filteredNewProductRequests
    : activeTab === "inventory"
    ? filteredInventoryChanges
    : filteredRestockRequests;

  // TOGGLE SELECT ALL FOR CURRENT ACTIVE TAB
  const toggleSelectAll = () => {
    const visibleIds = visibleRequests.map((request) => request.id);
    const selectedIds = activeTab === "new_products"
      ? selectedNewIds
      : activeTab === "inventory"
      ? selectedInventoryIds
      : selectedRestockIds;
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    const updateSelected = (previous: number[]) => allVisibleSelected
      ? previous.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...previous, ...visibleIds]));

    if (activeTab === "new_products") setSelectedNewIds(updateSelected);
    else if (activeTab === "inventory") setSelectedInventoryIds(updateSelected);
    else setSelectedRestockIds(updateSelected);
  };

  const toggleSelectItem = (id: number) => {
    if (activeTab === "new_products") {
      setSelectedNewIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    } else if (activeTab === "inventory") {
      setSelectedInventoryIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    } else if (activeTab === "restock") {
      setSelectedRestockIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }
  };

  const currentSelectedIds =
    activeTab === "new_products"
      ? selectedNewIds
      : activeTab === "inventory"
      ? selectedInventoryIds
      : selectedRestockIds;

  // BULK REVIEW HANDLER
  const handleBulkReview = async (decision: "approve" | "reject") => {
    if (currentSelectedIds.length === 0) return;
    setSubmittingBulk(true);
    setError("");
    setNotice("");
    try {
      const selectedRequests = requests.filter((r) => currentSelectedIds.includes(r.id));
      
      for (const request of selectedRequests) {
        const proposed = parseSnapshot(request.requested_data);
        const finalRestockQty = editedRestockQty[request.id] ?? proposed?.restockQty ?? 0;
        
        await apiRequest("/reviewinventorychange.php", "POST", {
          request_id: request.id,
          decision,
          note: reviewNotes[request.id] || "",
          approved_qty: request.action_type === "restock" ? finalRestockQty : undefined,
        });
      }

      setNotice(`Successfully ${decision}ed ${selectedRequests.length} requests!`);
      if (activeTab === "new_products") setSelectedNewIds([]);
      if (activeTab === "inventory") setSelectedInventoryIds([]);
      if (activeTab === "restock") setSelectedRestockIds([]);

      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to bulk ${decision} requests.`);
    } finally {
      setSubmittingBulk(false);
    }
  };

  return (
    <div
      className="flex min-h-screen bg-[#cfdcfc] text-slate-800 antialiased"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto text-left">
        {/* HEADER */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <div className="ml-2">
            <h1 className="text-lg font-extrabold uppercase tracking-wider flex items-center gap-2">
              Inventory & Restocking Approvals
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md disabled:opacity-60 cursor-pointer mr-1"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        {/* NOTICES */}
        {notice && (
          <div role="status" className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-xs font-bold text-green-800 shadow-xs">
            {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 shadow-xs">
            {error}
          </div>
        )}

        {/* TABS HEADER */}
        <div className="flex gap-2 bg-[#b0c8fa] p-1.5 rounded-2xl border border-black/10">
          <button
            type="button"
            onClick={() => setActiveTab("new_products")}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "new_products"
                ? "bg-[#17347a] text-white shadow-md"
                : "text-blue-900 hover:bg-white/40"
            }`}
          >
            <PlusCircle size={16} />
            New Products ({newProductRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "inventory"
                ? "bg-[#17347a] text-white shadow-md"
                : "text-blue-900 hover:bg-white/40"
            }`}
          >
            <Package size={16} />
            Edit Details ({inventoryChanges.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restock")}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "restock"
                ? "bg-[#17347a] text-white shadow-md"
                : "text-blue-900 hover:bg-white/40"
            }`}
          >
            <ShoppingCart size={16} />
            Restock Requests ({restockRequests.length})
          </button>
        </div>

        {/* CONTENT SECTION */}
        <section className="rounded-2xl bg-white p-5 shadow-lg border border-gray-200 space-y-4">
          {/* BULK ACTION CONTROLS BAR */}
          <div className="bg-[#17347a] text-white px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search product, barcode, requester..."
                aria-label="Search approval requests"
                className="w-full rounded-lg bg-white py-2 pl-9 pr-3 text-xs font-semibold text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-300"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear request search" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-white hover:text-blue-200 cursor-pointer flex items-center gap-2 text-xs font-extrabold uppercase"
                title="Select All"
              >
                {visibleRequests.length > 0 && visibleRequests.every((request) => currentSelectedIds.includes(request.id)) ? (
                  <CheckSquare size={18} className="text-emerald-400" />
                ) : (
                  <Square size={18} />
                )}
                <span>Select All</span>
              </button>
              <span className="text-xs text-blue-200 font-medium">
                {currentSelectedIds.length} item{currentSelectedIds.length === 1 ? "" : "s"} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submittingBulk || currentSelectedIds.length === 0}
                onClick={() => void handleBulkReview("reject")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 text-xs font-extrabold uppercase transition shadow-md cursor-pointer disabled:opacity-50"
              >
                <XCircle size={14} /> Reject Selected ({currentSelectedIds.length})
              </button>
              <button
                type="button"
                disabled={submittingBulk || currentSelectedIds.length === 0}
                onClick={() => void handleBulkReview("approve")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-extrabold uppercase transition shadow-md cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> {submittingBulk ? "Processing..." : `Approve Selected (${currentSelectedIds.length})`}
              </button>
            </div>
          </div>

          {activeTab === "new_products" ? (
            /* NEW PRODUCTS TAB */
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">Loading requests...</div>
              ) : filteredNewProductRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">{newProductRequests.length === 0 ? "No pending new product requests." : "No requests match your search."}</div>
              ) : (
                filteredNewProductRequests.map((request) => {
                  const proposed = parseSnapshot(request.requested_data);
                  const productName = proposed.productName || proposed.name || "Unnamed Product";
                  const requesterName = getRequesterDisplayName(request);
                  const isSelected = selectedNewIds.includes(request.id);

                  return (
                    <article key={request.id} className={`rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition space-y-3 ${isSelected ? "border-blue-500 bg-blue-50/30" : "border-gray-200"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectItem(request.id)}
                            className="text-gray-400 hover:text-blue-600 cursor-pointer"
                          >
                            {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                                New Product
                              </span>
                              <h3 className="font-extrabold text-sm text-[#17347a]">{productName}</h3>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-1">
                              <User size={12} className="text-gray-400" />
                              Submitted by <span className="font-bold text-gray-700">{requesterName}</span> ({request.staff_id || "Staff"}) ·{" "}
                              {request.created_at ? new Date(request.created_at.replace(" ", "T")).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recent"}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase text-amber-800 border border-amber-200">Pending</span>
                      </div>

                      <div className="grid gap-2.5 rounded-xl bg-blue-50/50 p-3.5 text-xs font-medium text-gray-700 sm:grid-cols-2 lg:grid-cols-3 border border-blue-100 ml-7">
                        <div className="flex items-center gap-1.5"><Barcode size={14} className="text-[#17347a]" /> Barcode: <strong className="font-mono text-gray-900">{proposed.barcode || "N/A"}</strong></div>
                        <div className="flex items-center gap-1.5"><Tag size={14} className="text-[#17347a]" /> Category: <strong className="text-gray-900">{proposed.category || "Uncategorized"}</strong></div>
                        <div className="flex items-center gap-1.5"><Package size={14} className="text-[#17347a]" /> Initial Stock: <strong className="text-emerald-700 font-extrabold">{proposed.stockQuantity ?? 0}</strong></div>
                        <div className="flex items-center gap-1.5"><DollarSign size={14} className="text-[#17347a]" /> Cost Price: <strong className="text-gray-900">₱{proposed.costPrice ?? "0.00"}</strong></div>
                        <div className="flex items-center gap-1.5"><DollarSign size={14} className="text-[#17347a]" /> Selling Price: <strong className="text-blue-900 font-extrabold">₱{proposed.sellingPrice ?? "0.00"}</strong></div>
                        <div className="flex items-center gap-1.5"><Building2 size={14} className="text-[#17347a]" /> Supplier: <strong className="text-gray-900">{proposed.supplier || "—"}</strong></div>
                      </div>

                      <div className="ml-7 pt-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">Review Note (Optional)</label>
                        <div className="relative">
                          <MessageSquare size={14} className="absolute left-3 top-2.5 text-gray-400" />
                          <input
                            value={reviewNotes[request.id] || ""}
                            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder="Reason for approval or rejection..."
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                          />
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          ) : activeTab === "inventory" ? (
            /* EDIT DETAILS TAB */
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">Loading requests...</div>
              ) : filteredInventoryChanges.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">{inventoryChanges.length === 0 ? "No pending edit requests." : "No requests match your search."}</div>
              ) : (
                filteredInventoryChanges.map((request) => {
                  const proposed = parseSnapshot(request.requested_data);
                  const before = parseSnapshot(request.before_data);
                  const productName = proposed.productName || proposed.name || "Unnamed Product";
                  const requesterName = getRequesterDisplayName(request);
                  const isSelected = selectedInventoryIds.includes(request.id);

                  return (
                    <article key={request.id} className={`rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition space-y-3 ${isSelected ? "border-blue-500 bg-blue-50/30" : "border-gray-200"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectItem(request.id)}
                            className="text-gray-400 hover:text-blue-600 cursor-pointer"
                          >
                            {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                Edit Details
                              </span>
                              <h3 className="font-extrabold text-sm text-[#17347a]">{productName}</h3>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-1">
                              <User size={12} className="text-gray-400" />
                              Submitted by <span className="font-bold text-gray-700">{requesterName}</span> ({request.staff_id || "Staff"}) ·{" "}
                              {request.created_at ? new Date(request.created_at.replace(" ", "T")).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recent"}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase text-amber-800 border border-amber-200">Pending</span>
                      </div>

                      <div className="grid gap-2.5 rounded-xl bg-blue-50/50 p-3.5 text-xs font-medium text-gray-700 sm:grid-cols-2 lg:grid-cols-3 border border-blue-100 ml-7">
                        <div className="flex items-center gap-1.5"><Barcode size={14} className="text-[#17347a]" /> Barcode: <strong className="font-mono text-gray-900">{proposed.barcode || "N/A"}</strong></div>
                        <div className="flex items-center gap-1.5"><Tag size={14} className="text-[#17347a]" /> Category: <strong className="text-gray-900">{proposed.category || "Uncategorized"}</strong></div>
                        <div className="flex items-center gap-1.5"><Package size={14} className="text-[#17347a]" /> Stock: <strong className="text-gray-900">{before && before.stockQuantity !== undefined ? <><span className="text-gray-400 line-through mr-1">{before.stockQuantity}</span><span className="text-emerald-700 font-extrabold">{proposed.stockQuantity}</span></> : proposed.stockQuantity}</strong></div>
                        <div className="flex items-center gap-1.5"><DollarSign size={14} className="text-[#17347a]" /> Cost Price: <strong className="text-gray-900">₱{proposed.costPrice ?? "0.00"}</strong></div>
                        <div className="flex items-center gap-1.5"><DollarSign size={14} className="text-[#17347a]" /> Selling Price: <strong className="text-blue-900 font-extrabold">₱{proposed.sellingPrice ?? "0.00"}</strong></div>
                        <div className="flex items-center gap-1.5"><Building2 size={14} className="text-[#17347a]" /> Supplier: <strong className="text-gray-900">{proposed.supplier || "—"}</strong></div>
                      </div>

                      {proposed.stockChangeReason && (
                        <div className="ml-7 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 font-medium flex items-start gap-2">
                          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <div><span className="font-bold">Stock Adjustment Reason:</span> {proposed.stockChangeReason}</div>
                        </div>
                      )}

                      <div className="ml-7 pt-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">Review Note (Optional)</label>
                        <div className="relative">
                          <MessageSquare size={14} className="absolute left-3 top-2.5 text-gray-400" />
                          <input
                            value={reviewNotes[request.id] || ""}
                            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder="Reason for approval or rejection..."
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                          />
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          ) : (
            /* RESTOCK REQUESTS TAB */
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">Loading restock requests...</div>
              ) : filteredRestockRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">{restockRequests.length === 0 ? "No pending restock requests." : "No requests match your search."}</div>
              ) : (
                filteredRestockRequests.map((request) => {
                  const proposed = parseSnapshot(request.requested_data);
                  const currentQty = editedRestockQty[request.id] ?? proposed.restockQty ?? 1;
                  const productName = proposed.productName || proposed.name || "Unnamed Product";
                  const requesterName = getRequesterDisplayName(request);
                  const isSelected = selectedRestockIds.includes(request.id);

                  return (
                    <article key={request.id} className={`rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition space-y-3 ${isSelected ? "border-emerald-500 bg-emerald-50/30" : "border-emerald-200"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectItem(request.id)}
                            className="text-gray-400 hover:text-emerald-600 cursor-pointer"
                          >
                            {isSelected ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">Restock Request</span>
                              <h3 className="font-extrabold text-sm text-[#17347a]">{productName}</h3>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-1">
                              <User size={12} className="text-gray-400" />
                              Requested by <span className="font-bold text-gray-700">{requesterName}</span> ·{" "}
                              {request.created_at ? new Date(request.created_at.replace(" ", "T")).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recent"}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase text-amber-800 border border-amber-200">Awaiting Manager Approval</span>
                      </div>

                      <div className="grid gap-3 rounded-xl bg-emerald-50/50 p-3.5 text-xs font-medium text-gray-700 sm:grid-cols-2 lg:grid-cols-3 border border-emerald-100 items-center ml-7">
                        <div>Barcode: <strong className="font-mono text-gray-900">{proposed.barcode || "N/A"}</strong></div>
                        <div>Current Stock: <strong className="text-red-600 font-extrabold">{proposed.stockQuantity ?? 0} pcs</strong></div>

                        <div className="bg-white p-2 rounded-xl border border-emerald-300 flex items-center gap-2 shadow-xs">
                          <Edit3 size={14} className="text-emerald-700 shrink-0" />
                          <label className="text-[10px] font-extrabold uppercase text-gray-600">Quantity to Buy:</label>
                          <input
                            type="number"
                            min="1"
                            value={currentQty}
                            onChange={(e) =>
                              setEditedRestockQty((prev) => ({
                                ...prev,
                                [request.id]: Math.max(1, Number(e.target.value)),
                              }))
                            }
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-xs font-bold text-center text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] font-bold text-gray-500">pcs</span>
                        </div>
                      </div>

                      <div className="ml-7 pt-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">Manager Note / Supplier Order Details</label>
                        <div className="relative">
                          <MessageSquare size={14} className="absolute left-3 top-2.5 text-gray-400" />
                          <input
                            value={reviewNotes[request.id] || ""}
                            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder="e.g. Order placed with supplier, Expected delivery tomorrow..."
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                          />
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
