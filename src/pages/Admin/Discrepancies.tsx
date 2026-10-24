import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface DiscrepancyItem {
  id: number;
  productName: string;
  barcode: string;
  category: string;
  expectedStock: number;
  actualStock: number;
  difference: number;
  status: 'Pending' | 'Resolved';
  dateChecked: string;
}

export default function Discrepancies() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("inventory_discrepancies");
    if (saved) {
      try {
        setDiscrepancies(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse discrepancies", e);
      }
    }
  }, []);

  const handleResolve = (id: number) => {
    const updated = discrepancies.map((item) => 
      item.id === id ? { ...item, status: 'Resolved' as const } : item
    );
    setDiscrepancies(updated);
    localStorage.setItem("inventory_discrepancies", JSON.stringify(updated));
  };

  const handleDelete = (id: number) => {
    const updated = discrepancies.filter((item) => item.id !== id);
    setDiscrepancies(updated);
    localStorage.setItem("inventory_discrepancies", JSON.stringify(updated));
  };

  const totalCount = discrepancies.length;
  const unresolvedCount = discrepancies.filter(d => d.status === 'Pending').length;
  const resolvedCount = discrepancies.filter(d => d.status === 'Resolved').length;

  const filteredDiscrepancies = discrepancies.filter((item) => {
    if (activeFilter === 'Pending') return item.status === 'Pending';
    if (activeFilter === 'Resolved') return item.status === 'Resolved';
    return true;
  });

  const summaryCards = [
    { label: 'TOTAL DISCREPANCIES', count: totalCount, icon: AlertCircle, bg: 'from-blue-600 to-indigo-700' },
    { label: 'UNRESOLVED ISSUES', count: unresolvedCount, icon: Scale, bg: 'from-amber-500 to-orange-600' },
    { label: 'RESOLVED ISSUES', count: resolvedCount, icon: CheckCircle2, bg: 'from-emerald-600 to-teal-700' },
  ];

  const filters = [
    { label: "All", count: totalCount },
    { label: "Pending", count: unresolvedCount },
    { label: "Resolved", count: resolvedCount },
  ];

  return (
    <div className="flex min-h-screen bg-[#cfdcfc] text-gray-800 antialiased" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Sidebar />
      
      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto text-left">
        
        {/* Header */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            Inventory Discrepancies
          </h1>
          <Scale size={20} className="opacity-50 mr-2" />
        </header>

        {/* Summary 3 Box Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-white p-5 rounded-2xl shadow-md border border-gray-200 relative overflow-hidden group hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-[11px] font-black tracking-wider mb-1 uppercase">
                      {card.label}
                    </p>
                    <h3 className="text-3xl font-black text-[#17347a]">
                      {card.count}
                    </h3>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.bg} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Discrepancy Card UI */}
        <section className="flex-1 flex flex-col mb-2">
          <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-md p-6 flex flex-col gap-5">

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-[#b0c8fa]/50 p-1.5 rounded-xl border border-blue-100 w-full max-w-md">
              {filters.map((filter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveFilter(filter.label)}
                  className={`flex-1 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    activeFilter === filter.label 
                      ? 'bg-[#17347a] text-white shadow-md' 
                      : 'text-blue-900 hover:bg-white/60'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Content Table or Empty State */}
            {filteredDiscrepancies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 mb-3 shadow-xs">
                  <CheckCircle2 size={30} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-wide text-gray-800">
                  No Discrepancies Found
                </h2>
                <p className="text-gray-400 text-xs mt-1 max-w-sm font-medium">
                  {activeFilter === 'All' 
                    ? 'All inventory counts from your latest check matched expected stock levels perfectly.' 
                    : `No ${activeFilter.toLowerCase()} discrepancy records found.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#17347a] text-white font-black uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="p-3.5 pl-4">Product Name</th>
                      <th className="p-3.5">Barcode</th>
                      <th className="p-3.5 text-center">Expected</th>
                      <th className="p-3.5 text-center">Actual Count</th>
                      <th className="p-3.5 text-center">Difference</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
                    {filteredDiscrepancies.map((item) => (
                      <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-3.5 pl-4 font-black text-[#17347a]">
                          {item.productName}
                        </td>
                        <td className="p-3.5 font-mono text-gray-500 font-medium">
                          {item.barcode}
                        </td>
                        <td className="p-3.5 text-center text-gray-700 font-bold">
                          {item.expectedStock}
                        </td>
                        <td className="p-3.5 text-center text-[#17347a] font-black">
                          {item.actualStock}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black ${
                            item.difference < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <AlertTriangle size={11} />
                            {item.difference < 0 ? `SHORT (${item.difference})` : `OVER (+${item.difference})`}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center pr-4">
                          <div className="flex items-center justify-center gap-2">
                            {item.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => handleResolve(item.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-emerald-500 transition active:scale-95 shadow-xs cursor-pointer"
                                title="Mark as Resolved"
                              >
                                <Check size={12} /> Resolve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg bg-gray-100 text-red-600 hover:bg-red-50 hover:text-red-700 transition active:scale-95 cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </section>

      </main>
    </div>
  );
}