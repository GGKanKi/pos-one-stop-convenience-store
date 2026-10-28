import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  FileSpreadsheet, 
  FileText, 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  Search,
  Filter
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { exportCsv, exportWorkbook } from '../../services/spreadsheet';

const API_BASE = "http://localhost/One-Convenience/backend/api";

interface SalesReportItem {
  id: string;
  inventoryName: string;
  qtySold: number;
  avgCostPrice: number;
  avgSellingPrice: number;
  grossSales: number;
  totalCost: number;
  salesProfit: number;
}

export default function SalesProfit() {
  const location = useLocation();
  const navigate = useNavigate();

  const isFullScreen = location.state?.fullScreen;

  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [reportData, setReportData] = useState<SalesReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  const fetchSalesProfitReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/salesprofit.php?from=${fromDate}&to=${toDate}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setReportData(result.data);
        } else {
          setReportData([]);
        }
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error("Failed to fetch sales profit data:", err);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

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
    void fetchSalesProfitReport();
  }, [fetchSalesProfitReport]);

  const filteredData = reportData.filter(item =>
    item.inventoryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGrossSales = filteredData.reduce((sum, item) => sum + item.grossSales, 0);
  const totalCost = filteredData.reduce((sum, item) => sum + item.totalCost, 0);
  const totalProfit = filteredData.reduce((sum, item) => sum + item.salesProfit, 0);

  const handleGenerate = () => {
    void fetchSalesProfitReport();
  };

  const salesRows = [
    ['Product', 'Quantity Sold', 'Average Cost', 'Average Selling Price', 'Gross Sales', 'Total Cost', 'Profit'],
    ...filteredData.map((item) => [
      item.inventoryName,
      Number(item.qtySold),
      Number(item.avgCostPrice),
      Number(item.avgSellingPrice),
      Number(item.grossSales),
      Number(item.totalCost),
      Number(item.salesProfit),
    ]),
    [],
    ['Totals', '', '', '', totalGrossSales, totalCost, totalProfit],
  ];

  const handleExportExcel = () => {
    exportWorkbook(`sales-profit-${fromDate}-to-${toDate}.xlsx`, [{ name: 'Sales Profit', rows: salesRows }]);
  };
  const handleExportCSV = () => {
    exportCsv(`sales-profit-${fromDate}-to-${toDate}.csv`, salesRows);
  };

  return (
    <div 
      className="flex min-h-screen bg-[#cfdcfc] text-gray-800 antialiased" 
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {!isFullScreen && <Sidebar />}

      <main className="flex-1 p-6 flex flex-col gap-5 text-left overflow-x-hidden">
        
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider">Sales Profit</h1>

          {isFullScreen && (
            <button 
              onClick={() => navigate(-1)} 
              className="mr-2 flex items-center gap-2 bg-white text-[#17347a] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-100 transition shadow-sm active:scale-95"
              type="button"
            >
              <ArrowLeft size={14} />
              BACK TO POS
            </button>
          )}
        </header>

        {/* CONTROL PANEL */}
        <div className="bg-[#b0c8fa] text-white p-4 rounded-2xl shadow-lg border border-black/10 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3 bg-[#17347a] p-2.5 rounded-xl border border-white/10">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-200 ml-1">Select Date:</span>
            
            <div className="flex flex-col relative">
              <label className="text-[10px] text-blue-300 font-semibold mb-0.5 ml-1">FROM</label>
              <div className="relative cursor-pointer">
                <div className="bg-white text-gray-800 font-bold text-xs px-3 py-1.5 rounded-lg border-2 border-transparent shadow-inner flex items-center justify-between gap-3 min-w-[130px]">
                  <span>{formatDateDisplay(fromDate)}</span>
                  <Calendar size={14} className="text-gray-600" />
                </div>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>

            <span className="text-blue-300 font-bold mt-4">-</span>

            <div className="flex flex-col relative">
              <label className="text-[10px] text-blue-300 font-semibold mb-0.5 ml-1">TO</label>
              <div className="relative cursor-pointer">
                <div className="bg-white text-gray-800 font-bold text-xs px-3 py-1.5 rounded-lg border-2 border-transparent shadow-inner flex items-center justify-between gap-3 min-w-[130px]">
                  <span>{formatDateDisplay(toDate)}</span>
                  <Calendar size={14} className="text-gray-600" />
                </div>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              type="button"
              className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Filter size={14} />
              Generate
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-gray-800 text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportExcel}
              className="flex flex-col items-center justify-center bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-xl transition text-white active:scale-95 shadow-md cursor-pointer"
              title="Export to Excel"
              type="button"
            >
              <FileSpreadsheet size={18} />
              <span className="text-[10px] font-bold mt-0.5">XLSX</span>
            </button>

            <button 
              onClick={handleExportCSV}
              className="flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition text-white active:scale-95 shadow-md cursor-pointer"
              title="Export to CSV"
              type="button"
            >
              <FileText size={18} />
              <span className="text-[10px] font-bold mt-0.5">CSV</span>
            </button>
          </div>

        </div>

        {/* SUMMARY CARDS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[#17347a] text-white p-5 rounded-2xl flex items-center justify-between shadow-lg border border-white/10">
            <div>
              <p className="text-[11px] uppercase font-extrabold text-blue-200 tracking-wider">Gross Sales</p>
              <h3 className="text-2xl font-black mt-1 text-red-400">₱{totalGrossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-[#1a3e7a] p-3 rounded-xl border border-white/10">
              <TrendingUp size={24} className="text-red-400" />
            </div>
          </div>

          <div className="bg-[#17347a] text-white p-5 rounded-2xl flex items-center justify-between shadow-lg border border-white/10">
            <div>
              <p className="text-[11px] uppercase font-extrabold text-blue-200 tracking-wider">Total Cost</p>
              <h3 className="text-2xl font-black mt-1 text-sky-400">₱{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-[#1a3e7a] p-3 rounded-xl border border-white/10">
              <DollarSign size={24} className="text-sky-400" />
            </div>
          </div>

          <div className="bg-[#17347a] text-white p-5 rounded-2xl flex items-center justify-between shadow-lg border border-white/10">
            <div>
              <p className="text-[11px] uppercase font-extrabold text-blue-200 tracking-wider">Sales Profit</p>
              <h3 className="text-2xl font-black mt-1 text-orange-400">₱{totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-[#1a3e7a] p-3 rounded-xl border border-white/10">
              <DollarSign size={24} className="text-orange-400" />
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#17347a] text-white font-bold uppercase text-[11px] tracking-wider z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-blue-900">Inventory Name</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-center">Qty Sold</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-right">Average Cost Price</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-right">Average Selling Price</th>
                  <th className="py-3 px-4 border-b border-blue-900 text-right">Gross Sales</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-right">Total Cost</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-right">Sales Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 italic">
                      Loading sales profit report...
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'} hover:bg-blue-100/50 transition-colors`}
                    >
                      <td className="py-2.5 px-4 font-bold text-gray-800">{item.inventoryName}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-blue-900">{item.qtySold.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">₱{item.avgCostPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">₱{item.avgSellingPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-800">₱{item.grossSales.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-600">₱{item.totalCost.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">₱{item.salesProfit.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 italic">
                      No report records found for the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
              
              <tfoot className="sticky bottom-0 bg-blue-100 border-t-2 border-blue-900 font-black text-gray-900 text-xs">
                <tr>
                  <td className="py-3 px-4 uppercase tracking-wider text-blue-950">TOTAL</td>
                  <td className="py-3 px-3 text-center text-blue-950">
                    {filteredData.reduce((acc, curr) => acc + curr.qtySold, 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-400">-</td>
                  <td className="py-3 px-3 text-right text-gray-400">-</td>
                  <td className="py-3 px-3 text-right text-blue-900 font-black">
                    ₱{totalGrossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-800 font-black">
                    ₱{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-black">
                    ₱{totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
