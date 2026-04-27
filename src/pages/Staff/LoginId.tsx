import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

export default function LoginId() {
  const [pin, setPin] = useState<string[]>(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

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

  // Logic to handle navigation to POS
  const handleClockIn = () => {
    const fullPin = pin.join("");
    
    if (fullPin.length < 6) {
      setErrorMsg("Please enter your full 6-digit ID.");
      return;
    }

    setLoading(true);
    // will be verify the PIN with backend here.
    // For now, it will navigate directly to the POS screen.
    setTimeout(() => {
      setLoading(false);
      navigate("/pos"); 
    }, 1000);
  };

  const backgroundImageUrl = "/pictures/bg.jpg";

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      {/* Dark overlay to ensure the form remains readable against the background image */}
      <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm" />

      {/* Content container set to relative z-10 to appear above the overlay */}
      <div className="relative z-10 w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-12 flex flex-col items-center text-center shadow-2xl">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-8 border border-white/20 shadow-inner">
          <Clock className="text-white w-8 h-8 opacity-90" />
        </div>
        <h1 className="text-white text-3xl font-bold mb-2">Clock In</h1>
        <p className="text-blue-100 mb-10 opacity-80">Enter your staff ID to start your shift</p>
        
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
              // Fixed: Ref assignment logic to remove TypeScript error
              ref={(el) => { if (el) inputRefs.current[index] = el; }} 
              value={digit}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-16 h-20 bg-white/5 border-2 border-white/20 rounded-2xl text-white text-3xl font-bold text-center focus:border-blue-400 focus:outline-none transition-all shadow-inner"
            />
          ))}
        </div>
        <p className="text-blue-100/40 text-sm mb-10 tracking-widest uppercase">6-digit unique identifier</p>
        
        <button 
          onClick={handleClockIn}
          disabled={loading}
          className="w-full max-w-md py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition uppercase tracking-widest shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Clock In"}
        </button>
      </div>
    </div>
  );
}