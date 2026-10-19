import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Calendar, User, Edit3 } from 'lucide-react';

type AttendanceRow = {
  user_id: number;
  staff_id: string | null;
  first_name: string;
  last_name: string;
  clock_in: string | null;
  clock_out: string | null;
  date: string | null;
};

type AttendanceResponse = { success: boolean; attendance?: AttendanceRow[]; message?: string };

function localDateValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateTime(value: string): Date {
  // MySQL DATETIME values have no timezone. Parse them as local store time.
  return new Date(value.replace(' ', 'T'));
}

function formatTime(value: string | null): string {
  if (!value) return '--';
  return parseDateTime(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calculateDuration(clockIn: string | null, clockOut: string | null): string {
  if (!clockIn) return '--';
  const start = parseDateTime(clockIn).getTime();
  const end = clockOut ? parseDateTime(clockOut).getTime() : Date.now();
  const minutes = Math.max(0, Math.floor((end - start) / 60000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function StaffPage() {
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(localDateValue());
  const [rows, setRows] = useState<AttendanceRow[]>([]);
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

  useEffect(() => {
    const controller = new AbortController();
    async function loadAttendance() {
      setLoading(true);
      setError('');
      try {
        const query = view === 'daily'
          ? `date=${encodeURIComponent(selectedDate)}`
          : `month=${encodeURIComponent(selectedDate.slice(0, 7))}`;
        const response = await fetch(`http://localhost/One-Convenience/backend/api/getattendance.php?${query}`, { signal: controller.signal });
        const result = await response.json() as AttendanceResponse;
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load attendance.');
        setRows(result.attendance || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setRows([]);
        setError(err instanceof Error ? err.message : 'Unable to load attendance.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadAttendance();
    return () => controller.abort();
  }, [selectedDate, view]);

  const staff = useMemo(() => {
    const unique = new Map<number, AttendanceRow>();
    rows.forEach((row) => { if (!unique.has(Number(row.user_id))) unique.set(Number(row.user_id), row); });
    return Array.from(unique.values());
  }, [rows]);

  const headingDate = view === 'daily'
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString()
    : new Date(`${selectedDate.slice(0, 7)}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const displayRows = view === 'daily' ? rows : rows.filter((row) => row.clock_in || row.clock_out);

  return (
    <div className="flex min-h-screen bg-[#cfdcfc] text-slate-800 antialiased" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Sidebar />
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto text-left">
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider">Staff Attendance</h1>
        </header>

        <form className="bg-white p-3 rounded-[1rem] shadow-sm flex flex-wrap items-center gap-4" onSubmit={(event) => event.preventDefault()}>
          <label className="flex items-center gap-3 border-2 border-gray-100 p-2 rounded-xl px-4 font-bold text-gray-600 text-sm tracking-wide">
            <Calendar size={18} className="text-[#1A3E7A]" />
            <span className="sr-only">Attendance date</span>
            <input aria-label="Attendance date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="outline-none" />
          </label>
          <button type="button" onClick={() => setSelectedDate(localDateValue())} className="border-2 border-gray-100 px-6 py-2 rounded-xl font-bold text-xs uppercase text-gray-500 hover:bg-gray-50 tracking-wider">Today</button>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => setView('daily')} className={`px-8 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${view === 'daily' ? 'bg-[#0056b3] text-white shadow-lg' : 'border-2 border-gray-100 text-gray-500 hover:bg-gray-50'}`}>Daily View</button>
            <button type="button" onClick={() => setView('monthly')} className={`px-8 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${view === 'monthly' ? 'bg-[#0056b3] text-white shadow-lg' : 'border-2 border-gray-100 text-gray-500 hover:bg-gray-50'}`}>Monthly View</button>
          </div>
        </form>

        <div className="bg-white rounded-[1rem] shadow-sm border-2 border-gray-50 overflow-x-auto min-h-[300px]">
          <div className="px-6 py-3 text-sm font-bold text-gray-500">{view === 'daily' ? headingDate : `Attendance for ${headingDate}`}</div>
          <table className="w-full text-left">
            <thead className="bg-[#17347a] text-white font-bold uppercase text-[12px] tracking-wider">
              <tr>
                <th className="p-5 font-extrabold"><span className="inline-flex items-center gap-2"><User size={16}/> Staff ID</span></th>
                <th className="p-5 font-extrabold">Staff Name</th>
                {view === 'monthly' && <th className="p-5 font-extrabold">Date</th>}
                <th className="p-5 font-extrabold">Time In</th>
                <th className="p-5 font-extrabold">Time Out</th>
                <th className="p-5 font-extrabold">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-50 font-bold text-gray-700 text-sm">
              {loading ? <tr><td colSpan={view === 'monthly' ? 6 : 5} className="p-10 text-center text-gray-400">Loading attendance…</td></tr>
                : error ? <tr><td colSpan={view === 'monthly' ? 6 : 5} className="p-10 text-center text-red-600">{error}</td></tr>
                  : displayRows.length === 0 ? <tr><td colSpan={view === 'monthly' ? 6 : 5} className="p-10 text-center text-gray-400">No attendance records for this {view === 'daily' ? 'date' : 'month'}.</td></tr>
                    : displayRows.map((row, index) => {
                      const timeIn = row.clock_in;
                      const timeOut = row.clock_out;
                      return <tr key={`${row.user_id}-${row.date}-${row.clock_in || index}`} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5 font-mono text-xs text-gray-600">{row.staff_id || 'ID not assigned'}</td>
                        <td className="p-5 font-extrabold text-gray-800">{row.first_name} {row.last_name}</td>
                        {view === 'monthly' && <td className="p-5">{row.date ? new Date(`${row.date}T00:00:00`).toLocaleDateString() : '--'}</td>}
                        <td className={`p-5 font-semibold ${timeIn ? 'text-green-600' : 'text-gray-400'}`}>{formatTime(timeIn)}</td>
                        <td className={`p-5 font-semibold ${timeOut ? 'text-red-600' : (timeIn ? 'text-blue-600' : 'text-gray-400')}`}>{timeIn ? (timeOut ? formatTime(timeOut) : 'Active') : '--'}</td>
                        <td className="p-5 font-semibold text-gray-600">{calculateDuration(timeIn, timeOut)}</td>
                      </tr>;
                    })}
            </tbody>
          </table>
        </div>

        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6">
          <h2 className="text-lg font-extrabold ml-2 uppercase tracking-wider">Staff Directory</h2>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
          {loading ? <div className="col-span-3 p-10 text-center text-gray-400 font-semibold">Loading staff…</div>
            : error ? <div className="col-span-3 p-10 text-center text-red-600 font-semibold">{error}</div>
              : staff.length === 0 ? <div className="col-span-3 p-10 text-center text-gray-400 font-semibold">No staff found</div>
                : staff.map((member) => <div key={member.user_id} className="bg-white rounded-[2rem] shadow-lg flex flex-col overflow-hidden border border-gray-100">
                  <div className="relative p-6 flex items-center gap-5">
                    <div className="absolute bottom-6 left-0 w-full h-10 bg-[#1A3E7A]" />
                    <div className="relative z-10 w-24 h-24 rounded-full border-[8px] border-[#FDB813] overflow-hidden bg-white shadow-xl shrink-0">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.first_name)}`} className="w-full h-full object-cover" alt={`${member.first_name} ${member.last_name}`} />
                    </div>
                    <div className="relative z-10 flex flex-col justify-end h-24">
                      <h3 className="font-extrabold text-[#1A3E7A] uppercase text-[15px] leading-tight mb-4 tracking-tight">{member.first_name} {member.last_name}</h3>
                      <div className="h-10 flex items-center"><p className="text-white font-black text-sm tracking-widest pl-1 leading-none font-mono">{member.staff_id || 'ID not assigned'}</p></div>
                    </div>
                  </div>
                  <div className="w-[90%] mx-auto h-[1px] bg-gray-100 mt-2" />
                  <div className="w-full py-4 flex items-center justify-center gap-2 text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Staff member <Edit3 size={12} /></div>
                </div>)}
        </div>
      </main>
    </div>
  );
}
