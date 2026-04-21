import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function SetStaffId() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [staffId, setStaffId] = useState<string[]>(["", "", "", "", "", ""]);
  const [selectedAvatar, setSelectedAvatar] = useState("/pictures/avatar1.jpg");

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // HANDLE INPUT
  const handleChange = (value: string, index: number) => {
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, "");

    const updated = [...staffId];
    updated[index] = cleanValue;
    setStaffId(updated);

    if (cleanValue && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  // BACKSPACE
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !staffId[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // SAVE: POST to /api/setstaffid.php
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const finalId = staffId.join("");

    if (finalId.length !== 6) {
      alert("Please complete 6-character Staff ID");
      return;
    }

    if (!email) {
      alert("Email not found. Please login again.");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      email,
      staffId: finalId,
      avatar: selectedAvatar,
    };

    try {
      const response = await fetch("http://localhost/One-Convenience/backend/api/setstaffid.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert("Staff ID set successfully!");
        navigate("/POS");
      } else {
        setError(result.message || "Failed to save Staff ID.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const avatars = [
    "/pictures/avatar1.jpg",
    "/pictures/avatar2.jpg",
    "/pictures/avatar3.jpg",
    "/pictures/avatar4.jpg",
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-10
      bg-[url('/pictures/bg.jpg')] bg-cover bg-center bg-no-repeat
      text-white relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#1f2a6c]/70 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-6xl h-[520px]
        bg-white/10 backdrop-blur-xl border border-white/20
        rounded-3xl shadow-2xl flex overflow-hidden z-10"
      >
        {/* LEFT PART */}
        <div className="w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center px-10 text-center">
          <h2 className="text-2xl font-bold mb-2">Select your avatar</h2>
          <p className="text-sm text-blue-200 mb-6">
            Choose your profile picture
          </p>

          <div className="w-32 h-32 rounded-full border-4 border-white/40 flex items-center justify-center mb-6 overflow-hidden">
            <img src={selectedAvatar} className="w-full h-full object-cover" />
          </div>

          <div className="flex gap-3">
            {avatars.map((avatar, i) => (
              <img
                key={i}
                src={avatar}
                onClick={() => setSelectedAvatar(avatar)}
                className={`w-24 h-24 rounded-full cursor-pointer border-2 transition
                ${
                  selectedAvatar === avatar
                    ? "border-blue-500 shadow-lg shadow-blue-500/40 scale-110"
                    : "border-transparent hover:scale-110"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-blue-200 mt-4">
            Click to select your avatar
          </p>
        </div>

        {/* RIGHT PART */}
        <div className="w-1/2 flex flex-col justify-center px-12">
          <h1 className="text-3xl font-bold mb-2">Setup Your Profile</h1>
          <p className="text-gray-300 mb-6">Enter your staff ID below</p>

          <div className="flex gap-3 mb-4">
            {staffId.map((val, i) => (
              <input
                key={i}
                maxLength={1}
                value={val}
                ref={(el: HTMLInputElement | null) => {
                  inputsRef.current[i] = el;
                }}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-[60px] h-[65px] text-center text-2xl font-semibold
                rounded-xl bg-white/5 border border-white/20
                text-white outline-none transition
                focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.7)]"
              />
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            6-digit unique identifier
          </p>

          <div className="bg-blue-400/20 border border-blue-300/30 rounded-xl p-4 text-sm text-blue-100 mb-6">
            Note: Your Staff ID is assigned by your manager for system
            identification.
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold transition-all
            bg-gradient-to-r from-blue-500 to-indigo-500
            shadow-lg shadow-blue-500/30 hover:opacity-90 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
          {error && (
            <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}