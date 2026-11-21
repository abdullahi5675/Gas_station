import React, { useState } from 'react';
import { Settings, X, Save, Flame, Building, Phone, Fuel } from 'lucide-react';

export default function SettingsModal({ overview, onClose, onSettingsUpdated }) {
  const station = overview?.station;
  const settings = overview?.settings;

  const [pricePerKg, setPricePerKg] = useState(settings?.pricePerKg || 1250);
  const [stationName, setStationName] = useState(station?.name || '');
  const [address, setAddress] = useState(station?.address || '');
  const [phone, setPhone] = useState(station?.phone || '');
  const [pumpsStr, setPumpsStr] = useState((settings?.pumps || ["Pump 1", "Pump 2"]).join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);

    try {
      const pumps = pumpsStr.split(',').map(p => p.trim()).filter(Boolean);
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricePerKg: parseFloat(pricePerKg),
          stationName,
          address,
          phone,
          pumps
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          if (onSettingsUpdated) onSettingsUpdated();
          onClose();
        }, 600);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
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
            <Settings className="w-6 h-6 text-orange-400" />
            <h3 className="font-bold text-white text-lg">Station Settings & Gas Pricing</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Price Per KG (Highlighted) */}
          <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider">
              Cooking Gas Price Per KG (₦)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xl font-bold text-orange-400">₦</span>
              <input
                type="number"
                step="10"
                min="100"
                required
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="w-full bg-slate-950 border border-orange-500/40 rounded-xl pl-9 pr-14 py-3 text-2xl font-black text-white focus:outline-none focus:border-orange-500 font-mono-numbers"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">/ KG</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Updating this instantly updates the POS counter and all future receipt calculations.
            </p>
          </div>

          {/* Station Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Station Name (Shown on Receipts):</label>
              <input
                type="text"
                required
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="e.g. Al-Barakah LPG Plant"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Station Address:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 14, Commercial Ave..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Phone Number:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 803 123 4567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Dispenser Islands / Pumps (Comma separated):
              </label>
              <input
                type="text"
                value={pumpsStr}
                onChange={(e) => setPumpsStr(e.target.value)}
                placeholder="Pump 1, Pump 2, Pump 3"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-semibold">
              ✓ Settings and Gas Rate saved successfully!
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
              className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-orange-500/25 transition active:scale-95"
            >
              {isSubmitting ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
