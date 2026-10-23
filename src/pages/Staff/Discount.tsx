import React, { useEffect, useRef, useState } from "react";
import { X, Percent } from "lucide-react";

interface DiscountModalProps {
  isOpen: boolean;
  subTotal: number;
  currentDiscount: number;
  onClose: () => void;
  onApplyDiscount: (discountAmount: number) => void;
}

export default function DiscountModal({
  isOpen,
  subTotal,
  currentDiscount,
  onClose,
  onApplyDiscount,
}: DiscountModalProps) {
  const [discountInput, setDiscountInput] = useState<string>(
    currentDiscount > 0 ? String(currentDiscount) : ""
  );
  const discountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset the draft when opening the modal or changing the selected item's discount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDiscountInput(currentDiscount > 0 ? String(currentDiscount) : "");
      setTimeout(() => {
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentDiscount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const discountVal = parseFloat(discountInput) || 0;

    if (discountVal < 0) {
      alert("Discount cannot be negative.");
      return;
    }
    if (discountVal > subTotal) {
      alert("Discount amount cannot exceed current subtotal.");
      return;
    }

    onApplyDiscount(discountVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all">
      <form
        onSubmit={handleSubmit}
        className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-cyan-400/60 w-[420px] rounded-[30px] p-6 flex flex-col justify-between gap-5 shadow-[0_0_60px_rgba(0,180,255,0.35)] text-cyan-100"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        <div className="space-y-4 flex flex-col">
          <div className="flex justify-between items-center pb-2 border-b border-cyan-500/20">
            <p className="text-xs text-cyan-400 font-black tracking-widest uppercase flex items-center gap-2">
              <Percent size={16} /> CASH DISCOUNT
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-cyan-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] rounded-xl p-3.5 border border-cyan-400/50 shadow-[0_0_20px_rgba(0,140,255,0.25)] flex justify-between items-center">
            <span className="text-xs text-cyan-300 font-bold uppercase tracking-wide">
              CURRENT SUBTOTAL
            </span>
            <span className="text-lg text-white font-mono font-black">
              ₱{subTotal.toFixed(2)}
            </span>
          </div>

          <div className="bg-gradient-to-b from-[#183478]/90 to-[#0e214d]/90 rounded-xl p-4 border border-cyan-400/40 space-y-3 shadow-[0_0_20px_rgba(0,140,255,0.15)] text-center">
            <p className="text-xs font-bold text-yellow-300 uppercase tracking-widest bg-yellow-400/10 py-1.5 px-3 rounded-lg border border-yellow-400/30">
              ENTER AMOUNT IN PESO
            </p>
            <div className="relative mt-2">
              <input
                ref={discountInputRef}
                type="number"
                step="0.01"
                value={discountInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 rounded-xl py-3 px-4 text-center text-cyan-200 font-black text-2xl outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,180,255,0.4)] transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-cyan-400 font-black">
                ₱
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="flex-1 bg-cyan-500 text-black py-3.5 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(0,242,254,0.4)]"
          >
            APPLY DISCOUNT
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 hover:brightness-110 transition shadow-[0_0_15px_rgba(0,120,255,0.2)]"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
}
