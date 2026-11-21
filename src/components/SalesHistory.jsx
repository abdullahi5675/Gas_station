import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Printer, 
  Download, 
  Filter, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Calendar,
  CheckCircle2,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export default function SalesHistory({ onSelectOrderForReceipt }) {
  const [orders, setOrders] = useState([]);
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders?limit=100');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Error fetching sales history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesMethod = filterMethod === 'ALL' || o.paymentMethod === filterMethod;
    const matchesDate = !dateFilter || o.createdAt.startsWith(dateFilter);
    const matchesSearch = !searchTerm ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.tokenCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.attendantName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMethod && matchesDate && matchesSearch;
  });

  // Calculate Metrics from filtered
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalKg = filteredOrders.reduce((sum, o) => sum + (o.kgRequested || 0), 0);
  const cashTotal = filteredOrders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.totalAmount, 0);
  const posTotal = filteredOrders.filter(o => o.paymentMethod === 'POS_CARD').reduce((sum, o) => sum + o.totalAmount, 0);
  const transferTotal = filteredOrders.filter(o => o.paymentMethod === 'BANK_TRANSFER').reduce((sum, o) => sum + o.totalAmount, 0);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = ["Order Number", "Token", "Date", "Customer", "Cylinder", "KG", "Rate", "Total (NGN)", "Payment Method", "Reference", "Cashier", "Attendant", "Status"];
    const rows = filteredOrders.map(o => [
      o.orderNumber,
      o.tokenCode,
      new Date(o.createdAt).toLocaleString(),
      `"${o.customerName}"`,
      `"${o.cylinderType}"`,
      o.kgRequested,
      o.ratePerKg,
      o.totalAmount,
      o.paymentMethod,
      `"${o.paymentRef || ''}"`,
      `"${o.cashierName || ''}"`,
      `"${o.attendantName || ''}"`,
      o.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LPG_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Title & Quick Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-6 h-6 text-orange-500" />
            <h2 className="font-extrabold text-white text-xl">Sales Ledger & Financial Reports</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete transaction history, payment method breakdown (Cash vs POS vs Transfer) and receipt reprinting.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchOrders}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Total Revenue</span>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono-numbers">
            ₦{totalRevenue.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{filteredOrders.length} transactions recorded</p>
        </div>

        {/* Total KGs Sold */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Total Gas Dispensed</span>
          <div className="text-2xl font-black text-orange-400 mt-1 font-mono-numbers">
            {totalKg.toFixed(1)} <span className="text-sm font-bold">KG</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{(totalKg / 1000).toFixed(2)} Metric Tons</p>
        </div>

        {/* Cash in Hand */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Physical Cash</span>
            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-slate-200 mt-1 font-mono-numbers">
            ₦{cashTotal.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Must be in cashier drawer</p>
        </div>

        {/* Bank & POS Terminals */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">POS & Transfers</span>
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-400 mt-1 font-mono-numbers">
            ₦{(posTotal + transferTotal).toLocaleString()}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
            <span>POS: ₦{posTotal.toLocaleString()}</span>
            <span>Trf: ₦{transferTotal.toLocaleString()}</span>
          </div>
        </div>

      </div>

      {/* Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order #, Token (TKN), Customer or Attendant..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Payment Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Payment:</span>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">All Methods</option>
            <option value="CASH">Cash Only</option>
            <option value="POS_CARD">POS Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-[11px] text-slate-400 hover:text-white underline"
            >
              Clear
            </button>
          )}
        </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order / Token</th>
                <th className="py-3 px-4">Time & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cylinder Spec</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Amount (₦)</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Pump / Attendant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-500 text-xs">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-amber-400 text-sm">{o.tokenCode}</div>
                      <div className="text-[10px] text-slate-500">{o.orderNumber}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      <div>{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{o.customerName}</div>
                      {o.customerPhone && o.customerPhone !== 'N/A' && (
                        <div className="text-[10px] text-slate-500">{o.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">{o.cylinderType}</td>
                    <td className="py-3 px-4 font-black text-white font-mono">{o.kgRequested} KG</td>
                    <td className="py-3 px-4 font-black text-emerald-400 font-mono-numbers text-sm">
                      ₦{o.totalAmount?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        o.paymentMethod === 'CASH'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : o.paymentMethod === 'POS_CARD'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {o.paymentMethod?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{o.pump}</div>
                      <div className="text-[10px] text-slate-500">{o.attendantName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        o.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : o.status === 'DISPENSING'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        <span>{o.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectOrderForReceipt(o)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                        title="Reprint Dual Receipts"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
