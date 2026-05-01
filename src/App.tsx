import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/Public/Login';
import SignupPage from './pages/Public/Signup';
import ForgotPasswordPage from './pages/Public/ForgotPassword';
import ResetPasswordPage from './pages/Public/ResetPassword';

import LoginId from './pages/Staff/LoginId';
import POS from './pages/Staff/POS';

import SetStaffId from "./pages/Admin/SetStaffId";
import AdminDashboard from './pages/Admin/Dashboard';
import StaffPage from './pages/Admin/Staff';
import Inventory from './pages/Admin/Inventory';
import Transactions from './pages/Admin/Transaction'; // New Import

function App() {
  return (
    <Router>
      <Routes>

        {/** PUBLIC */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/setstaffid" element={<SetStaffId />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/** STAFF */}
        <Route path="/loginid" element={<LoginId />} />
        <Route path="/pos" element={<POS />} />

        {/** ADMIN */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/staff" element={<StaffPage />} />
        <Route path="/admin/inventory" element={<Inventory />} />
        <Route path="/admin/transactions" element={<Transactions />} />

        {/** DEFAULT */}
        <Route path="/" element={<LoginPage />} />

      </Routes>
    </Router>
  );
}

export default App;