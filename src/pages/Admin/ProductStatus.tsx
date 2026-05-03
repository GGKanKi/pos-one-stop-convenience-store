import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { 
  Search, CalendarOff, AlertCircle, PackageSearch, 
  RotateCcw, Filter, Calendar, ChevronLeft, ChevronRight, ScanLine 
} from 'lucide-react';

export default function ProductStatus() {
  const [activeFilter, setActiveFilter] = useState('All Products');

  const summaryCards = [
    { label: 'EXPIRED BATCHES', count: 0, icon: CalendarOff },
    { label: 'NEAR EXPIRY', count: 0, icon: AlertCircle },
  ];

  const filters = [
    { label: "All Products", count: 0 },
    { label: "Active", count: 0 },
    { label: "Expired", count: 0 },
    { label: "Near Expiry (15d)", count: 0 },
  ];

  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans" style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}>
      <Sidebar />
      
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto text-left">
        
        {/* Header Bar */}
        <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Product Status</h1>
          <PackageSearch size={20} className="opacity-50 mr-2" />
        </header>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {summaryCards.map((card, i) => (
            <div key={i} className="bg-[#0056b3] p-6 rounded-2xl shadow-lg relative overflow-hidden group border-b-4 border-blue-900 transition-transform hover:scale-[1.02]">
              <div className="relative z-10">
                <p className="text-white/70 text-[11px] font-black tracking-widest mb-1 uppercase">
                  {card.label}
                </p>
                <h3 className="text-4xl font-black text-white">{card.count}</h3>
              </div>
              <card.icon className="absolute right-[-5px] bottom-[-5px] text-white/10 group-hover:text-white/20 transition-all" size={70} />
            </div>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search or Scan barcode" 
              className="w-full pl-12 pr-12 py-3 bg-white border border-gray-800 rounded-2xl outline-none text-sm font-medium shadow-sm focus:ring-2 focus:ring-blue-500/20"
            />
            <ScanLine className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 opacity-60" size={20} />
          </div>

          <div className="flex gap-2 flex-wrap">
            {filters.map((filter, i) => (
              <button 
                key={i}
                onClick={() => setActiveFilter(filter.label)}
                className={`bg-white border border-gray-800 px-6 py-3 rounded-2xl flex items-center gap-8 shadow-sm transition-all hover:bg-gray-50 active:scale-95 ${activeFilter === filter.label ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
              >
                <span className="text-sm font-bold text-gray-800">{filter.label}</span>
                <span className="text-sm font-black text-gray-800">{filter.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Content Area */}
        <section className="flex-1 bg-white rounded-[2rem] border border-gray-800 overflow-hidden flex flex-col min-h-[400px] shadow-lg">
          {/* Vibrant Blue Header */}
          <div className="bg-[#0056b3] text-white flex items-center px-8 py-5">
            <div className="flex-1 text-sm font-bold">Product</div>
            <div className="flex-1 text-sm font-bold">Barcode</div>
            <div className="flex-1 text-sm font-bold text-center">Status</div>
            <div className="flex-1 text-sm font-bold text-center">Expiration</div>
            <div className="flex-1 text-sm font-bold text-center">Category</div>
            <div className="flex-1 text-sm font-bold text-center">Performance</div>
          </div>

          {/* Table Body / Empty State */}
          <div className="flex-1 flex flex-col">
            {/* Divider lines representing row structure */}
            <div className="border-b border-gray-200 h-20 w-full"></div>
            <div className="border-b border-gray-200 h-20 w-full"></div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <div className="w-20 h-20 bg-gray-50 rounded-[1.5rem] border-2 border-dashed border-gray-200 flex items-center justify-center mb-4 text-gray-300">
                <PackageSearch size={32} />
              </div>
              <h2 className="text-lg font-black text-[#1A3E7A] uppercase tracking-tight">No Entities Found</h2>
              <p className="text-gray-400 text-xs font-bold mt-1 text-center max-w-xs">
                No products currently match your criteria.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}