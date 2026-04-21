// sidebar used to update the whole app instantly. instead of just the main content. \
// so that the sidebar can also reflect the active page.

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, History, BarChart3, LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Staff', path: '/admin/staff', icon: Users },
    { name: 'Inventory', path: '/admin/inventory', icon: Package },
    { name: 'History Transactions', path: '/admin/transactions', icon: History },
    { name: 'Product Status', path: '/admin/product-status', icon: BarChart3 },
  ];

  return (
    /* w-72 gives that extra space to the right so text doesn't cut off */
    <aside className="w-72 bg-[#1A3E7A] text-white flex flex-col p-4 m-4 rounded-[1.5rem] shadow-xl min-h-[92vh]">
      
      {/* Workspace Header */}
      <div className="bg-white/10 p-5 rounded-2xl mb-8 flex items-center gap-4 border border-white/5">

        <img // the LOGO PART
          src="/pictures/logo.png" // LOGO PIC
          alt="Store Logo"
          className="w-14 h-14 rounded-full object-cover shrink-0 shadow-md border-2 border-white/20"
        />

        <div className="text-left">
          <p className="text-[12px] uppercase opacity-70 font-black tracking-widest text-blue-200">
            Workspace
          </p>
          <h2 className="text-[15px] font-black leading-tight text-white drop-shadow-sm">
            One Stop <br/> Convenience Store
          </h2>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-2 flex-1">
        <p className="text-[10px] uppercase opacity-40 mb-2 ml-2 font-bold tracking-widest text-left">Operations</p>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <button className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 border border-transparent
                hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:bg-[#007BFF]/20
                ${active ? 'bg-[#007BFF] text-white shadow-lg border-blue-400 scale-[1.02]' : 'text-gray-300'}`}>
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="mt-auto pt-4 border-t border-white/10">
        <Link to="/login">
          <button className="flex items-center gap-3 w-full p-3 rounded-xl text-red-300 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all font-medium">
            <LogOut size={18} />
            <span className="text-sm">Logout</span>
          </button>
        </Link>
      </div>
    </aside>
  );
}