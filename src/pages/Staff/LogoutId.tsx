import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

export default function LogoutId() {
  const [pin, setPin] = useState<string[]>(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
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

  const handleClockOut = () => {
    const fullPin = pin.join("");
    
    if (fullPin.length < 6) {
      setErrorMsg("Please enter your 6-digit ID to confirm clock out.");
      return;
    }

    setLoading(true);
    
    // Simulating backend clock-out logic
    setTimeout(() => {
      setLoading(false);
      // After clocking out, typically send them back to the main Login
      alert("Shift ended successfully. Great job today!");
      navigate("/login");  // Redirect to login page after clocking out
    }, 1500);
  };

  return ( // bg
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 flex flex-col items-center text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-8 border border-red-500/30 shadow-inner">
          <Clock className="text-red-400 w-8 h-8" />
        </div>
        <h1 className="text-white text-3xl font-bold mb-2">Clock Out</h1>
        <p className="text-red-100 mb-10 opacity-80">Verify your ID to end your shift</p>
        
        {errorMsg && (
          <div className="mb-4 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/50">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-4 mb-4">
          {pin.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              ref={(el) => { if (el) inputRefs.current[index] = el; }} 
              value={digit}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-16 h-20 bg-white/5 border-2 border-white/20 rounded-2xl text-white text-3xl font-bold text-center focus:border-red-400 focus:outline-none transition-all shadow-inner"
            />
          ))}
        </div>

        <div className="flex flex-col w-full max-w-md gap-3">
          <button 
            onClick={handleClockOut}
            disabled={loading}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition uppercase tracking-widest shadow-lg shadow-red-500/30 disabled:opacity-50"
          >
            {loading ? "Ending Shift..." : "End Shift & Clock Out"}
          </button>
          
          <button 
            onClick={() => navigate("/pos")} 
            className="w-full py-3 bg-transparent hover:bg-white/5 text-white/60 font-medium rounded-xl transition text-sm"
          >
            Go Back to POS  
          </button>
        </div>
      </div>
    </div>
  );
}