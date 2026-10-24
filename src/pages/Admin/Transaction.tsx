import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { RotateCcw, Filter, Search, Calendar, Tag, ShieldAlert, History } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/One-Convenience/backend/api';

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Stock Deduction', value: 'Stock Deduction' },
  { label: 'Stock Addition', value: 'Stock Addition' },
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
      case 'Stock Addition':
      case 'Added New Product':
        return 'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]';
      case 'Stock Deduction':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Discount':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Voided Items/Invoice':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Product Details Update':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div
      className="flex min-h-screen bg-[#cfdcfc] text-gray-800 antialiased"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto text-left">
        {/* HEADER */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <div className="ml-2">
            <h1 className="text-lg font-extrabold uppercase tracking-wider flex items-center gap-2">
              Transaction History
            </h1>
          </div>
        </header>

        {/* FILTERS PANEL */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadHistory();
          }}
          className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-[#17347a]">
              <Filter size={16} />
              <h2 className="font-extrabold text-xs uppercase tracking-wider">Search & Filter Records</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 border border-gray-300 active:scale-95 transition cursor-pointer"
              >
                <RotateCcw size={13} /> Reset Filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                <Calendar size={12} className="text-[#17347a]" /> Start Date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 px-3 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                <Calendar size={12} className="text-[#17347a]" /> End Date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 px-3 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                <Tag size={12} className="text-[#17347a]" /> Action Type
              </span>
              <select
                value={action}
                onChange={handleActionChange}
                className="h-10 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner cursor-pointer"
              >
                {ACTION_OPTIONS.map((item) => (
                  <option key={item.label} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                <Search size={12} className="text-[#17347a]" /> Keyword Search
              </span>
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search description, user..."
                  className="w-full h-10 pl-3 pr-8 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner"
                />
              </div>
            </label>
          </div>
        </form>

        {/* RESULTS TABLE */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[400px] flex flex-col">
          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
            <span className="bg-[#17347a] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
              Showing {rows.length} {rows.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#17347a] text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 pl-6 border-b border-blue-900 w-[20%]">Date & Time</th>
                  <th className="py-3.5 px-4 border-b border-blue-900 w-[22%]">Action</th>
                  <th className="py-3.5 px-4 border-b border-blue-900 w-[42%]">Description</th>
                  <th className="py-3.5 px-4 border-b border-blue-900 w-[16%]">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-gray-400 italic">
                      Loading transaction logs...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      <div className="inline-flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
                        <ShieldAlert size={16} /> {error}
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-gray-400 italic">
                      No transaction history found for the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  rows.map((item, index) => {
                    const isEven = index % 2 === 0;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isEven ? 'bg-white' : 'bg-blue-50/30'
                        } hover:bg-blue-100/40`}
                      >
                        <td className="py-3.5 px-4 pl-6 whitespace-nowrap font-mono font-semibold text-gray-600">
                          {dateLabel(item.date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getActionBadgeColor(
                              item.action
                            )}`}
                          >
                            {item.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-800 font-medium break-words leading-relaxed">
                          {item.description}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#17347a]">{item.user}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}