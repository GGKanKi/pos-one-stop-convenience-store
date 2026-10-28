import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, Trash2, Plus, Minus, ScanLine, Check, Printer, X, ShoppingBag, Lock, AlertTriangle
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import { getAuthUser, getAuthUserId } from "../../services/authSession";

interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  qty: number;
  stock?: number;
  category?: string;
  discount?: number;
  expiryBatches?: any[];
  expirationDate?: string;
  expiration_date?: string;
}

// Helper to securely parse dates and check expiration against today (2026-10-28)
function checkProductExpiration(product: any): { isExpired: boolean; message: string } {
  const today = new Date("2026-10-28");
  today.setHours(0, 0, 0, 0);

  const parseDateString = (dateStr: string) => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
      }
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const batches = Array.isArray(product.expiryBatches) ? product.expiryBatches : [];
  if (batches.length > 0) {
    const hasExpiredBatch = batches.some((b: any) => {
      const batchDate = parseDateString(b.date);
      return batchDate && batchDate < today && Number(b.qty) > 0;
    });
    if (hasExpiredBatch) {
      return { 
        isExpired: true, 
        message: `⚠️ WARNING: "${product.name || product.productName}" has expired stock batches! Please verify before selling.` 
      };
    }
  }

  const primaryExpiryStr = product.expirationDate || product.expiration_date;
  const primaryExpiryDate = parseDateString(primaryExpiryStr);
  
  if (primaryExpiryDate && primaryExpiryDate < today) {
    return { 
      isExpired: true, 
      message: `⚠️ WARNING: "${product.name || product.productName}" expired on ${primaryExpiryStr}! Please check the expiry date.` 
    };
  }

  return { isExpired: false, message: '' };
}

export default function POS() {
  const navigate = useNavigate(); 
  const [clockInError, setClockInError] = useState("");

  // Clock-in Session Check
  useEffect(() => {
    let cancelled = false;
    const userId = getAuthUserId();

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

  // Cart & Selected Item State
  const [cart, setCart] = useState<Product[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash'>('Cash');
  const [cashTendered, setCashTendered] = useState("0.00");
  const [gcashReference, setGcashReference] = useState("");
  const [gcashParticulars, setGcashParticulars] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Custom Error Modal State
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Expiration Warning Modal State
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryWarningMessage, setExpiryWarningMessage] = useState("");
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState<string>("0.00");

  // Inventory Password Protection State
  const [showInventoryPasswordModal, setShowInventoryPasswordModal] = useState(false);
  const [staffPasswordInput, setStaffPasswordInput] = useState("");
  const [staffPasswordError, setStaffPasswordError] = useState("");
  const [isVerifyingStaff, setIsVerifyingStaff] = useState(false);

  // Scan & Search Window State
  const [scanCode, setScanCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const modalSearchInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const inventoryPasswordInputRef = useRef<HTMLInputElement>(null);
  const cartTableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cartTableContainerRef.current) {
      cartTableContainerRef.current.scrollTop = cartTableContainerRef.current.scrollHeight;
    }
  }, [cart]);

  const insertProductIntoCart = (productToAdd: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productToAdd.id || item.code === productToAdd.code);
      if (existing) {
        return prev.map(item =>
          item.id === productToAdd.id || item.code === productToAdd.code
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, productToAdd];
    });

    setSelectedItemId(productToAdd.id);
    setShowSearchModal(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const triggerDiscountModal = useCallback(() => {
    if (selectedItemId === null || !cart.some(item => item.id === selectedItemId)) {
      setErrorMessage("Please select an item from the cart to apply a discount.");
      setShowErrorModal(true);
      return;
    }

    const item = cart.find(i => i.id === selectedItemId);
    setDiscountInput(item?.discount ? item.discount.toFixed(2) : "0.00");
    setShowDiscountModal(true);
  }, [selectedItemId, cart]);

  useEffect(() => {
    if (showDiscountModal) {
      setTimeout(() => {
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
      }, 100);
    } else {
      scanInputRef.current?.focus();
    }
  }, [showDiscountModal]);

  useEffect(() => {
    if (showInventoryPasswordModal) {
      setTimeout(() => {
        inventoryPasswordInputRef.current?.focus();
      }, 100);
    } else {
      scanInputRef.current?.focus();
    }
  }, [showInventoryPasswordModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setShowPaymentModal(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        triggerDiscountModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, cart, triggerDiscountModal]);

  const barcodeBufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    const scannedCode = barcode.trim();
    if (!scannedCode) return;

    try {
      const response = await apiRequest(`/getproducts.php?search=${encodeURIComponent(scannedCode)}`, "GET");
      if (response.success && response.products && response.products.length > 0) {
        const exactMatch = response.products.find((p: Record<string, unknown>) => p.code === scannedCode) || response.products[0];
        
        const productToAdd: Product = {
          id: Number(exactMatch.id),
          code: String(exactMatch.code || ''),
          name: String(exactMatch.name || exactMatch.productName || ''),
          description: String(exactMatch.description || ''),
          price: parseFloat(String(exactMatch.price ?? exactMatch.sellingPrice ?? "0")) || 0,
          qty: 1,
          stock: Number(exactMatch.stock || exactMatch.stockQuantity || 0),
          category: String(exactMatch.category || ''),
          discount: 0,
          expiryBatches: exactMatch.expiryBatches,
          expirationDate: exactMatch.expirationDate,
          expiration_date: exactMatch.expiration_date
        };

        setShowSearchModal(false);
        setSearchQuery("");

        const expiryCheck = checkProductExpiration(exactMatch);
        if (expiryCheck.isExpired) {
          setPendingProduct(productToAdd);
          setExpiryWarningMessage(expiryCheck.message);
          setShowExpiryModal(true);
        } else {
          insertProductIntoCart(productToAdd);
        }

      } else {
        if (response.success && Array.isArray(response.products)) {
          setErrorMessage(`Product with barcode "${scannedCode}" was not found in inventory.`);
          setShowErrorModal(true);
        } else {
          setErrorMessage(response.message || "Could not search the product inventory. Please try again.");
          setShowErrorModal(true);
        }
      }
    } catch (err) {
      console.error("Scanner lookup error:", err);
      setErrorMessage("Could not search the product inventory. Please try again.");
      setShowErrorModal(true);
    }
  }, []);

  useEffect(() => {
    const handleGlobalScanKeypress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target.tagName === "INPUT" && target.id !== "pos-main-scan-input" && target !== scanInputRef.current) ||
        target.tagName === "TEXTAREA"
      ) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = ""; 
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode.length > 1) {
          e.preventDefault();
          handleBarcodeScanned(scannedCode);
        }
        barcodeBufferRef.current = "";
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalScanKeypress, true);
    return () => window.removeEventListener('keydown', handleGlobalScanKeypress, true);
  }, [handleBarcodeScanned]);

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
        const mapped: Product[] = response.products.map((item: Record<string, unknown>) => ({
          id: Number(item.id),
          code: String(item.code || item.barcode || ''),
          name: String(item.name || item.productName || ''),
          description: String(item.description || ''),
          price: parseFloat(String(item.price ?? item.sellingPrice ?? "0")) || 0,
          qty: 1,
          stock: Number(item.stock || item.stockQuantity || 0),
          category: String(item.category || ''),
          discount: 0,
          expiryBatches: item.expiryBatches,
          expirationDate: item.expirationDate,
          expiration_date: item.expiration_date
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
    setShowSearchModal(false);
    setSearchQuery("");
    setSearchResults([]);

    const expiryCheck = checkProductExpiration(product);
    if (expiryCheck.isExpired) {
      setPendingProduct(product);
      setExpiryWarningMessage(expiryCheck.message);
      setShowExpiryModal(true);
    } else {
      insertProductIntoCart(product);
    }
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

    const codeToSearch = scanCode.trim();
    setScanCode("");
    await handleBarcodeScanned(codeToSearch);
  };

  const subTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const transactionDiscount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.discount || 0), 0),
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
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  };

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cart.length) {
      setErrorMessage("Cart is empty.");
      setShowErrorModal(true);
      return;
    }

    if (paymentMethod === 'Cash') {
      const tendered = parseFloat(cashTendered) || 0;
      if (tendered < total) {
        setErrorMessage(`Insufficient cash tendered! The total amount is ₱${total.toFixed(2)}, but cash tendered is only ₱${tendered.toFixed(2)}.`);
        setShowErrorModal(true);
        return;
      }
    }
    
    if (paymentMethod === 'GCash' && !gcashReference.trim()) {
      setErrorMessage("Please enter the GCash Reference Number.");
      setShowErrorModal(true);
      return;
    }

    setShowPaymentModal(false);
    setShowReceiptModal(true);
  };

  const handleDiscountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(discountInput) || 0;

    if (selectedItemId === null) return;

    const targetItem = cart.find(i => i.id === selectedItemId);
    if (!targetItem) return;

    const itemTotal = targetItem.price * targetItem.qty;

    if (val < 0) {
      setErrorMessage("Discount cannot be negative.");
      setShowErrorModal(true);
      return;
    }

    if (val > itemTotal) {
      setErrorMessage("Discount cannot exceed the selected item's total price.");
      setShowErrorModal(true);
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.id === selectedItemId
          ? { ...item, discount: val }
          : item
      )
    );

    setShowDiscountModal(false);
  };

  const handleInventoryAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffPasswordError("");
    setIsVerifyingStaff(true);
    try {
      const result = await apiRequest("/verifystaffpassword.php", "POST", { password: staffPasswordInput });
      if (!result.success) throw new Error(result.message || "The staff password is incorrect.");
      const verifiedStaff = result.data?.staff;
      if (!verifiedStaff?.id) throw new Error("Staff account details could not be loaded.");
      const staffToken = result.data?.token;
      if (!staffToken) throw new Error("Staff verification did not create a secure session. Please try again.");
      const clockIn = await apiRequest("/clockin.php", "POST", { user_id: verifiedStaff.id }, staffToken);
      if (!clockIn.success) throw new Error(clockIn.message || "Unable to clock Staff in.");
      sessionStorage.setItem("staffToolsUnlockUntil", String(Date.now() + 30 * 60 * 1000));
      sessionStorage.setItem("staffToolsUser", JSON.stringify(verifiedStaff));
      sessionStorage.setItem("staffToolsToken", staffToken);
      setShowInventoryPasswordModal(false);
      setStaffPasswordInput("");
      navigate("/admin/dashboard", { state: { fullScreen: true, staffView: true } });
    } catch (error) {
      setStaffPasswordError(error instanceof Error ? error.message : "Unable to verify the staff password.");
    } finally {
      setIsVerifyingStaff(false);
    }
  };

  const finalizeTransaction = async (shouldPrint = false) => {
    if (cart.length === 0) {
      setShowReceiptModal(false);
      return;
    }

    const transactionData = {
      paymentMethod,
      totalAmount: total,
      cashTendered: paymentMethod === 'Cash' ? parseFloat(cashTendered) || total : total,
      changeDue: paymentMethod === 'Cash' ? changeDue : 0,
      gcashReference: paymentMethod === 'GCash' ? gcashReference : null,
      gcashParticulars: paymentMethod === 'GCash' ? gcashParticulars : null,
      actor: (() => {
        try {
          const user = getAuthUser();
          return { id: user.id || null, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Unknown" };
        } catch { return { name: "Unknown" }; }
      })(),
      discount: transactionDiscount,
      items: cart.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        price: item.price,
        qty: item.qty,
        discount: item.discount || 0
      })),
    };

    let savedResponse: {
      success?: boolean;
      transaction_id?: string | number;
      message?: string;
      items?: Array<{ transactionItemId?: number }>;
    };
    try {
      savedResponse = await apiRequest("/savetransaction.php", "POST", transactionData);
      if (!savedResponse?.success || !savedResponse.transaction_id) {
        setErrorMessage(savedResponse?.message || "The sale could not be saved.");
        setShowErrorModal(true);
        return;
      }
    } catch (err: unknown) {
      console.error("Fetch/Server Error:", err);
      setErrorMessage("Connection Error: " + (err instanceof Error ? err.message : "Failed to reach PHP server."));
      setShowErrorModal(true);
      return;
    }

    const fullSavedTx = {
      ...transactionData,
      id: String(savedResponse.transaction_id),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      itemCount: cart.reduce((sum, i) => sum + i.qty, 0),
    };

    try {
      const existing = JSON.parse(localStorage.getItem("pos_completed_transactions") || "[]");
      const mappedItemsTx = {
        ...fullSavedTx,
        items: transactionData.items.map((item, index) => ({
          ...item,
          transactionItemId: savedResponse.items?.[index]?.transactionItemId,
        })),
      };
      localStorage.setItem("pos_completed_transactions", JSON.stringify([mappedItemsTx, ...existing]));
      window.dispatchEvent(new Event("pos_transaction_saved"));
    } catch (e) {
      console.error("Local Sync Error:", e);
    }

    if (shouldPrint) {
      printThermalReceipt(fullSavedTx);
    }

    setShowReceiptModal(false);
    setCart([]);
    setSelectedItemId(null);
    setCashTendered("0.00");
    setGcashReference("");
    setGcashParticulars("");
    setScanCode("");
    setSearchQuery("");
  };

  // Optimized Thermal Receipt Printing Function with Auto-Close
  const printThermalReceipt = (tx: any) => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert("Please allow pop-ups for receipt printing.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - #${tx.id}</title>
          <style>
            @page { margin: 0; size: 58mm auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              width: 54mm;
              margin: 0 auto;
              padding: 4px;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; }
            .line { border-bottom: dashed 1px #000; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            th, td { font-size: 10px; text-align: left; padding: 1px 0; }
            .amount-col { text-align: right; }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 12px;">STORE NAME / POS</div>
          <div class="text-center">Terminal: 202603 - Bernice</div>
          <div class="text-center">Date: ${tx.date || new Date().toLocaleDateString()} ${tx.time || ''}</div>
          <div class="text-center">Tx ID: #${tx.id}</div>
          <div class="line"></div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Qty</th>
                <th class="amount-col">Total</th>
              </tr>
            </thead>
            <tbody>
              ${tx.items.map((item: any) => `
                <tr>
                  <td colspan="3" class="bold">${item.name}</td>
                </tr>
                <tr>
                  <td>₱${item.price.toFixed(2)} ${item.discount ? `(-₱${item.discount})` : ''}</td>
                  <td class="text-center">${item.qty}</td>
                  <td class="amount-col">₱${((item.price * item.qty) - (item.discount || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="line"></div>
          <div class="flex-between"><span>Subtotal:</span> <span>₱${(tx.totalAmount + (tx.discount || 0)).toFixed(2)}</span></div>
          <div class="flex-between"><span>Discount:</span> <span>₱${(tx.discount || 0).toFixed(2)}</span></div>
          <div class="flex-between bold" style="font-size: 12px;"><span>TOTAL:</span> <span>₱${tx.totalAmount.toFixed(2)}</span></div>
          
          <div class="line"></div>
          <div class="flex-between"><span>Payment:</span> <span>${tx.paymentMethod}</span></div>
          ${tx.paymentMethod === 'Cash' ? `
            <div class="flex-between"><span>Cash Tendered:</span> <span>₱${Number(tx.cashTendered || 0).toFixed(2)}</span></div>
            <div class="flex-between"><span>Change Due:</span> <span>₱${Number(tx.changeDue || 0).toFixed(2)}</span></div>
          ` : `
            <div class="flex-between"><span>Ref No:</span> <span>${tx.gcashReference || 'N/A'}</span></div>
          `}

          <div class="line"></div>
          <div class="text-center" style="margin-top: 6px;">Thank you for your purchase!</div>
          <div class="text-center" style="font-size: 8px; margin-top: 2px;">Powered by POS System</div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  };

  const selectedItem = useMemo(() => cart.find(i => i.id === selectedItemId), [cart, selectedItemId]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#183478] via-[#12285e] to-[#0a183b] flex flex-col p-4 relative text-cyan-100 overflow-hidden shadow-[inset_0_0_100px_rgba(0,140,255,0.15)]" style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}>
      
      {clockInError && (
        <div role="alert" className="mb-3 rounded-lg border border-red-400 bg-red-900/70 px-4 py-3 text-sm font-semibold text-red-100 shrink-0">
          {clockInError}
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all">
          <div className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-red-500 w-[440px] rounded-[30px] p-8 flex flex-col items-center shadow-[0_0_80px_rgba(239,68,68,0.5)]">
            <div className="w-16 h-16 bg-red-950 border-2 border-red-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.6)]">
              <AlertTriangle className="text-red-400" size={32} />
            </div>

            <h2 className="text-xl font-black text-white mb-2 tracking-wider text-center">NOTICE</h2>
            <p className="text-red-200 text-center mb-6 font-medium text-sm px-2">
              {errorMessage}
            </p>

            <button 
              type="button"
              onClick={() => {
                setShowErrorModal(false);
                setErrorMessage("");
                setTimeout(() => scanInputRef.current?.focus(), 50);
              }}
              className="w-full bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-black text-xs tracking-wider uppercase transition shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showExpiryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all">
          <div className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-red-500 w-[460px] rounded-[30px] p-8 flex flex-col items-center shadow-[0_0_80px_rgba(239,68,68,0.5)]">
            <div className="w-16 h-16 bg-red-950 border-2 border-red-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.6)]">
              <AlertTriangle className="text-red-400" size={32} />
            </div>

            <h2 className="text-xl font-black text-white mb-2 tracking-wider text-center">EXPIRED PRODUCT WARNING</h2>
            <p className="text-red-200 text-center mb-6 font-medium text-sm px-2">
              {expiryWarningMessage}
            </p>

            <div className="w-full flex gap-3">
              <button 
                type="button"
                onClick={() => {
                  if (pendingProduct) insertProductIntoCart(pendingProduct);
                  setShowExpiryModal(false);
                  setPendingProduct(null);
                  setTimeout(() => scanInputRef.current?.focus(), 50);
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-black text-xs tracking-wider uppercase transition shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
              >
                Proceed Anyway
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowExpiryModal(false);
                  setPendingProduct(null);
                  setTimeout(() => scanInputRef.current?.focus(), 50);
                }}
                className="flex-1 bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/40 text-cyan-300 py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase hover:brightness-110 transition shadow-[0_0_15px_rgba(0,120,255,0.2)] cursor-pointer"
              >
                Cancel / Do Not Sell
              </button>
            </div>
          </div>
        </div>
      )}

      {showInventoryPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all">
          <form 
            onSubmit={handleInventoryAccessSubmit}
            className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-cyan-400/60 w-[420px] rounded-[30px] p-6 flex flex-col justify-between gap-5 shadow-[0_0_60px_rgba(0,180,255,0.35)]"
          >
            <div className="space-y-4 flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-cyan-500/20">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Lock size={18} />
                  <p className="text-xs font-black tracking-widest uppercase">STAFF VERIFICATION</p>
                </div>
                <button type="button" onClick={() => { setShowInventoryPasswordModal(false); setStaffPasswordError(""); }} className="text-cyan-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-gradient-to-b from-[#183478]/90 to-[#0e214d]/90 rounded-xl p-5 border border-cyan-400/40 space-y-3 shadow-[0_0_20px_rgba(0,140,255,0.15)]">
                <p className="text-xs font-bold text-cyan-300 uppercase tracking-wide text-center">ENTER STAFF PASSWORD</p>
                
                <div className="relative mt-2">
                  <input 
                    ref={inventoryPasswordInputRef}
                    type="password"
                    value={staffPasswordInput} 
                    onChange={(e) => setStaffPasswordInput(e.target.value)} 
                    placeholder="Password"
                    className="w-full bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 rounded-xl py-3 px-4 text-center text-cyan-200 font-bold text-lg outline-none focus:border-cyan-400 transition placeholder-cyan-500/50" 
                  />
                </div>
                {staffPasswordError && <p role="alert" className="text-sm text-red-300 text-center">{staffPasswordError}</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isVerifyingStaff || !staffPasswordInput} className="flex-1 bg-cyan-500 text-black py-3.5 rounded-xl font-black text-sm tracking-wider active:scale-95 hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(0,242,254,0.4)] disabled:opacity-50">{isVerifyingStaff ? "VERIFYING..." : "ENTER"}</button>
              <button type="button" onClick={() => setShowInventoryPasswordModal(false)} className="flex-1 bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300 py-3.5 rounded-xl font-bold text-sm tracking-wider transition">CANCEL</button>
            </div>
          </form>
        </div>
      )}

      {showDiscountModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all">
          <form 
            onSubmit={handleDiscountSubmit}
            className="bg-gradient-to-b from-[#183478] to-[#0e214d] border-2 border-cyan-400/60 w-[460px] rounded-[30px] p-6 flex flex-col justify-between gap-4 shadow-[0_0_60px_rgba(0,180,255,0.35)]"
          >
            <div className="space-y-4 flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-cyan-500/20">
                <p className="text-xs text-cyan-400 font-black tracking-widest uppercase">ITEM DISCOUNT</p>
                <button type="button" onClick={() => setShowDiscountModal(false)} className="text-cyan-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] rounded-xl p-4 border border-cyan-400/50 shadow-[0_0_20px_rgba(0,140,255,0.25)]">
                <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase">SELECTED ITEM</p>
                <p className="text-sm font-bold text-white truncate mt-1">{selectedItem.name}</p>
                <div className="text-right text-2xl text-cyan-300 font-black tracking-wider mt-1">
                  ₱ {(selectedItem.price * selectedItem.qty).toFixed(2)}
                </div>
              </div>

              <div className="bg-gradient-to-b from-[#183478]/90 to-[#0e214d]/90 rounded-xl p-5 border border-cyan-400/40 space-y-3 shadow-[0_0_20px_rgba(0,140,255,0.15)]">
                <p className="text-xs font-bold text-cyan-300 uppercase tracking-wide text-center">ENTER DISCOUNT AMOUNT IN PESO</p>
                
                <div className="relative mt-2">
                  <input 
                    ref={discountInputRef}
                    type="text"
                    value={discountInput} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDiscountInput(e.target.value)} 
                    className="w-full bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 rounded-xl py-3 px-4 text-center text-cyan-200 font-bold text-xl outline-none focus:border-cyan-400 transition" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base text-cyan-500 font-bold">₱</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-cyan-500 text-black py-3.5 rounded-xl font-black text-sm tracking-wider active:scale-95 transition shadow-[0_0_20px_rgba(0,242,254,0.4)]">CONFIRM</button>
              <button type="button" onClick={() => setShowDiscountModal(false)} className="flex-1 bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300 py-3.5 rounded-xl font-bold text-sm tracking-wider transition">CANCEL</button>
            </div>
          </form>
        </div>
      )}

      {showSearchModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-6">
          <div className="bg-[#0e214d] border-2 border-cyan-400/60 w-full max-w-3xl h-[75vh] rounded-[26px] p-6 flex flex-col gap-4 shadow-[0_0_60px_rgba(0,180,255,0.35)]">
            
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
                className="w-full pl-12 pr-4 py-3.5 bg-gradient-to-r from-[#183478] to-[#0c1d45] border-2 border-cyan-400/60 rounded-xl text-base text-cyan-100 placeholder-cyan-400/60 outline-none focus:border-cyan-300 font-bold" 
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
          </div>
        </div>
      )}

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
                onClick={() => finalizeTransaction(true)}
                className="w-full bg-cyan-500 text-black py-3.5 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 hover:bg-cyan-400 active:scale-95 transition shadow-[0_0_20px_rgba(0,242,254,0.4)] cursor-pointer"
              >
                <Printer size={18} />
                PRINT RECEIPT & CLOSE
              </button>
              
              <button 
                onClick={() => finalizeTransaction(false)}
                className="w-full bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/40 text-cyan-300 py-3.5 rounded-xl font-bold text-sm hover:brightness-110 transition cursor-pointer"
              >
                CLOSE (NO PRINT)
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="text-right text-3xl text-cyan-300 font-black tracking-wider mt-1">
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

                {paymentMethod === 'Cash' ? (
                  <>
                    <div>
                      <p className="text-xs font-bold text-cyan-300 uppercase tracking-wide">CASH TENDERED</p>
                      <div className="relative mt-1.5">
                        <input 
                          ref={cashInputRef}
                          type="text"
                          value={cashTendered} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setCashTendered(e.target.value)} 
                          className="w-full bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 rounded-xl py-2.5 px-4 text-center text-cyan-200 font-bold text-sm outline-none focus:border-cyan-400 transition" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-cyan-500">₱</span>
                      </div>
                      <div className="flex gap-2 mt-2 text-sm">
                        {[100, 500, 1000].map((v) => (
                          <button type="button" key={v} onClick={() => setCashTendered(v.toFixed(2))} className="flex-1 border border-cyan-400/30 rounded-lg py-1.5 font-bold bg-gradient-to-r from-[#1c3e8a] to-[#122a63] text-cyan-300 hover:border-cyan-400 transition">₱{v}</button>
                        ))}
                      </div>
                      <button type="button" onClick={() => setCashTendered(total.toFixed(2))} className="w-full mt-2 border border-cyan-400/30 rounded-lg py-1.5 text-xs font-bold bg-gradient-to-r from-[#1c3e8a] to-[#122a63] text-cyan-300 transition">EXACT</button>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-cyan-300 mb-1.5 uppercase tracking-wide">CHANGE DUE</p>
                      <div className="bg-gradient-to-r from-[#183478] to-[#0c1d45] text-cyan-300 p-3.5 rounded-xl text-center">
                        <span className="text-lg font-black tracking-wider text-cyan-400">₱ {changeDue.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-cyan-300 uppercase tracking-wide block mb-1">GCASH REFERENCE NO.</label>
                      <input 
                        type="text"
                        value={gcashReference}
                        onChange={(e) => setGcashReference(e.target.value)}
                        placeholder="Enter 13-digit ref number"
                        className="w-full bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 rounded-xl py-2.5 px-4 text-cyan-200 font-bold text-sm outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-cyan-300 uppercase tracking-wide block mb-1">PARTICULARS / NOTES (OPTIONAL)</label>
                      <input 
                        type="text"
                        value={gcashParticulars}
                        onChange={(e) => setGcashParticulars(e.target.value)}
                        className="w-full bg-gradient-to-r from-[#183478] to-[#0c1d45] border border-cyan-400/50 rounded-xl py-2.5 px-4 text-cyan-200 font-bold text-sm outline-none transition"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-cyan-500 text-black py-3.5 rounded-xl font-black text-sm tracking-wider active:scale-95 transition shadow-[0_0_20px_rgba(0,242,254,0.4)]">CONFIRM</button>
              <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/30 text-cyan-300 py-3.5 rounded-xl font-bold text-sm tracking-wider transition">CANCEL</button>
            </div>
          </form>
        </div>
      )}

      {/* MAIN WORKSPACE BACKGROUND */}
      <div className="w-full flex-1 min-h-0 bg-slate-200 border-2 border-cyan-400/60 rounded-[26px] overflow-hidden shadow-[0_0_40px_rgba(0,140,255,0.25)] flex flex-col p-4 gap-4">
        
        <div className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] text-cyan-200 flex flex-wrap justify-between items-center gap-4 px-6 py-4 border-2 border-cyan-400/60 rounded-2xl shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-cyan-400 flex items-center justify-center bg-gradient-to-br from-[#1c3e8a] to-[#112759] shrink-0">
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
              className="bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/50 text-cyan-300 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-cyan-500 hover:text-black transition"
            >
              Cashier Out
            </button>
            <button 
              onClick={() => setShowInventoryPasswordModal(true)} 
              className="bg-gradient-to-r from-[#1c3e8a] to-[#122a63] border border-cyan-400/50 text-cyan-300 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-cyan-500 hover:text-black transition"
            >
              Inventory Monitoring (For Staff Only)
            </button>
          </div> 
        </div> 

        <div className="bg-slate-200 border-2 border-cyan-400/50 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          
          <form onSubmit={handleScanSubmit} className="relative shrink-0">
            <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={20} />
            <input
              ref={scanInputRef}
              id="pos-main-scan-input"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              placeholder="SCAN Product Code & Press Enter"
              className="w-full pl-12 pr-4 py-3.5 bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] border-2 border-cyan-400/60 rounded-xl text-cyan-100 placeholder-cyan-400/60 outline-none focus:border-cyan-300 font-semibold text-sm"
            />
          </form>

          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 shrink-0">
            <div className="flex gap-3.5 overflow-x-auto pb-2 lg:pb-0 shrink-0">
              {[
                { label: "Payment", shortcut: "F5", img: "/pictures/payment.jpg", action: () => setShowPaymentModal(true) },
                { label: "Discounts", shortcut: "F6", img: "/pictures/discount.png", action: triggerDiscountModal },
                { label: "Recall", shortcut: "F7", img: "/pictures/recall.jpg", action: () => navigate("/staff/recall") }
              ].map((btn, idx) => (
                <button 
                  key={idx}
                  onClick={btn.action}
                  className="relative flex flex-col items-center justify-between overflow-hidden border border-cyan-400/50 hover:border-cyan-300 p-2.5 rounded-xl group transition w-24 h-24 shrink-0"
                >
                  <img 
                    src={btn.img} 
                    alt={btn.label} 
                    className="absolute inset-0 w-full h-full object-cover brightness-75 group-hover:scale-110 transition duration-300 z-0" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10"></div>
                  <span className="relative text-[10px] text-cyan-300 font-bold z-20">{btn.shortcut}</span>
                  <span className="relative text-xs font-semibold text-white z-20">{btn.label}</span>
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
                className="w-full pl-11 pr-4 py-3.5 bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] border border-cyan-400/50 rounded-xl text-sm text-cyan-100 placeholder-cyan-400/60 outline-none focus:border-cyan-300 font-semibold" 
              />
            </form>
          </div>

          <div className="w-full bg-white border-2 border-cyan-400/50 rounded-xl shadow-inner flex flex-col flex-1 min-h-0 overflow-hidden">
            <div 
              ref={cartTableContainerRef}
              className="overflow-y-auto flex-1 h-full"
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
                <thead className="bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] text-cyan-300 border-b-2 border-cyan-400/60 sticky top-0 z-20">
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
                      const itemSubtotal = (item.price * item.qty) - (item.discount || 0);
                      const isSelected = selectedItemId === item.id;
                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => setSelectedItemId(item.id)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-cyan-100 border-l-4 border-cyan-600 font-semibold' : 'hover:bg-slate-50'}`}
                        >
                          <td className="p-3 text-center font-medium text-slate-600">{i + 1}</td>
                          <td className="p-3 truncate font-mono text-slate-700">{item.code}</td>
                          <td className="p-3 truncate font-bold text-slate-900">
                            {item.name}
                            {item.discount ? (
                              <span className="ml-2 text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded border border-red-300">
                                -₱{item.discount.toFixed(2)}
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3 truncate text-slate-500">{item.description}</td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center items-center gap-1.5">
                              <button onClick={() => updateQty(item.id, -1)} className="border border-cyan-400/50 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#183478] to-[#0e214d] text-cyan-300 hover:bg-cyan-500 hover:text-black transition"><Minus size={12} /></button>
                              <span className="font-bold w-5 text-center text-slate-800 text-xs">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="border border-cyan-400/50 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#183478] to-[#0e214d] text-cyan-300 hover:bg-cyan-500 hover:text-black transition"><Plus size={12} /></button>
                            </div>
                          </td>
                          <td className="p-3 text-center font-medium text-slate-600">
                            ₱{item.price.toFixed(2)}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-900" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <span>₱{itemSubtotal.toFixed(2)}</span>
                              <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 transition"><Trash2 size={15} /></button>
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
                          <p className="text-xs text-slate-400">Scan with your D-Tech MP6300IR scanner or search product name to add items.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="w-full bg-gradient-to-r from-[#0a183b] via-[#12285e] to-[#0c1d45] border-2 border-cyan-400/60 rounded-2xl px-5 py-3 flex flex-col md:flex-row justify-between items-center gap-4 text-cyan-200 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap w-full md:w-auto">
              <div className="flex items-center gap-2.5 pr-4 border-r border-cyan-500/30">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                  <img src="/pictures/transactions.png" alt="Transaction" className="w-full h-full object-contain" />
                </div>
                <span className="text-amber-400 font-bold tracking-wider text-xs sm:text-sm uppercase whitespace-nowrap">TRANSACTION TOTAL</span>
              </div>

              <div className="flex items-center gap-5 flex-wrap">
                <div className="flex items-center gap-2.5 pr-5 border-r border-cyan-500/30">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                    <img src="/pictures/subtotal.png" alt="Subtotal" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wide">Sub Total</span>
                    <strong className="text-white font-mono text-sm sm:text-base">₱{subTotal.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                    <img src="/pictures/discount.png" alt="Discount" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wide">Discount</span>
                    <strong className="text-white font-mono text-sm sm:text-base">₱{transactionDiscount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-cyan-400/50 rounded-xl px-5 py-2 bg-gradient-to-r from-[#183478] via-[#132c66] to-[#0c1d45] flex items-center justify-between gap-5 w-full md:w-auto shrink-0">
              <div className="flex items-center gap-2.5 pr-4 border-r border-cyan-500/30">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden p-1">
                  <img src="/pictures/total.png" alt="Total" className="w-full h-full object-contain" />
                </div>
                <span className="font-black text-amber-400 tracking-wider text-xs uppercase">TOTAL</span>
              </div>
              <span className="font-black text-amber-400 tracking-wider text-lg sm:text-xl font-mono">
                ₱{total.toFixed(2)}
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
