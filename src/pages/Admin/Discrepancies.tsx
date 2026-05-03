import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { 
  Scale, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';

export default function Discrepancies() {
  const [activeFilter, setActiveFilter] = useState('All');

  const summaryCards = [
    { label: 'TOTAL DISCREPANCIES', count: 0, icon: AlertCircle },
    { label: 'UNRESOLVED ISSUES', count: 0, icon: Scale },
    { label: 'RESOLVED ISSUES', count: 0, icon: CheckCircle2 },
  ];

  const filters = [
    { label: "All", count: 0 },
    { label: "Pending", count: 0 },
    { label: "Resolved", count: 0 },
  ];

  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans" style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}>
      
      {/* Sidebar */}
      <Sidebar />
      
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto text-left">
        
        {/* Header */}
        <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">
            Inventory Discrepancies
          </h1>
          <Scale size={20} className="opacity-50 mr-2" />
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryCards.map((card, i) => (
            <div key={i} className="bg-[#0056b3] p-6 rounded-2xl shadow-lg relative overflow-hidden group border-b-4 border-blue-900 transition-transform hover:scale-[1.02]">
              <div className="relative z-10 text-left">
                <p className="text-white/70 text-[11px] font-black tracking-widest mb-1 uppercase">
                  {card.label}
                </p>
                <h3 className="text-4xl font-black text-white">
                  {card.count}
                </h3>
              </div>
              <card.icon className="absolute right-[-5px] bottom-[-5px] text-white/10 group-hover:text-white/20 transition-all" size={70} />
            </div>
          ))}
        </div>

        {/* Discrepancy Card UI */}
        <section className="flex-1 flex items-center justify-center mb-6">
          
          <div className="w-full max-w-7xl bg-white rounded-[2rem] border border-gray-200 shadow-md p-6">

            {/* Tabs */}
            <div className="grid grid-cols-3 gap-3 mb-6 w-full">
              {filters.map((filter, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFilter(filter.label)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all
                  ${activeFilter === filter.label 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-16 text-center">
              
              <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gray-100 mb-4">
                <CheckCircle2 size={36} className="text-gray-400" />
              </div>

              <h2 className="text-lg font-bold text-gray-700">
                No Discrepancies Found
              </h2>

              <p className="text-gray-400 text-sm mt-1">
                All inventory counts are accurate
              </p>

            </div>

          </div>

        </section>

      </main>
    </div>
  );
}