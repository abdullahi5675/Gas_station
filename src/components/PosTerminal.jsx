import React, { useState } from 'react';
import { 
  Flame, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User, 
  Phone, 
  Check, 
  Calculator, 
  RotateCcw, 
  Plus, 
  Minus,
  Sparkles,
  AlertTriangle,
  Zap
} from 'lucide-react';

const STANDARD_CYLINDERS = [
  { size: 3, label: "3 kg", popular: false, subtitle: "Small Camping" },
  { size: 5, label: "5 kg", popular: false, subtitle: "Standard Small" },
  { size: 6, label: "6 kg", popular: true, subtitle: "Very Popular" },
  { size: 10, label: "10 kg", popular: false, subtitle: "Medium" },
  { size: 12.5, label: "12.5 kg", popular: true, subtitle: "Most Popular Household" },
  { size: 25, label: "25 kg", popular: false, subtitle: "Restaurant / Large" },
  { size: 50, label: "50 kg", popular: false, subtitle: "Commercial / Industrial" },
];

export default function PosTerminal({ overview, onSaleSuccess }) {
  const ratePerKg = overview?.settings?.pricePerKg || 1250;
  const currentTankStock = overview?.tank?.currentStockKg || 0;
  const attendants = overview?.attendants?.filter(a => a.active) || [];
  const pumps = overview?.settings?.pumps || ["Pump 1", "Pump 2"];

  // Form State
  const [mode, setMode] = useState('preset'); // 'preset', 'customKg', 'customNaira'
  const [selectedPreset, setSelectedPreset] = useState(12.5);
  const [quantity, setQuantity] = useState(1);
  const [customKg, setCustomKg] = useState('');
  const [customNaira, setCustomNaira] = useState('');
  const [cylinderDesc, setCylinderDesc] = useState('12.5kg Household Cylinder');

  // Payment & Customer Info
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH', 'POS_CARD', 'BANK_TRANSFER'
  const [paymentRef, setPaymentRef] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedAttendant, setSelectedAttendant] = useState(attendants[0]?.name || "Island Attendant");
  const [selectedPump, setSelectedPump] = useState(pumps[0] || "Pump 1");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate final KG and Naira
  let computedKg = 0;
  let computedNaira = 0;

  if (mode === 'preset') {
    computedKg = selectedPreset * quantity;
    computedNaira = computedKg * ratePerKg;
  } else if (mode === 'customKg') {
    const k = parseFloat(customKg) || 0;
    computedKg = k * quantity;
    computedNaira = Math.round(computedKg * ratePerKg);
  } else if (mode === 'customNaira') {
    const n = parseFloat(customNaira) || 0;
    computedNaira = n;
    computedKg = ratePerKg > 0 ? Number((n / ratePerKg).toFixed(2)) : 0;
  }

  const handleSelectPreset = (size, desc) => {
    setSelectedPreset(size);
    setMode('preset');
    setCylinderDesc(`${size}kg Cylinder`);
  };

  const handleCustomKgChange = (val) => {
    setCustomKg(val);
    setMode('customKg');
    setCylinderDesc(`Custom (${val || 0}kg)`);
  };

  const handleCustomNairaChange = (val) => {
    setCustomNaira(val);
    setMode('customNaira');
    setCylinderDesc(`Custom (₦${Number(val || 0).toLocaleString()})`);
  };

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (computedKg <= 0 || computedNaira <= 0) {
      setErrorMessage("Please select a cylinder or enter a valid refill amount.");
      return;
    }

    if (computedKg > currentTankStock) {
      setErrorMessage(`Insufficient tank stock! Tank only has ${currentTankStock.toFixed(1)}kg remaining.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || "Walk-in Customer",
          customerPhone: customerPhone || "",
          cylinderType: mode === 'preset' && quantity > 1 ? `${quantity}x ${selectedPreset}kg Cylinders` : cylinderDesc,
          kgRequested: computedKg,
          paymentMethod,
          paymentRef: paymentRef || (paymentMethod === 'CASH' ? 'CASH-PAID' : 'CONFIRMED'),
          attendantName: selectedAttendant,
          pump: selectedPump
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process sale");
      }

      // Reset form
      setQuantity(1);
      setCustomKg('');
      setCustomNaira('');
      setCustomerName('');
      setCustomerPhone('');
      setPaymentRef('');

      // Callback to show receipt modal and refresh overview
      onSaleSuccess(data.order);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / CENTER: Cylinder Selection & Amount Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top Mode Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-white text-base">Select Refill Quantity</h2>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-medium border border-slate-700">
                Rate: <strong className="text-orange-400">₦{ratePerKg.toLocaleString()}</strong> / kg
              </span>
            </div>

            {/* Quick Mode Switcher */}
            <div className="grid grid-cols-3 gap-2 mt-4 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('preset')}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  mode === 'preset'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Standard Cylinders
              </button>
              <button
                type="button"
                onClick={() => setMode('customKg')}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  mode === 'customKg'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                By Exact Weight (KG)
              </button>
              <button
                type="button"
                onClick={() => setMode('customNaira')}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  mode === 'customNaira'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                By Amount (₦ Naira)
              </button>
            </div>

            {/* TAB 1: Standard Preset Cylinders */}
            {mode === 'preset' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STANDARD_CYLINDERS.map((c) => {
                    const isSelected = selectedPreset === c.size;
                    const price = c.size * ratePerKg;
                    return (
                      <button
                        key={c.size}
                        type="button"
                        onClick={() => handleSelectPreset(c.size, `${c.size}kg Cylinder`)}
                        className={`relative p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/10 ring-2 ring-orange-500/30'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                        }`}
                      >
                        {c.popular && (
                          <span className="absolute -top-2 right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shadow">
                            HOT
                          </span>
                        )}
                        <div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xl font-extrabold text-white">{c.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-orange-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{c.subtitle}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-500">Price:</span>
                          <span className="font-bold text-sm text-orange-400">₦{price.toLocaleString()}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Cylinder Quantity Multiplier */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 mt-4">
                  <div>
                    <span className="text-sm font-semibold text-slate-200">Number of Cylinders:</span>
                    <p className="text-xs text-slate-400">If customer brought multiple of the same size</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-lg transition active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-bold text-white w-8 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-lg transition active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Custom KG Entry */}
            {mode === 'customKg' && (
              <div className="mt-5 space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Enter Exact Weight to Refill (KG)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={customKg}
                      onChange={(e) => handleCustomKgChange(e.target.value)}
                      placeholder="e.g. 7.5 or 4.2"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-2xl font-bold text-white focus:outline-none focus:border-orange-500 font-mono-numbers"
                    />
                    <span className="absolute right-4 top-4 text-slate-400 font-bold">KG</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[1.5, 2.5, 4.0, 7.5, 8.5, 15.0, 20.0, 45.0].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => handleCustomKgChange(quick)}
                        className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 rounded-lg transition"
                      >
                        +{quick} kg
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Custom Naira Entry */}
            {mode === 'customNaira' && (
              <div className="mt-5 space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Enter Budget Amount (₦) - e.g. Customer says "Fill ₦2,000"
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-2xl font-bold text-orange-400">₦</span>
                    <input
                      type="number"
                      step="100"
                      min="200"
                      value={customNaira}
                      onChange={(e) => handleCustomNairaChange(e.target.value)}
                      placeholder="e.g. 2000, 3500, 5000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3.5 text-2xl font-bold text-white focus:outline-none focus:border-orange-500 font-mono-numbers"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[1000, 2000, 3000, 4000, 5000, 7000, 10000, 15000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleCustomNairaChange(amt)}
                        className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 rounded-lg transition"
                      >
                        ₦{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Attendant & Pump Island Assignment */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Dispenser Island & Attendant Assignment</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Assigned Dispenser Pump:</label>
                <select
                  value={selectedPump}
                  onChange={(e) => setSelectedPump(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  {pumps.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Pump Attendant on Island:</label>
                <select
                  value={selectedAttendant}
                  onChange={(e) => setSelectedAttendant(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  {attendants.map(a => (
                    <option key={a.id} value={a.name}>{a.name} ({a.pump})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT: Payment, Customer Info & Checkout Bill (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <form onSubmit={handleSubmitSale} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            
            {/* Order Summary Card */}
            <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>Refill Specification</span>
                <span className="font-semibold text-slate-300">
                  {mode === 'preset' ? `${quantity}x ${selectedPreset}kg` : cylinderDesc}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Total Gas Weight</span>
                  <div className="text-2xl font-black text-white font-mono-numbers">
                    {computedKg} <span className="text-sm font-bold text-orange-400">KG</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Total Bill (NGN)</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono-numbers">
                    ₦{computedNaira.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Tank Warning if applicable */}
              {computedKg > currentTankStock && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center space-x-2 text-xs text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Exceeds available tank stock ({currentTankStock.toFixed(1)}kg available)!</span>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Payment Method (Nigeria)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs font-bold">CASH</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('POS_CARD')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition ${
                    paymentMethod === 'POS_CARD'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-300 ring-2 ring-blue-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-bold">POS CARD</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-300 ring-2 ring-purple-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-bold">TRANSFER</span>
                </button>
              </div>

              {/* Reference Input for POS or Transfer */}
              {paymentMethod !== 'CASH' && (
                <div className="mt-3">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {paymentMethod === 'POS_CARD' ? 'POS Terminal / STAN Reference:' : 'Bank Transfer Reference / Sender Name:'}
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder={paymentMethod === 'POS_CARD' ? 'e.g. STAN 004123' : 'e.g. Opay / Zenith / Customer Name'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}
            </div>

            {/* Optional Customer Information */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Customer Details (Optional)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone No."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* Submit & Generate Receipts Button */}
            <button
              type="submit"
              disabled={isSubmitting || computedKg <= 0 || computedKg > currentTankStock}
              className={`w-full py-4 px-6 rounded-xl font-extrabold text-base flex items-center justify-center space-x-2 shadow-xl transition active:scale-[0.98] ${
                isSubmitting || computedKg <= 0 || computedKg > currentTankStock
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-slate-950 shadow-orange-500/25 ring-2 ring-orange-400/50'
              }`}
            >
              <Flame className="w-5 h-5 text-slate-950" />
              <span>{isSubmitting ? "Processing..." : `Complete Sale & Print 2 Receipts (₦${computedNaira.toLocaleString()})`}</span>
            </button>

            <p className="text-center text-[11px] text-slate-500">
              Prints 1 Customer Receipt + 1 Attendant Dispense Slip automatically.
            </p>

          </form>

        </div>

      </div>
    </div>
  );
}
