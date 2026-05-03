import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import { Search } from "lucide-react";

interface InputFieldProps {
  label: string;
  placeholder?: string;
  type?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, placeholder = "", type = "text" }) => {
  const inputId = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
      <label 
        htmlFor={inputId}
        className="text-sm font-semibold text-gray-700 ml-1"
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        placeholder={type === "date" ? "YYYY-MM-DD" : placeholder}
        className="w-full h-12 px-5 border border-gray-400 rounded-[1.2rem] outline-none transition duration-150
                   placeholder:text-gray-400 text-gray-700
                   focus:border-blue-600 focus:ring-1 focus:ring-blue-200"
      />
    </div>
  );
};

export default function Inventory() {
  const [showAdd, setShowAdd] = useState<boolean>(false);
  // NEW: State to toggle between standard list and inventory check
  const [view, setView] = useState<'list' | 'check'>('list');

  const products = [
    {
      name: "Buldak Carbonara",
      barcode: "8801073411432",
      description: "Pink",
      category: "Noodles",
      price: 95,
      stock: "50/20",
      expected: 50, // Added for check mode
    },
    {
      name: "Coke Mismo",
      barcode: "8801073411313",
      description: "2.90mL",
      category: "Drinks",
      price: 23,
      stock: "25/10",
      expected: 25, // Added for check mode
    },
    {
      name: "Sprite Mismo",
      barcode: "729384949293",
      description: "2.90mL",
      category: "Drinks",
      price: 23,
      stock: "16/10",
      expected: 16, // Added for check mode
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans" style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}>
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto text-left">
        <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">
            Inventory
          </h1>
        </header>

        <div className="bg-white p-3 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search or Scan barcode to find products"
              className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none"
            />
          </div>

          <div className="flex gap-3 ml-auto">
            {view === 'list' ? (
              <>
                <button
                  onClick={() => setShowAdd(true)}
                  className="px-8 py-2 rounded-xl font-bold text-xs uppercase transition-all duration-300
                  bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95"
                >
                  Add Product
                </button>
                <button className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-blue-500 text-white shadow-md hover:bg-blue-600 hover:scale-105 active:scale-95">
                  Import Products
                </button>
                <button 
                  onClick={() => setView('check')}
                  className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-yellow-500 text-white shadow-md hover:bg-yellow-600 hover:scale-105 active:scale-95"
                >
                  Inventory Check
                </button>
              </>
            ) : (
              <>

                <button className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-[#0056b3] text-white shadow-md hover:opacity-90 transition-all active:scale-95 flex items-center gap-2">
                  📄 Complete Check
                </button>
                <button 
                  onClick={() => setView('list')}
                  className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-[#9ca3af] text-white shadow-md hover:bg-gray-500 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {showAdd && view === 'list' && (
          <div className="bg-[#ECECEC] p-8 rounded-[1.5rem] border border-gray-400 shadow-sm w-full">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-6">
                <InputField label="Product Name" />
                <InputField label="Barcode" />
                <InputField label="Description" />
              </div>

              <div className="flex flex-wrap gap-6">
                <InputField label="Stock Quantity" />
                <InputField label="Cost Price" />
                <InputField label="Selling Price" />
              </div>

              <div className="flex flex-wrap gap-6">
                <InputField label="Category" />
                <InputField label="Supplier" />
              </div>

              <div className="flex flex-wrap gap-6">
                <InputField label="Expiration Date" type="date" />
                <InputField label="Low Stock Threshold for Replenishment" />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button className="h-12 px-10 rounded-[1rem] font-bold text-white bg-[#2D44E1] shadow-md hover:bg-blue-800 transition active:scale-95">
                Add a Product
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="h-12 px-10 rounded-[1rem] font-bold text-gray-900 bg-white border border-gray-400 shadow-md hover:bg-gray-100 transition active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!showAdd && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-gray-50 overflow-hidden min-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-[#0056b3] text-white font-bold uppercase text-[13px]">
                <tr>
                  <th className="p-6">Product</th>
                  <th className="p-6">Barcode</th>
                  <th className="p-6">Description</th>
                  <th className="p-6">Category</th>
                  <th className="p-6">Price</th>
                  {/* Dynamic Header based on view */}
                  <th className="p-6 text-center leading-tight">
                    {view === 'check' ? 'Expected Output' : 'Stock Threshold'}
                  </th>
                  <th className="p-6 text-center">
                    {view === 'check' ? 'Actual Stock' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50 font-bold text-gray-700">
                {products.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-6 font-semibold">{item.name}</td>
                    <td className="p-6">{item.barcode}</td>
                    <td className="p-6">{item.description}</td>
                    <td className="p-6">{item.category}</td>
                    <td className="p-6">₱ {item.price}</td>
                    <td className="p-6 text-center">
                      {view === 'check' ? item.expected : item.stock}
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2">
                        {view === 'check' ? (
                          <input
                            type="number"
                            placeholder="Enter count"
                            className="w-[180px] h-[45px] px-4 py-2 rounded-[2rem] border-2 border-blue-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 text-gray-700 text-lg font-normal text-center transition duration-150 shadow-sm"
                          />
                        ) : (
                          <>
                            <button className="bg-blue-600 text-white px-7 py-3 rounded-lg text-xs font-bold hover:bg-blue-700">
                              Receive
                            </button>
                            <button className="bg-gray-300 px-7 py-3 rounded-lg text-xs font-bold hover:bg-gray-400">
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}