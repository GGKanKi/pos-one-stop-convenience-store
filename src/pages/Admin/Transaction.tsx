import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { RotateCcw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/One-Convenience/backend/api';
const ACTIONS = ['All Actions', 'Stock Deduction', 'Stock Addition', 'Sale', 'Voided Items/Invoice', 'Added New Product', 'Product Details Update'];
type HistoryRow = { id: string | number; date: string; action: string; entities: string; description: string; user: string };
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthStart = () => `${localDate().slice(0, 7)}-01`;

export default function Transactions() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(localDate());
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ start: startDate, end: endDate, action, search });
      const response = await fetch(`${API_BASE}/gettransactionhistory.php?${params}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load transaction history.');
      setRows(result.transactions || []);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Unable to load transaction history.');
    } finally { setLoading(false); }
  }, [startDate, endDate, action, search]);

  // Load the initial date range once; filter changes are applied by the form's Load button.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadHistory(); }, []);
  const resetFilters = () => { setStartDate(monthStart()); setEndDate(localDate()); setAction(''); setSearch(''); };
  const dateLabel = (value: string) => new Date(value.replace(' ', 'T')).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="flex min-h-screen bg-[#cfdcfc] font-sans" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
      <Sidebar />
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto text-left">
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6"><h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Transaction History</h1></header>
        <form onSubmit={(event) => { event.preventDefault(); void loadHistory(); }} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-700">Filters</h2><div className="flex items-center gap-2"><button type="button" onClick={resetFilters} className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-200 border border-gray-300"><RotateCcw size={14} /> Reset Filters</button><button disabled={loading} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-60"><RotateCcw size={14} /> Load Filters</button></div></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <label className="flex flex-col gap-1"><span className="text-[11px] font-bold text-gray-400 uppercase ml-1">Start Date</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-lg text-sm" /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-bold text-gray-400 uppercase ml-1">End Date</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-lg text-sm" /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-bold text-gray-400 uppercase ml-1">Action Type</span><select value={action} onChange={(e) => setAction(e.target.value)} className="p-2 border rounded-lg text-sm bg-white">{ACTIONS.map((item) => <option key={item} value={item === 'All Actions' ? '' : item}>{item}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-bold text-gray-400 uppercase ml-1">Search</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..." className="p-2 border rounded-lg text-sm" /></label>
          </div>
        </form>
        <section className="bg-white rounded-[1rem] shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          <div className="p-4"><span className="bg-gray-300 text-gray-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">Showing {rows.length} {rows.length === 1 ? 'entity' : 'entities'}</span></div>
          <div className="overflow-x-auto"><table className="w-full text-left min-w-[760px]"><thead className="bg-[#17347a] text-white font-bold text-[11px] uppercase tracking-wider"><tr><th className="p-4 pl-8">Date &amp; Time</th><th className="p-4">Action</th><th className="p-4">Entities</th><th className="p-4">Description</th><th className="p-4">User</th></tr></thead>
            <tbody className="divide-y divide-gray-100 text-sm font-semibold text-gray-600">{loading ? <tr><td colSpan={5} className="p-12 text-center text-gray-400">Loading history...</td></tr> : error ? <tr><td colSpan={5} className="p-12 text-center text-red-600">{error}</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-gray-400">No history found for these filters.</td></tr> : rows.map((item) => <tr key={item.id} className="hover:bg-gray-50"><td className="p-4 pl-8 whitespace-nowrap">{dateLabel(item.date)}</td><td className="p-4">{item.action}</td><td className="p-4">{item.entities}</td><td className="p-4">{item.description}</td><td className="p-4">{item.user}</td></tr>)}</tbody>
          </table></div>
        </section>
      </main>
    </div>
  );
}
