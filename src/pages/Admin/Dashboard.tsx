import { type LucideIcon, AlertCircle, TrendingUp, DollarSign, Award } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans text-gray-800">
      
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-6">
        
        {/* Dashboard Header Bar */}
         <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Dashboard</h1>
        </header>

        {/* Low Stock Alert Section */}
        <section>
          <div className="flex items-center gap-2 mb-2 ml-1 text-left">
            <AlertCircle size={18} className="text-gray-600" />
            <h2 className="font-bold text-gray-700">Low Stock Alert</h2>
          </div>
          <div className="bg-[#D9E4EC] border border-gray-300 h-36 rounded-2xl shadow-inner flex items-center justify-center text-gray-400 italic text-sm">
            No items are currently low on stock
          </div>
        </section>

        {/* Sales Overview Section */}
        <section>
          <h2 className="font-bold text-gray-800 mb-4 ml-1 text-left">Sales Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Gross Sales" value="₱0" Icon={TrendingUp} />
            <StatCard label="Net Profit" value="₱0" Icon={DollarSign} />
            <StatCard label="Best Seller" value="..." Icon={Award} />
          </div>
        </section>

        {/* Bottom Lists */}
        <div className="grid grid-cols-1 gap-6 text-left">
          <div className="flex flex-col">
            <h3 className="font-bold text-gray-700 mb-2 ml-1">Top Selling Products</h3>
            <div className="bg-[#D9E4EC] border border-gray-300 h-32 rounded-2xl shadow-inner"></div>
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-gray-700 mb-2 ml-1">Latest Inventory Transactions</h3>
            <div className="bg-[#D9E4EC] border border-gray-300 h-32 rounded-2xl shadow-inner"></div>
          </div>
        </div>

      </main>
    </div>
  );
}

function StatCard({ label, value, Icon }: { label: string, value: string, Icon: LucideIcon }) {
  return (
    <div className="bg-[#2460A7] text-white p-6 rounded-[1.5rem] flex items-center justify-between shadow-lg border border-white/5 
      cursor-pointer transition-all duration-300 
      hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)]">
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