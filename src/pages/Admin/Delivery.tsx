import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { apiRequest } from "../../services/api";
import { 
  Truck, 
  Package, 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Building2,
  ArrowLeft,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

type DeliveryItem = {
  id: number;
  product_id?: number;
  productName: string;
  barcode: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  expirationDate?: string;
};

type DeliveryTransaction = {
  id: number;
  supplierName: string;
  deliveryDate: string;
  referenceNo: string;
  totalAmount: number;
  receivedBy: string;
  items: DeliveryItem[];
};

export default function AdminDelivery() {
  const location = useLocation();
  const navigate = useNavigate();
  const isFullScreen = location.state?.fullScreen === true;

  const [deliveries, setDeliveries] = useState<DeliveryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchDeliveries = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/getdeliveries.php");
      if (response && response.success) {
        setDeliveries(response.deliveries || []);
      } else {
        setDeliveries([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load delivery records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filteredDeliveries = deliveries.filter((item) => {
    const deliveryDate = item.deliveryDate.slice(0, 10);
    const matchesSearch = !query || [
      item.supplierName,
      item.referenceNo,
      item.receivedBy,
      item.deliveryDate,
      String(item.totalAmount),
      ...item.items.flatMap((product) => [product.productName, product.barcode, String(product.quantity), product.expirationDate || ""]),
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesStartDate = !fromDate || deliveryDate >= fromDate;
    const matchesEndDate = !toDate || deliveryDate <= toDate;
    return matchesSearch && matchesStartDate && matchesEndDate;
  });
  const hasActiveFilters = Boolean(searchQuery || fromDate || toDate);

  const money = (amount: number) => `₱${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      className="flex min-h-screen bg-[#cfdcfc] text-slate-800 antialiased"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {!isFullScreen && <Sidebar />}

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto text-left">
        
        {/* HEADER */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            Delivery Transactions & Received Products
          </h1>

          <div className="flex items-center gap-2 mr-1">
            <button
              type="button"
              onClick={fetchDeliveries}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {isFullScreen && (
              <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 bg-white text-[#17347a] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-100 transition shadow-sm active:scale-95 cursor-pointer"
                type="button"
              >
                <ArrowLeft size={14} /> BACK
              </button>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 shadow-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" /> {error}
          </div>
        )}

        {/* CONTROLS & SEARCH BAR */}
        <div className="bg-[#b0c8fa] p-4 rounded-2xl shadow-lg border border-black/10 flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search supplier, reference, product, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search delivery records"
              className="w-full bg-white text-gray-800 text-xs font-bold pl-10 pr-9 py-2.5 rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-inner"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear delivery search" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                <X size={14} />
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[#17347a] shadow-xs border border-blue-200">
            <span>From</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Delivery date from" className="min-w-0 bg-transparent text-gray-800 outline-none" />
          </label>

          <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[#17347a] shadow-xs border border-blue-200">
            <span>To</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Delivery date to" className="min-w-0 bg-transparent text-gray-800 outline-none" />
          </label>

          {hasActiveFilters && (
            <button type="button" onClick={() => { setSearchQuery(""); setFromDate(""); setToDate(""); }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-500">
              Clear Filters
            </button>
          )}

          <div className="text-xs font-extrabold text-[#17347a] bg-white px-4 py-2.5 rounded-xl shadow-xs border border-blue-200">
            Total Deliveries Recorded: <span className="text-emerald-700">{filteredDeliveries.length}</span>
          </div>
        </div>

        {/* DELIVERY TRANSACTIONS LIST */}
        <div className="space-y-4 pb-10">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-xs text-gray-400 italic shadow-md">Loading delivery records...</div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-xs text-gray-500 italic shadow-md">No delivery transactions found matching your search.</div>
          ) : (
            filteredDeliveries.map((delivery) => (
              <div key={delivery.id} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
                
                {/* TRANSACTION HEADER CARD (Supplier Names & Totals) */}
                <div className="bg-[#132a63] px-5 py-3 text-xs text-blue-100 border-b border-blue-900 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-blue-800/80 text-white">
                      <Building2 size={16} />
                    </span>
                    <div>
                      <h3 className="font-black text-white text-sm uppercase tracking-wide">{delivery.supplierName}</h3>
                      <p className="text-[11px] text-blue-200 font-mono">Ref: {delivery.referenceNo}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-right">
                    <div className="flex items-center gap-1.5 bg-blue-900/60 px-3 py-1.5 rounded-lg border border-blue-400/20 text-white">
                      <Calendar size={13} className="text-blue-300" />
                      <span className="text-[11px] font-semibold">{delivery.deliveryDate}</span>
                    </div>
                    <div className="bg-emerald-800 text-emerald-100 px-3 py-1.5 rounded-lg font-black text-xs shadow-inner">
                      Receipt Total: {money(delivery.totalAmount)}
                    </div>
                  </div>
                </div>

                {/* RECEIVED PRODUCTS BREAKDOWN TABLE */}
                <div className="p-4 sm:p-5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                    <Package size={14} className="text-[#17347a]" /> Received Products Breakdown:
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 text-gray-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3.5">Product Name</th>
                          <th className="py-2.5 px-3">Barcode</th>
                          <th className="py-2.5 px-3 text-center">Quantity Received</th>
                          <th className="py-2.5 px-3 text-center">Expiration Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                        {delivery.items.map((item, idx) => {
                          return (
                            <tr key={item.id ?? idx} className="hover:bg-blue-50/30 transition">
                              <td className="py-2.5 px-3.5 font-bold text-gray-900">{item.productName}</td>
                              <td className="py-2.5 px-3 font-mono text-gray-500 text-[11px]">{item.barcode || "—"}</td>
                              <td className="py-2.5 px-3 text-center font-black text-emerald-700">{item.quantity} pcs</td>
                              <td className="py-2.5 px-3 text-center font-mono text-gray-600 text-[11px]">{item.expirationDate || "No Expiry"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex justify-between items-center text-[11px] text-gray-500 font-medium px-1">
                    <span>Received and recorded by: <strong className="text-gray-700">{delivery.receivedBy}</strong></span>
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 size={13} /> Inventory Updated Successfully
                    </span>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
}
