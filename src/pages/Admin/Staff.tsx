import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Calendar, User, Edit3, Clock } from 'lucide-react';

const STAFF_DATA = [
  { id: "202601", name: "Diane Annonuevo", timeIn: "06:03 AM", timeOut: "2:05 PM", duration: "8.03 hours", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diane" },
  { id: "202602", name: "Rhuztin Protomartir", timeIn: "2:06 PM", timeOut: "11:00 PM", duration: "8.9 hours", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rhuztin" },
  { id: "202603", name: "Bernice Partisala", timeIn: "--:--", timeOut: "--:--", duration: "--", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bernice" }
]; // avatars are not permanent, just for demo purposes. they will be generated based on the staff's name when they set their staff ID for the first time.

export default function StaffPage() {
  const [view, setView] = useState<'daily' | 'monthly'>('daily');

  return (
    <div className="flex min-h-screen bg-[#EAE7DC] font-sans">
      <Sidebar />
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto text-left">
        
        {/* Staff Attendance Header */}
         <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Staff Attendance</h1>
        </header>

        {/* Controls Bar */}
        <div className="bg-white p-3 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="flex items-center gap-3 border-2 border-gray-100 p-2 rounded-xl px-6 font-bold text-gray-500">
            <Calendar size={18} className="text-[#1A3E7A]" /> 04/21/2026 <Calendar size={18} className="text-[#1A3E7A]" />
          </div>
          <button className="border-2 border-gray-100 px-8 py-2 rounded-xl font-bold text-xs uppercase text-gray-400 hover:bg-gray-50">Filter</button>
          
          <div className="flex gap-2 ml-auto">
            <button 
              onClick={() => setView('daily')}
              className={`px-8 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                view === 'daily' ? "bg-[#0056b3] text-white shadow-lg scale-105" : "border-2 border-gray-100 text-gray-400 hover:bg-gray-50"
              }`}
            >
              Daily View
            </button>
            <button 
              onClick={() => setView('monthly')}
              className={`px-8 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                view === 'monthly' ? "bg-[#0056b3] text-white shadow-lg scale-105" : "border-2 border-gray-100 text-gray-400 hover:bg-gray-50"
              }`}
            >
              Monthly View
            </button>
          </div>
        </div>

        {/* Attendance Content Area */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-gray-50 overflow-hidden min-h-[300px]">
          {view === 'daily' ? (
            <table className="w-full text-left">
              <thead className="bg-[#0056b3] text-white font-bold uppercase text-[13px]">
                <tr>
                  <th className="p-6 flex items-center gap-2"><User size={16}/> Staff Id</th>
                  <th className="p-6">Staff Name</th>
                  <th className="p-6">Time In</th>
                  <th className="p-6">Time Out</th>
                  <th className="p-6">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50 font-bold text-gray-700">
                {STAFF_DATA.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-6">{staff.id}</td>
                    <td className="p-6">{staff.name}</td>
                    <td className="p-6 text-green-600">{staff.timeIn}</td>
                    <td className="p-6 text-red-600">{staff.timeOut}</td>
                    <td className="p-6">{staff.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 flex flex-col items-center justify-center h-full opacity-20">
               <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead className="bg-gray-200 rounded-lg">
                    <tr><th className="p-4 rounded-l-lg h-8 w-1/4"></th><th className="p-4 h-8 w-1/4"></th><th className="p-4 h-8 w-1/4"></th><th className="p-4 rounded-r-lg h-8 w-1/4"></th></tr>
                  </thead>
                  <tbody>
                    {[1,2,3].map(i => (
                      <tr key={i} className="bg-gray-50">
                        <td className="p-6 rounded-l-2xl h-12"></td><td className="p-6 h-12"></td><td className="p-6 h-12"></td><td className="p-6 rounded-r-2xl h-12"></td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          )}
        </div>

        <header className="bg-[#0056b3] text-white p-3 rounded-xl shadow-md border-b-4 border-blue-900 mt-6">
          <h1 className="text-lg font-bold ml-2 uppercase tracking-wide">Staff Directory</h1>
        </header>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
          {STAFF_DATA.map((staff) => (
            <div key={staff.id} className="bg-white rounded-[2rem] shadow-lg flex flex-col overflow-hidden border border-gray-100">
              
              <div className="relative p-6 flex items-center gap-5">
                
                {/* BLUE BAND and Height set to h-10 */}
                <div className="absolute bottom-6 left-0 w-full h-10 bg-[#1A3E7A]" />

                {/* Avatar floating */}
                <div className="relative z-10 w-24 h-24 rounded-full border-[8px] border-[#FDB813] overflow-hidden bg-white shadow-xl shrink-0">
                  <img src={staff.avatar} className="w-full h-full object-cover" alt={staff.name} />
                </div>

                {/* Info Container */}
                <div className="relative z-10 flex flex-col justify-end h-24 pb-0">
                  {/* Name above the band */}
                  <h3 className="font-black text-[#1A3E7A] uppercase text-[15px] leading-tight mb-4">
                    {staff.name}
                  </h3>
                  
                  {/* ID NUMBER - Flex items-center + h-10 makes it centered in the blue box */}
                  <div className="h-10 flex items-center">
                    <p className="text-white font-bold text-sm tracking-widest pl-1 leading-none">
                      {staff.id}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-[90%] mx-auto h-[1px] bg-gray-100 mt-2" />

              <button className="w-full py-4 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest hover:text-[#1A3E7A] transition-colors">
                Edit ID <Edit3 size={12} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}