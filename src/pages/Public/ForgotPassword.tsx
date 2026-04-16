import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center">

      {/* Background image */}
      <img
        src="/pictures/store.jpg" // 
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/90 via-blue-900/80 to-black/90" />

      {/* CENTER CARD */}
      <div className="relative z-10 w-full max-w-md px-6">
        <form
          className="flex flex-col gap-6 p-8 rounded-2xl 
                     bg-white/10 backdrop-blur-lg 
                     border border-white/20 shadow-2xl text-white"
        >
          {/* TITLE */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold">Forgot Password</h2>
            <p className="text-sm text-blue-200 mt-1">
              Enter your email to reset your password
            </p>
          </div>

          {/* EMAIL */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-blue-100">Email Address</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg 
                         bg-white/10 text-white placeholder-gray-300 
                         border border-white/20 
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* BUTTON */}
          <button
            type="button"
            className="w-full py-3 rounded-lg 
                       bg-blue-600 hover:bg-blue-700 
                       text-white transition shadow-lg shadow-blue-500/30"
          >
            Send Reset Link
          </button>

          {/* BACK LINK */}
          <p className="text-sm text-center text-blue-200">
            Remember your password?{" "}
            <Link
              to="/login"
              className="underline text-blue-300 hover:text-blue-400"
            >
              Back to Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}