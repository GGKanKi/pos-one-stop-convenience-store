import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Calendar, User, Edit3, Users } from 'lucide-react';

type AttendanceRow = {
  user_id: number;
  attendance_id: number | null;
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
  return new Date(value.replace(' ', 'T'));
}

function formatTime(value: string | null): string {
  if (!value) return '--';
  if (value.includes(':')) {
    if (value.includes(' ') || value.includes('T')) {
      return parseDateTime(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return value;
  }
  return value;
}

function formatDateCell(row: AttendanceRow): string {
  if (row.date) {
    const [year, month, day] = row.date.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return row.date;
  }
  if (row.clock_in && row.clock_in.includes('-')) {
    const datePart = row.clock_in.split(' ')[0];
    const [year, month, day] = datePart.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
  }
  return '--';
}

function calculateDuration(clockIn: string | null, clockOut: string | null): string {
  if (!clockIn) return '--';
  const start = clockIn.includes(' ') || clockIn.includes('T') ? parseDateTime(clockIn).getTime() : Date.now();
  const end = clockOut && (clockOut.includes(' ') || clockOut.includes('T')) ? parseDateTime(clockOut).getTime() : Date.now();
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
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB')
    : new Date(`${selectedDate.slice(0, 7)}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Keep the directory complete, and show only one (latest) attendance row per staff per day.
  const displayRows = view === 'daily'
    ? Array.from(rows.reduce((unique, row) => {
        if (row.clock_in || row.clock_out) {
          const key = String(row.user_id) + '-' + (row.date || selectedDate);
          if (!unique.has(key)) unique.set(key, row);
        }
        return unique;
      }, new Map<string, AttendanceRow>()).values())
    : rows.filter((row) => row.clock_in || row.clock_out);

  return (
    <div className="flex min-h-screen bg-[#cfdcfc] text-slate-800 antialiased" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Sidebar />
      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto text-left">
        
        {/* 1. HEADER */}
       <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            Staff Attendance
          </h1>
        </header>

        {/* 2. CONTROL PANEL & FILTERS */}
        <form className="bg-[#b0c8fa] p-4 rounded-2xl shadow-lg border border-black/10 flex flex-wrap items-center justify-between gap-4" onSubmit={(event) => event.preventDefault()}>
          <div className="flex flex-wrap items-center gap-3 bg-[#17347a] p-2.5 rounded-xl border border-white/10">
            <label className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border-2 border-transparent focus-within:border-blue-400 cursor-pointer shadow-inner">
              <Calendar size={16} className="text-[#17347a]" />
              <span className="sr-only">Attendance date</span>
              <input aria-label="Attendance date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-transparent text-gray-800 font-bold text-xs outline-none cursor-pointer" />
            </label>
            <button type="button" onClick={() => setSelectedDate(localDateValue())} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition active:scale-95 shadow-md">Today</button>
          </div>

          <div className="flex gap-2 bg-[#17347a] p-1.5 rounded-xl border border-white/10">
            <button type="button" onClick={() => setView('daily')} className={`px-4 py-1.5 rounded-lg font-extrabold text-xs uppercase tracking-wider transition-all active:scale-95 ${view === 'daily' ? 'bg-white text-[#17347a] shadow-md' : 'text-blue-200 hover:text-white'}`}>Daily View</button>
            <button type="button" onClick={() => setView('monthly')} className={`px-4 py-1.5 rounded-lg font-extrabold text-xs uppercase tracking-wider transition-all active:scale-95 ${view === 'monthly' ? 'bg-white text-[#17347a] shadow-md' : 'text-blue-200 hover:text-white'}`}>Monthly View</button>
          </div>
        </form>

        {/* 3. ATTENDANCE DATA TABLE */}
        <div className="bg-[#17347a] rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-[#132a63] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-blue-200 border-b border-blue-900 flex items-center justify-between">
            <span>{view === 'daily' ? `Daily Logs for ${headingDate}` : `Attendance Summary for ${headingDate}`}</span>
            <span className="bg-blue-800/80 text-white text-[10px] px-2.5 py-0.5 rounded-full border border-blue-400/30 font-bold">{displayRows.length} Records</span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#17347a] text-white font-bold uppercase text-[11px] tracking-wider z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-blue-900"><span className="inline-flex items-center gap-1.5"><User size={14}/> Staff ID</span></th>
                  <th className="py-3 px-4 border-b border-blue-900">Staff Name</th>
                  <th className="py-3 px-4 border-b border-blue-900 text-center">Date</th>
                  <th className="py-3 px-4 border-b border-blue-900 text-center">Time In</th>
                  <th className="py-3 px-4 border-b border-blue-900 text-center">Time Out</th>
                  <th className="py-3 px-4 border-b border-blue-900 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400 italic">Loading attendance records...</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="py-12 text-center text-red-600 font-bold">{error}</td></tr>
                ) : displayRows.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400 italic">No attendance records found for this {view === 'daily' ? 'date' : 'month'}.</td></tr>
                ) : (
                  displayRows.map((row, index) => {
                    const timeIn = row.clock_in;
                    const timeOut = row.clock_out;
                    return (
                      <tr key={row.attendance_id ?? `${row.user_id}-${row.date}-${index}`} className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'} hover:bg-blue-100/50 transition-colors`}>
                        <td className="py-3 px-4 font-mono font-bold text-gray-500">{row.staff_id || 'ID NOT ASSIGNED'}</td>
                        <td className="py-3 px-4 font-bold text-gray-800">{row.first_name} {row.last_name}</td>
                        
                        {/* Date Cell */}
                        <td className="py-3 px-4 text-center font-semibold text-gray-600">
                          {formatDateCell(row)}
                        </td>

                        {/* Time In Badge */}
                        <td className="py-3 px-4 text-center">
                          {timeIn ? (
                            <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                              {formatTime(timeIn)}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-semibold">--</span>
                          )}
                        </td>

                        {/* Time Out Badge */}
                        <td className="py-3 px-4 text-center">
                          {timeIn ? (
                            timeOut ? (
                              <span className="inline-flex items-center bg-red-100 text-red-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-red-300">
                                {formatTime(timeOut)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center bg-blue-100 text-blue-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-300 animate-pulse">
                                Active Shift
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 font-semibold">--</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-gray-800">{calculateDuration(timeIn, timeOut)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. DIRECTORY HEADER */}
        <header className="bg-[#17347a] text-white p-3.5 rounded-xl shadow-md border-b-4 border-blue-900 mt-4 flex justify-between items-center">
          <h2 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            <Users size={20} className="text-blue-300" />
            Staff Directory
          </h2>
        </header>

        {/* 5. STAFF CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-10">
          {loading ? (
            <div className="col-span-3 py-10 text-center text-gray-500 font-bold">Loading staff directory...</div>
          ) : error ? (
            <div className="col-span-3 py-10 text-center text-red-600 font-bold">{error}</div>
          ) : staff.length === 0 ? (
            <div className="col-span-3 py-10 text-center text-gray-500 font-bold">No staff members found</div>
          ) : (
            staff.map((member) => (
              <div key={member.user_id} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                <div className="relative p-5 flex items-center gap-4 bg-gradient-to-r from-blue-50/50 to-transparent">
                  <div className="relative z-10 w-20 h-20 rounded-full border-4 border-[#FDB813] overflow-hidden bg-white shadow-md shrink-0">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.first_name)}`} className="w-full h-full object-cover" alt={`${member.first_name} ${member.last_name}`} />
                  </div>
                  <div className="relative z-10 flex flex-col justify-center">
                    <h3 className="font-extrabold text-[#17347a] uppercase text-sm leading-tight mb-1">{member.first_name} {member.last_name}</h3>
                    <div className="bg-[#17347a] text-white px-2.5 py-0.5 rounded-md self-start border border-blue-900 shadow-sm">
                      <p className="font-mono font-bold text-[11px] tracking-wider">{member.staff_id || 'ID NOT ASSIGNED'}</p>
                    </div>
                  </div>
                </div>
                <div className="w-[90%] mx-auto h-[1px] bg-gray-100" />
                <div className="w-full py-3 bg-gray-50/50 flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">
                  Staff Member <Edit3 size={12} className="text-blue-600" />
                </div>
              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
}
