import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/Public/Login';
import SignupPage from './pages/Public/Signup';
import ForgotPasswordPage from './pages/Public/ForgotPassword';
import ResetPasswordPage from './pages/Public/ResetPassword';

import CashRegister from './pages/Staff/CashRegister';
import LogoutId from './pages/Staff/LogoutId';
import POS from './pages/Staff/POS';
import InventoryCheck from './pages/Staff/InventoryCheck';

import AdminDashboard from './pages/Admin/Dashboard';
import StaffPage from './pages/Admin/Staff';
import Inventory from './pages/Admin/Inventory';
import Discrepancies from './pages/Admin/Discrepancies';
import Transactions from './pages/Admin/Transaction';
import SalesProfit from './pages/Admin/SalesProfit';
import Recall from './pages/Staff/Recall';
import ProductStatus from './pages/Admin/ProductStatus';
import RoleGate from './components/RoleGate';
import InventoryApprovals from './pages/Admin/InventoryApprovals';

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* STAFF ROUTES */}
        <Route path="/cashregister" element={<RoleGate permission="pos"><CashRegister /></RoleGate>} />
        <Route path="/logoutid" element={<RoleGate permission="pos"><LogoutId /></RoleGate>} />
        <Route path="/pos" element={<RoleGate permission="pos"><POS /></RoleGate>} />
        <Route path="/staff/pos" element={<RoleGate permission="pos"><POS /></RoleGate>} />
        <Route path="/staff/inventorycheck" element={<RoleGate permission="staff-tools"><InventoryCheck /></RoleGate>} />
        <Route path="/staff/recall" element={<RoleGate permission="pos"><Recall /></RoleGate>} />

        {/* ADMIN ROUTES */}
        <Route path="/admin/dashboard" element={<RoleGate permission="staff-tools"><AdminDashboard /></RoleGate>} />
        <Route path="/admin/staff" element={<RoleGate permission="admin"><StaffPage /></RoleGate>} />
        <Route path="/admin/inventory" element={<RoleGate permission="staff-tools"><Inventory /></RoleGate>} />
        <Route path="/admin/inventory-approvals" element={<RoleGate permission="admin"><InventoryApprovals /></RoleGate>} />
        <Route path="/admin/discrepancies" element={<RoleGate permission="admin"><Discrepancies /></RoleGate>} />
        <Route path="/admin/transactions" element={<RoleGate permission="admin"><Transactions /></RoleGate>} />
        <Route path="/admin/salesprofit" element={<RoleGate permission="admin"><SalesProfit /></RoleGate>} />
        <Route path="/admin/productstatus" element={<RoleGate permission="admin"><ProductStatus /></RoleGate>} />

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800">
                  Page Not Found
                </h1>
                <p className="mt-2 text-gray-600">
                  The page you're looking for doesn't exist.
                </p>
                <a
                  href="/login"
                  className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Back to Login
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
