import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText } from "lucide-react";

export default function InventoryCheck() {
  const navigate = useNavigate();
  const [actualStocks, setActualStocks] = useState<Record<string, string>>({});

  // Mock data representing current inventory
  const products = [
    { name: "Buldak Carbonara", barcode: "8801073411432", description: "Pink", category: "Noodles", price: 95 },
    { name: "Coke Mismo", barcode: "8801073411313", description: "2.90mL", category: "Drinks", price: 23 },
    { name: "Sprite Mismo", barcode: "729384949293", description: "2.90mL", category: "Drinks", price: 23 },
  ];

  const handleStockChange = (barcode: string, value: string) => {
    setActualStocks((prev) => ({ ...prev, [barcode]: value }));
  };

  const handleComplete = () => {
    const isConfirmed = window.confirm("Confirm inventory check and proceed to POS?");
    
    if (isConfirmed) {
      console.log("Submitting Check Data:", actualStocks);
      // Navigate to POS route
      navigate("/pos"); 
    }
  };

  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans" style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}>
      <main className="p-6 flex flex-col gap-6 max-w-[1400px] mx-auto text-left">
        
        {/* Centered Header */}
        <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900">
          <h1 className="text-lg font-bold uppercase tracking-wide text-center">
            Inventory Check
          </h1>
        </header>

        {/* Search and Action Bar */}
        <div className="bg-white p-4 rounded-[2.5rem] shadow-sm flex items-center gap-6 border-2 border-gray-100">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search or Scan barcode to find products"
              className="w-full pl-14 pr-6 py-3 bg-gray-50 rounded-full border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all font-medium"
            />
          </div>
          
          <div className="flex gap-4 ml-auto">
            <button 
              onClick={handleComplete}
              className="flex items-center gap-2 px-10 py-3 rounded-full font-bold text-xs uppercase bg-[#0056b3] text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              <FileText size={16} /> Complete Check
            </button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-[2.5rem] shadow-md border-2 border-gray-50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0056b3] text-white font-bold uppercase text-[12px] tracking-wider">
              <tr>
                <th className="p-6 pl-10">Product</th>
                <th className="p-6">Barcode</th>
                <th className="p-6">Description</th>
                <th className="p-6">Category</th>
                <th className="p-6">Price</th>
                <th className="p-6 text-center pr-10">Actual Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-50 font-bold text-gray-700">
              {products.map((item) => (
                <tr key={item.barcode} className="hover:bg-blue-50/40 transition-colors">
                  <td className="p-6 pl-10 whitespace-pre-line leading-tight">{item.name}</td>
                  <td className="p-6 font-mono text-xs text-blue-900">{item.barcode}</td>
                  <td className="p-6 text-gray-500 font-medium">{item.description}</td>
                  <td className="p-6 font-semibold">{item.category}</td>
                  <td className="p-6">₱ {item.price}</td>
                  <td className="p-6 pr-10">
                    <div className="flex justify-center">
                      {/* RESTORED: Original container size and styling */}
                      <input
                        type="number"
                        value={actualStocks[item.barcode] || ""}
                        onChange={(e) => handleStockChange(item.barcode, e.target.value)}
                        placeholder="Enter count"
                        className="w-[180px] h-[50px] px-6 py-2 rounded-full border-2 border-blue-200 text-center text-blue-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300 shadow-inner bg-gray-50/50"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}