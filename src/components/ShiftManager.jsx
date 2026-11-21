import React, { useState } from 'react';
import { 
  UserCheck, 
  X, 
  Clock, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert 
} from 'lucide-react';

export default function ShiftManager({ overview, onClose, onShiftUpdated }) {
  const activeShift = overview?.activeShift;
  const metrics = overview?.metrics;

  const [actualCash, setActualCash] = useState('');
  const [nextCashier, setNextCashier] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const openingCash = activeShift?.openingCash || 0;
  const cashSales = metrics?.cashSales || 0;
  const expectedDrawerCash = openingCash + cashSales;

  const counted = parseFloat(actualCash) || 0;
  const discrepancy = actualCash !== '' ? counted - expectedDrawerCash : null;

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (actualCash === '') {
      setError("Please enter the actual physical cash counted in the drawer.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/shift/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCashCounted: counted,
          nextCashierName: nextCashier || "Cashier On Duty",
          notes: shiftNotes
        })
      });

      if (!res.ok) {
        throw new Error("Failed to close shift");
      }

      const data = await res.json();
      if (onShiftUpdated) onShiftUpdated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="font-bold text-white text-lg">Cashier Shift Reconciliation</h3>
              <p className="text-xs text-slate-400">Shift ID: {activeShift?.id || "N/A"}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Shift Live Summary */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Cashier on Duty:</span>
            <span className="font-bold text-white">{activeShift?.cashierName || "Fatima Adamu"}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Shift Started At:</span>
            <span>{activeShift?.startTime ? new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}</span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Opening Float (Cash):</span>
              <span className="font-mono text-slate-200">₦{openingCash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cash Sales Collected:</span>
              <span className="font-mono text-emerald-400 font-bold">+ ₦{cashSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>POS Card Sales (Terminals):</span>
              <span className="font-mono text-blue-400">₦{(metrics?.posSales || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Direct Bank Transfers:</span>
              <span className="font-mono text-purple-400">₦{(metrics?.transferSales || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Expected Cash in Drawer:</span>
            <span className="text-lg font-black text-amber-400 font-mono-numbers">
              ₦{expectedDrawerCash.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Handover Form */}
        <form onSubmit={handleCloseShift} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Actual Physical Cash Counted in Drawer (₦):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-lg font-bold text-emerald-400">₦</span>
              <input
                type="number"
                required
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="Count physical notes and enter total..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-blue-400 font-mono-numbers"
              />
            </div>

            {/* Discrepancy Alert */}
            {discrepancy !== null && (
              <div className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                discrepancy === 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : discrepancy < 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <span>
                  {discrepancy === 0 
                    ? "✓ Exact Match! Cash perfectly reconciled."
                    : discrepancy < 0
                    ? `⚠ Shortage detected! Cash is short by ₦${Math.abs(discrepancy).toLocaleString()}`
                    : `ℹ Excess Cash! Cash drawer is over by ₦${discrepancy.toLocaleString()}`
                  }
                </span>
                <span className="font-mono font-bold">
                  {discrepancy >= 0 ? `+₦${discrepancy.toLocaleString()}` : `-₦${Math.abs(discrepancy).toLocaleString()}`}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Incoming / Next Cashier:</label>
              <input
                type="text"
                value={nextCashier}
                onChange={(e) => setNextCashier(e.target.value)}
                placeholder="Next Cashier Name"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Handover Notes:</label>
              <input
                type="text"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="e.g. Handed over safe key"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              {isSubmitting ? "Reconciling..." : "Close Shift & Handover"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
