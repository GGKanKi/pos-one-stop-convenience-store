import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, ShoppingCart, Package, BarChart3 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost/One-Convenience/backend/api/login.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

        if (data.success) {
          localStorage.setItem("user", JSON.stringify(data.user));

          if (data.user && data.user.id) {
            localStorage.setItem("userId", data.user.id);
          }

          if (data.token) {
            localStorage.setItem("authToken", data.token);
          } else if (data.authToken) {
            localStorage.setItem("authToken", data.authToken);
          }

          // SetStaffId flow integration 
          if (data.user.role === 'admin') {
            navigate("/admin/dashboard");
          } else if (data.user.role === 'staff') {
            if (data.user.hasStaffId) {
              navigate("/LoginId");
            } else {
              navigate("/setstaffid", { state: { email: email } });
            }
          }
        } else {
        setErrorMsg(data.message || "Invalid email or password");
      }
    } catch (error: unknown) {
      setErrorMsg("Server error. Make sure your Laragon/Apache is running.");
      console.log("Login Error: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* LEFT PANEL */}
      <div className="hidden md:flex flex-1 relative overflow-hidden">

        <img
          src="/pictures/store.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/70 to-blue-950/90" />

        <div className="relative z-10 flex flex-col justify-between w-full text-white p-6 md:p-10 lg:p-16">

          <div>
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Store className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl">One Stop</h1>
                <p className="text-blue-200 text-sm">Convenience Store</p>
              </div>
            </div>

            <div className="max-w-md">
              <h2 className="text-2xl md:text-4xl lg:text-5xl leading-tight mb-4 md:mb-6">
                Modern POS & Inventory System
              </h2>

              <p className="text-blue-100 text-sm md:text-base lg:text-lg opacity-90">
                Streamline your retail operations with our powerful point-of-sale and inventory management platform.
              </p>
            </div>
          </div>

          {/* FEATURES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-md">

            <div className="flex flex-col items-center gap-3 p-4 md:p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
              <ShoppingCart className="w-6 h-6 text-white" />
              <span className="text-sm text-center">Fast Checkout</span>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 md:p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
              <Package className="w-6 h-6 text-white" />
              <span className="text-sm text-center">Inventory Tracking</span>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 md:p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
              <BarChart3 className="w-6 h-6 text-white" />
              <span className="text-sm text-center">Analytics</span>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 px-6 py-12">

        <div className="w-full max-w-md">

          <form
            onSubmit={handleSignIn}
            className="flex flex-col gap-6 p-6 rounded-xl 
                       bg-white/10 backdrop-blur-md border border-white/20 shadow-xl text-white"
          >

            {errorMsg && (
              <div className="bg-red-500/20 border border-red-400 text-red-200 px-4 py-2 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email"
              className="px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* PASSWORD */}
            <input
              type="password"
              placeholder="Password"
              className="px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-lg shadow-blue-500/30"
            >
              {loading ? "Checking..." : "Sign In"}
            </button>

            {/* LINKS */}
            <Link to="/forgot-password" className="text-blue-300 hover:text-blue-400 text-sm underline">
              Forgot password?
            </Link>

            <p className="text-sm text-gray-300">
              Don't have an account?{" "}
              <Link to="/signup" className="underline text-blue-300 hover:text-blue-400">
                Sign up here
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}