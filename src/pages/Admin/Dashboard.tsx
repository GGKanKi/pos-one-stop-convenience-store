import { useEffect, useState } from "react";
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

  // ROLE CHECK: Identify if the current user is an Admin/Manager
  const role = currentUser.role?.toLowerCase() || "";
  const isAdmin = role === "admin" || role === "manager" || (!isStaffView && !isFullScreen && role !== "staff");

  // FULL SCREEN FOR STAFF ONLY
  const hideSidebar = !isAdmin || isFullScreen || isStaffView;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [refreshKey, setRefreshKey] = useState(0);

  // EDITABLE BUY QUANTITIES FOR LOW STOCK ITEMS (Staff only)
  const [restockQuantities, setRestockQuantities] = useState<Record<number, number>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

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

        // INITIALIZE REORDER QUANTITIES (THRESHOLD - STOCK)
        const initialQtyMap: Record<number, number> = {};
        (dashboardResult.lowStock || []).forEach((item) => {
          const defaultReorder = Math.max(1, item.threshold - item.stockQuantity);
          initialQtyMap[item.id] = defaultReorder;
        });
        setRestockQuantities(initialQtyMap);
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

  // SUBMIT RESTOCK REQUEST TO INVENTORY APPROVALS (STAFF ACTION)
  const handleRequestRestock = async (product: LowStockItem) => {
    const qtyToBuy = restockQuantities[product.id] || Math.max(1, product.threshold - product.stockQuantity);
    setSubmittingId(product.id);
    setError("");
    setNotice("");
    try {
      const user = getActiveStaffUser();
      const response = await apiRequest("/submitinventorychange.php", "POST", {
        action: "restock",
        product: {
          id: product.id,
          productName: product.name,
          barcode: product.barcode,
          stockQuantity: product.stockQuantity,
          restockQty: qtyToBuy,
          actor: { id: user.id || null, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Staff" },
        },
      });

      if (!response.success) throw new Error(response.message || "Failed to submit restock request.");
      setNotice(`Restock request for ${product.name} (${qtyToBuy} pcs) sent to Inventory Approvals!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit restock request.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#cfdcfc] text-slate-800 antialiased" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {!hideSidebar && <Sidebar />}

      <main className="flex-1 p-6 flex flex-col gap-5 text-left overflow-x-hidden">
        {/* HEADER */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            {!isAdmin ? "Store Analytics" : "Dashboard"}
          </h1>

          <div className="flex items-center gap-2 mr-1">
            {/* INVENTORY BUTTON BESIDE REFRESH (STAFF ONLY / ALL) */}
            <button
              type="button"
              onClick={() => navigate("/admin/inventory")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md cursor-pointer"
              aria-label="Go to Inventory"
            >
              <Package size={14} />
              <span className="hidden sm:inline">Inventory</span>
            </button>

            <button 
              type="button" 
              onClick={() => setRefreshKey((key) => key + 1)} 
              disabled={loading} 
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md disabled:opacity-60 cursor-pointer" 
              aria-label="Refresh dashboard"
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
        <section className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertCircle size={20} />
              </span>
              <div>
                <h2 className="font-extrabold tracking-tight text-[#17347a] text-sm">Restock Attention</h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  {isAdmin
                    ? "Products at or below their restock threshold (Read Only for Admin)"
                    : "Products at or below threshold. Specify quantity and send restock order to Inventory Approvals."}
                </p>
              </div>
              {!loading && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-800 border border-red-300">
                  {data?.lowStock.length ?? 0} items
                </span>
              )}
            </div>

            {isAdmin && (
              <button 
                type="button" 
                onClick={() => navigate("/admin/inventory-approvals")} 
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                Go to Approvals <ChevronRight size={14} />
              </button>
            )}
          </div>

          {loading ? (
            <p className="py-4 text-center text-xs text-gray-400 italic">Checking stock levels…</p>
          ) : !data?.lowStock.length ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800">
              All products are currently above their restock thresholds.
            </div>
          ) : (
            <div className="max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.lowStock.map((product) => {
                  const currentBuyQty = restockQuantities[product.id] ?? Math.max(1, product.threshold - product.stockQuantity);

                  // ADMIN VIEW: CLEAN READ-ONLY CARD
                  if (isAdmin) {
                    return (
                      <div key={product.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/50 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-gray-800" title={product.name}>{product.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{product.barcode}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black text-red-600">{product.stockQuantity} left</p>
                          <p className="text-[10px] font-semibold text-gray-400">min {product.threshold}</p>
                        </div>
                      </div>
                    );
                  }

                  // STAFF VIEW: EDITABLE RESTOCK FORM CARD
                  return (
                    <div key={product.id} className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/40 p-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-gray-800" title={product.name}>{product.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{product.barcode}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black text-red-600">{product.stockQuantity} left</p>
                          <p className="text-[10px] font-semibold text-gray-400">min {product.threshold}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-red-100">
                        <label className="text-[10px] font-bold text-gray-600 uppercase">Qty to buy:</label>
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
                          className="w-16 px-2 py-0.5 border border-gray-300 rounded-lg text-xs font-bold text-center bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          disabled={submittingId === product.id}
                          onClick={() => void handleRequestRestock(product)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#17347a] hover:bg-blue-900 text-white px-2.5 py-1 text-[11px] font-extrabold uppercase transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          <ShoppingCart size={12} />
                          {submittingId === product.id ? "Sending..." : "Request Restock"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* APPROVED RESTOCK ORDERS (TO BE BOUGHT) PANEL */}
        {data?.approvedRestocks && data.approvedRestocks.length > 0 && (
          <section className="bg-emerald-50/60 rounded-2xl shadow-md border border-emerald-200 p-4 sm:p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <h2 className="font-extrabold tracking-tight text-emerald-900 text-sm">Approved Restock Orders (To Be Bought)</h2>
                <p className="text-[11px] text-emerald-700 font-medium">Restock orders approved by manager ready for supplier purchase</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.approvedRestocks.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-800">{item.productName}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{item.barcode}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                      Buy {item.approvedQty} pcs
                    </span>
                  </div>
                </div>
              ))}
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
          {/* TOP SELLING PRODUCTS */}
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

          {/* RECENT INVENTORY ACTIVITY */}
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
    </div>
  );
}

function StatCard({ label, value, detail, Icon, tone }: { label: string; value: string; detail?: string; Icon: LucideIcon; tone: "red" | "sky" | "amber" }) {
  const textColor = tone === "red" ? "text-red-400" : tone === "sky" ? "text-sky-400" : "text-amber-400";
  
  return (
    <div className="bg-[#17347a] text-white p-5 rounded-2xl flex items-center justify-between shadow-lg border border-white/10 hover:scale-[1.01] transition duration-200">
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