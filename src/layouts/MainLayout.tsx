import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { Sidebar } from '../components/Sidebar';
import { LayoutDashboard, Users, UserCheck, Zap, Menu } from 'lucide-react';
import { QuickTestModal } from '../components/modals/QuickTestModal';
import { FranchiseOnboardingModal } from '../components/modals/FranchiseOnboardingModal';
import { APP_CONFIG, useBrandConfig, getColorMode } from '../config/appConfig';

export const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickTestOpen, setQuickTestOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const location = useLocation();
  const brand = useBrandConfig();
  const isXtream = brand.themeStyle === 'xtream-classic';
  const isLight = getColorMode(brand) === 'light';

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Onboarding apenas sob demanda manual, sem popup intrusivo
  useEffect(() => {
    setOnboardingOpen(false);
  }, []);

  return (
    <div
      className={`min-h-screen flex font-sans relative transition-colors ${
        isLight ? 'text-[#2c3e50]' : 'text-white'
      }`}
      style={{ backgroundColor: 'var(--theme-bg, #0F1014)' }}
    >
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 md:hidden transition-opacity animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Desktop Static + Mobile Drawer */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-w-0 transition-colors"
        style={{ backgroundColor: 'var(--theme-bg, #0F1014)' }}
      >
        {/* On desktop, hide standard Topbar in Xtream Classic mode to match reference screenshot */}
        <div className={isXtream ? 'md:hidden' : ''}>
          <Topbar onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />
        </div>
        <main className={`flex-1 p-3 sm:p-4 md:p-6 pb-20 md:pb-6 w-full max-w-[1600px] mx-auto overflow-x-hidden ${
          isLight ? 'text-[#2c3e50]' : ''
        }`}>
          <Outlet />
        </main>
      </div>

      {/* Modal de Onboarding Automático de 1º Acesso */}
      <FranchiseOnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onCompleted={() => setOnboardingOpen(false)}
      />

      {/* Mobile Bottom Dock Navigation Bar (Minimalist, Clean, 1-Thumb touch navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0E1015]/95 backdrop-blur-md border-t border-[#1C1F2B] px-3 py-1 flex items-center justify-between select-none">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#009EF7]' : 'text-[#7E8299] hover:text-white'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Início</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#009EF7]' : 'text-[#7E8299] hover:text-white'
            }`
          }
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Clientes</span>
        </NavLink>

        {/* Quick Test Touch Button */}
        <button
          type="button"
          onClick={() => setQuickTestOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium text-[#009EF7] hover:text-white transition-colors"
          title="Criar Teste Rápido"
        >
          <Zap className="w-4 h-4 mb-0.5 text-[#009EF7]" />
          <span>Teste</span>
        </button>

        <NavLink
          to="/resellers"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#009EF7]' : 'text-[#7E8299] hover:text-white'
            }`
          }
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span>Revendas</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium text-[#7E8299] hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Global Quick Test Modal reachable from mobile bottom dock */}
      <QuickTestModal isOpen={quickTestOpen} onClose={() => setQuickTestOpen(false)} />
    </div>
  );
};
