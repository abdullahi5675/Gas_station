import React from 'react';
import { Printer, CheckCircle2, X, Flame, Shield, ArrowRight } from 'lucide-react';

export default function DualReceiptModal({ order, station, settings, onClose, onNewSale }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-lg">Sale Confirmed & Paid</h3>
              <p className="text-xs text-slate-400">Order: {order.orderNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info callout */}
        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between text-xs text-orange-300">
          <span className="font-medium">2 Copies Generated: 1 for Customer & 1 for Dispenser Island</span>
          <span className="font-bold px-2 py-0.5 bg-orange-500/20 rounded text-orange-200">{order.tokenCode}</span>
        </div>

        {/* Printable Area Wrapper (This is styled for 80mm/58mm thermal output) */}
        <div className="my-4 max-h-[60vh] overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-center">
          <div id="printable-receipt-area" className="w-[320px] bg-white text-black p-4 font-mono text-[12px] leading-relaxed shadow-md">
            
            {/* ================= COPY 1: CUSTOMER RECEIPT ================= */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400">
              <div className="font-extrabold text-[15px] tracking-tight uppercase">{station?.name || "LPG GAS STATION"}</div>
              <div className="text-[10px] text-gray-700">{station?.tagline || "Clean Cooking Gas Plant"}</div>
              <div className="text-[10px] text-gray-600">{station?.address}</div>
              <div className="text-[10px] text-gray-600">Tel: {station?.phone}</div>
              {station?.rcNumber && <div className="text-[9px] text-gray-500">{station.rcNumber}</div>}
              <div className="mt-2 text-[11px] font-bold uppercase bg-gray-200 py-0.5 rounded">
                *** CUSTOMER RECEIPT ***
              </div>
            </div>

            <div className="py-2 text-[11px] space-y-0.5 border-b border-dashed border-gray-300">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Refill Token:</span>
                <span className="font-bold text-[13px]">{order.tokenCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{order.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{order.customerName}</span>
              </div>
            </div>

            {/* Sale Items */}
            <div className="py-2 border-b border-dashed border-gray-300">
              <div className="flex justify-between text-[11px] font-bold border-b border-gray-200 pb-1 mb-1">
                <span>ITEM / CYLINDER</span>
                <span>TOTAL</span>
              </div>
              <div className="flex justify-between font-bold text-[12px]">
                <span>LPG Cooking Gas ({order.cylinderType})</span>
                <span>₦{order.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>Weight: {order.kgRequested} kg @ ₦{order.ratePerKg?.toLocaleString()}/kg</span>
                <span></span>
              </div>
            </div>

            {/* Totals & Payment */}
            <div className="py-2 space-y-1 border-b border-dashed border-gray-400">
              <div className="flex justify-between text-[14px] font-extrabold">
                <span>TOTAL PAID:</span>
                <span>₦{order.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Payment Method:</span>
                <span className="font-semibold">{order.paymentMethod?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>Reference:</span>
                <span>{order.paymentRef}</span>
              </div>
            </div>

            <div className="text-center py-2 text-[10px] text-gray-700">
              <p>Keep your cylinder upright & well-ventilated.</p>
              <p className="font-semibold mt-0.5">Thank you for cooking with us!</p>
            </div>

            {/* ================= PERFORATED SEPARATOR LINE ================= */}
            <div className="relative my-4 py-2 border-y-2 border-dashed border-black text-center font-bold text-[10px] tracking-wider uppercase bg-gray-100">
              ✂ ✂ ✂ &nbsp; TEAR HERE &nbsp; ✂ ✂ ✂
            </div>

            {/* ================= COPY 2: ATTENDANT REFILL SLIP ================= */}
            <div className="pt-1 pb-2 text-center border-b border-dashed border-gray-400">
              <div className="text-[12px] font-black uppercase tracking-wider bg-black text-white py-1 rounded">
                DISPENSER REFILL SLIP
              </div>
              <div className="mt-1 text-[10px] text-gray-600">{station?.name}</div>
            </div>

            <div className="my-2 p-2 bg-gray-100 border border-gray-300 rounded text-center">
              <div className="text-[10px] uppercase font-bold text-gray-600">TOKEN CODE:</div>
              <div className="text-[24px] font-black tracking-widest text-black my-0.5">{order.tokenCode}</div>
              <div className="text-[10px] text-gray-500">Order: {order.orderNumber}</div>
            </div>

            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-gray-400">
              <div className="flex justify-between text-[14px] font-extrabold bg-yellow-100 p-1 border border-yellow-300 rounded">
                <span>TARGET REFILL:</span>
                <span className="text-[16px] underline">{order.kgRequested} KG</span>
              </div>
              <div className="flex justify-between">
                <span>Cylinder:</span>
                <span className="font-bold">{order.cylinderType}</span>
              </div>
              <div className="flex justify-between">
                <span>Assigned Pump:</span>
                <span className="font-bold">{order.pump}</span>
              </div>
              <div className="flex justify-between">
                <span>Attendant:</span>
                <span>{order.attendantName}</span>
              </div>
              <div className="flex justify-between">
                <span>Time Stamp:</span>
                <span>{formattedTime}</span>
              </div>
            </div>

            <div className="pt-3 pb-1 text-[10px] space-y-2">
              <div className="border-t border-gray-400 pt-1 flex justify-between text-[9px] text-gray-500">
                <span>Attendant Signature / Stamp:</span>
                <span className="border-b border-black w-24"></span>
              </div>
              <div className="text-center text-[9px] text-gray-500 italic">
                * Check cylinder for leakage / collar safety before dispensing *
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/25 transition active:scale-[0.98]"
          >
            <Printer className="w-5 h-5" />
            <span>Print Dual Receipts (80mm / 58mm)</span>
          </button>
          
          <button
            onClick={() => {
              if (onNewSale) onNewSale();
              onClose();
            }}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-5 rounded-xl border border-slate-700 transition"
          >
            <span>Next Customer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
