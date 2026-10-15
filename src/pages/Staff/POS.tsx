import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Trash2, Plus, Minus, ScanLine, Check, Printer, X
} from 'lucide-react';
import { useNavigate } from "react-router-dom";

interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  qty: number;
}

export default function POS() {
  const navigate = useNavigate(); 

  const [cart, setCart] = useState<Product[]>([
    { id: 1, code: '8801073411432', name: 'Buldak Carbonara', description: '200g Pink', price: 95, qty: 2 },
    { id: 2, code: '4801981107971', name: 'Wilkins Pure', description: '500ML', price: 20, qty: 1 },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash'>('Cash');
  const [cashTendered, setCashTendered] = useState("0.00");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionDiscount, setTransactionDiscount] = useState<number>(0.00);

  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        setShowPaymentModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const subTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const total = useMemo(
    () => Math.max(0, subTotal - transactionDiscount),
    [subTotal, transactionDiscount]
  );

  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    return Math.max(0, tendered - total);
  }, [cashTendered, total]);

  const updateQty = (id: number, delta: number) => {
    setCart(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      )
    );
  };

  const removeItem = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirm = () => {
    if (!cart.length) return alert("Cart is empty");
    setShowPaymentModal(false);
    setShowReceiptModal(true);
  };

  const finalizeTransaction = () => {
    setShowReceiptModal(false);
    setCart([]);
    setCashTendered("0.00");
    setTransactionDiscount(0.00);
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-[#183478] via-[#12285e] to-[#0a183b] flex flex-col p-4 relative text-cyan-100 overflow-x-hidden shadow-[inset_0_0_100px_rgba(0,140,255,0.15)]" style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}>
      
      {/* Receipt Success Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all">
          <div className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-cyan-400/60 w-[450px] rounded-[30px] p-10 flex flex-col items-center shadow-[0_0_50px_rgba(0,180,255,0.3)]">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1c3e8a] to-[#0e204c] border-2 border-cyan-400 rounded-full flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(0,242,254,0.4)]">
              <Check size={40} className="text-cyan-400 stroke-[3px]" />
            </div>

            <h2 className="text-2xl font-black text-white mb-1 tracking-wider">TRANSACTION SUCCESS</h2>
            <p className="text-cyan-300/70 text-center mb-6 font-medium text-sm">
              Total Amount: <span className="font-bold text-cyan-400">₱{total.toFixed(2)}</span>
            </p>

            <div className="w-full space-y-3">
              <button 
                onClick={finalizeTransaction}
                className="w-full bg-cyan-500 text-black py-3.5 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 hover:bg-cyan-400 active:scale-95 transition shadow-[0_0_20px_rgba(0,242,254,0.4)]"
              >
                <Printer size={18} />
                PRINT RECEIPT
              </button>
              
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="w-full bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/40 text-cyan-300 py-3.5 rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition shadow-[0_0_15px_rgba(0,120,255,0.2)]"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment & Checkout Centered Window */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all">
          <div className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-cyan-400/60 w-[460px] rounded-[30px] p-6 flex flex-col justify-between gap-4 shadow-[0_0_60px_rgba(0,180,255,0.35)] animate-in zoom-in-95 duration-150">
            
            <div className="space-y-4 flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-cyan-500/20">
                <p className="text-xs text-cyan-400 font-black tracking-widest uppercase">PAYMENT & CHECKOUT</p>
                <button onClick={() => setShowPaymentModal(false)} className="text-cyan-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              {/* Total Display Box */}
              <div className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] rounded-xl p-4 border border-cyan-400/50 shadow-[0_0_20px_rgba(0,140,255,0.25)]">
                <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase">TOTAL AMOUNT</p>
                <div className="text-right text-3xl text-cyan-300 font-black tracking-wider mt-1 drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]">
                  ₱ {total.toFixed(2)}
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-gradient-to-b from-[#183478]/90 to-[#0e214d]/90 rounded-xl p-4 border border-cyan-400/40 space-y-3.5 shadow-[0_0_20px_rgba(0,140,255,0.15)]">
                <div>
                  <p className="text-xs font-bold text-cyan-300 uppercase tracking-wide">PAYMENT METHOD</p>
                  <div className="flex gap-2.5 mt-1.5">
                    <button onClick={() => setPaymentMethod("Cash")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${paymentMethod === "Cash" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]" : "bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300"}`}>Cash</button>
                    <button onClick={() => setPaymentMethod("GCash")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${paymentMethod === "GCash" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]" : "bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300"}`}>GCash</button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-cyan-300 uppercase tracking-wide">CASH TENDERED</p>
                  <div className="relative mt-1.5">
                    <input 
                      value={cashTendered} 
                      onClick={() => setCashTendered("")} 
                      onChange={(e) => setCashTendered(e.target.value)} 
                      className="w-full bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 rounded-xl py-2.5 px-4 text-center text-cyan-200 font-bold text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,180,255,0.3)] transition" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-cyan-500">₱</span>
                  </div>
                  <div className="flex gap-2 mt-2 text-sm">
                    {[100, 500, 1000].map((v) => (
                      <button key={v} onClick={() => setCashTendered(v.toFixed(2))} className="flex-1 border border-cyan-400/30 rounded-lg py-1.5 font-bold bg-gradient-to-r from-[#1c3e8a] to-[#122a63] text-cyan-300 hover:border-cyan-400 active:scale-95 transition shadow-[0_0_10px_rgba(0,120,255,0.15)]">₱{v}</button>
                    ))}
                  </div>
                  <button onClick={() => setCashTendered(total.toFixed(2))} className="w-full mt-2 border border-cyan-400/30 rounded-lg py-1.5 text-xs font-bold bg-gradient-to-r from-[#1c3e8a] to-[#122a63] text-cyan-300 hover:border-cyan-400 active:scale-95 transition shadow-[0_0_10px_rgba(0,120,255,0.15)]">EXACT</button>
                </div>

                <div>
                  <p className="text-xs font-bold text-cyan-300 mb-1.5 uppercase tracking-wide">CHANGE DUE</p>
                  <div className="bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 text-cyan-300 p-3.5 rounded-xl text-center shadow-[0_0_15px_rgba(0,140,255,0.2)]">
                    <span className="text-lg font-black tracking-wider text-cyan-400">₱ {changeDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button onClick={handleConfirm} className="flex-1 bg-cyan-500 text-black py-3.5 rounded-xl font-black text-sm tracking-wider active:scale-95 hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(0,242,254,0.4)]">CONFIRM</button>
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300 py-3.5 rounded-xl font-bold text-sm tracking-wider active:scale-95 hover:brightness-110 transition shadow-[0_0_15px_rgba(0,120,255,0.2)]">CANCEL</button>
            </div>

          </div>
        </div>
      )}

      {/* Full-Screen Main POS Workspace Panel */}
      <div className="w-full flex-1 bg-slate-200 border-2 border-cyan-400/60 rounded-[26px] overflow-hidden shadow-[0_0_40px_rgba(0,140,255,0.25)] flex flex-col p-4 gap-4">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] text-cyan-200 flex flex-wrap justify-between items-center gap-4 px-6 py-4 border-2 border-cyan-400/60 rounded-2xl shadow-[0_0_25px_rgba(0,150,255,0.2)]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.6)] flex items-center justify-center bg-gradient-to-br from-[#1c3e8a] to-[#112759] shrink-0">
              <span className="text-xs font-bold text-cyan-200">User</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-black uppercase tracking-wider text-white">POS TERMINAL</span>
              <span className="text-xs text-cyan-300/70 mt-0.5">202603 - Bernice Partisala</span>
            </div>
          </div>
          
          <div className="flex gap-2.5">
            <button 
              onClick={() => navigate("/cashregister")} 
              className="bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/50 text-cyan-300 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-cyan-500 hover:text-black active:scale-95 transition shadow-[0_0_15px_rgba(0,140,255,0.25)]"
            >
              Cashier Out
            </button>
            <button 
              className="bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/50 text-cyan-300 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-cyan-500 hover:text-black active:scale-95 transition shadow-[0_0_15px_rgba(0,140,255,0.25)]"
            >
              Settings
            </button>
          </div> 
        </div> 

        {/* Body Content */}
        <div className="bg-slate-200 border-2 border-cyan-400/50 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 flex-1 shadow-sm">
          
          {/* Scan Bar */}
          <div className="relative">
            <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" size={20} />
            <input
              ref={scanInputRef}
              placeholder="SCAN Product Code"
              className="w-full pl-12 pr-4 py-3.5 bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] border-2 border-cyan-400/60 rounded-xl text-cyan-100 placeholder-cyan-400/60 outline-none focus:border-cyan-300 focus:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all font-semibold text-sm shadow-[0_0_15px_rgba(0,140,255,0.2)]"
            />
          </div>

          {/* Quick Actions & Search Row */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            <div className="flex gap-3.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-thin">
              {[
                { label: "Discounts", shortcut: "F5", img: "/pictures/discount.png" },
                { label: "Recall", shortcut: "F6", img: "/pictures/recall.jpg" },
                { label: "Dashboard", shortcut: "F7", img: "/pictures/dashboard.png", action: () => navigate("/admin/dashboard", { state: { fullScreen: true } }) },
                { label: "Void", shortcut: "F8", img: "/pictures/void.jpg" },
                { label: "Inventory", shortcut: "F9", img: "/pictures/inventory.jpg", action: () => navigate("/staff/inventorycheck") },
                { label: "Payment", shortcut: "F10", img: "/pictures/payment.jpg", action: () => setShowPaymentModal(true) }
              ].map((btn, idx) => (
                <button 
                  key={idx}
                  onClick={btn.action}
                  className="relative flex flex-col items-center justify-between overflow-hidden border border-cyan-400/50 hover:border-cyan-300 p-2.5 rounded-xl group hover:shadow-[0_0_20px_rgba(0,180,255,0.35)] transition w-24 h-24 shrink-0 shadow-[0_0_12px_rgba(0,140,255,0.2)]"
                >
                  {/* Background Image */}
                  <img 
                    src={btn.img} 
                    alt={btn.label} 
                    className="absolute inset-0 w-full h-full object-cover brightness-75 group-hover:scale-110 group-hover:brightness-90 transition duration-300 z-0" 
                  />
                  
                  {/* Overlay Gradient for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10"></div>

                  {/* Top Shortcut Text */}
                  <span className="relative text-[10px] text-cyan-300 font-bold z-20 drop-shadow">{btn.shortcut}</span>

                  {/* Bottom Label Text */}
                  <span className="relative text-xs font-semibold text-white z-20 drop-shadow">{btn.label}</span>
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-[300px]">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400" size={18} />
              <input placeholder="Search Product Name" className="w-full pl-4 pr-11 py-3.5 bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] border border-cyan-400/50 rounded-xl text-sm text-cyan-100 placeholder-cyan-400/60 outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(0,180,255,0.3)] transition shadow-[0_0_12px_rgba(0,140,255,0.2)]" />
            </div>
          </div>

          {/* Stacked Layout: Full-Width Table + Bottom Summary Box */}
          <div className="flex flex-col gap-4 flex-1">
            
            {/* Cart Table Grid (Full Width with precise alignment) */}
            <div className="border border-cyan-400/50 bg-white rounded-xl flex-1 overflow-hidden shadow-inner flex flex-col min-h-[220px]">
              <div className="overflow-y-auto flex-1">
                <table className="w-full table-fixed text-sm text-slate-800 border-collapse">
                  <colgroup>
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] text-cyan-300 border-b-2 border-cyan-400/60 sticky top-0 z-10 shadow-[0_4px_10px_rgba(0,140,255,0.2)]">
                    <tr>
                      <th className="p-3 text-center font-bold">No.</th>
                      <th className="p-3 text-left font-bold">Code</th>
                      <th className="p-3 text-left font-bold">Name</th>
                      <th className="p-3 text-left font-bold">Desc</th>
                      <th className="p-3 text-center font-bold">Qty</th>
                      <th className="p-3 text-center font-bold">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cart.map((item, i) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-medium text-slate-600">{i + 1}</td>
                        <td className="p-3 truncate font-mono text-slate-700">{item.code}</td>
                        <td className="p-3 truncate font-bold text-slate-900">{item.name}</td>
                        <td className="p-3 truncate text-slate-500">{item.description}</td>
                        <td className="p-3">
                          <div className="flex justify-center items-center gap-1.5">
                            <button onClick={() => updateQty(item.id, -1)} className="border border-cyan-400/50 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#183478] to-[#0e214d] text-cyan-300 hover:bg-cyan-500 hover:text-black active:scale-90 transition shadow-[0_0_10px_rgba(0,140,255,0.2)]"><Minus size={12} /></button>
                            <span className="font-bold w-5 text-center text-slate-800 text-xs">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="border border-cyan-400/50 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#183478] to-[#0e214d] text-cyan-300 hover:bg-cyan-500 hover:text-black active:scale-90 transition shadow-[0_0_10px_rgba(0,140,255,0.2)]"><Plus size={12} /></button>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 relative">
                          <div className="flex items-center justify-center gap-2">
                            <span>₱{item.price.toFixed(2)}</span>
                            <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 active:scale-90 transition"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Transaction Total Panel */}
            <div className="w-full bg-gradient-to-r from-[#0a183b] via-[#12285e] to-[#0c1d45] border-2 border-cyan-400/60 rounded-2xl px-5 py-3.5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center shadow-[0_0_30px_rgba(0,150,255,0.3)] text-cyan-200">
              <div className="min-w-0 flex items-center gap-4 sm:gap-6 flex-wrap">
                <div className="flex items-center gap-3 pr-4 border-r border-cyan-500/30">
                  <div className="w-10 h-10 rounded-xl border border-cyan-400/50 flex items-center justify-center bg-gradient-to-br from-[#183478] to-[#0e214d] text-yellow-400 shadow-[0_0_10px_rgba(0,140,255,0.3)] shrink-0">
                    <span className="font-black text-lg">📄</span>
                  </div>
                  <span className="text-amber-400 font-bold tracking-widest text-xs sm:text-sm uppercase whitespace-nowrap">--- TRANSACTION TOTAL ---</span>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-3 pr-6 border-r border-cyan-500/30">
                    <div className="w-9 h-9 rounded-full border border-cyan-400/50 flex items-center justify-center bg-gradient-to-br from-[#183478] to-[#0e214d] text-cyan-400 shadow-[0_0_10px_rgba(0,140,255,0.2)] shrink-0">
                      💳
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wide">Sub Total</span>
                      <strong className="text-white font-mono text-base sm:text-lg">Php {subTotal.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full border border-cyan-400/50 flex items-center justify-center bg-gradient-to-br from-[#183478] to-[#0e214d] text-cyan-400 shadow-[0_0_10px_rgba(0,140,255,0.2)] shrink-0">
                      %
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wide">Discount</span>
                      <strong className="text-white font-mono text-base sm:text-lg">Php {transactionDiscount.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-cyan-400/50 rounded-xl px-6 py-2.5 bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] flex items-center justify-between gap-6 shadow-[0_0_20px_rgba(0,140,255,0.25)] shrink-0">
                <div className="flex items-center gap-3 pr-4 border-r border-cyan-500/30">
                  <div className="w-8 h-8 rounded-full border border-cyan-400/50 flex items-center justify-center bg-gradient-to-br from-[#183478] to-[#0e214d] text-yellow-400 shrink-0 text-xs">
                    💰
                  </div>
                  <span className="font-black text-amber-400 tracking-wider text-xs uppercase">TOTAL</span>
                </div>
                <span className="font-black text-amber-400 tracking-wider text-xl sm:text-2xl font-mono drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                  Php {total.toFixed(2)}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}