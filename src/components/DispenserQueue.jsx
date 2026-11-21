import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Fuel, 
  Search, 
  RefreshCw, 
  Flame, 
  ArrowRight,
  Filter
} from 'lucide-react';

export default function DispenserQueue({ onSelectOrderForReceipt }) {
  const [orders, setOrders] = useState([]);
  const [filterPump, setFilterPump] = useState('ALL');
  const [searchToken, setSearchToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders?limit=30');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 6000); // Poll every 6 seconds for live queue
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error("Error updating order status:", err);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesPump = filterPump === 'ALL' || o.pump.includes(filterPump);
    const matchesSearch = !searchToken || 
      o.tokenCode.toLowerCase().includes(searchToken.toLowerCase()) || 
      o.orderNumber.toLowerCase().includes(searchToken.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchToken.toLowerCase());
    return matchesPump && matchesSearch;
  });

  const waitingOrders = filteredOrders.filter(o => o.status === 'PAID');
  const dispensingOrders = filteredOrders.filter(o => o.status === 'DISPENSING');
  const completedToday = filteredOrders.filter(o => o.status === 'COMPLETED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Fuel className="w-6 h-6 text-orange-500" />
            <h2 className="font-extrabold text-white text-xl">Dispenser Refill Queue</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Attendant Island Screen: Match customer's Refill Slip Token to dispense the exact KG.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              placeholder="Search Token (e.g. TKN-314)..."
              className="bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500 w-52"
            />
          </div>

          <select
            value={filterPump}
            onChange={(e) => setFilterPump(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">All Pumps</option>
            <option value="Pump 1">Pump 1 Island</option>
            <option value="Pump 2">Pump 2 Island</option>
          </select>

          <button
            onClick={fetchOrders}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Queue Columns: Waiting / In Progress / Recently Completed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMN 1: Waiting to Refill */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Waiting to Refill</h3>
            </div>
            <span className="bg-amber-500/10 text-amber-400 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {waitingOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {waitingOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800/60">
                No orders waiting in queue.
              </div>
            ) : (
              waitingOrders.map((o) => (
                <div 
                  key={o.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 shadow-lg transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xl font-black text-amber-400 tracking-wider font-mono">
                        {o.tokenCode}
                      </div>
                      <span className="text-[11px] text-slate-400">{o.pump}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white font-mono-numbers">
                        {o.kgRequested} <span className="text-xs text-orange-400">KG</span>
                      </span>
                      <div className="text-[10px] text-slate-400">{o.cylinderType}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="truncate max-w-[140px]">{o.customerName}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleUpdateStatus(o.id, 'DISPENSING')}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition active:scale-95"
                    >
                      <Fuel className="w-3.5 h-3.5" />
                      <span>Start Dispensing</span>
                    </button>
                    {onSelectOrderForReceipt && (
                      <button
                        onClick={() => onSelectOrderForReceipt(o)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                        title="View Receipt"
                      >
                        Slip
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: Currently Dispensing */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Dispensing Now</h3>
            </div>
            <span className="bg-blue-500/10 text-blue-400 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-blue-500/20">
              {dispensingOrders.length}
            </span>
          </div>

          <div className="space-y-3">
            {dispensingOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800/60">
                No cylinders currently filling.
              </div>
            ) : (
              dispensingOrders.map((o) => (
                <div 
                  key={o.id}
                  className="bg-blue-950/20 border border-blue-500/40 rounded-xl p-4 shadow-lg transition space-y-3 ring-1 ring-blue-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xl font-black text-blue-400 tracking-wider font-mono">
                        {o.tokenCode}
                      </div>
                      <span className="text-[11px] text-slate-400">{o.pump}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white font-mono-numbers">
                        {o.kgRequested} <span className="text-xs text-orange-400">KG</span>
                      </span>
                      <div className="text-[10px] text-blue-300 font-medium">Filling in progress...</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="truncate max-w-[140px]">Attendant: {o.attendantName}</span>
                    <span className="text-[10px] text-slate-400">{o.cylinderType}</span>
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(o.id, 'COMPLETED')}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 transition active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Done & Release Cylinder</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: Completed Today */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Completed Cylinders</h3>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {completedToday.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {completedToday.slice(0, 15).map((o) => (
              <div 
                key={o.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs hover:border-slate-700 transition"
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center space-x-2">
                    <span className="font-mono text-emerald-400">{o.tokenCode}</span>
                    <span>•</span>
                    <span>{o.kgRequested} kg</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{o.customerName} ({o.pump})</p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold text-xs">₦{o.totalAmount?.toLocaleString()}</span>
                  <div className="text-[10px] text-slate-500">
                    {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
