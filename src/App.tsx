import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Public/Login';
import SignupPage from './pages/Public/Signup';
import ForgotPasswordPage from './pages/Public/ForgotPassword';
import ResetPasswordPage from './pages/Public/ResetPassword';
import LoginId from './pages/Staff/LoginId'; // NEW: Added by bern for 6-digit PIN clock-in
import SetStaffId from "./pages/Admin/SetStaffId"; // changed by bern to admin ('./pages/Public/SetStaffId'😉
import AdminDashboard from './pages/Admin/Dashboard'; 
import StaffPage from './pages/Admin/Staff'; 

function App() {
  return (
    <Router>
      <Routes>
        {/** PUBLIC PAGES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* NEW: Secondary authentication route for staff members */}
        <Route path="/loginid" element={<LoginId />} /> 
        <Route path="/setstaffid" element={<SetStaffId />} /> {/* ADDED BY BERN */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/** ADMIN PAGES */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/staff" element={<StaffPage />} /> 

        {/** DEFAULT */}
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;