import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/Public/Login';
import SignupPage from './pages/Public/Signup';
import ForgotPasswordPage from './pages/Public/ForgotPassword';
import ResetPasswordPage from './pages/Public/ResetPassword';
import LoginId from './pages/Staff/LoginId'; // NEW: Added by bern for 6-digit PIN clock-in
import POS from './pages/Staff/POS'; // NEW: Added by rhuz for the POS page
import SetStaffId from "./pages/Admin/SetStaffId"; // changed by bern to admin ('./pages/Public/SetStaffId'😉
import AdminDashboard from './pages/Admin/Dashboard'; 

import CashRegister from './pages/Staff/CashRegister'; 
import LoginId from './pages/Staff/LoginId';
import LogoutId from './pages/Staff/LogoutId'; 
import POS from './pages/Staff/POS';

import SetStaffId from "./pages/Admin/SetStaffId";
import AdminDashboard from './pages/Admin/Dashboard';
import StaffPage from './pages/Admin/Staff';
import Inventory from './pages/Admin/Inventory';
import Transactions from './pages/Admin/Transaction'; 
import ProductStatus from './pages/Admin/ProductStatus'; // New Import

function App() {
  return (
    <Router>
      <Routes>
        {/** PUBLIC ROUTES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/setstaffid" element={<SetStaffId />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/** STAFF ROUTES */}
        <Route path="/cashregister" element={<CashRegister />} />
        <Route path="/loginid" element={<LoginId />} />
        <Route path="/logoutid" element={<LogoutId />} />
        <Route path="/pos" element={<POS />} />

        {/** ADMIN ROUTES */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/staff" element={<StaffPage />} />
        <Route path="/admin/inventory" element={<Inventory />} />
        <Route path="/admin/transactions" element={<Transactions />} />
        <Route path="/admin/productstatus" element={<ProductStatus />} /> {/* New Route */}

        {/** DEFAULT ROUTE */}
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;