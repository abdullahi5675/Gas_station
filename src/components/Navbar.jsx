import React from 'react';
import { Flame, Database, ShoppingCart, Clock, Settings, ShieldCheck, Gauge, UserCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, overview, onOpenSettings, onOpenShiftModal }) {
  const price = overview?.settings?.pricePerKg || 1250;
  const tank = overview?.tank;
  const activeShift = overview?.activeShift;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Station Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('pos')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">GasFlow</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">LPG STATION</span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">{overview?.station?.name || "LPG Plant"}</p>
            </div>
          </div>

          {/* Quick Status Badges */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Live Rate */}
            <div 
              onClick={onOpenSettings}
              className="group flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:border-orange-500/50 cursor-pointer transition"
              title="Click to update price per KG"
            >
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              <span className="text-xs text-slate-400">Current Rate:</span>
              <span className="font-bold text-sm text-orange-400">₦{price.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500">/kg</span>
            </div>

            {/* Tank Level Badge */}
            {tank && (
              <div 
                onClick={() => setActiveTab('tank')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border cursor-pointer transition ${
                  tank.isLowStock 
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' 
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:border-emerald-500/50'
                }`}
              >
                <Gauge className={`w-4 h-4 ${tank.isLowStock ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span className="text-xs">Tank Stock:</span>
                <span className="font-semibold text-xs text-white">
                  {tank.currentStockKg?.toLocaleString()} kg ({tank.percentage}%)
                </span>
              </div>
            )}

            {/* Active Cashier Badge */}
            <div 
              onClick={onOpenShiftModal}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 cursor-pointer text-xs transition"
            >
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span className="text-slate-400">Shift:</span>
              <span className="font-medium text-slate-200">{activeShift?.cashierName || "Cashier"}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'pos'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>POS Desk</span>
            </button>

            <button
              onClick={() => setActiveTab('dispenser')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'dispenser'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Dispenser Queue</span>
            </button>

            <button
              onClick={() => setActiveTab('tank')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'tank'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Bulk Tank</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'history'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Sales & Reports</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Station Settings & Gas Rate"
            >
              <Settings className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
