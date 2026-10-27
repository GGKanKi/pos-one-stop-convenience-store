import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import { apiRequest } from "../../services/api";
import { 
  WalletCards, 
  Save, 
  X, 
  DollarSign, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ArrowLeft 
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Payouts() {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if opened as fullScreen (from Dashboard header button)
  const isFullScreen = location.state?.fullScreen === true;

  const [payOutTo, setPayOutTo] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!payOutTo.trim() || !amount || Number(amount) <= 0) {
      setError("Please provide a valid recipient/supplier and an amount greater than zero.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("/savepayout.php", "POST", {
        pay_out_to: payOutTo.trim(),
        amount: Number(amount),
        description: description.trim(),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to record payout.");
      }

      setNotice("Payout recorded successfully, and cash balance has been deducted.");
      setPayOutTo("");
      setAmount("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save payout.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPayOutTo("");
    setAmount("");
    setDescription("");
    setError("");
    setNotice("");
    if (isFullScreen) {
      navigate(-1);
    }
  };

  return (
    <div
      className="flex min-h-screen bg-[#cfdcfc] text-slate-800 antialiased"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Sidebar will only show if NOT in fullScreen mode */}
      {!isFullScreen && <Sidebar />}

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto text-left">
        
        {/* HEADER */}
        <header className="bg-[#17347a] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-extrabold ml-2 uppercase tracking-wider flex items-center gap-2">
            <WalletCards size={20} className="text-blue-300" />
            Payout & Expenses
          </h1>

          {isFullScreen && (
            <button 
              onClick={() => navigate(-1)} 
              className="mr-2 flex items-center gap-1.5 bg-white text-[#17347a] px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition shadow-sm active:scale-95 cursor-pointer"
              type="button"
            >
              <ArrowLeft size={14} />
              BACK
            </button>
          )}
        </header>

        {/* NOTICES */}
        {notice && (
          <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 shadow-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" /> {error}
          </div>
        )}

        {/* FORM CONTAINER */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-[#132a63] px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-blue-200 border-b border-blue-900 flex items-center justify-between">
            <span>Record Daily Expenses & Supplier Payments</span>
            <span className="bg-blue-800/80 text-white text-[10px] px-2.5 py-0.5 rounded-full border border-blue-400/30 font-bold">Cash Drawer Deduction</span>
          </div>

          <div className="p-6">
            <form id="payout-form" onSubmit={handleSave} className="space-y-5">
              
              {/* PAY OUT TO */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <User size={14} className="text-[#17347a]" /> Pay Out To:
                </label>
                <input
                  type="text"
                  required
                  value={payOutTo}
                  onChange={(e) => setPayOutTo(e.target.value)}
                  placeholder="Enter supplier name or recipient..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-gray-50/50"
                />
              </div>

              {/* AMOUNT */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-[#17347a]" /> Amount:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-500 font-bold text-xs">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-gray-50/50"
                  />
                </div>
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#17347a]" /> Description:
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details about this expense or payout..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-gray-50/50 resize-none"
                />
              </div>

              {/* ACTION BUTTONS BAR */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition active:scale-95 cursor-pointer"
                >
                  <X size={14} /> Clear
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 text-xs font-extrabold uppercase tracking-wider transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 
                  {loading ? "Saving..." : "Save Payout"}
                </button>
              </div>

            </form>
          </div>
        </section>

      </main>
    </div>
  );
}