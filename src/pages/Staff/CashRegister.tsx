import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface Denomination {
  label: string;
  value: number;
}

const DENOMINATIONS: Denomination[] = [
  { label: "Php 1,000.00", value: 1000 },
  { label: "Php 500.00", value: 500 },
  { label: "Php 200.00", value: 200 },
  { label: "Php 100.00", value: 100 },
  { label: "Php 50.00", value: 50 },
  { label: "Php 20.00", value: 20 },
  { label: "Php 10.00", value: 10 },
  { label: "Php 5.00", value: 5 },
  { label: "Php 1.00", value: 1 },
];

export default function CashRegister() {
  const navigate = useNavigate();
  
  const [counts, setCounts] = useState<{ [key: number]: string }>(
    Object.fromEntries(DENOMINATIONS.map((d) => [d.value, ""]))
  );

  const handleCountChange = (val: string, denom: number) => {
    if (val === "" || /^\d+$/.test(val)) {
      setCounts((prev) => ({ ...prev, [denom]: val }));
    }
  };

  const totalFund = useMemo(() => {
    return DENOMINATIONS.reduce((sum, d) => {
      const count = parseInt(counts[d.value] || "0");
      return sum + count * d.value;
    }, 0);
  }, [counts]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 text-white">
        
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-white text-xl font-bold tracking-tight">Cash Register Start Amount</h1>
          <p className="text-blue-100/60 text-[15px] mt-1 text-center font-medium">
            Please enter initial cash fund
          </p>
        </div>

        {/* Tighter spacing in the grid and smaller py (padding-vertical) */}
        <div className="space-y-1 mb-6 px-2">
          {DENOMINATIONS.map((d) => {
            const subtotal = parseInt(counts[d.value] || "0") * d.value;
            const formattedSubtotal = subtotal === 0 ? "" : subtotal.toLocaleString();

            return (
              <div key={d.value} className="grid grid-cols-[1.2fr_70px_110px] gap-3 items-center py-0.5">
                <span className="text-white font-medium text-[13px] opacity-90">{d.label}</span>
                
                <input
                  type="text"
                  placeholder="0"
                  value={counts[d.value]}
                  onChange={(e) => handleCountChange(e.target.value, d.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg py-1 text-center text-white text-xs focus:border-blue-400 focus:outline-none transition-all placeholder:opacity-20 shadow-inner"
                />

                <div className="w-full bg-white/5 border border-white/20 rounded-lg py-1 text-center text-white/70 text-xs font-mono min-h-[32px] flex items-center justify-center shadow-inner">
                  {formattedSubtotal}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white/5 rounded-xl p-1.5 mb-3 border border-white/10 flex justify-between items-center shadow-inner">
           <span className="text-blue-100/50 text-[10px] font-black uppercase tracking-widest">Total Fund</span>
           <span className="text-white text-lg font-black">
             ₱ {totalFund.toLocaleString(undefined, { minimumFractionDigits: 2 })}
           </span>
        </div>

        <button 
          onClick={() => navigate("/pos")}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition uppercase tracking-widest shadow-lg shadow-blue-500/30 active:scale-[0.98]"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}