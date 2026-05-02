// sidebar used to update the whole app instantly. instead of just the main content.
// so that the sidebar can also reflect the active page.

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, History, BarChart3, LogOut, Scale, TrendingUp,
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  // Navigation items configuration
  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Staff', path: '/admin/staff', icon: Users },
    { name: 'Inventory', path: '/admin/inventory', icon: Package },
    { name: 'Transaction History', path: '/admin/transactions', icon: History },
    { name: 'Product Status', path: '/admin/productstatus', icon: BarChart3 },
    { name: 'Inventory Discrepancies', path: '/admin/Discrepancies', icon: Scale }, // to be followed
    { name: 'Sales Reports', path: '/admin/salesreports', icon: TrendingUp }, // to be followed
  ];

  return (
    <aside className="w-72 bg-[#1A3E7A] text-white flex flex-col p-4 rounded-[1.5rem] shadow-xl min-h-screen shrink-0">
      
      {/* Workspace Header */}
      <div className="bg-white/10 p-5 rounded-2xl mb-8 flex items-center gap-4 border border-white/5">
        <img 
          src="/pictures/logo.png" 
          alt="Store Logo"
          className="w-14 h-14 rounded-full object-cover shrink-0 shadow-md border-2 border-white/20"
        />
        <div className="text-left">
          <p className="text-[12px] uppercase opacity-70 font-black tracking-widest text-blue-200">Workspace</p>
          <h2 className="text-[15px] font-black leading-tight text-white drop-shadow-sm">
            One Stop <br/> Convenience Store
          </h2>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-2 flex-1">
        <p className="text-[10px] uppercase opacity-40 mb-2 ml-2 font-bold tracking-widest text-left">
          Operations
        </p>

        {navItems.map((item) => {
          // Check if the current URL matches the item path for active styling
          const active = location.pathname === item.path;

          return (
            <Link key={item.path} to={item.path} className="no-underline">
              <button
                className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 border border-transparent
                ${active 
                  ? 'bg-[#007BFF] text-white shadow-[0_0_20px_rgba(0,123,255,0.4)] scale-[1.03] border-blue-400/30' 
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
              >
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Logout Section */}
      <div className="mt-auto pt-4 border-t border-white/10">
        <Link to="/login" className="no-underline">
          <button className="flex items-center gap-3 w-full p-3 rounded-xl text-red-300 hover:bg-red-500/10 transition-all font-medium group">
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
            <span className="text-sm">Logout</span>
          </button>
        </Link>
      </div>
    </aside>
  );
}