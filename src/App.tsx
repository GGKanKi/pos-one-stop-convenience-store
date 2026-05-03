import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/Public/Login';
import SignupPage from './pages/Public/Signup';
import ForgotPasswordPage from './pages/Public/ForgotPassword';
import ResetPasswordPage from './pages/Public/ResetPassword';
import LoginId from './pages/Staff/LoginId'; // NEW: Added by bern for 6-digit PIN clock-in
import POS from './pages/Staff/POS'; // NEW: Added by rhuz for the POS page
import SetStaffId from "./pages/Admin/SetStaffId"; // changed by bern to admin ('./pages/Public/SetStaffId'😉
import AdminDashboard from './pages/Admin/Dashboard'; 

import StaffPage from './pages/Admin/Staff'; 
import StaffDashboard from './pages/Staff/Dashboard'; // NEW: Dynamic staff dashboard - BLACKBOXAI

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
        
        {/* ADDED: This route allows the "Staff" button in your Sidebar to work */}
        <Route path="/admin/staff" element={<StaffPage />} /> 
        <Route path="/staff/dashboard" element={<StaffDashboard />} /> {/* NEW: Staff Dashboard route - BLACKBOXAI */}

        {/** DEFAULT ROUTE */}
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;