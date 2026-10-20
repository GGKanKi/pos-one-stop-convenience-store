import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ArrowLeft, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost/One-Convenience/backend/api";

interface PurchasedItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  qty: number;
}

interface Transaction {
  id: number;
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
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [openTx, setOpenTx] = useState<Transaction | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

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
          id: Number(tx.id || idx + 1),
          time: String(tx.time || tx.created_at || "09:15 AM"),
          itemCount: Number(tx.itemCount || tx.total_items || 1),
          paymentMethod: String(tx.paymentMethod || tx.payment_type || "Cash"),
          totalAmount: Number(tx.totalAmount || tx.total_price || 0),
          items: tx.items || [],
        }));

        setTransactions([...localTxList, ...mapped]);
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

  const handleTxClick = (txId: number) => {
    setSelectedTxId(txId);
  };

  const handleTxDoubleClick = (tx: Transaction) => {
    setOpenTx(tx);
    setSelectedTxId(tx.id);
    setSelectedItemId(null);
  };

  return (
    <div
      className="flex h-screen bg-[#cfdcfc] font-sans text-gray-800 antialiased overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <main className="p-6 flex flex-col gap-6 max-w-[1400px] mx-auto text-left w-full h-full overflow-hidden">
        
        {/* TOP TITLE BAR WITH BACK TO POS BUTTON */}
        <header className="bg-[#17347a] text-white p-3 px-4 rounded-xl shadow-md border-b-4 border-blue-900 shrink-0 flex items-center justify-between">
          <button
            onClick={() => navigate("/pos")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-800/80 hover:bg-blue-700 active:scale-95 text-xs font-extrabold uppercase transition-all border border-blue-400/30 shadow-xs"
          >
            <ArrowLeft size={16} />
            <span>POS</span>
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

          <button className="flex-1 bg-[#092b7a] hover:bg-[#0c39a0] rounded-xl py-2.5 px-4 flex items-center justify-center gap-3 transition-all border border-[#00d2ff]/30">
            <span className="text-2xl font-black text-white">F2</span>
            <span className="text-[11px] font-extrabold text-[#99ccff] text-left leading-tight">
              Void<br />Item
            </span>
          </button>

          <div className="h-8 w-[1px] bg-[#00d2ff]/30" />

          <button className="flex-1 bg-[#092b7a] hover:bg-[#0c39a0] rounded-xl py-2.5 px-4 flex items-center justify-center gap-3 transition-all border border-[#00d2ff]/30">
            <span className="text-2xl font-black text-white">F3</span>
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

        {/* WHITE CONTAINER BOX WORKSPACE */}
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
                    displayedTransactions.map((tx, idx) => {
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
                              {idx + 1}
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