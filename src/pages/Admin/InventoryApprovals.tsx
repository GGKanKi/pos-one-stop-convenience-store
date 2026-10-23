import { useCallback, useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { apiRequest } from "../../services/api";

type ChangeRequest = {
  id: number;
  action_type: "add" | "update";
  product_id: number | null;
  requested_by: number;
  staff_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  before_data: ProductSnapshot | null;
  requested_data: ProductSnapshot;
};

type ProductValue = string | number | null;
type ExpiryBatch = { date: string; qty: number };
type ProductSnapshot = {
  productName?: string;
  barcode?: string;
  category?: string;
  stockQuantity?: ProductValue;
  costPrice?: ProductValue;
  sellingPrice?: ProductValue;
  supplier?: string | null;
  description?: string | null;
  stockChangeReason?: string;
  expiryBatches?: ExpiryBatch[];
};

export default function InventoryApprovals() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest("/getinventorychanges.php");
      if (!response.success) throw new Error(response.message || "Unable to load approval requests.");
      setRequests(response.data?.requests || []);
      setError("");
    } catch (err) {
      setRequests([]);
      setError(err instanceof Error ? err.message : "Unable to load approval requests.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const review = async (request: ChangeRequest, decision: "approve" | "reject") => {
    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest("/reviewinventorychange.php", "POST", {
        request_id: request.id,
        decision,
        note: reviewNotes[request.id] || "",
      });
      if (!response.success) throw new Error(response.message || "Unable to review this request.");
      setNotice(response.message);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review this request.");
    } finally { setBusyId(null); }
  };

  return (
    <div className="flex min-h-screen bg-[#cfdcfc] text-slate-800">
      <Sidebar />
      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
        <header className="bg-[#17347a] text-white p-4 rounded-xl shadow-md flex items-center justify-between">
          <div><h1 className="text-lg font-extrabold uppercase tracking-wider">Inventory Approvals</h1><p className="text-sm text-blue-200">Review staff changes before they affect inventory.</p></div>
          <button type="button" onClick={() => void loadRequests()} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">Refresh</button>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-lg space-y-4">
          <p className="text-sm text-slate-600">This page is available to Admin accounts only.</p>
          {notice && <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
          {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {loading ? <p>Loading requests...</p> : error ? null : requests.length === 0 ? <p className="text-sm text-slate-500">There are no pending inventory changes.</p> : (
            <div className="space-y-4">
              {requests.map((request) => {
                const proposed = request.requested_data;
                const before = request.before_data;
                return (
                  <article key={request.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-bold text-[#17347a]">{request.action_type === "add" ? "New product request" : "Product change request"}: {proposed.productName}</p><p className="text-xs text-slate-500">Submitted by {request.staff_id || "ID not assigned"} - {request.first_name} {request.last_name} · {new Date(request.created_at.replace(" ", "T")).toLocaleString()}</p></div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">Pending</span>
                    </div>
                    <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <p>Barcode: <strong>{proposed.barcode}</strong></p>
                      <p>Category: <strong>{proposed.category}</strong></p>
                      <p>Stock: <strong>{before ? `${before.stockQuantity} → ` : ""}{proposed.stockQuantity}</strong></p>
                      <p>Cost: <strong>{before ? `₱${before.costPrice} → ` : ""}₱{proposed.costPrice}</strong></p>
                      <p>Selling price: <strong>{before ? `₱${before.sellingPrice} → ` : ""}₱{proposed.sellingPrice}</strong></p>
                      <p>Supplier: <strong>{proposed.supplier || "—"}</strong></p>
                    </div>
                    {proposed.stockChangeReason && <p className="text-sm">Stock adjustment reason: <strong>{proposed.stockChangeReason}</strong></p>}
                    {proposed.description && <p className="text-sm text-slate-600">{proposed.description}</p>}
                    <label className="block text-xs font-semibold text-slate-600">Review note (optional)
                      <input value={reviewNotes[request.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))} maxLength={500} placeholder="Reason for rejection or approval note" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <div className="flex gap-2">
                      <button type="button" disabled={busyId !== null} onClick={() => void review(request, "approve")} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busyId === request.id ? "Saving..." : "Approve & Apply"}</button>
                      <button type="button" disabled={busyId !== null} onClick={() => void review(request, "reject")} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Reject</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
