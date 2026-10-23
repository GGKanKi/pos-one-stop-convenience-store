import { useCallback, useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { apiRequest } from "../services/api";
import { getActiveStaffAuthToken, getActiveStaffUser } from "../services/authSession";

type AttendanceRecord = {
  clock_in: string;
  clock_out: string | null;
} | null;

export default function StaffAttendanceControl() {
  const user = getActiveStaffUser();
  const userId = user.id;
  const [attendance, setAttendance] = useState<AttendanceRecord>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isClockedIn = Boolean(attendance?.clock_in && !attendance.clock_out);

  const loadAttendance = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await apiRequest("/getmystaffattendance.php", "GET", undefined, getActiveStaffAuthToken());
      if (!result.success) throw new Error(result.message || "Unable to load your attendance.");
      setAttendance(result.attendance || null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your attendance.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void loadAttendance(); }, [loadAttendance]);

  const handleAttendance = async () => {
    if (!userId) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest("/clockout.php", "POST", { user_id: userId }, getActiveStaffAuthToken());
      if (!response.success) throw new Error(response.message || "Unable to clock Staff out.");
      setConfirmOpen(false);
      setNotice("You have clocked out.");
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your attendance.");
    } finally {
      setSaving(false);
    }
  };

  if (!userId) return null;

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-md sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#17347a]"><Clock size={20} /></span>
          <div>
            <h2 className="text-sm font-extrabold text-[#17347a]">My Attendance</h2>
            <p className="text-xs text-slate-500">
              {loading ? "Loading attendance..." : isClockedIn
                ? `Active shift - Clocked in ${new Date(attendance!.clock_in.replace(" ", "T")).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : attendance?.clock_out ? "Shift ended for today" : "Not clocked in today"}
            </p>
          </div>
        </div>
        {isClockedIn && <button type="button" onClick={() => setConfirmOpen(true)} disabled={loading || saving} className="rounded-lg bg-red-700 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-red-800 disabled:opacity-50">Staff Out</button>}
      </div>
      {!loading && !isClockedIn && !attendance?.clock_out && <p className="mt-3 text-xs text-slate-500">Staff is not clocked in. Clock in through Inventory Monitoring on the POS.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">{notice}</p>}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="staff-out-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="staff-out-title" className="text-base font-extrabold text-[#17347a]">Confirm Staff Out</h2>
                <p className="mt-1 text-sm text-slate-600">Are you sure you want to clock out and end this shift?</p>
              </div>
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={saving} aria-label="Close confirmation" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void handleAttendance()} disabled={saving} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">{saving ? "Clocking out..." : "Confirm Staff Out"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
