import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import { Search } from "lucide-react";

// Updated InputField to accept value and onChange props
interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  name, 
  value, 
  onChange, 
  placeholder = "", 
  type = "text" 
}) => {
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
        name={name}
        type={type}
        value={value}
        onChange={onChange}
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
  const [view, setView] = useState<'list' | 'check'>('list');

  // State for the "Add Product" form
  const [formData, setFormData] = useState({
    productName: '',
    barcode: '',
    description: '',
    stockQuantity: '',
    costPrice: '',
    sellingPrice: '',
    category: '',
    supplier: '',
    expirationDate: '',
    threshold: ''
  });

  // RESTORED: All your original products
  const products = [
    {
      name: "Buldak Carbonara",
      barcode: "8801073411432",
      description: "Pink",
      category: "Noodles",
      price: 95,
      stock: "50/20",
      expected: 50,
      actualRecord: 48, 
    },
    {
      name: "Coke Mismo",
      barcode: "8801073411313",
      description: "2.90mL",
      category: "Drinks",
      price: 23,
      stock: "25/10",
      expected: 25,
      actualRecord: 25, 
    },
    {
      name: "Sprite Mismo",
      barcode: "729384949293",
      description: "2.90mL",
      category: "Drinks",
      price: 23,
      stock: "16/10",
      expected: 16,
      actualRecord: 14, 
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddProduct = async () => {
    console.log("Submitting to database:", formData);
    // Future: fetch('backend/api/add_product.php', ...)
    setShowAdd(false); 
  };

  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans text-gray-800" style={{ fontFamily: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif" }}>
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto text-left">
        <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6 flex justify-between items-center">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Inventory Management</h1>
        </header>

        {/* Search and Action Buttons */}
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
                  className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Add Product
                </button>
                <button 
                  onClick={() => setView('check')}
                  className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-yellow-500 text-white shadow-md hover:bg-yellow-600 active:scale-95 transition-all"
                >
                  Manual Count Log
                </button>
              </>
            ) : (
              <button 
                onClick={() => setView('list')}
                className="px-8 py-2 rounded-xl font-bold text-xs uppercase bg-[#9ca3af] text-white shadow-md hover:bg-gray-500 active:scale-95 transition-all"
              >
                Back to List
              </button>
            )}
          </div>
        </div>

        {/* Add Product Form */}
        {showAdd && view === 'list' && (
          <div className="bg-[#ECECEC] p-8 rounded-[1.5rem] border border-gray-400 shadow-sm w-full">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-6">
                <InputField label="Product Name" name="productName" value={formData.productName} onChange={handleChange} />
                <InputField label="Barcode" name="barcode" value={formData.barcode} onChange={handleChange} />
                <InputField label="Description" name="description" value={formData.description} onChange={handleChange} />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField label="Stock Quantity" name="stockQuantity" type="number" value={formData.stockQuantity} onChange={handleChange} />
                <InputField label="Cost Price" name="costPrice" type="number" value={formData.costPrice} onChange={handleChange} />
                <InputField label="Selling Price" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleChange} />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField label="Category" name="category" value={formData.category} onChange={handleChange} />
                <InputField label="Supplier" name="supplier" value={formData.supplier} onChange={handleChange} />
              </div>
              <div className="flex flex-wrap gap-6">
                <InputField label="Expiration Date" name="expirationDate" type="date" value={formData.expirationDate} onChange={handleChange} />
                <InputField label="Low Stock Threshold for Replenishment" name="threshold" type="number" value={formData.threshold} onChange={handleChange} />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={handleAddProduct} className="h-12 px-10 rounded-[1rem] font-bold text-white bg-[#2D44E1] shadow-md hover:bg-blue-800 transition active:scale-95">
                Add a Product
              </button>
              <button onClick={() => setShowAdd(false)} className="h-12 px-10 rounded-[1rem] font-bold text-gray-900 bg-white border border-gray-400 shadow-md hover:bg-gray-100 transition active:scale-95">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        {!showAdd && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-gray-50 overflow-hidden min-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-[#0056b3] text-white font-bold uppercase text-[13px]">
                <tr>
                  <th className="p-6">Product</th>
                  <th className="p-6">Barcode</th>
                  <th className="p-6">Category</th>
                  <th className="p-6">Price</th>
                  <th className="p-6 text-center">{view === 'check' ? 'Expected Output' : 'Stock Threshold'}</th>
                  <th className="p-6 text-center">{view === 'check' ? 'Staff Input (Actual)' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50 font-bold text-gray-700">
                {products.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-6 font-semibold">{item.name}</td>
                    <td className="p-6 font-mono text-xs">{item.barcode}</td>
                    <td className="p-6">{item.category}</td>
                    <td className="p-6">₱ {item.price}</td>
                    <td className="p-6 text-center">{view === 'check' ? item.expected : item.stock}</td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2">
                        {view === 'check' ? (
                          <div className={`w-[130px] py-1 rounded-[2rem] border-2 text-center text-lg font-bold shadow-sm
                            ${item.actualRecord !== item.expected ? 'bg-red-50 border-red-400 text-red-600' : 'bg-blue-50 border-blue-400 text-blue-600'}`}>
                            {item.actualRecord}
                          </div>
                        ) : (
                          <>
                            <button className="bg-blue-600 text-white px-7 py-3 rounded-lg text-xs font-bold transition active:scale-95">Receive</button>
                            <button className="bg-gray-300 px-7 py-3 rounded-lg text-xs font-bold transition active:scale-95">Edit</button>
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