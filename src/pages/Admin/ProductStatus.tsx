import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Search, 
  ArrowLeft, 
  Trash2, 
  FileSpreadsheet,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/One-Convenience/backend/api';

interface ExpiryItem {
  id: string;
  sku: string;
  inventoryName: string;
  category: string;
  quantity: number;
  unitCost: number;
  expiryDate: string; // YYYY-MM-DD
  status: 'EXPIRED' | 'NEAR_EXPIRY';
  daysRemaining: number;
}

export default function ProductStatus() {
  const location = useLocation();
  const navigate = useNavigate();

  const isFullScreen = location.state?.fullScreen;

  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPIRED' | 'NEAR_EXPIRY'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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

  const loadProductStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/getproductstatus.php`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to load product status.');
      }
      
      // Filter or tag items where near expiry uses 30 days window if calculated on frontend,
      // or map directly if backend handles the threshold. Backend PHP typically handles the day calculation.
      setItems(result.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load product status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProductStatus();
  }, [loadProductStatus]);

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    return `${month}/${day}/${year}`;
  };

  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === 'ALL' || item.status === activeTab;
    const matchesSearch = 
      item.inventoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const expiredCount = items.filter(i => i.status === 'EXPIRED').length;
  const nearExpiryCount = items.filter(i => i.status === 'NEAR_EXPIRY').length;

  const totalExpiredValue = items
    .filter(i => i.status === 'EXPIRED')
    .reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);

  const totalNearExpiryValue = items
    .filter(i => i.status === 'NEAR_EXPIRY')
    .reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);

  const handleDispose = async (id: string) => {
    if (confirm('Are you sure you want to mark this item as disposed/removed?')) {
      try {
        const response = await fetch(`${API_BASE}/updateproduct.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, stockQuantity: 0, reason: 'Expired stock disposal' })
        });
        const result = await response.json();
        if (result.success) {
          setItems(prev => prev.filter(item => item.id !== id));
        } else {
          alert(result.message || 'Failed to dispose item.');
        }
      } catch {
        setItems(prev => prev.filter(item => item.id !== id));
      }
    }
  };

  const handleExportExcel = () => alert("Exporting product status to Excel...");
  const handleExportCSV = () => alert("Exporting product status to CSV...");

  return (
    <div 
      className="flex min-h-screen bg-[#cfdcfc] text-gray-800 antialiased" 
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {!isFullScreen && <Sidebar />}

      <main className="flex-1 p-6 flex flex-col gap-5 text-left overflow-x-hidden">
        
        {/* HEADER */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            Product Status 
          </h1>

          {isFullScreen && (
            <button 
              onClick={() => navigate(-1)} 
              className="mr-2 flex items-center gap-2 bg-white text-[#17347a] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-100 transition shadow-sm active:scale-95 cursor-pointer"
              type="button"
            >
              <ArrowLeft size={14} />
              BACK TO POS
            </button>
          )}
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 shadow-xs flex items-center gap-2">
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {/* SUMMARY STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div 
            onClick={() => setActiveTab('EXPIRED')}
            className={`bg-[#17347a] text-white p-5 rounded-2xl flex items-center justify-between shadow-lg border cursor-pointer transition duration-200 ${
              activeTab === 'EXPIRED' ? 'ring-4 ring-red-400 border-white/20' : 'border-white/10 hover:scale-[1.01]'
            }`}
          >
            <div>
              <p className="text-[11px] uppercase font-extrabold text-red-300 tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Expired Items
              </p>
              <h3 className="text-2xl font-black mt-1 text-red-400">{expiredCount} Products</h3>
              <p className="text-xs text-gray-300 mt-1 font-semibold">
                Est. Loss Value: <span className="text-white font-bold">₱{totalExpiredValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
            <div className="bg-red-500/20 p-3.5 rounded-xl border border-red-400/30">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('NEAR_EXPIRY')}
            className={`bg-[#17347a] text-white p-5 rounded-2xl flex items-center justify-between shadow-lg border cursor-pointer transition duration-200 ${
              activeTab === 'NEAR_EXPIRY' ? 'ring-4 ring-amber-400 border-white/20' : 'border-white/10 hover:scale-[1.01]'
            }`}
          >
            <div>
              <p className="text-[11px] uppercase font-extrabold text-amber-300 tracking-wider flex items-center gap-1.5">
                <Clock size={14} />
                Near Expiry (Within 30 Days)
              </p>
              <h3 className="text-2xl font-black mt-1 text-amber-300">{nearExpiryCount} Products</h3>
              <p className="text-xs text-gray-300 mt-1 font-semibold">
                At Risk Inventory: <span className="text-white font-bold">₱{totalNearExpiryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
            <div className="bg-amber-500/20 p-3.5 rounded-xl border border-amber-400/30">
              <Clock size={28} className="text-amber-300" />
            </div>
          </div>
        </div>

        {/* CONTROL PANEL & FILTERS */}
        <div className="bg-[#b0c8fa] text-white p-4 rounded-2xl shadow-lg border border-black/10 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-[#17347a] p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition active:scale-95 cursor-pointer ${
                activeTab === 'ALL' ? 'bg-white text-[#17347a] shadow-md' : 'text-blue-200 hover:text-white'
              }`}
            >
              ALL ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('EXPIRED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'EXPIRED' ? 'bg-red-600 text-white shadow-md' : 'text-red-300 hover:text-white'
              }`}
            >
              <AlertTriangle size={12} />
              EXPIRED ({expiredCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('NEAR_EXPIRY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'NEAR_EXPIRY' ? 'bg-amber-500 text-gray-900 shadow-md' : 'text-amber-200 hover:text-white'
              }`}
            >
              <Clock size={12} />
              NEAR EXPIRY ({nearExpiryCount})
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search product, SKU, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-gray-800 text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleExportExcel}
              className="flex flex-col items-center justify-center bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-xl transition text-white active:scale-95 shadow-md cursor-pointer"
              title="Export to Excel"
            >
              <FileSpreadsheet size={18} />
              <span className="text-[10px] font-bold mt-0.5">XLS</span>
            </button>

            <button 
              type="button"
              onClick={handleExportCSV}
              className="flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition text-white active:scale-95 shadow-md cursor-pointer"
              title="Export to CSV"
            >
              <FileText size={18} />
              <span className="text-[10px] font-bold mt-0.5">CSV</span>
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#17347a] text-white font-bold uppercase text-[11px] tracking-wider z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-blue-900">SKU</th>
                  <th className="py-3 px-4 border-b border-blue-900">Inventory Name</th>
                  <th className="py-3 px-3 border-b border-blue-900">Category</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-center">Qty</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-right">Unit Cost</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-center">Expiry Date</th>
                  <th className="py-3 px-3 border-b border-blue-900 text-center">Status</th>
                  <th className="py-3 px-4 border-b border-blue-900 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                      Loading product expiration data from database...
                    </td>
                  </tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <tr 
                      key={item.id} 
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'} hover:bg-blue-100/50 transition-colors`}
                    >
                      <td className="py-2.5 px-4 font-bold text-gray-500">{item.sku}</td>
                      <td className="py-2.5 px-4 font-bold text-gray-800">{item.inventoryName}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-600">{item.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-950">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right">₱{item.unitCost.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center font-semibold">{formatDateDisplay(item.expiryDate)}</td>
                      
                      <td className="py-2.5 px-3 text-center">
                        {item.status === 'EXPIRED' ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-red-300">
                            <AlertTriangle size={12} className="text-red-600" />
                            EXPIRED ({Math.abs(item.daysRemaining)}d ago)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-300">
                            <Clock size={12} className="text-amber-600" />
                            EXPIRING ({item.daysRemaining}d left)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDispose(item.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-red-200 transition active:scale-95 inline-flex items-center gap-1 cursor-pointer"
                          title="Dispose or Remove Item"
                        >
                          <Trash2 size={13} />
                          Dispose
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400 italic">
                      No expired or near-expiry items found in your database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}