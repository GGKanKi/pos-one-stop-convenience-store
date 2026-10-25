import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { RotateCcw, Filter, Search, Calendar, Tag, ShieldAlert } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/One-Convenience/backend/api';

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Restock Approved', value: 'Restock Approved' },
  { label: 'Stock Deduction', value: 'Stock Deduction' },
  { label: 'Stock Addition', value: 'Stock Addition' },
  { label: 'Expired Items Dispose', value: 'Expired Items Dispose' },
  { label: 'Discount', value: 'Discount' },
  { label: 'Voided Items/Invoice', value: 'Voided Items/Invoice' },
  { label: 'Added New Product', value: 'Added New Product' },
  { label: 'Product Details Update', value: 'Product Details Update' },
];

type HistoryRow = {
  id: string | number;
  date: string;
  action: string;
  description: string;
  user: string;
};

const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthStart = () => `${localDate().slice(0, 7)}-01`;

export default function Transactions() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(localDate());
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const loadHistory = useCallback(
    async (
      overrideParams?: {
        startDate?: string;
        endDate?: string;
        action?: string;
        search?: string;
      }
    ) => {
      setLoading(true);
      setError('');
      try {
        const queryParams = new URLSearchParams({
          start: overrideParams?.startDate ?? startDate,
          end: overrideParams?.endDate ?? endDate,
          action: overrideParams?.action ?? action,
          search: overrideParams?.search ?? search,
        });

        const response = await fetch(`${API_BASE}/gettransactionhistory.php?${queryParams}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load transaction history.');
        setRows(result.transactions || []);
      } catch (err) {
        setRows([]);
        setError(err instanceof Error ? err.message : 'Unable to load transaction history.');
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, action, search]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHistory();
    }, 300);

    return () => clearTimeout(timer);
  }, [startDate, endDate, action, search, loadHistory]);

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAction = e.target.value;
    setAction(selectedAction);
    void loadHistory({ action: selectedAction });
  };

  const resetFilters = () => {
    const defaultStart = monthStart();
    const defaultEnd = localDate();
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setAction('');
    setSearch('');
    void loadHistory({ startDate: defaultStart, endDate: defaultEnd, action: '', search: '' });
  };

  const dateLabel = (value: string) =>
    new Date(value.replace(' ', 'T')).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'Restock Approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Stock Addition':
      case 'Added New Product':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Stock Deduction':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Expired Items Dispose':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Discount':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Voided Items/Invoice':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Product Details Update':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div
      className="flex min-h-screen bg-[#cfdcfc] text-slate-800 antialiased"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto text-left">
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <div className="ml-2">
            <h1 className="text-lg font-extrabold uppercase tracking-wider flex items-center gap-2">
              Transaction History
            </h1>
          </div>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadHistory();
          }}
          className="bg-[#b0c8fa] p-4 rounded-2xl shadow-lg border border-black/10 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex flex-wrap items-center gap-3 bg-[#17347a] p-2.5 rounded-xl border border-white/10 flex-1">
            <label className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border-2 border-transparent focus-within:border-blue-400 cursor-pointer shadow-inner">
              <Calendar size={16} className="text-[#17347a]" />
              <span className="text-gray-700 font-bold text-xs">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-gray-800 font-bold text-xs outline-none cursor-pointer"
              />
            </label>

            <label className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border-2 border-transparent focus-within:border-blue-400 cursor-pointer shadow-inner">
              <Calendar size={16} className="text-[#17347a]" />
              <span className="text-gray-700 font-bold text-xs">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-gray-800 font-bold text-xs outline-none cursor-pointer"
              />
            </label>

            <label className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border-2 border-transparent focus-within:border-blue-400 cursor-pointer shadow-inner">
              <Tag size={16} className="text-[#17347a]" />
              <select
                value={action}
                onChange={handleActionChange}
                className="bg-transparent text-gray-800 font-bold text-xs outline-none cursor-pointer appearance-none pr-4"
              >
                {ACTION_OPTIONS.map((item) => (
                  <option key={item.label} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, user..."
                className="w-full h-9 pl-9 pr-3 bg-white rounded-lg text-xs font-bold text-gray-800 shadow-inner outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition active:scale-95 shadow-md cursor-pointer uppercase tracking-wider"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </form>

        <div className="bg-[#17347a] rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-[#132a63] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-blue-200 border-b border-blue-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Filter size={15} className="text-blue-300" /> Transaction Audit Logs
            </span>
            <span className="bg-blue-800/80 text-white text-[10px] px-2.5 py-0.5 rounded-full border border-blue-400/30 font-bold">
              {rows.length} {rows.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#17347a] text-white font-bold uppercase text-[11px] tracking-wider z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-blue-900 w-[20%]">Date & Time</th>
                  <th className="py-3 px-4 border-b border-blue-900 w-[22%]">Action</th>
                  <th className="py-3 px-4 border-b border-blue-900 w-[42%]">Description</th>
                  <th className="py-3 px-4 border-b border-blue-900 text-right w-[16%]">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400 italic">
                      Loading transaction logs...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="inline-flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-bold text-red-700 shadow-xs mx-auto">
                        <ShieldAlert size={16} /> {error}
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400 italic">
                      No transaction history found for the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  rows.map((item, index) => (
                    <tr
                      key={item.id ?? index}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'} hover:bg-blue-100/50 transition-colors`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-gray-600 whitespace-nowrap">
                        {dateLabel(item.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${getActionBadgeColor(
                            item.action
                          )}`}
                        >
                          {item.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-medium break-words leading-relaxed">
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#17347a]">{item.user}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}