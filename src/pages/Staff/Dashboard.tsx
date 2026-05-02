import { type LucideIcon, AlertCircle, TrendingUp, DollarSign, Award, Clock, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';

export default function StaffDashboard() { // MODIFIED: Use staff_id for clock-out (auto clock-in via LoginId) - BLACKBOXAI
  const [staffList, setStaffList] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayStatus, setTodayStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  // FIXED: Use staff_id from localStorage (set by LoginId page after auto clock-in) - BLACKBOXAI
  const staffId = localStorage.getItem('staff_id') || '';

// FIXED: Enhanced fetchData with better error handling and localStorage sync - BLACKBOXAI
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Sync staff_id from localStorage if not already set (handle direct navigation)
      const storedStaffId = localStorage.getItem('staff_id');
      if (storedStaffId && !staffId) {
        // Force update - this handles case where LoginId just set it
        window.location.reload(); // Simple fix - reload to ensure fresh state
        return;
      }

      const staffRes = await fetch('http://localhost/One-Convenience/backend/api/getstaff.php');
      if (!staffRes.ok) throw new Error(`Staff fetch failed: ${staffRes.status}`);
      const staffData = await staffRes.json();
      if (staffData.success) setStaffList(staffData.staff);

      // FIXED: Use staff_id in body for getattendance - BLACKBOXAI
      if (staffId) {
        const attRes = await fetch('http://localhost/One-Convenience/backend/api/getattendance.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: staffId })
        });
        if (!attRes.ok) throw new Error(`Attendance fetch failed: ${attRes.status}`);
        const attData = await attRes.json();
        if (attData.success) {
          setAttendance(attData.attendance);
          setTodayStatus(attData.today_status);
          // FIXED: Also check localStorage for pending clock-in from LoginId - BLACKBOXAI
          const pendingClockIn = localStorage.getItem('pending_clock_in');
          if (pendingClockIn) {
            // Clear pending clock-in and refresh
            localStorage.removeItem('pending_clock_in');
          }
        }
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Always fetch on mount, handle staffId changes - BLACKBOXAI
  useEffect(() => {
    if (staffId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []); // Empty deps - always run on mount

  // Also re-fetch when staffId changes
  useEffect(() => {
    if (staffId) {
      fetchData();
    }
  }, [staffId]);

  // FIXED: Removed clock-in (handled in LoginId page), only clock-out button - BLACKBOXAI
  const handleClockOut = async () => {
    if (!staffId) {
      alert('Please enter your staff ID on Clock In page first.');
      return;
    }
    try {
      const res = await fetch('http://localhost/One-Convenience/backend/api/clockout.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId })
      });
      const data = await res.json();
      if (data.success) {
        // Clear staff_id after clock-out
        localStorage.removeItem('staff_id');
        fetchData();
        alert(data.message);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Clock out error:', error);
      alert('Clock out failed.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans text-gray-800">
      <Sidebar />
      <main className="flex-1 p-6 flex flex-col gap-6">
        <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide text-left">Staff Dashboard</h1>
        </header>

        {/* Staff Directory */}
        <section>
          <div className="flex items-center gap-2 mb-2 ml-1 text-left">
            <Users size={18} className="text-gray-600" />
            <h2 className="font-bold text-gray-700">Staff Directory ({staffList.length})</h2>
          </div>
          {loading ? (
            <div className="bg-[#D9E4EC] border border-gray-300 h-48 rounded-2xl shadow-inner animate-pulse flex items-center justify-center text-gray-400 italic">
              Loading staff...
            </div>
          ) : staffList.length === 0 ? (
            <div className="bg-[#D9E4EC] border border-gray-300 h-48 rounded-2xl shadow-inner flex items-center justify-center text-gray-400 italic">
              No staff registered yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto bg-white rounded-2xl shadow-lg p-4 border">
              {staffList.map((staff) => (
                <div key={staff.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                  <img src={staff.avatar || '/pictures/avatar1.jpg'} alt={`${staff.first_name} ${staff.last_name}`} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-sm">{staff.first_name} {staff.last_name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{staff.staff_id || 'ID not set'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

{/* Time Tracking - Only Clock Out button since LoginId handles clock-in automatically */}
        <section>
          <h2 className="font-bold text-gray-800 mb-4 ml-1 text-left">Time Tracking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <StatCard label="Total Shifts" value={attendance.length.toString()} Icon={TrendingUp} />
            <StatCard label="Present Days" value={attendance.filter((a: any) => a.clock_out).length.toString()} Icon={Clock} />
            <StatCard label="Today Status" value={todayStatus ? (todayStatus.clock_out ? 'OUT' : 'IN') : 'OFF'} Icon={Award} />
          </div>
          {/* FIXED: Removed Clock In button, only Clock Out - BLACKBOXAI */}
          <button 
            onClick={handleClockOut}
            disabled={!todayStatus || !!todayStatus.clock_out || loading || !staffId}
            className="flex-1 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
          >
            {todayStatus && !todayStatus.clock_out ? 'Clock Out' : 'Not Clocked In'}
          </button>
        </section>

        {/* Recent Attendance */}
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col">
            <h3 className="font-bold text-gray-700 mb-2 ml-1">Recent Attendance</h3>
            <div className="bg-white border border-gray-300 rounded-2xl shadow-lg p-4 max-h-48 overflow-y-auto">
              {attendance.slice(0,5).map((record) => (
                <div key={record.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0 text-sm">
                  <span>{record.date}</span>
                  <span className="font-mono text-xs">
                    {new Date(record.clock_in).toLocaleTimeString()} 
                    {record.clock_out ? ` - ${new Date(record.clock_out).toLocaleTimeString()}` : ' (open)'}
                  </span>
                </div>
              ))}
              {attendance.length === 0 && (
                <p className="text-gray-400 italic text-center py-8">No attendance records yet</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, Icon }: { label: string, value: string, Icon: LucideIcon }) {
  return (
    <div className="bg-[#2460A7] text-white p-6 rounded-[1.5rem] flex items-center justify-between shadow-lg border border-white/5 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)]">
      <div className="text-left">
        <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">{label}</p>
        <h3 className="text-3xl font-bold mt-1 leading-tight">{value}</h3>
      </div>
      <div className="bg-[#1A3E7A] p-3 rounded-xl border border-white/10 shadow-inner">
        <Icon size={24} />
      </div>
    </div>
  );
}
