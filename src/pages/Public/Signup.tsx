﻿import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordRequirementsMessage, SignupSchema } from "../../services/ValidationServices";
import { apiRequest } from "../../services/api";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Schema validation
    const validationResult = SignupSchema.safeParse({ firstName, lastName, email, password });
    if (!validationResult.success) {
      setErrorMsg("Please enter valid registration details.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Call centralized API helper instead of hardcoded fetch
      const response = await apiRequest("/register.php", "POST", {
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
      });

      if (response.success) {
        navigate("/login");
      } else {
        setErrorMsg(response.message || "Registration failed. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Signup Error:", err);
      setErrorMsg("Server error. Make sure your Laragon/Apache service is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 text-white">

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Create Account</h2>
          <p className="text-gray-300 text-sm">Please fill in your details</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSignup} className="space-y-4">

          {/* First Name */}
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:border-blue-400"
          />

          {/* Last Name */}
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:border-blue-400"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:border-blue-400"
          />


          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              minLength={15}
              maxLength={64}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:border-blue-400"
            />
            <p className="mt-1 text-xs text-gray-300">{PasswordRequirementsMessage}</p>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-sm text-blue-300 hover:text-blue-200"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {/* Confirm Password */}
          <input
            type="password"
            placeholder="Confirm Password"
            minLength={15}
            maxLength={64}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:border-blue-400"
          />

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-400 text-red-200 px-4 py-2 rounded-lg text-sm text-center">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-300 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}
