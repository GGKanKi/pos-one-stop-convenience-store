import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Trash2, Plus, Minus, ScanLine, Check, Printer, X, ShoppingBag
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";

interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  qty: number;
  stock?: number;
  category?: string;
}

export default function POS() {
  const navigate = useNavigate(); 
  const [clockInError, setClockInError] = useState("");

  // Clock-in Session Check
  useEffect(() => {
    let cancelled = false;
    let userId: string | number | null = localStorage.getItem("userId");

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      userId = user.id || userId;
    } catch {
      userId = localStorage.getItem("userId");
    }

    if (!userId) {
      setClockInError("Could not clock in: user session was not found. Please sign in again.");
      return () => { cancelled = true; };
    }

    apiRequest("/clockin.php", "POST", { user_id: userId })
      .then((data) => {
        if (!data.success) {
          throw new Error(data.message || "Clock-in failed.");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setClockInError(error instanceof Error ? error.message : "Clock-in failed.");
        }
      });

    return () => { cancelled = true; };
  }, []);

  // Cart & Transaction State
  const [cart, setCart] = useState<Product[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash'>('Cash');
  const [cashTendered, setCashTendered] = useState("0.00");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionDiscount, setTransactionDiscount] = useState<number>(0.00);

  // Scan & Search Window State
  const [scanCode, setScanCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const modalSearchInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);
  const cartTableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cartTableContainerRef.current) {
      cartTableContainerRef.current.scrollTop = cartTableContainerRef.current.scrollHeight;
    }
  }, [cart]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setShowPaymentModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus on Cash Input kapag inopen ang Payment Modal
  useEffect(() => {
    if (showPaymentModal) {
      setTimeout(() => {
        cashInputRef.current?.focus();
        cashInputRef.current?.select();
      }, 100);
    } else {
      scanInputRef.current?.focus();
    }
  }, [showPaymentModal]);

  const executeSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest(`/getproducts.php?search=${encodeURIComponent(query)}`, "GET");
      if (response.success && Array.isArray(response.products)) {
        const mapped: Product[] = response.products.map((item: any) => ({
          id: Number(item.id),
          code: String(item.code || ''),
          name: String(item.name || ''),
          description: String(item.description || ''),
          price: parseFloat(item.price) || 0,
          qty: 1,
          stock: Number(item.stock || 0),
          category: String(item.category || '')
        }));
        setSearchResults(mapped);
      }
    } catch (err) {
      console.error("Product Search Error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSearchModal && searchQuery.trim()) {
        executeSearch(searchQuery);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearchModal]);

  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => {
        modalSearchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearchModal]);

  const handleTriggerSearchModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSearchModal(true);
    if (searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id || item.code === product.code);
      if (existing) {
        return prev.map(item =>
          item.id === product.id || item.code === product.code
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });

    setShowSearchModal(false);
    setSearchQuery("");
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      addToCart(searchResults[0]);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode.trim()) return;

    try {
      const response = await apiRequest(`/getproducts.php?search=${encodeURIComponent(scanCode.trim())}`, "GET");
      if (response.success && response.products.length > 0) {
        const exactMatch = response.products.find((p: any) => p.code === scanCode.trim()) || response.products[0];
        addToCart({
          id: Number(exactMatch.id),
          code: String(exactMatch.code || ''),
          name: String(exactMatch.name || ''),
          description: String(exactMatch.description || ''),
          price: parseFloat(exactMatch.price) || 0,
          qty: 1,
          stock: Number(exactMatch.stock || 0)
        });
        setScanCode("");
      } else {
        alert("Product not found for barcode: " + scanCode);
      }
    } catch (err) {
      console.error("Scan error:", err);
    }
  };

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

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cart.length) return alert("Cart is empty");
    setShowPaymentModal(false);
    setShowReceiptModal(true);
  };

  // FINALIZE TRANSACTION: SINESAVE SA DATABASE AT CINI-CLEAR ANG POS CART
  const finalizeTransaction = async () => {
    if (cart.length === 0) return;

    const transactionData = {
      paymentMethod,
      totalAmount: total,
      items: cart.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        price: item.price,
        qty: item.qty,
      })),
    };

    // 1. Send Request sa PHP backend (savetransaction.php)
    try {
      const res = await apiRequest("/savetransaction.php", "POST", transactionData);
      console.log("DB Response:", res);
      
      if (!res || !res.success) {
        alert("DB Warning: " + (res?.message || "Hindi na-save sa database. Pakitingnan ang F12 Console."));
      }
    } catch (err: any) {
      console.error("Fetch/Server Error:", err);
      alert("Connection Error: " + (err.message || "Failed to reach PHP server."));
    }

    // 2. Local storage sync para sa Recall Screen
    try {
      const existing = JSON.parse(localStorage.getItem("pos_completed_transactions") || "[]");
      const newTx = {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        itemCount: cart.reduce((sum, i) => sum + i.qty, 0),
        paymentMethod,
        totalAmount: total,
        items: transactionData.items,
      };
      
      localStorage.setItem("pos_completed_transactions", JSON.stringify([newTx, ...existing]));
      window.dispatchEvent(new Event("pos_transaction_saved"));
    } catch (e) {
      console.error("Local Sync Error:", e);
    }

    // 3. Clear POS State AFTER THE CHECKOUT
    setShowReceiptModal(false);
    setCart([]);
    setCashTendered("0.00");
    setTransactionDiscount(0.00);
    setScanCode("");
    setSearchQuery("");
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#183478] via-[#12285e] to-[#0a183b] flex flex-col p-4 relative text-cyan-100 overflow-hidden shadow-[inset_0_0_100px_rgba(0,140,255,0.15)]" style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}>
      
      {clockInError && (
        <div role="alert" className="mb-3 rounded-lg border border-red-400 bg-red-900/70 px-4 py-3 text-sm font-semibold text-red-100 shrink-0">
          {clockInError}
        </div>
      )}

      {/* SEARCH OVERLAY MODAL */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-6">
          <div className="bg-[#0e214d] border-2 border-cyan-400/60 w-full max-w-3xl h-[75vh] rounded-[26px] p-6 flex flex-col gap-4 shadow-[0_0_60px_rgba(0,180,255,0.35)] animate-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center pb-2 border-b border-cyan-500/30">
              <span className="text-sm text-cyan-400 font-black tracking-widest uppercase">SEARCH PRODUCTS CATALOG</span>
              <button onClick={() => setShowSearchModal(false)} className="text-cyan-400 hover:text-white transition">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" size={20} />
              <input 
                ref={modalSearchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type product name or barcode & press Enter..." 
                className="w-full pl-12 pr-4 py-3.5 bg-gradient-to-r from-[#183478] to-[#0c1d45] border-2 border-cyan-400/60 rounded-xl text-base text-cyan-100 placeholder-cyan-400/60 outline-none focus:border-cyan-300 focus:shadow-[0_0_20px_rgba(0,180,255,0.3)] transition font-bold" 
              />
            </form>

            <div className="flex-1 overflow-y-auto pr-1">
              {isSearching ? (
                <div className="p-10 text-center text-sm text-cyan-300 font-bold">Searching products catalog...</div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="p-4 bg-white border-2 border-cyan-400 hover:border-cyan-500 rounded-xl cursor-pointer hover:shadow-lg transition flex justify-between items-center group shadow-md"
                    >
                      <div className="flex flex-col pr-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono mt-0.5">
                          {product.code} {product.description ? `- ${product.description}` : ''}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-amber-600">
                          ₱{product.price.toFixed(2)}
                        </span>
                        <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          Stock: {product.stock ?? 'N/A'}
                        </div>
                        <button className="mt-2 text-[11px] bg-cyan-500 text-black px-2.5 py-1 rounded-md font-bold hover:bg-cyan-400">
                          Add +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="p-10 text-center text-sm text-red-300 font-bold">No products found matching "{searchQuery}"</div>
              ) : (
                <div className="p-10 text-center text-sm text-cyan-300/60 font-bold">Type a name above or press Enter to add top result directly to POS.</div>
              )}
            </div>

            <p className="text-xs text-cyan-300/60 text-center">Pressing <strong className="text-cyan-300">Enter</strong> adds the top search item and returns directly to POS.</p>
          </div>
        </div>
      )}

      {/* RECEIPT SUCCESS MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all">
          <div className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-cyan-400/60 w-[450px] rounded-[30px] p-10 flex flex-col items-center shadow-[0_0_50px_rgba(0,180,255,0.3)]">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1c3e8a] to-[#0e204c] border-2 border-cyan-400 rounded-full flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(0,242,254,0.4)]">
              <Check className="text-cyan-400 stroke-[3px]" size={40} />
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
                onClick={finalizeTransaction}
                className="w-full bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/40 text-cyan-300 py-3.5 rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition shadow-[0_0_15px_rgba(0,120,255,0.2)]"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all">
          <form 
            onSubmit={handleConfirm}
            className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-cyan-400/60 w-[460px] rounded-[30px] p-6 flex flex-col justify-between gap-4 shadow-[0_0_60px_rgba(0,180,255,0.35)]"
          >
            <div className="space-y-4 flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-cyan-500/20">
                <p className="text-xs text-cyan-400 font-black tracking-widest uppercase">PAYMENT & CHECKOUT</p>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="text-cyan-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] rounded-xl p-4 border border-cyan-400/50 shadow-[0_0_20px_rgba(0,140,255,0.25)]">
                <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase">TOTAL AMOUNT</p>
                <div className="text-right text-3xl text-cyan-300 font-black tracking-wider mt-1 drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]">
                  ₱ {total.toFixed(2)}
                </div>
              </div>

              <div className="bg-gradient-to-b from-[#183478]/90 to-[#0e214d]/90 rounded-xl p-4 border border-cyan-400/40 space-y-3.5 shadow-[0_0_20px_rgba(0,140,255,0.15)]">
                <div>
                  <p className="text-xs font-bold text-cyan-300 uppercase tracking-wide">PAYMENT METHOD</p>
                  <div className="flex gap-2.5 mt-1.5">
                    <button type="button" onClick={() => setPaymentMethod("Cash")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${paymentMethod === "Cash" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]" : "bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300"}`}>Cash</button>
                    <button type="button" onClick={() => setPaymentMethod("GCash")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${paymentMethod === "GCash" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]" : "bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300"}`}>GCash</button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-cyan-300 uppercase tracking-wide">CASH TENDERED</p>
                  <div className="relative mt-1.5">
                    <input 
                      ref={cashInputRef}
                      type="text"
                      value={cashTendered} 
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCashTendered(e.target.value)} 
                      className="w-full bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 rounded-xl py-2.5 px-4 text-center text-cyan-200 font-bold text-sm outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,180,255,0.3)] transition" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-cyan-500">₱</span>
                  </div>
                  <div className="flex gap-2 mt-2 text-sm">
                    {[100, 500, 1000].map((v) => (
                      <button type="button" key={v} onClick={() => setCashTendered(v.toFixed(2))} className="flex-1 border border-cyan-400/30 rounded-lg py-1.5 font-bold bg-gradient-to-r from-[#1c3e8a] to-[#122a63] text-cyan-300 hover:border-cyan-400 active:scale-95 transition shadow-[0_0_10px_rgba(0,120,255,0.15)]">₱{v}</button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setCashTendered(total.toFixed(2))} className="w-full mt-2 border border-cyan-400/30 rounded-lg py-1.5 text-xs font-bold bg-gradient-to-r from-[#1c3e8a] to-[#122a63] text-cyan-300 hover:border-cyan-400 active:scale-95 transition shadow-[0_0_10px_rgba(0,120,255,0.15)]">EXACT</button>
                </div>

                <div>
                  <p className="text-xs font-bold text-cyan-300 mb-1.5 uppercase tracking-wide">CHANGE DUE</p>
                  <div className="bg-gradient-to-r from-[#183478] to-[#0c1d45] text-cyan-300 p-3.5 rounded-xl text-center shadow-[0_0_15px_rgba(0,140,255,0.2)]">
                    <span className="text-lg font-black tracking-wider text-cyan-400">₱ {changeDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-cyan-500 text-black py-3.5 rounded-xl font-black text-sm tracking-wider active:scale-95 hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(0,242,254,0.4)]">CONFIRM</button>
              <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300 py-3.5 rounded-xl font-bold text-sm tracking-wider active:scale-95 hover:brightness-110 transition shadow-[0_0_15px_rgba(0,120,255,0.2)]">CANCEL</button>
            </div>

          </form>
        </div>
      )}

      {/* MAIN WORKSPACE BACKGROUND */}
      <div className="w-full flex-1 min-h-0 bg-slate-200 border-2 border-cyan-400/60 rounded-[26px] overflow-hidden shadow-[0_0_40px_rgba(0,140,255,0.25)] flex flex-col p-4 gap-4">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] text-cyan-200 flex flex-wrap justify-between items-center gap-4 px-6 py-4 border-2 border-cyan-400/60 rounded-2xl shadow-[0_0_25px_rgba(0,150,255,0.2)] shrink-0">
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
              onClick={() => navigate("/cashregister", { state: { cashierOut: true } })} 
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

        <div className="bg-slate-200 border-2 border-cyan-400/50 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 flex-1 min-h-0 shadow-sm overflow-hidden">
          
          {/* FOR SCANNER OR Scan Bar */}
          <form onSubmit={handleScanSubmit} className="relative shrink-0">
            <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={20} />
            <input
              ref={scanInputRef}
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              placeholder="SCAN Product Code & Press Enter"
              className="w-full pl-12 pr-4 py-3.5 bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] border-2 border-cyan-400/60 rounded-xl text-cyan-100 placeholder-cyan-400/60 outline-none focus:border-cyan-300 focus:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all font-semibold text-sm shadow-[0_0_15px_rgba(0,140,255,0.2)]"
            />
          </form>

          {/* F-Keys Quick Actions Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 shrink-0">
            <div className="flex gap-3.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-thin shrink-0">
              {[
                { label: "Payment", shortcut: "F5", img: "/pictures/payment.jpg", action: () => setShowPaymentModal(true) },
                { label: "Discounts", shortcut: "F6", img: "/pictures/discount.png" },
                { label: "Recall", shortcut: "F7", img: "/pictures/recall.jpg", action: () => navigate("/staff/recall") },
                { label: "Dashboard", shortcut: "F8", img: "/pictures/dashboard.png", action: () => navigate("/admin/dashboard", { state: { fullScreen: true } }) },
                { label: "Inventory", shortcut: "F9", img: "/pictures/inventory.jpg", action: () => navigate("/staff/inventorycheck") }
               
              ].map((btn, idx) => (
                <button 
                  key={idx}
                  onClick={btn.action}
                  className="relative flex flex-col items-center justify-between overflow-hidden border border-cyan-400/50 hover:border-cyan-300 p-2.5 rounded-xl group hover:shadow-[0_0_20px_rgba(0,180,255,0.35)] transition w-24 h-24 shrink-0 shadow-[0_0_12px_rgba(0,140,255,0.2)]"
                >
                  <img 
                    src={btn.img} 
                    alt={btn.label} 
                    className="absolute inset-0 w-full h-full object-cover brightness-75 group-hover:scale-110 group-hover:brightness-90 transition duration-300 z-0" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10"></div>
                  <span className="relative text-[10px] text-cyan-300 font-bold z-20 drop-shadow">{btn.shortcut}</span>
                  <span className="relative text-xs font-semibold text-white z-20 drop-shadow">{btn.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleTriggerSearchModal} className="relative w-full lg:w-[320px] shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={18} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchModal(true)}
                placeholder="Search Product Name & Press Enter..." 
                className="w-full pl-11 pr-4 py-3.5 bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] border border-cyan-400/50 rounded-xl text-sm text-cyan-100 placeholder-cyan-400/60 outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(0,180,255,0.3)] transition shadow-[0_0_12px_rgba(0,140,255,0.2)] font-semibold" 
              />
            </form>
          </div>

          {/* SCROLLABLE CART TABLE */}
          <div className="w-full bg-white border-2 border-cyan-400/50 rounded-xl shadow-inner flex flex-col flex-1 min-h-0 overflow-hidden">
            <div 
              ref={cartTableContainerRef}
              className="overflow-y-auto flex-1 h-full scrollbar-thin scrollbar-thumb-cyan-500/50"
            >
              <table className="w-full table-fixed text-sm text-slate-800 border-collapse">
                <colgroup>
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                </colgroup>
                <thead className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] text-cyan-300 border-b-2 border-cyan-400/60 sticky top-0 z-20 shadow-[0_4px_10px_rgba(0,140,255,0.2)]">
                  <tr>
                    <th className="p-3 text-center font-bold">No.</th>
                    <th className="p-3 text-left font-bold">Code</th>
                    <th className="p-3 text-left font-bold">Name</th>
                    <th className="p-3 text-left font-bold">Desc</th>
                    <th className="p-3 text-center font-bold">Qty</th>
                    <th className="p-3 text-center font-bold">Price</th>
                    <th className="p-3 text-center font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cart.length > 0 ? (
                    cart.map((item, i) => {
                      const itemSubtotal = item.price * item.qty;
                      return (
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
                          <td className="p-3 text-center font-medium text-slate-600">
                            ₱{item.price.toFixed(2)}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-900">
                            <div className="flex items-center justify-center gap-2">
                              <span>₱{itemSubtotal.toFixed(2)}</span>
                              <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 active:scale-90 transition"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ShoppingBag className="text-slate-300" size={32} />
                          <p className="font-semibold text-sm text-slate-500">Cart is empty</p>
                          <p className="text-xs text-slate-400">Scan a barcode or search product name to add items.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Total Panel */}
          <div className="w-full bg-gradient-to-r from-[#0a183b] via-[#12285e] to-[#0c1d45] border-2 border-cyan-400/60 rounded-2xl px-5 py-3.5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center shadow-[0_0_30px_rgba(0,150,255,0.3)] text-cyan-200 shrink-0">
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
  );
}