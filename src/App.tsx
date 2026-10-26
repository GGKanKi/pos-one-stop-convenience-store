import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/Public/Login';
import SignupPage from './pages/Public/Signup';
import ForgotPasswordPage from './pages/Public/ForgotPassword';
import ResetPasswordPage from './pages/Public/ResetPassword';

import CashRegister from './pages/Staff/CashRegister';
import LogoutId from './pages/Staff/LogoutId';
import POS from './pages/Staff/POS';
import InventoryCheck from './pages/Staff/InventoryCheck';
import Recall from './pages/Staff/Recall';

import AdminDashboard from './pages/Admin/Dashboard';
import StaffPage from './pages/Admin/Staff';
import Inventory from './pages/Admin/Inventory';
import Discrepancies from './pages/Admin/Discrepancies';
import Transactions from './pages/Admin/Transaction';
import SalesProfit from './pages/Admin/SalesProfit';
import ProductStatus from './pages/Admin/ProductStatus';
import InventoryApprovals from './pages/Admin/InventoryApprovals';
import DailyReports from './pages/Admin/DailyReports';
import Payout from './pages/Admin/Payouts';

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
        <Route path="/cashregister" element={<CashRegister />} />
        <Route path="/logoutid" element={<LogoutId />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/staff/pos" element={<POS />} />
        <Route path="/inventorycheck" element={<InventoryCheck />} />
        <Route path="/inventory-check" element={<InventoryCheck />} />
        <Route path="/staff/inventorycheck" element={<InventoryCheck />} />
        <Route path="/staff/inventory-check" element={<InventoryCheck />} />
        <Route path="/staff/recall" element={<Recall />} />
        
        {/* ADDED /inventory ROUTE FOR STAFF FULLSCREEN VIEW */}
        <Route path="/inventory" element={<Inventory />} />

        {/* ADMIN ROUTES */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/staff" element={<StaffPage />} />
        <Route path="/admin/inventory" element={<Inventory />} />
        <Route path="/admin/inventory-approvals" element={<InventoryApprovals />} />
        <Route path="/admin/approvals" element={<InventoryApprovals />} />
        <Route path="/admin/discrepancies" element={<Discrepancies />} />
        <Route path="/admin/transactions" element={<Transactions />} />
        <Route path="/admin/salesprofit" element={<SalesProfit />} />
        <Route path="/admin/productstatus" element={<ProductStatus />} />
        <Route path="/admin/daily-reports" element={<DailyReports />} />
        <Route path="/admin/dailyreports" element={<DailyReports />} />
        <Route path="/admin/payouts" element={<Payout />} /> {/* <-- Idinagdag ang Payout route */}

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