import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost/One-Convenience/backend/api";

export default function LoginId() {
  const [pin, setPin] = useState<string[]>(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;
    const newPin = [...pin];
    newPin[index] = element.value;
    setPin(newPin);

    if (element.value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && pin[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleClockIn = async () => {
    const fullPin = pin.join("");

    if (fullPin.length < 6) {
      setErrorMsg("Please enter your 6-digit ID to confirm clock in.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE}/clockin.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: fullPin }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg(`Clocked in at ${data.time_in}`);
        localStorage.setItem("staff_id", fullPin);
        localStorage.setItem("pending_clock_in", "true");
        setTimeout(() => {
          navigate("/POS");
        }, 1500);
      } else {
        setErrorMsg(data.message || "Clock-in failed.");
      }
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Dark overlay with blur */}
      <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm" />

      {/* Glassmorphism Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 flex flex-col items-center text-center shadow-2xl">
        
        {/* Icon Circle */}
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-8 border border-blue-500/30 shadow-inner">
          <Clock className="text-blue-400 w-8 h-8" />
        </div>

        <h1 className="text-white text-3xl font-bold mb-2">Clock In</h1>
        <p className="text-blue-100 mb-10 opacity-80">Enter your staff ID to start your shift</p>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-6 w-full max-w-md text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/50">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 w-full max-w-md text-green-400 bg-green-900/20 px-4 py-2 rounded-lg border border-green-500/50">
            {successMsg}
          </div>
        )}

        {/* PIN Inputs */}
        <div className="flex gap-4 mb-10">
          {pin.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              ref={(el) => { if (el) inputRefs.current[index] = el; }}
              value={digit}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={loading}
              className="w-16 h-20 bg-white/5 border-2 border-white/20 rounded-2xl text-white text-3xl font-bold text-center focus:border-blue-400 focus:outline-none transition-all shadow-inner disabled:opacity-50"
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full max-w-md gap-3">
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition uppercase tracking-widest shadow-lg shadow-blue-500/30 disabled:opacity-50 active:scale-95"
          >
            {loading ? "Verifying..." : "Confirm Clock In"}
          </button>

          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 bg-transparent hover:bg-white/5 text-white/60 font-medium rounded-xl transition text-sm"
          >
            Cancel & Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}