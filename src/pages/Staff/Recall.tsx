import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Search, ArrowLeft, ShoppingBag, X, AlertTriangle, Lock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost/One-Convenience/backend/api";
const MANAGER_PIN = "123456"; // Admin PIN requirement

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
  timestamp?: number;
  created_at?: string;
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
  const [managerPin, setManagerPin] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Custom Alert / Error Modal States
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "error" | "info";
    onClose?: () => void;
  }>({
    show: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (message: string, title = "System Notification", type: "error" | "info" = "info", onClose?: () => void) => {
    setAlertModal({
      show: true,
      title,
      message,
      type,
      onClose,
    });
  };

  const closeAlert = () => {
    const callback = alertModal.onClose;
    setAlertModal((prev) => ({ ...prev, show: false }));
    if (callback) callback();
  };

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

  // Helper function to extract numerical sorting value (newest timestamps first)
  const getSortTimestamp = (tx: Transaction): number => {
    if (tx.timestamp) return tx.timestamp;
    if (tx.created_at) {
      const parsed = new Date(tx.created_at).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    if (tx.time) {
      const parsedTime = new Date(tx.time).getTime();
      if (!isNaN(parsedTime)) return parsedTime;
    }
    return Number(tx.dbTransactionId || tx.id) || 0;
  };

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

    let combinedList: Transaction[] = [];

    try {
      const response = await fetch(`${API_BASE}/gettransactions.php`);
      if (response.ok) {
        const data = await response.json();
        const rawList = Array.isArray(data) ? data : Array.isArray(data?.transactions) ? data.transactions : [];
        const mapped: Transaction[] = rawList.map((tx: any, idx: number) => ({
          id: tx.id ? String(tx.id) : String(idx + 1).padStart(2, '0'),
          dbTransactionId: Number(tx.dbTransactionId || tx.id) || undefined,
          time: String(tx.time || tx.created_at || "09:15 AM"),
          created_at: tx.created_at,
          itemCount: Number(tx.itemCount || tx.total_items || 1),
          paymentMethod: String(tx.paymentMethod || tx.payment_type || "Cash"),
          totalAmount: Number(tx.totalAmount || tx.total_price || 0),
          items: tx.items || [],
        }));

        // Deduplicate using String conversion for both ID and dbTransactionId to prevent string vs number duplicate rows
        const databaseIds = new Set(
          mapped.flatMap((tx) => [String(tx.id), String(tx.dbTransactionId || "")])
        );

        const localOnly = localTxList.filter((tx) => {
          const txId = String(tx.id);
          const txDbId = String(tx.dbTransactionId || "");
          return !databaseIds.has(txId) && !databaseIds.has(txDbId);
        });

        combinedList = [...localOnly, ...mapped];
      } else {
        combinedList = localTxList;
      }
    } catch {
      // Backend offline fallback
      combinedList = localTxList;
    }

    // Sort strictly DESCENDING (newest transactions at the top)
    const sortedDesc = combinedList.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
    setTransactions(sortedDesc);
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
      showAlert("Please double click a transaction to open its items breakdown first.", "Action Required", "info");
      return;
    }
    if (!selectedItemId) {
      showAlert("Please select an item from the breakdown table to void.", "Action Required", "info");
      return;
    }
    setVoidType("item");
    setManagerPin("");
    setVoidReason("");
    setShowVoidModal(true);
  }, [openTx, selectedItemId]);

  // Trigger Void Invoice Action
  const triggerVoidInvoice = useCallback(() => {
    const targetTx = openTx || transactions.find(t => String(t.id) === String(selectedTxId));
    if (!targetTx) {
      showAlert("Please select or double click a transaction to void.", "Action Required", "info");
      return;
    }
    setVoidType("invoice");
    setManagerPin("");
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

  // Auto-focus on manager PIN input when modal opens
  useEffect(() => {
    if (showVoidModal) {
      setTimeout(() => {
        pinInputRef.current?.focus();
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

  // Submit Void Request with Manager PIN validation
  const submitVoid = async (e: React.FormEvent) => {
    e.preventDefault();

    if (managerPin !== MANAGER_PIN) {
      setManagerPin("");
      showAlert("Invalid Manager PIN. Access denied.", "ACCESS DENIED", "error", () => {
        pinInputRef.current?.focus();
      });
      return;
    }

    if (!voidReason.trim()) {
      showAlert("Please state a reason for voiding.", "Reason Required", "info");
      return;
    }

    const currentTx = openTx || transactions.find(t => String(t.id) === String(selectedTxId));
    if (!currentTx) return;
    const targetItem = openTx?.items?.find((item) => item.id === selectedItemId);
    if (!currentTx.dbTransactionId || (voidType === 'item' && !targetItem?.transactionItemId)) {
      showAlert("This older transaction has no database record to void.", "Record Not Found", "error");
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
          manager_pin: managerPin,
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
      showAlert(err instanceof Error ? err.message : 'Failed to void transaction.', "Void Failed", "error");
      return;
    }

    let updatedTxList = [...transactions];

    if (voidType === "invoice") {
      updatedTxList = updatedTxList.filter(t => String(t.id) !== String(currentTx.id));
      setOpenTx(null);
      setSelectedTxId(null);
    } else if (voidType === "item" && openTx) {
      const updatedItems = (openTx.items || []).filter(i => i.id !== selectedItemId);
      const newTotal = Math.max(0, openTx.totalAmount - ((targetItem?.price || 0) * (targetItem?.qty || 1) - (targetItem?.discount || 0)));

      if (updatedItems.length === 0) {
        updatedTxList = updatedTxList.filter(t => String(t.id) !== String(openTx.id));
        setOpenTx(null);
      } else {
        const updatedTx = {
          ...openTx,
          items: updatedItems,
          itemCount: updatedItems.reduce((sum, i) => sum + i.qty, 0),
          totalAmount: newTotal
        };

        updatedTxList = updatedTxList.map(t => String(t.id) === String(openTx.id) ? updatedTx : t);
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
      className="flex h-screen bg-[#b0c7ff] font-sans text-gray-800 antialiased overflow-hidden p-6 relative"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* CUSTOM ALERT / ACCESS DENIED MODAL (STAYS IN FRONT AT z-[60]) */}
      {alertModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0d1e47]/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#122b68] border-2 border-blue-400/50 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center gap-3 border-b border-blue-400/20 pb-3">
              {alertModal.type === "error" ? (
                <div className="p-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  <ShieldAlert size={22} />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <CheckCircle2 size={22} />
                </div>
              )}
              <h3 className="font-extrabold text-base tracking-wide text-white uppercase">
                {alertModal.title}
              </h3>
            </div>

            <p className="text-xs font-semibold text-blue-100 leading-relaxed">
              {alertModal.message}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={closeAlert}
                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                  alertModal.type === "error"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="p-0 flex flex-col gap-4 max-w-[1400px] mx-auto text-left w-full h-full overflow-hidden">

        {/* VOID REASON & MANAGER PIN MODAL WINDOW (LAYER AT z-50) */}
        {showVoidModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1e47]/70 backdrop-blur-xs p-4">
            <form onSubmit={submitVoid} className="bg-[#122b68] border-2 border-blue-400/40 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white">
              <div className="flex justify-between items-center pb-2 border-b border-blue-400/20">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold">
                  <AlertTriangle size={20} />
                  <span className="uppercase text-sm tracking-wider font-extrabold">
                    {voidType === "item" ? "VOID SINGLE ITEM" : "VOID ENTIRE INVOICE"}
                  </span>
                </div>
                <button type="button" onClick={() => setShowVoidModal(false)} className="text-blue-200 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="text-xs text-blue-100 font-medium">
                {voidType === "item" ? (
                  <p>You are about to void selected item from Transaction <strong>#{String(openTx?.id).padStart(2, '0')}</strong>.</p>
                ) : (
                  <p>You are about to void the complete transaction invoice <strong>#{String(openTx?.id || selectedTxId).padStart(2, '0')}</strong>.</p>
                )}
              </div>

              {/* MANAGER PIN INPUT */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-blue-200 uppercase tracking-wide flex items-center gap-1.5">
                  <Lock size={14} className="text-amber-400" />
                  Manager PIN *
                </label>
                <input
                  ref={pinInputRef}
                  type="password"
                  maxLength={10}
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  placeholder="Enter Manager Admin PIN..."
                  className="w-full bg-[#0d1f4d] border border-blue-400/40 rounded-xl p-3 text-xs text-white placeholder-blue-300/50 outline-none focus:ring-2 focus:ring-blue-400 font-mono font-black tracking-widest"
                />
              </div>

              {/* REASON INPUT */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-blue-200 uppercase tracking-wide">
                  Reason for Void *
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Type description / reason (e.g., Damaged item, Customer cancel)..."
                  className="w-full bg-[#0d1f4d] border border-blue-400/40 rounded-xl p-3 text-xs text-white placeholder-blue-300/50 outline-none focus:ring-2 focus:ring-blue-400 font-semibold"
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
                  className="flex-1 bg-[#1d387d] border border-blue-400/30 text-white py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-[#25469b] active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TOP NAV BAR - MATCHING DESIGN BANNER */}
        <header className="bg-[#122b68] text-white p-3.5 px-6 rounded-2xl shadow-md shrink-0 flex items-center justify-between">
          <button
            onClick={() => navigate("/pos")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs font-extrabold uppercase transition-all shadow-xs"
          >
            <ArrowLeft size={16} />
            <span>POS Terminal</span>
          </button>

          <h1 className="text-lg font-black uppercase tracking-wider text-center flex-1 pr-28 text-white">
            RECALL TRANSACTIONS
          </h1>
        </header>

        {/* F-KEYS BAR - MATCHING CONTROLS CONTAINER */}
        <div className="bg-[#adbde6] rounded-2xl p-2.5 px-3 flex items-center justify-between gap-3 shadow-xs shrink-0">
          <button className="flex-1 bg-[#122b68] hover:bg-[#1a3880] text-white rounded-xl py-2 px-4 flex items-center justify-center gap-3 transition-all">
            <span className="text-2xl font-black text-white">F1</span>
            <span className="text-[11px] font-extrabold uppercase leading-tight text-left">
              Reprint<br />Receipt
            </span>
          </button>

          {/* F2 VOID ITEM BUTTON */}
          <button 
            onClick={triggerVoidItem}
            className={`flex-1 rounded-xl py-2 px-4 flex items-center justify-center gap-3 transition-all ${
              openTx && selectedItemId 
                ? "bg-red-600 hover:bg-red-500 text-white shadow-md animate-pulse" 
                : "bg-[#122b68] hover:bg-[#1a3880] text-white"
            }`}
          >
            <span className="text-2xl font-black">F2</span>
            <span className="text-[11px] font-extrabold uppercase leading-tight text-left">
              Void<br />Item
            </span>
          </button>

          {/* F3 VOID INVOICE BUTTON */}
          <button 
            onClick={triggerVoidInvoice}
            className={`flex-1 rounded-xl py-2 px-4 flex items-center justify-center gap-3 transition-all ${
              !openTx && selectedTxId 
                ? "bg-red-600 hover:bg-red-500 text-white shadow-md" 
                : "bg-[#122b68] hover:bg-[#1a3880] text-white"
            }`}
          >
            <span className="text-2xl font-black">F3</span>
            <span className="text-[11px] font-extrabold uppercase leading-tight text-left">
              Void<br />Invoice
            </span>
          </button>
        </div>

        {/* SEARCH & FILTER BAR - PERIWINKLE CONTAINER STYLE */}
        <div className="bg-[#adbde6] rounded-2xl p-2.5 px-4 flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Item / Payment / Amount..."
              className="w-full pl-11 pr-4 py-2 bg-white rounded-xl text-gray-900 font-extrabold text-xs outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter("today")}
              className={`px-8 py-2 rounded-xl font-extrabold text-xs uppercase transition-all shadow-xs ${
                activeFilter === "today"
                  ? "bg-[#122b68] text-white"
                  : "bg-white/70 text-[#122b68] hover:bg-white"
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* MAIN DATA CONTAINER - CARD WITH NAVY HEADER TABLE */}
        <div className="flex-1 bg-white rounded-2xl overflow-hidden min-h-0 flex flex-col shadow-md">
          {openTx ? (
            <div className="w-full h-full flex flex-col justify-between">
              
              {/* BREAKDOWN NAVY BAR */}
              <div className="bg-[#122b68] text-white p-3.5 px-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setOpenTx(null);
                      setSelectedItemId(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-extrabold uppercase transition-all"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <div>
                    <h2 className="font-black text-sm uppercase tracking-wide">
                      Transaction Items Breakdown
                    </h2>
                    <p className="text-[11px] text-blue-200 font-extrabold">
                      TIME: {openTx.time} | PAYMENT: {openTx.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-blue-200 font-black block">Transaction Total</span>
                  <span className="text-base font-black text-amber-400">
                    Php {openTx.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* ITEM BREAKDOWN TABLE */}
              <div className="flex-1 overflow-y-auto p-0 min-h-0">
                <table className="w-full text-left border-collapse select-none">
                  <thead className="bg-[#122b68] text-white font-extrabold text-[11px] uppercase tracking-wider sticky top-0 z-10">
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
                                ? "bg-blue-600 text-white"
                                : "hover:bg-blue-50/80"
                            }`}
                          >
                            <td className={`py-3.5 px-6 font-extrabold ${isItemSelected ? "text-white" : "text-[#122b68]"}`}>
                              {item.name}
                            </td>
                            <td className={`py-3.5 px-6 font-mono ${isItemSelected ? "text-blue-100" : "text-gray-500"}`}>
                              {item.code || "N/A"}
                            </td>
                            <td className="py-3.5 px-6 text-center">{item.qty}</td>
                            <td className={`py-3.5 px-6 text-right ${isItemSelected ? "text-blue-100" : "text-gray-600"}`}>
                              Php {item.price.toFixed(2)}
                            </td>
                            <td className={`py-3.5 px-6 text-right pr-8 font-black ${isItemSelected ? "text-amber-300" : "text-[#122b68]"}`}>
                              Php {(item.price * item.qty).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER BAR */}
              <div className="bg-[#adbde6]/40 p-3 px-6 border-t border-gray-200 flex items-center justify-between text-xs font-extrabold text-[#122b68] shrink-0">
                <span>
                  Total Purchased Items: <strong className="text-gray-900">{openTx.itemCount} items</strong>
                </span>
                <span>
                  {selectedItemId ? "Item Selected: Ready for F2 Void Item" : "Click an item to select for F2 Void"}
                </span>
              </div>

            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto">
              <table className="w-full text-left border-collapse select-none">
                <thead className="bg-[#122b68] text-white font-extrabold text-[11px] uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-6 text-center w-28">No.</th>
                    <th className="py-3 px-6">Time</th>
                    <th className="py-3 px-6">Items</th>
                    <th className="py-3 px-6">Payment</th>
                    <th className="py-3 px-6">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-extrabold text-gray-800">
                  {displayedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-gray-400 font-bold">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    displayedTransactions.map((tx, idx) => {
                      const isTxSelected = String(selectedTxId) === String(tx.id);
                      return (
                        <tr
                          key={`${tx.id}-${tx.dbTransactionId || idx}`}
                          onClick={() => handleTxClick(tx.id)}
                          onDoubleClick={() => handleTxDoubleClick(tx)}
                          className={`cursor-pointer transition-colors ${
                            isTxSelected
                              ? "bg-blue-600 text-white"
                              : "hover:bg-blue-50/80"
                          }`}
                        >
                          <td className="py-3.5 px-6 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black uppercase transition-all ${
                                isTxSelected
                                  ? "bg-white text-blue-900"
                                  : "bg-[#122b68] text-white"
                              }`}
                            >
                              {String(tx.id).padStart(2, '0')}
                            </span>
                          </td>
                          <td className={`py-3.5 px-6 ${isTxSelected ? "text-blue-100" : "text-gray-600"}`}>
                            {tx.time}
                          </td>
                          <td className={`py-3.5 px-6 ${isTxSelected ? "text-blue-100" : "text-gray-700"}`}>
                            {tx.itemCount} items
                          </td>
                          <td className={`py-3.5 px-6 ${isTxSelected ? "text-white" : "text-gray-800"}`}>
                            {tx.paymentMethod}
                          </td>
                          <td className={`py-3.5 px-6 font-black ${isTxSelected ? "text-amber-300" : "text-[#122b68]"}`}>
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