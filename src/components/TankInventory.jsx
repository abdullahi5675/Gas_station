import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Truck, 
  Gauge, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  History, 
  TrendingDown, 
  FileText,
  DollarSign
} from 'lucide-react';

export default function TankInventory({ overview, onRefresh }) {
  const [tankData, setTankData] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [dips, setDips] = useState([]);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showDipModal, setShowDipModal] = useState(false);

  // Delivery Form State
  const [supplier, setSupplier] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [waybillNumber, setWaybillNumber] = useState('');
  const [metricTons, setMetricTons] = useState('');
  const [kgReceived, setKgReceived] = useState('');
  const [costPerKg, setCostPerKg] = useState('1050');
  const [offloadedBy, setOffloadedBy] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Dip Audit Form State
  const [gaugePercent, setGaugePercent] = useState('');
  const [recordedBy, setRecordedBy] = useState('');
  const [dipNotes, setDipNotes] = useState('');
  const [isSubmittingDip, setIsSubmittingDip] = useState(false);

  const fetchTankData = async () => {
    try {
      const res = await fetch('/api/tank');
      const data = await res.json();
      setTankData(data.tank);
      setDeliveries(data.deliveries);
      setDips(data.dips);
    } catch (err) {
      console.error("Error fetching tank data:", err);
    }
  };

  useEffect(() => {
    fetchTankData();
  }, []);

  const handleTonsChange = (val) => {
    setMetricTons(val);
    const tons = parseFloat(val) || 0;
    setKgReceived(tons * 1000);
  };

  const handleKgChange = (val) => {
    setKgReceived(val);
    const kg = parseFloat(val) || 0;
    setMetricTons((kg / 1000).toFixed(2));
  };

  const handleSubmitDelivery = async (e) => {
    e.preventDefault();
    setIsSubmittingDelivery(true);
    try {
      const res = await fetch('/api/tank/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier,
          truckNumber,
          waybillNumber,
          metricTons: parseFloat(metricTons),
          kgReceived: parseFloat(kgReceived),
          costPerKg: parseFloat(costPerKg),
          offloadedBy,
          notes: deliveryNotes
        })
      });
      if (res.ok) {
        setShowDeliveryModal(false);
        // Reset form
        setSupplier('');
        setTruckNumber('');
        setWaybillNumber('');
        setMetricTons('');
        setKgReceived('');
        fetchTankData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Error submitting delivery:", err);
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const handleSubmitDip = async (e) => {
    e.preventDefault();
    setIsSubmittingDip(true);
    try {
      const res = await fetch('/api/tank/dip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gaugePercent: parseFloat(gaugePercent),
          recordedBy,
          notes: dipNotes
        })
      });
      if (res.ok) {
        setShowDipModal(false);
        setGaugePercent('');
        fetchTankData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Error recording dip:", err);
    } finally {
      setIsSubmittingDip(false);
    }
  };

  const currentStock = tankData?.currentStockKg || overview?.tank?.currentStockKg || 0;
  const capacity = tankData?.capacityKg || overview?.tank?.capacityKg || 5000;
  const percentage = Math.min(100, Math.round((currentStock / capacity) * 100));
  const isLow = currentStock <= (tankData?.lowStockThresholdKg || 800);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-6 h-6 text-orange-500" />
            <h2 className="font-extrabold text-white text-xl">LPG Central Storage & Bulk Tank</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitor central bulk storage level, record offloading tanker deliveries & track physical dip variances.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowDipModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>Audit Gauge / Dip</span>
          </button>

          <button
            onClick={() => setShowDeliveryModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 text-xs font-extrabold shadow-lg shadow-orange-500/20 transition active:scale-95"
          >
            <Truck className="w-4 h-4 text-slate-950" />
            <span>Offload Tanker Delivery</span>
          </button>
        </div>
      </div>

      {/* Tank Visualizer & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Visual Tank Gauge Card (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Bulk Skid Tank Level</h3>
              <p className="text-xs text-slate-400">{tankData?.name || "Main LPG Skid Tank 1"}</p>
            </div>
            {isLow && (
              <span className="flex items-center space-x-1 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>REORDER SOON</span>
              </span>
            )}
          </div>

          {/* Graphical Tank Cylinder Bar */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">Current Usable Fuel:</span>
              <span className="text-2xl font-black text-white font-mono-numbers">
                {currentStock.toLocaleString()} <span className="text-sm font-bold text-orange-400">KG</span>
                <span className="text-xs text-slate-400 font-normal ml-2">({(currentStock / 1000).toFixed(2)} Metric Tons)</span>
              </span>
            </div>

            {/* Custom Tank Progress Gauge */}
            <div className="relative w-full h-8 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-1">
              <div 
                className={`h-full rounded-lg transition-all duration-700 ${
                  isLow 
                    ? 'bg-gradient-to-r from-rose-600 to-rose-400' 
                    : percentage < 40 
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400' 
                    : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400'
                }`}
                style={{ width: `${percentage}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow">
                {percentage}% CAPACITY
              </span>
            </div>

            <div className="flex justify-between text-[11px] text-slate-500">
              <span>0 KG (Empty)</span>
              <span>Reserve: {tankData?.lowStockThresholdKg || 800} KG</span>
              <span>Max Safe Fill (85%): {Math.round(capacity * 0.85)} KG</span>
              <span>Total: {capacity} KG</span>
            </div>
          </div>

          {/* Quick Tank Specs */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tank Capacity</span>
              <span className="text-sm font-bold text-slate-200">{(capacity / 1000).toFixed(1)} Metric Tons</span>
              <p className="text-[10px] text-slate-500">{capacity.toLocaleString()} kg</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Remaining Cylinders</span>
              <span className="text-sm font-bold text-emerald-400">~{Math.floor(currentStock / 12.5)}</span>
              <p className="text-[10px] text-slate-500">Standard 12.5kg refills</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Bridger Offload</span>
              <span className="text-sm font-bold text-slate-200">
                {deliveries[0] ? new Date(deliveries[0].date).toLocaleDateString('en-GB') : "Recently"}
              </span>
              <p className="text-[10px] text-slate-500">{deliveries[0]?.metricTons || 3.5} Tons</p>
            </div>
          </div>
        </div>

        {/* Physical Dip Audits & Variances (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Gauge className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Tank Calibration & Dip Log</h3>
            </div>
            <button
              onClick={() => setShowDipModal(true)}
              className="text-xs text-orange-400 hover:underline font-semibold"
            >
              + Log Check
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Comparing physical rotary/magnetic tank gauge against system calculated volume:
          </p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {dips.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No dip audits recorded yet.</div>
            ) : (
              dips.map((d) => (
                <div key={d.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{d.gaugePercent}% on Dial Gauge</span>
                    <span className={`font-mono font-bold ${d.varianceKg < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {d.varianceKg > 0 ? `+${d.varianceKg}` : d.varianceKg} kg variance
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Calc: {d.calculatedStockKg?.toLocaleString()} kg</span>
                    <span>System: {d.systemStockKg?.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                    <span>Auditor: {d.recordedBy}</span>
                    <span>{new Date(d.timestamp).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bridger Tanker Delivery History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-white text-base">Bulk LPG Tanker Offloading History</h3>
          </div>
          <span className="text-xs text-slate-400">{deliveries.length} total deliveries logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Supplier / Depot</th>
                <th className="py-3 px-4">Truck / Waybill</th>
                <th className="py-3 px-4">Volume (Tons)</th>
                <th className="py-3 px-4">Weight (KG)</th>
                <th className="py-3 px-4">Cost/KG</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4">Receiver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-slate-500">No bulk deliveries recorded yet.</td>
                </tr>
              ) : (
                deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {new Date(del.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{del.supplier}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{del.truckNumber}</div>
                      <div className="text-[10px] text-slate-500">{del.waybillNumber}</div>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-amber-400 font-mono">{del.metricTons} MT</td>
                    <td className="py-3 px-4 font-bold text-slate-200">{del.kgReceived?.toLocaleString()} KG</td>
                    <td className="py-3 px-4 text-slate-400">₦{del.costPerKg?.toLocaleString()}</td>
                    <td className="py-3 px-4 font-extrabold text-emerald-400">₦{del.totalCost?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-400">{del.offloadedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Delivery */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-1 flex items-center space-x-2">
              <Truck className="w-5 h-5 text-orange-500" />
              <span>Log Bulk LPG Tanker Delivery</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the offloading details from the driver's depot waybill. Stock will be auto-added to the tank.
            </p>

            <form onSubmit={handleSubmitDelivery} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">LPG Supplier / Depot:</label>
                  <input
                    type="text"
                    required
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. NNPC / Matrix / Rainoil"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Truck Plate Number:</label>
                  <input
                    type="text"
                    required
                    value={truckNumber}
                    onChange={(e) => setTruckNumber(e.target.value)}
                    placeholder="e.g. KMC-102-XA"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Waybill No:</label>
                  <input
                    type="text"
                    value={waybillNumber}
                    onChange={(e) => setWaybillNumber(e.target.value)}
                    placeholder="WB-48912"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Metric Tons:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={metricTons}
                    onChange={(e) => handleTonsChange(e.target.value)}
                    placeholder="e.g. 3.5"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Weight in KG:</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={kgReceived}
                    onChange={(e) => handleKgChange(e.target.value)}
                    placeholder="3500"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Cost per KG (₦):</label>
                  <input
                    type="number"
                    value={costPerKg}
                    onChange={(e) => setCostPerKg(e.target.value)}
                    placeholder="1050"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Offloaded By (Operator):</label>
                  <input
                    type="text"
                    required
                    value={offloadedBy}
                    onChange={(e) => setOffloadedBy(e.target.value)}
                    placeholder="e.g. Usman Danladi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelivery}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-orange-500/20"
                >
                  {isSubmittingDelivery ? "Saving..." : "Confirm & Add to Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Dip / Gauge Audit */}
      {showDipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-1 flex items-center space-x-2">
              <Gauge className="w-5 h-5 text-amber-400" />
              <span>Record Physical Gauge / Dip Check</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Read the rotary magnetic float gauge on the bulk tank and enter the percentage.
            </p>

            <form onSubmit={handleSubmitDip} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Gauge Percentage (%):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={gaugePercent}
                  onChange={(e) => setGaugePercent(e.target.value)}
                  placeholder="e.g. 76.5"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-lg font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Recorded By (Inspector/Manager):</label>
                <input
                  type="text"
                  required
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  placeholder="e.g. Ahmed Yahaya"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDipModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDip}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
                >
                  {isSubmittingDip ? "Saving..." : "Record Calibration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
