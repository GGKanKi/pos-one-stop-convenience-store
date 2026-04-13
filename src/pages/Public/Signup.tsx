import { useState } from "react";
import { Link } from "react-router-dom";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10
      bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">

      {/* Card */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 text-white">

        {/* Text */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Create Account</h2>
          <p className="text-gray-300 text-sm">
            Please fill in your details
          </p>
        </div>

        {/* Form */}
        <form className="flex flex-col gap-4">

          {/* First Name */}
          <input
            type="text"
            placeholder="First Name"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Last Name */}
          <input
            type="text"
            placeholder="Last Name"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-300 text-sm"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {/* Confirm pass */}
          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Button */}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-lg shadow-blue-500/30"
          >
            Create Account
          </button>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-300 mt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>

        </form>
      </div>
    </div>
  );
}