import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // validation
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost/POS/backend/api/register.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        navigate("/login");
      } else {
        setErrorMsg("Registration failed");
      }

    } catch (error) {
      setErrorMsg("Server error. Please try again.");
    }

    setLoading(false);
  };
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

            <div className="flex flex-col gap-2">
              <label htmlFor="firstName" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="lastName" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <div className="flex flex-col gap-2 relative">
              <label htmlFor="password" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                Password
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-11 text-[#6B7280]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <button
              type="button"
              className="w-full py-3 rounded-lg border border-[#2C2C2C] bg-[#2C2C2C] text-[#F5F5F5] transition-colors hover:bg-[#1f1f1f]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Create account
            </button>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-300 mt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>

        </div> {/**DAPAT DIV HAHAHAHA */}
      </div>
  );
}