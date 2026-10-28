import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { 
  CalendarDays, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  RefreshCw,
  WalletCards 
} from 'lucide-react';

interface ReportItem {
  product_name: string;
  qty: number;
  total: number;
  category: string;
}

interface CategorySale {
  category: string;
  total: number;
}

interface CashierSummary {
  cashier_name: string;
  start_time: string;
  register_start: number;
  register_end: number | null;
  closed_at: string | null;
  cash_sales: number;
  expected_cash: number;
  cash_difference: number | null;
}

interface PayoutItem {
  pay_out_to: string;
  amount: number;
  description: string;
  created_at?: string;
}

// Helper function to format product names into Title Case (Capitalize Every Word)
function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function DailyReports() {
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [items, setItems] = useState<ReportItem[]>([]);
  const [categories, setCategories] = useState<CategorySale[]>([]);
  const [cashiers, setCashiers] = useState<CashierSummary[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [totals, setTotals] = useState({
    grandTotal: 0,
    totalCash: 0,
    totalEpayments: 0,
    totalGcash: 0,
    totalCredit: 0,
    returned: 0,
    voidedAmount: 0,
    transactionCount: 0,
    totalItemCount: 0,
    totalDiscounts: 0,
    totalPayouts: 0,
    netSales: 0,
  });

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost/One-Convenience/backend/api/getdailyreport.php?date=${reportDate}`);
      const response = await res.json();
      
      console.log("Daily Report API Response:", response);

      if (!response.success) {
        throw new Error(response.message || 'Unable to fetch daily report.');
      }

      const data = response.data || response;
      
      setItems(data.items || []);
      setCategories(data.categories || []);
      setCashiers(data.cashiers || []);
      setPayouts(data.payouts || []);
      setTotals(data.totals || {
        grandTotal: 0,
        totalCash: 0,
        totalEpayments: 0,
        totalGcash: 0,
        totalCredit: 0,
        returned: 0,
        voidedAmount: 0,
        transactionCount: 0,
        totalItemCount: 0,
        totalDiscounts: 0,
        totalPayouts: 0,
        netSales: 0,
      });

    } catch (err) {
      console.error("API Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load daily sales report.");
      setItems([]);
      setCategories([]);
      setCashiers([]);
      setPayouts([]);
      setTotals({
        grandTotal: 0,
        totalCash: 0,
        totalEpayments: 0,
        totalGcash: 0,
        totalCredit: 0,
        returned: 0,
        voidedAmount: 0,
        transactionCount: 0,
        totalItemCount: 0,
        totalDiscounts: 0,
        totalPayouts: 0,
        netSales: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [reportDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const filteredItems = items.filter(item => 
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    alert("Exporting daily sales report to Excel...");
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
              Daily Sales Report
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md disabled:opacity-60 cursor-pointer mr-1"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 shadow-xs">
            {error}
          </div>
        )}

        {/* CONTROLS & ACTIONS BAR */}
        <div className="bg-[#b0c8fa] p-2.5 rounded-2xl border border-black/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs font-extrabold uppercase text-[#17347a]">Report Date:</span>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white rounded-xl text-xs font-extrabold text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products in report..."
              className="w-full pl-9 pr-3 py-1.5 bg-white rounded-xl text-xs font-bold text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 mr-1">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md cursor-pointer uppercase tracking-wider"
            >
              <FileSpreadsheet size={14} /> Export
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#17347a] hover:bg-blue-900 text-white px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-md cursor-pointer uppercase tracking-wider"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* MAIN CONTENT SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* LEFT 2 COLS: PRODUCTS SOLD TABLE */}
          <section className="lg:col-span-2 rounded-2xl bg-white p-5 shadow-lg border border-gray-200 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={15} className="text-[#17347a]" /> Products Sold ({filteredItems.length})
              </p>
              <span className="text-[11px] font-semibold text-gray-400">
                {new Date(reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#17347a] text-white font-extrabold uppercase text-[11px] tracking-wider sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Products</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-xs text-gray-400 italic">
                        Loading database records...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-xs text-gray-400 italic">
                        No sales recorded for this date.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition">
                        <td className="py-3 px-4 font-bold text-[#17347a] normal-case">
                          {toTitleCase(item.product_name)}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-700 font-bold">{Number(item.qty).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-gray-900 font-black">₱{Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* GRAND TOTAL */}
            <div className="bg-[#17347a] text-white p-3.5 rounded-xl flex items-center justify-between shadow-md">
              <span className="text-xs font-extrabold uppercase tracking-wider">Grand Total</span>
              <span className="text-base font-black">₱{Number(totals.grandTotal).toFixed(2)}</span>
            </div>
          </section>

          {/* RIGHT COL: FINANCIAL BREAKDOWN & CATEGORIES */}
          <div className="flex flex-col gap-5">
            
            {/* PAYMENT BREAKDOWN */}
            <section className="rounded-2xl bg-white p-5 shadow-lg border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <DollarSign size={15} className="text-[#17347a]" /> Payment Breakdown
              </h3>

              <div className="space-y-2 text-xs font-bold text-gray-700">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span>Total Cash</span>
                  <strong className="text-gray-900">₱{Number(totals.totalCash).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span>Total e-Payments</span>
                  <strong className="text-gray-900">₱{Number(totals.totalEpayments).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span>Total GCash</span>
                  <strong className="text-gray-900">₱{Number(totals.totalGcash).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span>Total Credit</span>
                  <strong className="text-gray-900">₱{Number(totals.totalCredit).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span>Returned</span>
                  <strong className="text-rose-600">₱{Number(totals.returned).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span>Voided Amount</span>
                  <strong className="text-rose-600">₱{Number(totals.voidedAmount).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span>Total Payouts / Expenses</span>
                  <strong className="text-amber-600">₱{Number(totals.totalPayouts || 0).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span>Transaction Count</span>
                  <strong className="text-[#17347a]">{totals.transactionCount}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Total Items Sold</span>
                  <strong className="text-[#17347a]">{totals.totalItemCount}</strong>
                </div>
              </div>
            </section>

            {/* PAYOUTS LIST CARD */}
            <section className="rounded-2xl bg-white p-5 shadow-lg border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <WalletCards size={15} className="text-[#17347a]" /> Payout Records ({payouts.length})
              </h3>

              <div className="space-y-2 max-h-[160px] overflow-y-auto text-xs font-bold text-gray-700 pr-1">
                {payouts.length === 0 ? (
                  <p className="text-gray-400 italic text-center py-2">No payouts recorded for this date.</p>
                ) : (
                  payouts.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <div>
                        <span className="uppercase text-gray-900 font-extrabold block">{p.pay_out_to}</span>
                        <span className="text-[10px] text-gray-400 font-normal">{p.description || "No description"}</span>
                      </div>
                      <strong className="text-rose-600 font-black">-₱{Number(p.amount).toFixed(2)}</strong>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* SALES BY CATEGORY */}
            <section className="rounded-2xl bg-white p-5 shadow-lg border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <TrendingUp size={15} className="text-[#17347a]" /> Sales by Category
              </h3>

              <div className="space-y-2 max-h-[200px] overflow-y-auto text-xs font-bold text-gray-700 pr-1">
                {categories.length === 0 ? (
                  <p className="text-gray-400 italic text-center py-2">No category data.</p>
                ) : (
                  categories.map((cat, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="uppercase text-gray-700 font-extrabold">{cat.category}</span>
                      <strong className="text-gray-900">₱{Number(cat.total).toFixed(2)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between items-center bg-[#17347a] text-white p-3 rounded-xl">
                <span className="text-xs font-extrabold uppercase">Net Sales (Less Payouts)</span>
                <span className="text-sm font-black">₱{Number(totals.netSales).toFixed(2)}</span>
              </div>
            </section>

            {/* CASHIER SUMMARY */}
            <section className="rounded-2xl bg-white p-5 shadow-lg border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <Users size={15} className="text-[#17347a]" /> Cashiers
              </h3>

              <div className="space-y-2 text-xs font-bold text-gray-700">
                {cashiers.length === 0 ? (
                  <p className="text-gray-400 italic text-center py-2">No cashier log.</p>
                ) : (
                  cashiers.map((c, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-gray-900 font-extrabold">
                        <span>{c.cashier_name}</span>
                        <span className="text-gray-400 font-normal">{c.start_time}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-gray-600">
                        <span>Opening Cash</span>
                        <span>₱{Number(c.register_start).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-gray-600">
                        <span>Cash Sales</span>
                        <span>₱{Number(c.cash_sales).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-gray-600">
                        <span>Expected Cash</span>
                        <span>₱{Number(c.expected_cash).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-gray-600">
                        <span>{c.register_end === null ? "Closing Cash (open)" : "Closing Cash"}</span>
                        <span>{c.register_end === null ? "—" : `₱${Number(c.register_end).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-gray-600">
                        <span>Cash Difference</span>
                        <span>{c.cash_difference === null ? "—" : `₱${Number(c.cash_difference).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>

        </div>
      </main>
    </div>
  );
}
