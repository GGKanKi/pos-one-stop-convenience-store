import { type LucideIcon, TrendingUp, Award, Clock, Users, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

export default function StaffDashboard() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayStatus, setTodayStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();
  const staffId = localStorage.getItem('staff_id') || '';

  // Determine if dashboard should be full screen (no sidebar) based on POS state
  const isFullScreen = location.state?.fullScreen || false;

  const fetchData = async () => {
    try {
      setLoading(true);
      const staffRes = await fetch('http://localhost/One-Convenience/backend/api/getstaff.php');
      const staffData = await staffRes.json();
      if (staffData.success) setStaffList(staffData.staff);

      if (staffId) {
        const attRes = await fetch('http://localhost/One-Convenience/backend/api/getattendance.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: staffId })
        });
        const attData = await attRes.json();
        if (attData.success) {
          setAttendance(attData.attendance);
          setTodayStatus(attData.today_status);
        }
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [staffId]);

  const handleClockOut = async () => {
    if (!staffId) return alert('No staff ID found.');
    try {
      const res = await fetch('http://localhost/One-Convenience/backend/api/clockout.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('staff_id');
        fetchData();
        alert(data.message);
      }
    } catch (error) {
      console.error('Clock out error:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans text-gray-800">
      {/* 1. Only render Sidebar if we are NOT in full screen mode */}
      {!isFullScreen && <Sidebar />}
      
      {/* 2. Padding adjusts based on whether sidebar is present */}
      <main className={`flex-1 flex flex-col gap-6 ${isFullScreen ? 'p-10' : 'p-6'}`}>
        <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 flex justify-between items-center">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Staff Dashboard</h1>
          
          {/* 3. Helper button to exit full screen and go back to POS */}
          {isFullScreen && (
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 bg-white text-[#0056b3] px-4 py-1 rounded-lg text-xs font-black hover:bg-gray-200 transition"
            >
              <ArrowLeft size={14} /> EXIT TO POS
            </button>
          )}
        </header>

        {/* Staff Directory */}
        <section>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <Users size={18} className="text-gray-600" />
            <h2 className="font-bold text-gray-700">Staff Directory ({staffList.length})</h2>
          </div>
          {loading ? (
            <div className="bg-[#D9E4EC] border border-gray-300 h-48 rounded-2xl shadow-inner animate-pulse flex items-center justify-center text-gray-400 italic">
              Loading staff...
            </div>
          ) : (
            <div className={`grid gap-4 max-h-64 overflow-y-auto bg-white rounded-2xl shadow-lg p-4 border ${isFullScreen ? 'grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
              {staffList.map((staff) => (
                <div key={staff.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                  <img src={staff.avatar || '/pictures/avatar1.jpg'} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-sm">{staff.first_name} {staff.last_name}</p>
                    <p className="text-xs text-gray-500 uppercase">{staff.staff_id || 'ID not set'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-gray-800 mb-4 ml-1">Time Tracking</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard label="Total Shifts" value={attendance.length.toString()} Icon={TrendingUp} />
            <StatCard label="Present Days" value={attendance.filter((a: any) => a.clock_out).length.toString()} Icon={Clock} />
            <StatCard label="Today Status" value={todayStatus ? (todayStatus.clock_out ? 'OUT' : 'IN') : 'OFF'} Icon={Award} />
          </div>
          <button 
            onClick={handleClockOut}
            disabled={!todayStatus || !!todayStatus.clock_out || loading || !staffId}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 uppercase tracking-wide"
          >
            {todayStatus && !todayStatus.clock_out ? 'Clock Out' : 'Not Clocked In'}
          </button>
        </section>

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
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, Icon }: { label: string, value: string, Icon: any }) {
  return (
    <div className="bg-[#2460A7] text-white p-6 rounded-[1.5rem] flex items-center justify-between shadow-lg transition-all hover:scale-[1.03]">
      <div className="text-left">
        <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">{label}</p>
        <h3 className="text-3xl font-bold mt-1 leading-tight">{value}</h3>
      </div>
      <div className="bg-[#1A3E7A] p-3 rounded-xl border border-white/10">
        <Icon size={24} />
      </div>
    </div>
  );
}