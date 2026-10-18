import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SigmaStoreProvider, useSigmaStore } from './store/SigmaStore';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { CustomersListing } from './pages/customers/CustomersListing';
import { CustomersAdd } from './pages/customers/CustomersAdd';
import { LiveConnections } from './pages/customers/LiveConnections';
import { RenewalAssistant } from './pages/customers/RenewalAssistant';
import { CustomersStatistics } from './pages/customers/CustomersStatistics';
import { CustomersMigration } from './pages/customers/CustomersMigration';
import { CustomersDeleted } from './pages/customers/CustomersDeleted';
import { ResellersListing } from './pages/resellers/ResellersListing';
import { ResellersAdd } from './pages/resellers/ResellersAdd';
import { CreditTransactions } from './pages/resellers/CreditTransactions';
import { MonthlyBillingPage } from './pages/billing/MonthlyBillingPage';
import { SupportTickets } from './pages/SupportTickets';
import { AccountSecurity } from './pages/AccountSecurity';
import { ActiveSessions } from './pages/ActiveSessions';
import { AccountSettings } from './pages/AccountSettings';

import { BrandSettings } from './pages/settings/BrandSettings';
import { CustomDomainPage } from './pages/settings/CustomDomainPage';
import { PublicRenewPage } from './pages/public/PublicRenewPage';
import { WhatsAppBotPage } from './pages/automation/WhatsAppBotPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { ResellerCostPage } from './pages/billing/ResellerCostPage';
import { APP_CONFIG, applyBrandStyles, updateAppConfig, getBrandApiEndpoints } from './config/appConfig';
import { MasterKeyStore } from './utils/auth';
import { ErrorBoundary } from './components/ErrorBoundary';

const DemoRoute: React.FC = () => {
  const { enterDemoMode } = useSigmaStore();
  React.useEffect(() => {
    enterDemoMode();
  }, [enterDemoMode]);
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  React.useEffect(() => {
    // 1. Aplica estilos iniciais da marca e título da página
    applyBrandStyles(APP_CONFIG);
    if (typeof document !== 'undefined' && APP_CONFIG.appName) {
      document.title = APP_CONFIG.appName;
    }

    // 2. Busca personalização atualizada diretamente da API central com isolamento de franquia
    const loadBrandFromApi = async () => {
      const endpoints = getBrandApiEndpoints('/api/v1/brand-settings');
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.brand) {
              if (data.ownerUsername || data.brand?.ownerUsername) {
                const owner = String(data.ownerUsername || data.brand.ownerUsername).trim().toLowerCase();
                localStorage.setItem('sigma_franchise_owner', owner);
                (window as any).__APP_CONFIG__ = { ...((window as any).__APP_CONFIG__ || {}), franchiseOwner: owner };
                data.brand.franchiseOwner = owner;
              }
              updateAppConfig(data.brand);
              break;
            }
          }
        } catch {}
      }
    };

    loadBrandFromApi();
  }, []);

  return (
    <ErrorBoundary>
      <SigmaStoreProvider>
        <HashRouter>
          <Routes>
            {/* Setup inicial (se já configurado no .env, redireciona direto para login) */}
            <Route
              path="/setup"
              element={MasterKeyStore.isConfiguredViaEnv() ? <Navigate to="/login" replace /> : <SetupPage />}
            />

            {/* Login público com usuário e senha */}
            <Route path="/login" element={<LoginPage />} />
            {/* Rota direta para entrar no Modo Demonstração */}
            <Route path="/demo" element={<DemoRoute />} />
            {/* Auto-Renovação Pública (Sem login) via link enviado ao cliente */}
            <Route path="/renew/:username" element={<PublicRenewPage />} />
            <Route path="/renew/reseller/:username" element={<PublicRenewPage />} />

            {/* Protected Routes (acessíveis apenas após login) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="automation" element={<Navigate to="/automation/whatsapp" replace />} />
                <Route path="automation/whatsapp" element={<WhatsAppBotPage defaultTab="slots" />} />
                <Route path="automation/flow" element={<WhatsAppBotPage defaultTab="flow" />} />
                <Route path="automation/promotions" element={<WhatsAppBotPage defaultTab="promotions" />} />
                <Route path="automation/gateways" element={<WhatsAppBotPage defaultTab="gateways" />} />
                <Route path="automation/broadcast" element={<WhatsAppBotPage defaultTab="broadcast" />} />
                <Route path="automation/test" element={<WhatsAppBotPage defaultTab="test" />} />
                <Route path="notices" element={<AnnouncementsPage />} />
                <Route path="settings/brand" element={<BrandSettings />} />
                <Route path="settings/modal" element={<BrandSettings defaultTab="modal" />} />
                <Route path="settings/client-modal" element={<BrandSettings defaultTab="modal" />} />
                <Route path="settings/domain" element={<CustomDomainPage />} />
                <Route path="settings/upstream-dns" element={<Navigate to="/dashboard" replace />} />
                <Route path="settings/servers" element={<Navigate to="/dashboard" replace />} />
                <Route path="billing/cost" element={<ResellerCostPage />} />
                <Route path="support-tickets" element={<SupportTickets />} />
                <Route path="account" element={<AccountSettings />} />
                <Route path="account-settings" element={<AccountSettings />} />
                <Route path="account/settings" element={<AccountSettings />} />
                <Route path="account-security" element={<AccountSecurity />} />
                <Route path="account/security" element={<AccountSecurity />} />
                <Route path="profile" element={<AccountSettings />} />
                <Route path="active-sessions" element={<ActiveSessions />} />

                {/* Customers Routes */}
                <Route path="customers" element={<CustomersListing />} />
                <Route path="customers/add" element={<CustomersAdd />} />
                <Route path="customers/live-connections" element={<LiveConnections />} />
                <Route path="customers/renewal-assistant" element={<RenewalAssistant />} />
                <Route path="customers/statistics" element={<CustomersStatistics />} />
                <Route path="customers/migration" element={<CustomersMigration />} />
                <Route path="customers/deleted" element={<CustomersDeleted />} />

                {/* Resellers Routes */}
                <Route path="resellers" element={<ResellersListing />} />
                <Route path="resellers/add" element={<ResellersAdd />} />
                <Route path="resellers/credit-transactions" element={<CreditTransactions />} />
                <Route path="resellers/referral-link" element={<AccountSettings />} />
                <Route path="resellers/renew-membership" element={<RenewalAssistant />} />
                <Route path="resellers/billing" element={<MonthlyBillingPage />} />
                <Route path="billing" element={<MonthlyBillingPage />} />
                <Route path="billing/monthly" element={<MonthlyBillingPage />} />
                <Route path="billing/credit-orders" element={<CreditTransactions />} />
              </Route>
            </Route>

            {/* Fallback para login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </SigmaStoreProvider>
    </ErrorBoundary>
  );
};

export default App;
