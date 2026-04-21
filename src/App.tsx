import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Public/Login';
import SignupPage from './pages/Public/Signup';
import ForgotPasswordPage from './pages/Public/ForgotPassword';
import ResetPasswordPage from './pages/Public/ResetPassword';
import SetStaffId from "./pages/Admin/SetStaffId"; // changed by bern to admin ('./pages/Public/SetStaffId';)
import AdminDashboard from './pages/Admin/Dashboard'; // new

function App() {
  return (
    <Router>
      <Routes>
        {/** PUBLIC PAGES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/setstaffid" element={<SetStaffId />} /> {/* ADDED BY BERN */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />


        {/** ADMIN PAGES */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* DEFAULT */}
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;