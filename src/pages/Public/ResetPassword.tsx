import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BarChart3, Package, ShoppingCart, Store } from "lucide-react";
import { apiRequest } from "../../services/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg("");
    if (!token) {
      setErrorMsg("This reset link is missing its token. Request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("/resetpassword.php", "POST", { token, password });
      if (!response.success) throw new Error(response.message || "Could not reset your password.");
      setSuccess(true);
      window.setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:flex flex-1 relative overflow-hidden">
        <img src="/pictures/store.jpg" alt="Store Environment" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/70 to-blue-950/90" />
        <div className="relative z-10 flex flex-col justify-between w-full text-white p-6 md:p-10 lg:p-16">
          <div>
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center"><Store className="w-7 h-7 text-white" /></div>
              <div><h1 className="text-xl md:text-2xl lg:text-3xl font-bold">One Stop</h1><p className="text-blue-200 text-sm">Convenience Store</p></div>
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 md:mb-6">InBentalytix</h2>
              <p className="text-blue-100 text-sm md:text-base lg:text-lg opacity-90">Streamline your retail operations with our powerful point-of-sale and inventory management platform.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-md">
            <div className="flex flex-col items-center gap-3 p-4 md:p-6 bg-white/10 rounded-2xl backdrop-blur-sm"><ShoppingCart className="w-6 h-6 text-white" /><span className="text-sm text-center">Fast Checkout</span></div>
            <div className="flex flex-col items-center gap-3 p-4 md:p-6 bg-white/10 rounded-2xl backdrop-blur-sm"><Package className="w-6 h-6 text-white" /><span className="text-sm text-center">Inventory Tracking</span></div>
            <div className="flex flex-col items-center gap-3 p-4 md:p-6 bg-white/10 rounded-2xl backdrop-blur-sm"><BarChart3 className="w-6 h-6 text-white" /><span className="text-sm text-center">Analytics</span></div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 px-6 py-12">
        <div className="w-full max-w-md">
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-6 p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl text-white">
            <div>
              <h2 className="text-2xl font-bold">Set New Password</h2>
              <p className="mt-1 text-sm text-blue-200">Choose a new password for your account.</p>
            </div>
            {errorMsg && <div role="alert" className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-2 rounded-lg text-sm">{errorMsg}</div>}
            {success && <div role="status" className="bg-green-500/20 border border-green-400 text-green-100 px-4 py-2 rounded-lg text-sm">Password updated. Redirecting to login...</div>}
            {!token && <p className="text-sm text-blue-100">This link is missing its reset token. <Link className="underline text-blue-300" to="/forgot-password">Request a new link</Link>.</p>}
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password" className="text-sm text-blue-100">New Password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required className="px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-password" className="text-sm text-blue-100">Confirm Password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" required className="px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading || success || !token} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-50">
              {loading ? "Updating..." : "Reset Password"}
            </button>
            <Link to="/login" className="text-blue-300 hover:text-blue-400 text-sm underline">Back to Sign In</Link>
          </form>
        </div>
      </div>
    </div>
  );
}
