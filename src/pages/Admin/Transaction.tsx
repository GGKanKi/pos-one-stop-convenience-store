import React from 'react';
import Sidebar from '../../components/Sidebar';
import { RotateCcw, Search } from 'lucide-react';

const TRANSACTION_DATA = [
  { id: 1, date: "05/01/2026 10:30 AM", action: "Sale", entities: "Product", description: "Sold 2x Buldak Carbonara", user: "Diane Annonuevo" },
  { id: 2, date: "05/01/2026 11:15 AM", action: "Stock Update", entities: "Inventory", description: "Added 50 units Coke Mismo", user: "Rhuztin Protomartir" },
];

export default function Transactions() {
  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans" style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto text-left">
        
         {/* Dashboard Header Bar */}
         <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Transaction History</h1>
        </header>

        {/* Filters Section */}
        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-700">Filters</h2>
            <button className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors border border-gray-300">
              <RotateCcw size={14} /> Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Start Date</label>
              <input type="date" defaultValue="2026-05-01" className="p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">End Date</label>
              <input type="date" defaultValue="2026-05-01" className="p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Action Type</label>
              <select className="p-2 border rounded-lg text-sm outline-none bg-white">
                <option>Select an Option</option>
                <option>Sale</option>
                <option>Inventory Update</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Entity Type</label>
              <select className="p-2 border rounded-lg text-sm outline-none bg-white">
                <option>All Entities</option>
                <option>Product</option>
                <option>Staff</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Search</label>
              <div className="relative">
                <input placeholder="Search transactions..." className="w-full p-2 border rounded-lg text-sm outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            {/* Pagination/Status Bar */}
            <div className="p-4">
                <span className="bg-gray-300 text-gray-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
                    Showing 1-{TRANSACTION_DATA.length} of {TRANSACTION_DATA.length} entities
                </span>
            </div>

            <table className="w-full text-left">
              <thead className="bg-[#0056b3] text-white font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-8">Date & Time</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Entities</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-semibold text-gray-600">
                {TRANSACTION_DATA.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 pl-8">{item.date}</td>
                    <td className="p-4">{item.action}</td>
                    <td className="p-4">{item.entities}</td>
                    <td className="p-4">{item.description}</td>
                    <td className="p-4">{item.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </main>
    </div>
  );
}