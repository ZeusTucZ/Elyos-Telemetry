import React from 'react';
import { Routes, Route } from 'react-router-dom';

import DashboardPage from './pages/Dashboard';
import SessionsPage from './pages/Sessions';
import PilotsPage from './pages/Pilots';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <div className="bg-[#0A0F1C] min-h-screen">
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/pilots" element={<PilotsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </div>
  );
}

export default App;
