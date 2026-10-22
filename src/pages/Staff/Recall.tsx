import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Search, ArrowLeft, ShoppingBag, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost/One-Convenience/backend/api";

interface PurchasedItem {
  id: number;
  transactionItemId?: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  discount?: number;
  qty: number;
}

interface Transaction {
  id: string | number;
  dbTransactionId?: number;
  time: string;
  itemCount: number;
  paymentMethod: string;
  totalAmount: number;
  items?: PurchasedItem[];
}

export default function RecallTransactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"today" | "today_only">("today");
  
  // Selection States
  const [selectedTxId, setSelectedTxId] = useState<string | number | null>(null);
  const [openTx, setOpenTx] = useState<Transaction | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Void Modal States
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidType, setVoidType] = useState<"item" | "invoice">("item");
  const [voidReason, setVoidReason] = useState("");
  const reasonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fontId = "google-font-inter";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    let localTxList: Transaction[] = [];
    try {
      const saved = localStorage.getItem("pos_completed_transactions");
      if (saved) {
        localTxList = JSON.parse(saved);
      }
    } catch {
      localTxList = [];
    }

    try {
      const response = await fetch(`${API_BASE}/gettransactions.php`);
      if (response.ok) {
        const data = await response.json();
        const rawList = Array.isArray(data) ? data : Array.isArray(data?.transactions) ? data.transactions : [];
        const mapped: Transaction[] = rawList.map((tx: any, idx: number) => ({
          id: tx.id ? String(tx.id) : String(idx + 1).padStart(2, '0'),
          dbTransactionId: Number(tx.dbTransactionId || tx.id) || undefined,
          time: String(tx.time || tx.created_at || "09:15 AM"),
          itemCount: Number(tx.itemCount || tx.total_items || 1),
          paymentMethod: String(tx.paymentMethod || tx.payment_type || "Cash"),
          totalAmount: Number(tx.totalAmount || tx.total_price || 0),
          items: tx.items || [],
        }));

        const databaseIds = new Set(mapped.map((tx) => tx.dbTransactionId).filter(Boolean));
        const localOnly = localTxList.filter((tx) => !tx.dbTransactionId || !databaseIds.has(tx.dbTransactionId));
        setTransactions([...localOnly, ...mapped]);
        return;
      }
    } catch {
      // Backend offline
    }

    setTransactions(localTxList);
  }, []);

  useEffect(() => {
    void loadTransactions();

    const handleSync = () => {
      void loadTransactions();
    };

    window.addEventListener("pos_transaction_saved", handleSync);
    return () => {
      window.removeEventListener("pos_transaction_saved", handleSync);
    };
  }, [loadTransactions]);

  // Trigger Void Item Action
  const triggerVoidItem = useCallback(() => {
    if (!openTx) {
      alert("Please double click a transaction to open its items breakdown first.");
      return;
    }
    if (!selectedItemId) {
      alert("Please select an item from the breakdown table to void.");
      return;
    }
    setVoidType("item");
    setVoidReason("");
    setShowVoidModal(true);
  }, [openTx, selectedItemId]);

  // Trigger Void Invoice Action
  const triggerVoidInvoice = useCallback(() => {
    const targetTx = openTx || transactions.find(t => t.id === selectedTxId);
    if (!targetTx) {
      alert("Please select or double click a transaction to void.");
      return;
    }
    setVoidType("invoice");
    setVoidReason("");
    setShowVoidModal(true);
  }, [openTx, transactions, selectedTxId]);

  // Keyboard Shortcuts (F1, F2, F3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        triggerVoidItem();
      } else if (e.key === 'F3') {
        e.preventDefault();
        triggerVoidInvoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerVoidItem, triggerVoidInvoice]);

  // Auto-focus on reason input when modal opens
  useEffect(() => {
    if (showVoidModal) {
      setTimeout(() => {
        reasonInputRef.current?.focus();
      }, 100);
    }
  }, [showVoidModal]);

  const displayedTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return transactions;

    return transactions.filter((tx) => {
      const payment = tx.paymentMethod.toLowerCase();
      const amount = tx.totalAmount.toString();
      const hasMatchingItem = tx.items?.some(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query)
      );
      return payment.includes(query) || amount.includes(query) || hasMatchingItem;
    });
  }, [transactions, searchTerm]);

  const handleTxClick = (txId: string | number) => {
    setSelectedTxId(txId);
  };

  const handleTxDoubleClick = (tx: Transaction) => {
    setOpenTx(tx);
    setSelectedTxId(tx.id);
    setSelectedItemId(null);
  };

  // Submit Void Request
  const submitVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      alert("Please state a reason for voiding.");
      return;
    }

    const currentTx = openTx || transactions.find(t => t.id === selectedTxId);
    if (!currentTx) return;
    const targetItem = openTx?.items?.find((item) => item.id === selectedItemId);
    if (!currentTx.dbTransactionId || (voidType === 'item' && !targetItem?.transactionItemId)) {
      alert('This older transaction has no database record to void.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/voidtransaction.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: voidType,
          transaction_id: currentTx.dbTransactionId,
          item_id: targetItem?.transactionItemId,
          reason: voidReason,
          actor: (() => {
            try {
              const user = JSON.parse(localStorage.getItem("user") || "{}");
              return { id: user.id || null, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Unknown" };
            } catch { return { name: "Unknown" }; }
          })(),
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to void transaction.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to void transaction.');
      return;
    }

    let updatedTxList = [...transactions];

    if (voidType === "invoice") {
      updatedTxList = updatedTxList.filter(t => t.id !== currentTx.id);
      setOpenTx(null);
      setSelectedTxId(null);
    } else if (voidType === "item" && openTx) {
      const updatedItems = (openTx.items || []).filter(i => i.id !== selectedItemId);
      const newTotal = Math.max(0, openTx.totalAmount - ((targetItem?.price || 0) * (targetItem?.qty || 1) - (targetItem?.discount || 0)));

      if (updatedItems.length === 0) {
        updatedTxList = updatedTxList.filter(t => t.id !== openTx.id);
        setOpenTx(null);
      } else {
        const updatedTx = {
          ...openTx,
          items: updatedItems,
          itemCount: updatedItems.reduce((sum, i) => sum + i.qty, 0),
          totalAmount: newTotal
        };

        updatedTxList = updatedTxList.map(t => t.id === openTx.id ? updatedTx : t);
        setOpenTx(updatedTx);
      }
      setSelectedItemId(null);
    }

    setTransactions(updatedTxList);
    localStorage.setItem("pos_completed_transactions", JSON.stringify(updatedTxList));
    setShowVoidModal(false);
  };

  return (
    <div
      className="flex h-screen bg-[#cfdcfc] font-sans text-gray-800 antialiased overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <main className="p-6 flex flex-col gap-6 max-w-[1400px] mx-auto text-left w-full h-full overflow-hidden">
        
        {/* VOID REASON MODAL WINDOW */}
        {showVoidModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <form onSubmit={submitVoid} className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-cyan-400/60 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-cyan-100">
              <div className="flex justify-between items-center pb-2 border-b border-cyan-500/30">
                <div className="flex items-center gap-2 text-amber-400 font-black">
                  <AlertTriangle size={20} />
                  <span className="uppercase text-sm tracking-wider">
                    {voidType === "item" ? "VOID SINGLE ITEM" : "VOID ENTIRE INVOICE"}
                  </span>
                </div>
                <button type="button" onClick={() => setShowVoidModal(false)} className="text-cyan-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="text-xs text-cyan-200/80 font-medium">
                {voidType === "item" ? (
                  <p>You are about to void selected item from Transaction <strong>#{String(openTx?.id).padStart(2, '0')}</strong>.</p>
                ) : (
                  <p>You are about to void the complete transaction invoice <strong>#{String(openTx?.id || selectedTxId).padStart(2, '0')}</strong>.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                  Reason for Void *
                </label>
                <input
                  ref={reasonInputRef}
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Type description / reason (e.g., Damaged item, Customer cancel)..."
                  className="w-full bg-[#0c1d45] border border-cyan-400/50 rounded-xl p-3 text-xs text-white placeholder-cyan-400/50 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  Confirm Void
                </button>
                <button
                  type="button"
                  onClick={() => setShowVoidModal(false)}
                  className="flex-1 bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TOP TITLE BAR WITH BACK TO POS BUTTON */}
        <header className="bg-[#17347a] text-white p-3 px-4 rounded-xl shadow-md border-b-4 border-blue-900 shrink-0 flex items-center justify-between">
          <button
            onClick={() => navigate("/pos")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-800/80 hover:bg-blue-700 active:scale-95 text-xs font-extrabold uppercase transition-all border border-blue-400/30 shadow-xs"
          >
            <ArrowLeft size={16} />
            <span>POS Terminal</span>
          </button>

          <h1 className="text-lg font-extrabold uppercase tracking-wide text-center flex-1 pr-24">
            Recall Transactions
          </h1>
        </header>

        {/* F-Keys Header Bar */}
        <div className="bg-gradient-to-r from-[#0038a8] via-[#0052cc] to-[#0038a8] rounded-2xl p-2 flex items-center gap-3 shadow-md border border-[#00d2ff]/40 shrink-0">
          <button className="flex-1 bg-[#092b7a] hover:bg-[#0c39a0] rounded-xl py-2.5 px-4 flex items-center justify-center gap-3 transition-all border border-[#00d2ff]/30">
            <span className="text-2xl font-black text-white">F1</span>
            <span className="text-[11px] font-extrabold text-[#99ccff] text-left leading-tight">
              Reprint<br />Receipt
            </span>
          </button>

          <div className="h-8 w-[1px] bg-[#00d2ff]/30" />

          {/* F2 VOID ITEM BUTTON */}
          <button 
            onClick={triggerVoidItem}
            className={`flex-1 rounded-xl py-2.5 px-4 flex items-center justify-center gap-3 transition-all border ${
              openTx && selectedItemId 
                ? "bg-red-700 hover:bg-red-600 border-red-400 text-white shadow-lg animate-pulse" 
                : "bg-[#092b7a] hover:bg-[#0c39a0] border-[#00d2ff]/30 text-white"
            }`}
          >
            <span className="text-2xl font-black">F2</span>
            <span className="text-[11px] font-extrabold text-[#99ccff] text-left leading-tight">
              Void<br />Item
            </span>
          </button>

          <div className="h-8 w-[1px] bg-[#00d2ff]/30" />

          {/* F3 VOID INVOICE BUTTON */}
          <button 
            onClick={triggerVoidInvoice}
            className={`flex-1 rounded-xl py-2.5 px-4 flex items-center justify-center gap-3 transition-all border ${
              !openTx && selectedTxId 
                ? "bg-red-700 hover:bg-red-600 border-red-400 text-white shadow-lg" 
                : "bg-[#092b7a] hover:bg-[#0c39a0] border-[#00d2ff]/30 text-white"
            }`}
          >
            <span className="text-2xl font-black">F3</span>
            <span className="text-[11px] font-extrabold text-[#99ccff] text-left leading-tight">
              Void<br />Invoice
            </span>
          </button>

          <div className="h-8 w-[1px] bg-[#00d2ff]/30" />
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-[#eaf3ff] rounded-2xl p-2.5 px-4 flex items-center justify-between gap-4 shrink-0 shadow-xs border border-blue-100">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Item / Payment / Amount..."
              className="w-full pl-11 pr-4 py-2.5 bg-white rounded-xl text-gray-800 font-semibold text-xs outline-none focus:ring-2 focus:ring-blue-400 transition-all border border-gray-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveFilter("today")}
              className={`px-8 py-2.5 rounded-xl font-extrabold text-xs uppercase transition-all shadow-xs ${
                activeFilter === "today"
                  ? "bg-[#0040b3] text-white"
                  : "bg-[#cce3ff] text-blue-900 hover:bg-[#b8d8ff]"
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* WHITE CONTAINER BOX */}
        <div className="flex-1 bg-white rounded-2xl overflow-hidden min-h-0 flex flex-col shadow-md border-2 border-gray-100">
          {openTx ? (
            <div className="w-full h-full flex flex-col justify-between">
              
              <div className="bg-[#17347a] text-white p-3.5 px-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setOpenTx(null);
                      setSelectedItemId(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-xs font-black transition-all"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <div>
                    <h2 className="font-extrabold text-sm uppercase tracking-wide">
                      Transaction Items Breakdown
                    </h2>
                    <p className="text-[11px] text-blue-200">
                      Time: {openTx.time} | Payment Method: {openTx.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-blue-200 font-bold block">Transaction Total</span>
                  <span className="text-base font-black text-amber-400">
                    Php {openTx.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <table className="w-full text-left border-collapse select-none">
                  <thead className="bg-gray-100 text-gray-700 font-extrabold text-xs uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-6">Product Name</th>
                      <th className="py-3 px-6 font-mono">Barcode / Code</th>
                      <th className="py-3 px-6 text-center">Quantity</th>
                      <th className="py-3 px-6 text-right">Unit Price</th>
                      <th className="py-3 px-6 text-right pr-8">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                    {!openTx.items || openTx.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-gray-400 font-bold">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ShoppingBag size={32} className="text-gray-300" />
                            <span>No itemized breakdown recorded for this transaction.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      openTx.items.map((item) => {
                        const isItemSelected = selectedItemId === item.id;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            className={`cursor-pointer transition-colors ${
                              isItemSelected
                                ? "bg-blue-600 text-white hover:bg-blue-600"
                                : "hover:bg-blue-50/80"
                            }`}
                          >
                            <td className={`py-3.5 px-6 font-extrabold ${isItemSelected ? "text-white" : "text-[#17347a]"}`}>
                              {item.name}
                            </td>
                            <td className={`py-3.5 px-6 font-mono ${isItemSelected ? "text-blue-100" : "text-gray-500"}`}>
                              {item.code || "N/A"}
                            </td>
                            <td className="py-3.5 px-6 text-center">{item.qty}</td>
                            <td className={`py-3.5 px-6 text-right ${isItemSelected ? "text-blue-100" : "text-gray-600"}`}>
                              Php {item.price.toFixed(2)}
                            </td>
                            <td className={`py-3.5 px-6 text-right pr-8 font-black ${isItemSelected ? "text-amber-300" : "text-[#17347a]"}`}>
                              Php {(item.price * item.qty).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 p-3 px-6 border-t border-gray-200 flex items-center justify-between text-xs font-extrabold text-gray-600 shrink-0">
                <span>
                  Total Purchased Items: <strong className="text-gray-900">{openTx.itemCount} items</strong>
                </span>
                <span className="text-blue-900">
                  {selectedItemId ? "Item Selected: Ready for F2 Void Item" : "Click an item to select for F2 Void"}
                </span>
              </div>

            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto">
              <table className="w-full text-left border-collapse select-none">
                <thead className="bg-[#17347a] text-white font-extrabold text-xs uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-4 px-6 text-center w-24 bg-[#17347a]">No.</th>
                    <th className="py-4 px-6 bg-[#17347a]">Time</th>
                    <th className="py-4 px-6 bg-[#17347a]">Items</th>
                    <th className="py-4 px-6 bg-[#17347a]">Payment</th>
                    <th className="py-4 px-6 bg-[#17347a]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-800">
                  {displayedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-gray-400 font-bold">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    displayedTransactions.map((tx) => {
                      const isTxSelected = selectedTxId === tx.id;
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => handleTxClick(tx.id)}
                          onDoubleClick={() => handleTxDoubleClick(tx)}
                          className={`cursor-pointer transition-colors ${
                            isTxSelected
                              ? "bg-blue-600 text-white hover:bg-blue-600"
                              : "hover:bg-blue-50/80"
                          }`}
                        >
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black transition-all shadow-xs ${
                                isTxSelected
                                  ? "bg-white text-blue-700"
                                  : "bg-blue-100 text-[#17347a]"
                              }`}
                            >
                              {String(tx.id).padStart(2, '0')}
                            </span>
                          </td>
                          <td className={`py-4 px-6 ${isTxSelected ? "text-blue-100" : "text-gray-600"}`}>
                            {tx.time}
                          </td>
                          <td className={`py-4 px-6 ${isTxSelected ? "text-blue-100" : "text-gray-700"}`}>
                            {tx.itemCount} items
                          </td>
                          <td className={`py-4 px-6 ${isTxSelected ? "text-white" : "text-gray-800"}`}>
                            {tx.paymentMethod}
                          </td>
                          <td className={`py-4 px-6 font-black ${isTxSelected ? "text-amber-300" : "text-[#17347a]"}`}>
                            Php {tx.totalAmount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
