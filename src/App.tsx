import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthGuard from './components/AuthGuard';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClinicsPage from './pages/ClinicsPage';
import ClinicDetailPage from './pages/ClinicDetailPage';
import RevenuePage from './pages/RevenuePage';
import SupportPage from './pages/SupportPage';
import SettingsPage from './pages/SettingsPage';
import LeadsPage from './pages/LeadsPage';
import AffiliatesPage from './pages/AffiliatesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthGuard><AdminLayout /></AuthGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clinics" element={<ClinicsPage />} />
          <Route path="clinics/:clinicId" element={<ClinicDetailPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="affiliates" element={<AffiliatesPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
