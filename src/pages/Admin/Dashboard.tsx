import React, { useEffect } from 'react';
import { type LucideIcon, AlertCircle, TrendingUp, DollarSign, Award, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we came from POS with the fullScreen flag
  const isFullScreen = location.state?.fullScreen;

  // Load Inter font dynamically
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

  return (
    <div 
      className="flex min-h-screen bg-[#cfdcfc] text-gray-800 antialiased" 
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      
      {/* 1. SIDEBAR: Only show if NOT in full screen mode */}
      {!isFullScreen && <Sidebar />}

      <main className="flex-1 p-6 flex flex-col gap-6 text-left">
        
        {/* 2. HEADER */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider">
            {isFullScreen ? "Store Analytics" : "Dashboard"}
          </h1>

          {isFullScreen && (
            <button 
              onClick={() => navigate(-1)} 
              className="mr-2 flex items-center gap-2 bg-white text-[#0056b3] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-100 transition shadow-sm active:scale-95"
              type="button"
            >
              <ArrowLeft size={14} />
              BACK TO POS
            </button>
          )}
        </header>

        {/* Low Stock Alert Section */}
        <section>
          <div className="flex items-center gap-2 mb-2 ml-1">
            <AlertCircle size={18} className="text-gray-600" />
            <h2 className="font-extrabold text-gray-700 tracking-tight">Low Stock Alert</h2>
          </div>
          <div className="bg-[#ffffff] border border-gray-300 h-36 rounded-2xl shadow-inner flex items-center justify-center text-gray-400 italic text-sm font-medium">
            No items are currently low on stock
          </div>
        </section>

        {/* Sales Overview Section */}
        <section>
          <h2 className="font-extrabold text-gray-800 mb-4 ml-1 tracking-tight">Sales Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Gross Sales" value="₱0" Icon={TrendingUp} />
            <StatCard label="Net Profit" value="₱0" Icon={DollarSign} />
            <StatCard label="Best Seller" value="..." Icon={Award} />
          </div>
        </section>

        {/* Bottom Lists */}
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col">
            <h3 className="font-bold text-gray-700 mb-2 ml-1">Top Selling Products</h3>
            <div className="bg-[#ffffff] border border-gray-300 h-32 rounded-2xl shadow-inner"></div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-gray-700 mb-2 ml-1">Latest Inventory Transactions</h3>
            <div className="bg-[#ffffff] border border-gray-300 h-32 rounded-2xl shadow-inner"></div>
          </div>
        </div>

      </main>
    </div>
  );
}

function StatCard({ label, value, Icon }: { label: string, value: string, Icon: LucideIcon }) {
  return (
    <div className="bg-[#17347a] text-white p-6 rounded-[1.5rem] flex items-center justify-between shadow-lg border border-white/5 
      cursor-pointer transition-all duration-300  
      hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)]">
      <div className="text-left">  
        <p className="text-[10px] uppercase font-extrabold opacity-80 tracking-widest">{label}</p>
        <h3 className="text-3xl font-black mt-1 leading-tight tracking-tight">{value}</h3>
      </div>
      <div className="bg-[#1A3E7A] p-3 rounded-xl border border-white/10 shadow-inner">
        <Icon size={24} />
      </div>
    </div>
  );
}