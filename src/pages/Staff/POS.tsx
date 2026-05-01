import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Trash2, Plus, Minus,
  Tag, RotateCcw, ScanLine
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

  const navigate = useNavigate(); // ✅ needed for dashboard button

  const [cart, setCart] = useState<Product[]>([
    { id: 1, code: '8801073411432', name: 'Buldak Carbonara', description: '200g Pink', price: 95, qty: 2 },
    { id: 2, code: '4801981107971', name: 'Wilkins Pure', description: '500ML', price: 20, qty: 1 },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash'>('Cash');
  const [cashTendered, setCashTendered] = useState("0.00");

  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
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
    alert("Payment Confirmed");
    setCart([]);
    setCashTendered("0.00");
  };

  const handleCancel = () => {
    if (!cart.length) return;
    if (confirm("Cancel transaction?")) {
      setCart([]);
      setCashTendered("0.00");
    }
  };

  return (
    <div className="min-h-screen bg-[#1f3b6d] flex items-center justify-center px-4 py-6">

      <div className="w-full max-w-[1400px] flex gap-5">

        {/* LEFT PANEL */}
        <div className="flex-[2] bg-white rounded-[30px] overflow-hidden shadow-xl flex flex-col">

          {/* HEADER */}
          <div className="bg-[#0056b3] text-white flex justify-between items-center px-6 py-4 rounded-xl shadow-md border-b-4 border-blue-900">

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                <img src="/pictures/avatar.jpg" className="w-full h-full object-cover" />
              </div>

              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold uppercase tracking-wide">
                  Dashboard
                </span>
                <span className="text-xs opacity-90">
                  202603 - Bernice Partisala
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-200">
                Settings
              </button>
              <button className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-200">
                Log out
              </button>
            </div>

          </div>

          <div className="p-5 flex flex-col gap-5 flex-1">

            {/* SCAN */}
            <div className="relative">
              <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={scanInputRef}
                placeholder="Scan Product Code"
                className="w-full pl-12 pr-4 py-3 border-2 border-blue-400 rounded-full outline-none"
              />
            </div>

            {/* ACTIONS */}
            <div className="flex justify-between items-center">
              <div className="flex gap-10">

                {/* DISCOUNTS */}
                <button className="flex flex-col items-center group">
                  <span className="text-sm text-gray-600 mb-1">F5</span>
                  <img src="/pictures/discount.jpg" className="w-14 h-14 object-contain group-hover:scale-110 group-active:scale-95 transition" />
                  <span className="text-sm font-medium mt-1">Discounts</span>
                </button>

                {/* RECALL */}
                <button className="flex flex-col items-center group">
                  <span className="text-sm text-gray-600 mb-1">F6</span>
                  <img src="/pictures/recall.jpg" className="w-14 h-14 object-contain group-hover:scale-110 group-active:scale-95 transition" />
                  <span className="text-sm font-medium mt-1">Recall</span>
                </button>

                {/* DASHBOARD */}
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex flex-col items-center group"
                >
                  <span className="text-sm text-gray-600 mb-1">F7</span>
                  <img src="/pictures/dashboard.png" className="w-14 h-14 object-contain group-hover:scale-110 group-active:scale-95 transition" />
                  <span className="text-sm font-medium mt-1">Dashboard</span>
                </button>

              </div>

              {/* SEARCH */}
              <div className="relative w-[220px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search Product Name"
                  className="w-full px-3 py-2 border rounded-full text-sm"
                />
              </div>
            </div>

            {/* TABLE */}
            <div className="border rounded-xl flex-1 overflow-hidden shadow-md">
              <div className="h-full overflow-y-auto">
                <table className="w-full table-fixed text-sm">

                  <thead className="bg-[#0056b3] text-white border-b-4 border-blue-900 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-[6%]">No.</th>
                      <th className="p-3 w-[20%]">Code</th>
                      <th className="p-3 w-[24%]">Name</th>
                      <th className="p-3 w-[20%]">Desc</th>
                      <th className="p-3 w-[15%] text-center">Qty</th>
                      <th className="p-3 w-[15%] text-center">Price</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cart.map((item, i) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-3 text-center">{i + 1}</td>
                        <td className="p-3 truncate">{item.code}</td>
                        <td className="p-3 truncate font-bold">{item.name}</td>
                        <td className="p-3 truncate text-gray-500">{item.description}</td>

                        <td className="p-3">
                          <div className="flex justify-center items-center gap-2">
                            <button onClick={() => updateQty(item.id, -1)} className="border w-7 h-7 rounded-full flex items-center justify-center active:scale-95">
                              <Minus size={12} />
                            </button>

                            <span className="font-bold">{item.qty}</span>

                            <button onClick={() => updateQty(item.id, 1)} className="border w-7 h-7 rounded-full flex items-center justify-center active:scale-95">
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>

                        <td className="p-3 text-center font-bold relative">
                          ₱ {item.price}
                          <button onClick={() => removeItem(item.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL (UNCHANGED) */}
        <div className="flex-[1] max-w-[380px] bg-[#e9e9e9] rounded-[30px] p-5 border-4 border-blue-600 shadow-xl flex flex-col gap-5">

          {/* TOTAL */}
          <div className="bg-black rounded-xl px-5 py-5 border-2 border-orange-500">
            <p className="text-xs text-gray-300 font-bold">TOTAL</p>
            <div className="text-right text-3xl text-gray-300 font-extrabold">
              ₱ {total.toFixed(2)}
            </div>
          </div>

          <hr />

          {/* PAYMENT (UNCHANGED) */}
          <div className="bg-[#f4f4f4] rounded-xl p-4 border space-y-4">

            <div>
              <p className="text-xs font-bold">Payment Method</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setPaymentMethod("Cash")}
                  className={`flex-1 py-2 rounded-xl font-bold ${
                    paymentMethod === "Cash"
                      ? "bg-[#0056b3] text-white shadow-md border-b-4 border-blue-900"
                      : "bg-gray-300"
                  }`}
                >
                  Cash
                </button>

                <button
                  onClick={() => setPaymentMethod("GCash")}
                  className={`flex-1 py-2 rounded-xl font-bold ${
                    paymentMethod === "GCash"
                      ? "bg-[#0056b3] text-white shadow-md border-b-4 border-blue-900"
                      : "bg-gray-300"
                  }`}
                >
                  GCash
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold">Cash Tendered</p>

              <input
                value={cashTendered}
                onClick={() => setCashTendered("")}
                onChange={(e) => setCashTendered(e.target.value)}
                className="w-full bg-[#ddd] rounded p-2 text-center font-bold outline-none"
              />

              <div className="flex gap-2 mt-2 text-sm">
                {[100, 500, 1000].map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setCashTendered(v.toFixed(2))}
                    className="flex-1 border-2 border-gray-600 rounded-md py-1 font-bold bg-[#efefef]
                    active:scale-95
                    active:bg-[#2f5bd3] active:text-white active:border-[#2f5bd3]
                    active:shadow-[0_0_10px_rgba(47,91,211,0.6)]"
                  >
                    [F{i + 1}] ₱{v}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCashTendered(total.toFixed(2))}
                className="w-full mt-2 border-2 border-gray-600 rounded-md py-1 font-bold bg-[#efefef]
                active:scale-95
                active:bg-[#2f5bd3] active:text-white active:border-[#2f5bd3]
                active:shadow-[0_0_10px_rgba(47,91,211,0.6)]"
              >
                [F4] EXACT
              </button>
            </div>

            <div className="mt-2">
              <p className="text-xs font-bold mb-1 uppercase tracking-wide">
                Change Due
              </p>

              <div className="bg-[#0056b3] text-white p-4 rounded-xl shadow-md border-b-4 border-blue-900 text-center">
                <span className="text-xl font-extrabold tracking-wide">
                  ₱ {changeDue.toFixed(2)}
                </span>
              </div>
            </div>

          </div>

          {/* BUTTONS */}
          <div className="flex gap-2 mt-auto">
            <button onClick={handleConfirm}
              className="flex-1 bg-[#102c44] text-white py-2 rounded font-bold active:scale-95">
              Confirm
            </button>

            <button onClick={handleCancel}
              className="flex-1 bg-gray-300 py-2 rounded font-bold active:scale-95">
              Cancel
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}