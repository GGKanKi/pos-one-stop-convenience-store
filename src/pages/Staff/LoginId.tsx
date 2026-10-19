import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost/One-Convenience/backend/api";

export default function LoginId() {
  const [staffId, setStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const handleClockIn = async () => {
    const enteredId = staffId.trim().toUpperCase();
    if (!/^(OS-\d{4}-\d{2}|\d{6})$/.test(enteredId)) {
      setErrorMsg("Enter your staff ID (for example, OS-1026-17).");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/clockin.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: enteredId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Clocked in at ${data.time_in}`);
        localStorage.setItem("staff_id", enteredId);
        localStorage.setItem("pending_clock_in", "true");
        setTimeout(() => navigate("/pos"), 1500);
      } else {
        setErrorMsg(data.message || "Clock-in failed.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 flex flex-col items-center text-center shadow-2xl">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-8 border border-blue-500/30 shadow-inner">
          <Clock className="text-blue-400 w-8 h-8" />
        </div>
        <h1 className="text-white text-3xl font-bold mb-2">Clock In</h1>
        <p className="text-blue-100 mb-10 opacity-80">Enter your staff ID to start your shift</p>
        {errorMsg && <div className="mb-6 w-full max-w-md text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/50">{errorMsg}</div>}
        {successMsg && <div className="mb-6 w-full max-w-md text-green-400 bg-green-900/20 px-4 py-2 rounded-lg border border-green-500/50">{successMsg}</div>}
        <input
          type="text"
          value={staffId}
          onChange={(event) => setStaffId(event.target.value.toUpperCase())}
          onKeyDown={(event) => { if (event.key === "Enter") void handleClockIn(); }}
          disabled={loading}
          maxLength={11}
          autoComplete="off"
          placeholder="OS-1026-17"
          aria-label="Staff ID"
          className="w-full max-w-md mb-10 px-6 py-5 bg-white/5 border-2 border-white/20 rounded-2xl text-white text-2xl font-bold text-center tracking-widest placeholder:text-white/30 focus:border-blue-400 focus:outline-none transition-all shadow-inner disabled:opacity-50"
        />
        <div className="flex flex-col w-full max-w-md gap-3">
          <button onClick={() => void handleClockIn()} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition uppercase tracking-widest shadow-lg shadow-blue-500/30 disabled:opacity-50 active:scale-95">
            {loading ? "Verifying..." : "Confirm Clock In"}
          </button>
          <button onClick={() => navigate("/login")} className="w-full py-3 bg-transparent hover:bg-white/5 text-white/60 font-medium rounded-xl transition text-sm">
            Cancel & Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
