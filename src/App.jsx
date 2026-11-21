import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PosTerminal from './components/PosTerminal';
import DispenserQueue from './components/DispenserQueue';
import TankInventory from './components/TankInventory';
import SalesHistory from './components/SalesHistory';
import DualReceiptModal from './components/DualReceiptModal';
import SettingsModal from './components/SettingsModal';
import ShiftManager from './components/ShiftManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'dispenser', 'tank', 'history'
  const [overview, setOverview] = useState(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error("Error fetching overview:", err);
    }
  };

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(fetchOverview, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSaleSuccess = (newOrder) => {
    setSelectedOrderForReceipt(newOrder);
    fetchOverview();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        overview={overview}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenShiftModal={() => setShowShiftModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'pos' && (
          <PosTerminal
            overview={overview}
            onSaleSuccess={handleSaleSuccess}
          />
        )}

        {activeTab === 'dispenser' && (
          <DispenserQueue
            onSelectOrderForReceipt={(order) => setSelectedOrderForReceipt(order)}
          />
        )}

        {activeTab === 'tank' && (
          <TankInventory
            overview={overview}
            onRefresh={fetchOverview}
          />
        )}

        {activeTab === 'history' && (
          <SalesHistory
            onSelectOrderForReceipt={(order) => setSelectedOrderForReceipt(order)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{overview?.station?.name || "LPG Plant & Station"} • {overview?.station?.rcNumber}</span>
          <span className="text-[11px] text-slate-600">GasFlow POS v1.0 • Built for Modern Nigerian Cooking Gas Plants</span>
        </div>
      </footer>

      {/* DUAL RECEIPT MODAL (Customer Copy + Dispenser Refill Slip) */}
      {selectedOrderForReceipt && (
        <DualReceiptModal
          order={selectedOrderForReceipt}
          station={overview?.station}
          settings={overview?.settings}
          onClose={() => setSelectedOrderForReceipt(null)}
          onNewSale={() => {
            setSelectedOrderForReceipt(null);
            setActiveTab('pos');
          }}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <SettingsModal
          overview={overview}
          onClose={() => setShowSettingsModal(false)}
          onSettingsUpdated={fetchOverview}
        />
      )}

      {/* SHIFT MANAGER MODAL */}
      {showShiftModal && (
        <ShiftManager
          overview={overview}
          onClose={() => setShowShiftModal(false)}
          onShiftUpdated={fetchOverview}
        />
      )}

    </div>
  );
}
