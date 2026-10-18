/**
 * Configuração Geral do Painel (Totalmente Customizável via .env)
 *
 * Altere as variáveis no arquivo .env para personalizar o nome do painel,
 * logotipo, cores, servidores e credenciais sem precisar mexer no código fonte.
 */

export interface AppConfig {
  // Identidade do Painel
  appName: string;
  appShortName: string;
  appVersion: string;

  // Logotipo
  logoText: string;
  logoIcon: string;
  logoImageUrl: string;
  logoGradientFrom: string;
  logoGradientTo: string;

  // Cores do Tema
  primaryColor: string;
  primaryHoverColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  sidebarColor: string;

  // Conexão com API de Streaming
  apiBaseUrl: string;
  defaultApiKey: string;
  defaultServerName: string;
  defaultBouquetId: string;
  defaultBouquetName: string;

  // Parâmetros Operacionais
  defaultTestHours: number;
  currencySymbol: string;
  supportWhatsApp: string;
  supportTelegram: string;

  // URLs de Player & DNS
  panelUrl: string;
  defaultDns: string;

  // Aplicativos e Recursos da Franquia
  playStoreUrl?: string;
  primaryApkUrl?: string;
  secondaryApkUrl?: string;
  webPlayerUrl?: string;
  appStoreUrl?: string;
  dnsStb?: string;
  announcementText?: string;
  announcementEnabled?: boolean;
  onboardingCompleted?: boolean;
  activePresetId?: string;

  // Credenciais Padrão do Administrador Master (configuradas no .env)
  adminUsername: string;
  adminPassword: string;

  // Aparência Padrão & Temas
  defaultTheme: 'dark' | 'light';
  themeStyle?: 'default' | 'xtream-classic' | 'cyberpunk-neon' | 'stream-purple' | 'minimalist-light';
  brandSlogan?: string;
  faviconUrl?: string;
  customCss?: string;
  sidebarStyle?: 'classic' | 'modern' | 'compact';
  // Layout da barra lateral: 'auto' segue o tema; 'xtream' / 'sigma' forçam o layout independente do tema
  sidebarLayout?: 'auto' | 'xtream' | 'sigma';
  resellersDefaultView?: 'cards' | 'tree';
  cardBorderRadius?: 'sm' | 'md' | 'lg' | 'xl';
  glowEffects?: boolean;
  announcementLevel?: 'info' | 'warning' | 'danger' | 'success';

  // Proprietário legítimo do painel / franquia
  franchiseOwner?: string;

  // Customização de Cores do Xtream Server Clássico
  xtreamPrimaryColor?: string;
  xtreamHeaderColor?: string;
  xtreamSidebarColor?: string;
  xtreamBackgroundColor?: string;
  xtreamCardClientsColor?: string;
  xtreamCardActiveColor?: string;
  xtreamCardExpiredColor?: string;
  xtreamCardTrialColor?: string;
  xtreamCardLiveColor?: string;
  xtreamCardResellersColor?: string;

  // Modos claro/escuro de cada tema e tema da tela de login
  xtreamMode?: 'light' | 'dark';
  xtreamDarkBackgroundColor?: string;
  sigmaMode?: 'light' | 'dark';
  sigmaLightBackgroundColor?: string;
  loginTheme?: 'classic' | 'minimal' | 'split' | 'glass' | 'xtream' | 'vibrant';
}

const env = (import.meta as any).env || {};
const runtimeConfig = (typeof window !== 'undefined' && (window as any).__APP_CONFIG__) || {};
const savedBrand = (() => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('sigma_brand_config') : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

export const APP_CONFIG: AppConfig = {
  // Identidade do Painel
  appName: savedBrand.appName || runtimeConfig.appName || env.VITE_APP_NAME || 'POS TV - Painel de Gestão',
  appShortName: savedBrand.appShortName || runtimeConfig.appShortName || env.VITE_APP_SHORT_NAME || 'POS TV',
  appVersion: runtimeConfig.appVersion || env.VITE_APP_VERSION || '2.5.0',

  // Logotipo
  logoText: savedBrand.logoText || runtimeConfig.logoText || env.VITE_LOGO_TEXT || 'POS TV',
  logoIcon: savedBrand.logoIcon || runtimeConfig.logoIcon || env.VITE_LOGO_ICON || '▶',
  logoImageUrl: (savedBrand.logoImageUrl !== undefined ? savedBrand.logoImageUrl : runtimeConfig.logoImageUrl) || env.VITE_LOGO_IMAGE_URL || '',
  logoGradientFrom: savedBrand.logoGradientFrom || runtimeConfig.logoGradientFrom || env.VITE_LOGO_GRADIENT_FROM || '#E91E63',
  logoGradientTo: savedBrand.logoGradientTo || runtimeConfig.logoGradientTo || env.VITE_LOGO_GRADIENT_TO || '#9C27B0',

  // Cores do Tema
  primaryColor: savedBrand.primaryColor || runtimeConfig.primaryColor || env.VITE_PRIMARY_COLOR || '#009EF7',
  primaryHoverColor: savedBrand.primaryHoverColor || runtimeConfig.primaryHoverColor || env.VITE_PRIMARY_HOVER_COLOR || '#0086D1',
  accentColor: savedBrand.accentColor || runtimeConfig.accentColor || env.VITE_ACCENT_COLOR || '#50CD89',
  backgroundColor: savedBrand.backgroundColor || runtimeConfig.backgroundColor || env.VITE_BACKGROUND_COLOR || '#0F1014',
  cardColor: savedBrand.cardColor || runtimeConfig.cardColor || env.VITE_CARD_COLOR || '#14151C',
  sidebarColor: savedBrand.sidebarColor || runtimeConfig.sidebarColor || env.VITE_SIDEBAR_COLOR || '#111217',

  // Conexão com API de Streaming
  apiBaseUrl: runtimeConfig.apiBaseUrl || env.VITE_FASTCDN_API_URL || 'https://fastcdn.fit',
  defaultApiKey: runtimeConfig.defaultApiKey || env.VITE_DEFAULT_API_KEY || '',
  defaultServerName: runtimeConfig.defaultServerName || env.VITE_DEFAULT_SERVER_NAME || 'Servidor Principal',
  defaultBouquetId: runtimeConfig.defaultBouquetId || env.VITE_DEFAULT_BOUQUET_ID || 'bq_completo',
  defaultBouquetName: runtimeConfig.defaultBouquetName || env.VITE_DEFAULT_BOUQUET_NAME || 'COMPLETO C/ ADULTOS',

  // Parâmetros Operacionais
  defaultTestHours: Number(runtimeConfig.defaultTestHours || env.VITE_DEFAULT_TEST_HOURS || 4),
  currencySymbol: runtimeConfig.currencySymbol || env.VITE_CURRENCY_SYMBOL || 'R$',
  supportWhatsApp: savedBrand.supportWhatsApp || runtimeConfig.supportWhatsApp || env.VITE_SUPPORT_WHATSAPP || '',
  supportTelegram: runtimeConfig.supportTelegram || env.VITE_SUPPORT_TELEGRAM || '',

  // URLs de Player & DNS
  panelUrl: (() => {
    const raw = String(runtimeConfig.panelUrl || '').trim();
    if (raw) return raw.startsWith('http') ? raw : `http://${raw}`;
    const dns = String(runtimeConfig.defaultDns || env.VITE_DEFAULT_DNS || '').trim();
    if (dns) return dns.startsWith('http') ? dns : `http://${dns}`;
    const envPanel = String(env.VITE_PANEL_URL || '').trim();
    if (envPanel) return envPanel.startsWith('http') ? envPanel : `http://${envPanel}`;
    return 'https://fastcdn.fit';
  })(),
  defaultDns: String(runtimeConfig.defaultDns || env.VITE_DEFAULT_DNS || 'fastcdn.fit').trim(),

  // Credenciais Padrão do Administrador Master (opcionais, vazias por padrão)
  adminUsername: runtimeConfig.adminUsername || env.VITE_ADMIN_USERNAME || '',
  adminPassword: runtimeConfig.adminPassword || env.VITE_ADMIN_PASSWORD || '',

  // Aplicativos e Recursos da Franquia
  playStoreUrl: savedBrand.playStoreUrl || runtimeConfig.playStoreUrl || '',
  primaryApkUrl: savedBrand.primaryApkUrl || runtimeConfig.primaryApkUrl || '',
  secondaryApkUrl: savedBrand.secondaryApkUrl || runtimeConfig.secondaryApkUrl || '',
  webPlayerUrl: savedBrand.webPlayerUrl || runtimeConfig.webPlayerUrl || '',
  appStoreUrl: savedBrand.appStoreUrl || runtimeConfig.appStoreUrl || '',
  dnsStb: savedBrand.dnsStb || runtimeConfig.dnsStb || '',
  announcementText: savedBrand.announcementText || runtimeConfig.announcementText || '',
  announcementEnabled: Boolean(savedBrand.announcementEnabled ?? runtimeConfig.announcementEnabled ?? false),
  onboardingCompleted: Boolean(savedBrand.onboardingCompleted ?? runtimeConfig.onboardingCompleted ?? false),
  activePresetId: savedBrand.activePresetId || runtimeConfig.activePresetId || '',

  // Aparência & Customização
  defaultTheme: 'dark',
  themeStyle: (() => {
    try {
      const local = typeof window !== 'undefined' ? localStorage.getItem('sigma_theme_style') : null;
      if (local && ['xtream-classic', 'default', 'cyberpunk-neon', 'stream-purple', 'minimalist-light'].includes(local)) {
        return local as any;
      }
    } catch {}
    return savedBrand.themeStyle || runtimeConfig.themeStyle || env.VITE_THEME_STYLE || 'default';
  })(),
  brandSlogan: savedBrand.brandSlogan || runtimeConfig.brandSlogan || '',
  faviconUrl: savedBrand.faviconUrl || runtimeConfig.faviconUrl || '',
  customCss: savedBrand.customCss || runtimeConfig.customCss || '',
  sidebarStyle: savedBrand.sidebarStyle || runtimeConfig.sidebarStyle || 'classic',
  sidebarLayout: (['auto', 'xtream', 'sigma'].includes(savedBrand.sidebarLayout) ? savedBrand.sidebarLayout : (['auto', 'xtream', 'sigma'].includes(runtimeConfig.sidebarLayout) ? runtimeConfig.sidebarLayout : 'auto')),
  resellersDefaultView: savedBrand.resellersDefaultView || runtimeConfig.resellersDefaultView || 'cards',
  cardBorderRadius: savedBrand.cardBorderRadius || runtimeConfig.cardBorderRadius || 'lg',
  glowEffects: Boolean(savedBrand.glowEffects ?? runtimeConfig.glowEffects ?? true),
  announcementLevel: savedBrand.announcementLevel || runtimeConfig.announcementLevel || 'info',
  franchiseOwner: runtimeConfig.franchiseOwner || savedBrand.franchiseOwner || env.VITE_FRANCHISE_OWNER || '',

  // Cores do Xtream Classic Customizáveis
  xtreamPrimaryColor: savedBrand.xtreamPrimaryColor || runtimeConfig.xtreamPrimaryColor || '#00c0ef',
  xtreamHeaderColor: savedBrand.xtreamHeaderColor || runtimeConfig.xtreamHeaderColor || '#2c3338',
  xtreamSidebarColor: savedBrand.xtreamSidebarColor || runtimeConfig.xtreamSidebarColor || '#20252c',
  xtreamBackgroundColor: savedBrand.xtreamBackgroundColor || runtimeConfig.xtreamBackgroundColor || '#f4f6f9',
  xtreamCardClientsColor: savedBrand.xtreamCardClientsColor || runtimeConfig.xtreamCardClientsColor || '#00c0ef',
  xtreamCardActiveColor: savedBrand.xtreamCardActiveColor || runtimeConfig.xtreamCardActiveColor || '#00a65a',
  xtreamCardExpiredColor: savedBrand.xtreamCardExpiredColor || runtimeConfig.xtreamCardExpiredColor || '#dd4b39',
  xtreamCardTrialColor: savedBrand.xtreamCardTrialColor || runtimeConfig.xtreamCardTrialColor || '#f39c12',
  xtreamCardLiveColor: savedBrand.xtreamCardLiveColor || runtimeConfig.xtreamCardLiveColor || '#0073b7',
  xtreamCardResellersColor: savedBrand.xtreamCardResellersColor || runtimeConfig.xtreamCardResellersColor || '#605ca8',

  // Modos claro/escuro (padrões preservam o visual anterior: Xtream claro, Sigma escuro)
  xtreamMode: (savedBrand.xtreamMode || runtimeConfig.xtreamMode) === 'dark' ? 'dark' : 'light',
  xtreamDarkBackgroundColor: savedBrand.xtreamDarkBackgroundColor || runtimeConfig.xtreamDarkBackgroundColor || '#12151b',
  sigmaMode: (savedBrand.sigmaMode || runtimeConfig.sigmaMode) === 'light' ? 'light' : 'dark',
  sigmaLightBackgroundColor: savedBrand.sigmaLightBackgroundColor || runtimeConfig.sigmaLightBackgroundColor || '#f4f6f9',
  loginTheme: (['classic', 'minimal', 'split', 'glass', 'xtream', 'vibrant'].includes(savedBrand.loginTheme) ? savedBrand.loginTheme : (['classic', 'minimal', 'split', 'glass', 'xtream', 'vibrant'].includes(runtimeConfig.loginTheme) ? runtimeConfig.loginTheme : 'classic'))
};

/** Modo de cor efetivo (claro/escuro) do tema ativo. */
export function getColorMode(cfg: Partial<AppConfig> = APP_CONFIG): 'light' | 'dark' {
  if ((cfg.themeStyle || APP_CONFIG.themeStyle) === 'xtream-classic') {
    return (cfg.xtreamMode ?? APP_CONFIG.xtreamMode) === 'dark' ? 'dark' : 'light';
  }
  return (cfg.sigmaMode ?? APP_CONFIG.sigmaMode) === 'light' ? 'light' : 'dark';
}

export function getThemeStyle(): 'default' | 'xtream-classic' | 'cyberpunk-neon' | 'stream-purple' | 'minimalist-light' {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('sigma_theme_style');
    if (local && ['xtream-classic', 'default', 'cyberpunk-neon', 'stream-purple', 'minimalist-light'].includes(local)) {
      return local as any;
    }
  }
  return APP_CONFIG.themeStyle || 'default';
}

export function setThemeStyle(style: 'default' | 'xtream-classic' | 'cyberpunk-neon' | 'stream-purple' | 'minimalist-light') {
  APP_CONFIG.themeStyle = style;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sigma_theme_style', style);
    } catch {}
    applyBrandStyles(APP_CONFIG);
    window.dispatchEvent(new CustomEvent('brand_config_updated', { detail: APP_CONFIG }));
  }
}

export function isHostedOnGithub(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('github.io') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
}

export function getFranchiseDomain(): string {
  if (typeof window === 'undefined') return '';
  if (runtimeConfig.franchiseDomain) return runtimeConfig.franchiseDomain;
  if (env.VITE_FRANCHISE_DOMAIN) return env.VITE_FRANCHISE_DOMAIN;
  const host = window.location.hostname.toLowerCase();
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }
  return '';
}

export function getBrandApiEndpoints(path = '/api/v1/brand-settings'): string[] {
  const domain = getFranchiseDomain();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const separator = cleanPath.includes('?') ? '&' : '?';
  const pathWithQuery = domain ? `${cleanPath}${separator}domain=${encodeURIComponent(domain)}` : cleanPath;
  const base = (APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit').replace(/\/+$/, '');

  if (isHostedOnGithub()) {
    return [`${base}${pathWithQuery}`];
  }
  return [`/fastcdn-api${pathWithQuery}`, `${base}${pathWithQuery}`];
}

export function applyBrandStyles(cfg: Partial<AppConfig>) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const style = cfg.themeStyle || getThemeStyle();

  root.setAttribute('data-theme-style', style);
  root.classList.remove(
    'theme-xtream-classic',
    'theme-default',
    'theme-cyberpunk-neon',
    'theme-stream-purple',
    'theme-minimalist-light',
    'mode-light',
    'mode-dark'
  );

  if (style === 'xtream-classic') {
    root.classList.add('theme-xtream-classic');
    const xBg = cfg.xtreamBackgroundColor || APP_CONFIG.xtreamBackgroundColor || '#f4f6f9';
    const xSidebar = cfg.xtreamSidebarColor || APP_CONFIG.xtreamSidebarColor || '#20252c';
    const xHeader = cfg.xtreamHeaderColor || APP_CONFIG.xtreamHeaderColor || '#2c3338';
    const xPrimary = cfg.xtreamPrimaryColor || APP_CONFIG.xtreamPrimaryColor || '#00c0ef';
    const xDark = (cfg.xtreamMode ?? APP_CONFIG.xtreamMode) === 'dark';
    const xBgFinal = xDark ? (cfg.xtreamDarkBackgroundColor || APP_CONFIG.xtreamDarkBackgroundColor || '#12151b') : xBg;
    root.classList.add(xDark ? 'mode-dark' : 'mode-light');
    root.style.setProperty('--theme-bg', xBgFinal);
    root.style.setProperty('--theme-card', xDark ? '#1b1f27' : '#ffffff');
    root.style.setProperty('--theme-sidebar', xSidebar);
    root.style.setProperty('--color-sigma-bg', xBgFinal);
    root.style.setProperty('--xtream-primary', xPrimary);
    root.style.setProperty('--xtream-header', xHeader);
    root.style.setProperty('--xtream-sidebar', xSidebar);
  } else if (style === 'minimalist-light') {
    root.classList.add('theme-minimalist-light');
    root.style.setProperty('--theme-bg', '#f8fafc');
    root.style.setProperty('--theme-card', '#ffffff');
    root.style.setProperty('--theme-sidebar', '#ffffff');
    root.style.setProperty('--color-sigma-bg', '#f8fafc');
  } else if (style === 'cyberpunk-neon') {
    root.classList.add('theme-cyberpunk-neon');
    root.style.setProperty('--theme-bg', '#07090e');
    root.style.setProperty('--theme-card', '#0e121d');
    root.style.setProperty('--theme-sidebar', '#0a0d15');
    root.style.setProperty('--color-sigma-bg', '#07090e');
  } else if (style === 'stream-purple') {
    root.classList.add('theme-stream-purple');
    root.style.setProperty('--theme-bg', '#0d0a1a');
    root.style.setProperty('--theme-card', '#151128');
    root.style.setProperty('--theme-sidebar', '#110c22');
    root.style.setProperty('--color-sigma-bg', '#0d0a1a');
  } else {
    root.classList.add('theme-default');
    const sLight = (cfg.sigmaMode ?? APP_CONFIG.sigmaMode) === 'light';
    root.classList.add(sLight ? 'mode-light' : 'mode-dark');
    if (sLight) {
      const lb = cfg.sigmaLightBackgroundColor || APP_CONFIG.sigmaLightBackgroundColor || '#f4f6f9';
      root.style.setProperty('--theme-bg', lb);
      root.style.setProperty('--color-sigma-bg', lb);
      root.style.setProperty('--theme-card', '#ffffff');
      root.style.setProperty('--color-sigma-card', '#ffffff');
      root.style.setProperty('--theme-sidebar', '#ffffff');
    } else {
    if (cfg.backgroundColor) {
      root.style.setProperty('--theme-bg', cfg.backgroundColor);
      root.style.setProperty('--color-sigma-bg', cfg.backgroundColor);
    }
    if (cfg.cardColor) {
      root.style.setProperty('--theme-card', cfg.cardColor);
      root.style.setProperty('--color-sigma-card', cfg.cardColor);
    }
    if (cfg.sidebarColor) {
      root.style.setProperty('--theme-sidebar', cfg.sidebarColor);
    }
    }
  }

  if (cfg.primaryColor) {
    root.style.setProperty('--theme-primary', cfg.primaryColor);
    root.style.setProperty('--color-sigma-primary', cfg.primaryColor);
  }
  if (cfg.primaryHoverColor) {
    root.style.setProperty('--theme-primary-hover', cfg.primaryHoverColor);
    root.style.setProperty('--color-sigma-primaryHover', cfg.primaryHoverColor);
  }
  if (cfg.accentColor) {
    root.style.setProperty('--theme-accent', cfg.accentColor);
    root.style.setProperty('--color-sigma-accent', cfg.accentColor);
  }
  if (cfg.logoGradientFrom) root.style.setProperty('--logo-gradient-from', cfg.logoGradientFrom);
  if (cfg.logoGradientTo) root.style.setProperty('--logo-gradient-to', cfg.logoGradientTo);
  if (cfg.appName) document.title = cfg.appName;

  // Injeção de CSS personalizado
  if (cfg.customCss !== undefined) {
    let styleEl = document.getElementById('sigma-custom-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'sigma-custom-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = cfg.customCss || '';
  }

  // Favicon Dinâmico
  if (cfg.faviconUrl) {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    link.href = cfg.faviconUrl;
  }
}

// Inicia estilos imediatamente para evitar flash de estilo
if (typeof window !== 'undefined') {
  applyBrandStyles(APP_CONFIG);
}

export function updateAppConfig(patch: Partial<AppConfig>) {
  Object.assign(APP_CONFIG, patch);
  try {
    const current = JSON.parse(localStorage.getItem('sigma_brand_config') || '{}');
    localStorage.setItem('sigma_brand_config', JSON.stringify({ ...current, ...patch }));
  } catch {}

  if (typeof window !== 'undefined') {
    (window as any).__APP_CONFIG__ = { ...((window as any).__APP_CONFIG__ || {}), ...patch };
    applyBrandStyles(APP_CONFIG);
    window.dispatchEvent(new CustomEvent('brand_config_updated', { detail: APP_CONFIG }));
  }
}

import { useState, useEffect } from 'react';

export function useBrandConfig(): AppConfig {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('brand_config_updated', handler);
    return () => window.removeEventListener('brand_config_updated', handler);
  }, []);
  return APP_CONFIG;
}
