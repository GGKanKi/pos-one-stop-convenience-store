import { useEffect, useState } from 'react';
import { type LucideIcon, AlertCircle, TrendingUp, DollarSign, Award, ArrowLeft, Clock, RefreshCw, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/One-Convenience/backend/api';
type DashboardData = {
  grossSales: number;
  netProfit: number;
  profitEstimated: boolean;
  salesTrend: { date: string; sales: number }[];
  bestSeller: { id: number; name: string; quantity: number } | null;
  topProducts: { id: number; name: string; quantity: number }[];
  lowStock: { id: number; name: string; barcode: string; stockQuantity: number; threshold: number }[];
  latestInventoryTransactions: { id: number; action: string; product: string; description: string; user: string; date: string }[];
};

function localDateValue(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const money = (amount: number) => `PHP ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const timeLabel = (value: string) => new Date(value.replace(' ', 'T')).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const isFullScreen = location.state?.fullScreen;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fontId = 'google-font-inter';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE}/getdashboard.php?date=${localDateValue()}&trendDays=${trendDays}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load dashboard data.');
        setData(result as DashboardData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadDashboard();
    return () => controller.abort();
  }, [trendDays, refreshKey]);

  return (
    <div className="flex min-h-screen bg-[#f2f5fb] text-slate-800 antialiased" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {!isFullScreen && <Sidebar />}
      <main className="flex-1 p-4 sm:p-6 xl:p-8 flex flex-col gap-6 text-left min-w-0 max-w-[1600px] mx-auto w-full">
        <header className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">One Stop Convenience Store</p><h1 className="text-3xl font-black tracking-tight text-slate-900 mt-1">{isFullScreen ? 'Store Analytics' : 'Dashboard'}</h1><p className="text-sm text-slate-500 mt-1">A clear view of today’s store activity</p></div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-semibold text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-[#17347a] shadow-sm transition hover:bg-blue-50 disabled:opacity-60" aria-label="Refresh dashboard"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span></button>
            {isFullScreen && <button onClick={() => navigate(-1)} className="flex items-center gap-2 rounded-xl bg-[#17347a] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-900" type="button"><ArrowLeft size={14} /> BACK TO POS</button>}
          </div>
        </header>

        {error && <div role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertCircle size={19} /></span><div><h2 className="font-extrabold tracking-tight text-slate-900">Restock attention</h2><p className="text-xs text-slate-500">Products at or below their restock threshold</p></div>{!loading && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-700">{data?.lowStock.length ?? 0} items</span>}</div>
            <button type="button" onClick={() => navigate('/admin/inventory')} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 transition hover:text-blue-900">Review inventory <ChevronRight size={15} /></button>
          </div>
          {loading ? <p className="py-5 text-center text-sm text-slate-400">Checking stock levels…</p> : !data?.lowStock.length ? <div className="rounded-xl bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800">All products are above their restock thresholds.</div> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.lowStock.slice(0, 3).map((product) => <div key={product.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-3.5 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800" title={product.name}>{product.name}</p><p className="mt-0.5 text-xs text-slate-500">{product.barcode}</p></div><div className="shrink-0 text-right"><p className="text-sm font-extrabold text-rose-700">{product.stockQuantity} left</p><p className="text-[10px] font-semibold text-slate-500">min {product.threshold}</p></div></div>)}</div>}
          {!loading && (data?.lowStock.length ?? 0) > 3 && <p className="mt-3 text-xs font-medium text-slate-500">+ {(data?.lowStock.length ?? 0) - 3} more products need attention</p>}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="font-extrabold tracking-tight text-slate-900">Today at a glance</h2><p className="mt-0.5 text-xs text-slate-500">Sales performance for today</p></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Gross Sales" value={loading ? '—' : money(data?.grossSales || 0)} Icon={TrendingUp} tone="blue" />
            <StatCard label="Net Profit" value={loading ? '—' : money(data?.netProfit || 0)} detail={data?.profitEstimated ? 'Older sales use current product cost' : 'After product costs'} Icon={DollarSign} tone="emerald" />
            <StatCard label="Best Seller" value={loading ? '—' : data?.bestSeller?.name || 'No sales yet'} detail={data?.bestSeller ? `${data.bestSeller.quantity} units sold today` : 'No completed sales yet'} Icon={Award} tone="amber" />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div><h2 className="font-extrabold tracking-tight text-slate-900">Sales trend</h2><p className="mt-0.5 text-xs text-slate-500">Gross sales by day</p></div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Sales trend range">
              {([7, 30] as const).map((days) => <button key={days} type="button" onClick={() => setTrendDays(days)} aria-pressed={trendDays === days} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${trendDays === days ? 'bg-white text-[#17347a] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{days} days</button>)}
            </div>
          </div>
          <div className="p-3 sm:p-5">
            {loading ? <p className="py-16 text-center text-slate-400 text-sm">Loading sales trend…</p> : data?.salesTrend?.length ? <SalesTrendChart points={data.salesTrend} /> : <p className="py-16 text-center text-slate-400 text-sm">No sales data available</p>}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 pb-6 xl:grid-cols-2">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-extrabold text-slate-900">Top selling products</h3><p className="mt-0.5 text-xs text-slate-500">Ranked by units sold today</p></div>
            <div className="min-h-36">
              {loading ? <p className="p-8 text-center text-slate-400 text-sm">Loading sales…</p> : !data?.topProducts.length ? <p className="p-8 text-center text-slate-400 text-sm">No products sold today</p> : <TopProductsChart products={data.topProducts} />}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-extrabold text-slate-900">Recent inventory activity</h3><p className="mt-0.5 text-xs text-slate-500">Latest recorded stock changes</p></div>
            <div className="min-h-36">
              {loading ? <p className="p-8 text-center text-slate-400 text-sm">Loading inventory activity…</p> : !data?.latestInventoryTransactions.length ? <p className="p-8 text-center text-slate-400 text-sm">No inventory changes recorded yet</p> : <div className="divide-y divide-slate-100">{data.latestInventoryTransactions.map((entry) => <div key={entry.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800" title={entry.description}>{entry.description}</p><p className="text-xs text-slate-500">{entry.action} <span className="px-1 text-slate-300">·</span> {entry.user}</p></div><span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-slate-400"><Clock size={12} />{timeLabel(entry.date)}</span></div>)}</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, detail, Icon, tone }: { label: string; value: string; detail?: string; Icon: LucideIcon; tone: 'blue' | 'emerald' | 'amber' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700' };
  return <div className="flex min-w-0 items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><h3 className="mt-2 break-words text-[clamp(1.2rem,2vw,1.75rem)] font-black leading-tight tracking-tight text-slate-900" title={value}>{value}</h3><p className="mt-1 min-h-4 text-xs text-slate-500">{detail || ' '}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={21} /></span></div>;
}

function SalesTrendChart({ points }: { points: DashboardData['salesTrend'] }) {
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
  const line = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${coordinates.at(-1)?.x ?? width - right} ${top + chartHeight} L ${left} ${top + chartHeight} Z`;
  const formatAxis = (amount: number) => amount >= 1000 ? `₱${(amount / 1000).toFixed(1)}k` : `₱${Math.round(amount)}`;

  return <div className="w-full overflow-x-auto" role="img" aria-label={`Gross sales for each of the last ${points.length} days`}>
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[520px] h-auto" aria-hidden="true">
      {[0, 0.5, 1].map((fraction) => {
        const y = top + chartHeight * fraction;
        const value = maxSales * (1 - fraction);
        return <g key={fraction}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#e5eaf4" strokeDasharray="4 5" /><text x={left - 9} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{formatAxis(value)}</text></g>;
      })}
      <path d={area} fill="#2563eb" fillOpacity="0.1" />
      <path d={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {coordinates.map((point, index) => {
        const showLabel = points.length <= 7 || index % 5 === 0 || index === points.length - 1;
        const date = new Date(`${point.date}T00:00:00`);
        const label = points.length <= 7 ? date.toLocaleDateString(undefined, { weekday: 'short' }) : date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
        return <g key={point.date}><circle cx={point.x} cy={point.y} r={points.length > 7 ? 3 : 5} fill="#fff" stroke="#2563eb" strokeWidth="3" tabIndex={0} className="outline-none focus:stroke-[#17347a]"><title>{`${point.date}: ${money(Number(point.sales))}`}</title></circle>{showLabel && <text x={point.x} y={height - 15} textAnchor="middle" fill="#64748b" fontSize="11">{label}</text>}</g>;
      })}
    </svg>
  </div>;
}

function TopProductsChart({ products }: { products: DashboardData['topProducts'] }) {
  const highestQuantity = Math.max(...products.map((product) => Number(product.quantity)), 1);
  return <div className="space-y-4 p-5" role="img" aria-label="Top selling products ranked by units sold today">
    {products.map((product, index) => {
      const quantity = Number(product.quantity);
      const width = Math.max(quantity > 0 ? 6 : 0, quantity / highestQuantity * 100);
      return <div key={`${product.id}-${product.name}`}>
        <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
          <span className="min-w-0 font-semibold text-gray-700 break-words"><span className="mr-2 text-xs font-extrabold text-gray-400">{index + 1}.</span>{product.name}</span>
          <span className="shrink-0 font-extrabold text-[#17347a]">{quantity} sold</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-blue-50"><div title={`${quantity} units sold`} className={`h-full rounded-full transition-all duration-500 ${index === 0 ? 'bg-blue-600' : 'bg-blue-300'}`} style={{ width: `${width}%` }} /></div>
      </div>;
    })}
  </div>;
}
