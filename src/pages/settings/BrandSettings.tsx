import React, { useState, useEffect, useRef } from 'react';
import {
  Palette, Image, Type, RotateCcw, Check, AlertCircle, Globe, Loader2,
  Sparkles, ShieldCheck, Upload, Trash2, Link2, CheckCircle2, FileText,
  Smartphone, Megaphone, HelpCircle, ArrowRight, ExternalLink, Save, Eye,
  Sliders, SunMedium, Code2, Monitor, Layout, MonitorPlay, Zap, Radio,
  Film, Layers, Moon, Sun, Terminal, CheckCircle, ChevronRight, X, Copy
} from 'lucide-react';
import {
  APP_CONFIG, updateAppConfig, getBrandApiEndpoints, getFranchiseDomain,
  applyBrandStyles, getThemeStyle, setThemeStyle, AppConfig
} from '../../config/appConfig';
import { ClientModalTemplateEditor } from './ClientModalTemplateEditor';
import { PRESET_THEMES, PresetTheme } from '../../config/presetThemes';
import { FranchiseOnboardingModal } from '../../components/modals/FranchiseOnboardingModal';
import { isPanelMaster, getPanelMasterUsername } from '../../utils/panelAuth';
import { checkIsDedicatedDemoPanel } from '../../utils/demoData';
import sigmaProDefaultImg from '../../assets/themes/sigma-pro-default.png';
import xtreamClassicDefaultImg from '../../assets/themes/xtream-classic-default.png';
import sidebarSigmaProImg from '../../assets/themes/sidebar-sigma-pro.png';
import sidebarXtreamClassicImg from '../../assets/themes/sidebar-xtream-classic.png';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../../utils/phone';

const getBrandEndpoints = (path: string = '/api/v1/brand-settings') => getBrandApiEndpoints(path);

export interface XtreamColorPreset {
  id: string;
  name: string;
  primary: string;
  header: string;
  sidebar: string;
  cardClients: string;
  cardActive: string;
  cardExpired: string;
  cardTrial: string;
  cardLive: string;
  cardResellers: string;
}

export const XTREAM_COLOR_PRESETS: XtreamColorPreset[] = [
  {
    id: 'classic-cyan',
    name: 'Clássico Cyan (Xtream Padrão)',
    primary: '#00c0ef',
    header: '#2c3338',
    sidebar: '#20252c',
    cardClients: '#00c0ef',
    cardActive: '#00a65a',
    cardExpired: '#dd4b39',
    cardTrial: '#f39c12',
    cardLive: '#0073b7',
    cardResellers: '#605ca8'
  },
  {
    id: 'emerald-server',
    name: 'Emerald Server (Verde)',
    primary: '#10b981',
    header: '#1e282d',
    sidebar: '#182226',
    cardClients: '#10b981',
    cardActive: '#059669',
    cardExpired: '#dc2626',
    cardTrial: '#d97706',
    cardLive: '#0284c7',
    cardResellers: '#7c3aed'
  },
  {
    id: 'royal-blue',
    name: 'Royal Blue (Azul Escuro)',
    primary: '#2563eb',
    header: '#1b2234',
    sidebar: '#141a29',
    cardClients: '#3b82f6',
    cardActive: '#10b981',
    cardExpired: '#ef4444',
    cardTrial: '#f59e0b',
    cardLive: '#2563eb',
    cardResellers: '#6366f1'
  },
  {
    id: 'dark-crimson',
    name: 'Dark Crimson (Rubi Escuro)',
    primary: '#e11d48',
    header: '#2b1c20',
    sidebar: '#201518',
    cardClients: '#e11d48',
    cardActive: '#10b981',
    cardExpired: '#be123c',
    cardTrial: '#f59e0b',
    cardLive: '#0284c7',
    cardResellers: '#9333ea'
  },
  {
    id: 'deep-amethyst',
    name: 'Deep Amethyst (Violeta)',
    primary: '#8b5cf6',
    header: '#231d33',
    sidebar: '#1a1526',
    cardClients: '#8b5cf6',
    cardActive: '#10b981',
    cardExpired: '#ef4444',
    cardTrial: '#f59e0b',
    cardLive: '#0284c7',
    cardResellers: '#6366f1'
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber (Dourado)',
    primary: '#f59e0b',
    header: '#2c2518',
    sidebar: '#211c12',
    cardClients: '#f59e0b',
    cardActive: '#10b981',
    cardExpired: '#ef4444',
    cardTrial: '#d97706',
    cardLive: '#0284c7',
    cardResellers: '#8b5cf6'
  }
];

const VariableTagBadge: React.FC<{ tag: string }> = ({ tag }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        try {
          navigator.clipboard.writeText(tag);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
      title={`Clique para copiar a tag ${tag}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#009EF7]/10 hover:bg-[#009EF7]/20 border border-[#009EF7]/30 text-[10px] font-mono text-[#00E5FF] transition-all cursor-pointer group"
    >
      <span>Tag: <strong className="font-semibold text-white group-hover:text-[#00E5FF]">{tag}</strong></span>
      {copied ? <Check className="w-2.5 h-2.5 text-[#50CD89]" /> : <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />}
    </button>
  );
};

export interface BrandSettingsProps {
  defaultTab?: 'visual' | 'apps' | 'modal' | 'announcement' | 'brand';
}

type TabType = 'themes' | 'branding' | 'colors' | 'apps' | 'modal' | 'announcements' | 'css';

export const BrandSettings: React.FC<BrandSettingsProps> = ({ defaultTab }) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (defaultTab === 'modal') return 'modal';
    if (defaultTab === 'apps') return 'apps';
    if (defaultTab === 'announcement') return 'announcements';
    if (defaultTab === 'brand') return 'branding';
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      if (t === 'modal') return 'modal';
      if (t === 'apps') return 'apps';
      if (t === 'announcement' || t === 'announcements') return 'announcements';
      if (t === 'colors') return 'colors';
      if (t === 'branding') return 'branding';
      if (t === 'css' || t === 'advanced') return 'css';
    } catch {}
    return 'themes';
  });

  const [showAdvancedTabs, setShowAdvancedTabs] = useState(false);

  // Identidade da Marca
  const [appName, setAppName] = useState(APP_CONFIG.appName || 'POS TV - Painel de Gestão');
  const [logoText, setLogoText] = useState(APP_CONFIG.logoText || 'POS TV');
  const [brandSlogan, setBrandSlogan] = useState(APP_CONFIG.brandSlogan || '');
  const [logoImageUrl, setLogoImageUrl] = useState(APP_CONFIG.logoImageUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(APP_CONFIG.faviconUrl || '');
  const [logoIcon, setLogoIcon] = useState(APP_CONFIG.logoIcon || '▶');
  const [gradientFrom, setGradientFrom] = useState(APP_CONFIG.logoGradientFrom || '#009EF7');
  const [gradientTo, setGradientTo] = useState(APP_CONFIG.logoGradientTo || '#7239EA');

  // Cores & Paleta Sigma Pro
  const [primaryColor, setPrimaryColor] = useState(APP_CONFIG.primaryColor || '#009EF7');
  const [primaryHoverColor, setPrimaryHoverColor] = useState(APP_CONFIG.primaryHoverColor || '#0086D1');
  const [accentColor, setAccentColor] = useState(APP_CONFIG.accentColor || '#50CD89');
  const [backgroundColor, setBackgroundColor] = useState(APP_CONFIG.backgroundColor || '#0B0E14');
  const [cardColor, setCardColor] = useState(APP_CONFIG.cardColor || '#121722');
  const [sidebarColor, setSidebarColor] = useState(APP_CONFIG.sidebarColor || '#0F131C');
  const [selectedThemeId, setSelectedThemeId] = useState<string>(APP_CONFIG.activePresetId || 'azul');

  // Cores Customizáveis do Xtream Server Clássico
  const [xtreamPrimaryColor, setXtreamPrimaryColor] = useState(APP_CONFIG.xtreamPrimaryColor || '#00c0ef');
  const [xtreamHeaderColor, setXtreamHeaderColor] = useState(APP_CONFIG.xtreamHeaderColor || '#2c3338');
  const [xtreamSidebarColor, setXtreamSidebarColor] = useState(APP_CONFIG.xtreamSidebarColor || '#20252c');
  const [xtreamCardClientsColor, setXtreamCardClientsColor] = useState(APP_CONFIG.xtreamCardClientsColor || '#00c0ef');
  const [xtreamCardActiveColor, setXtreamCardActiveColor] = useState(APP_CONFIG.xtreamCardActiveColor || '#00a65a');
  const [xtreamCardExpiredColor, setXtreamCardExpiredColor] = useState(APP_CONFIG.xtreamCardExpiredColor || '#dd4b39');
  const [xtreamCardTrialColor, setXtreamCardTrialColor] = useState(APP_CONFIG.xtreamCardTrialColor || '#f39c12');
  const [xtreamCardLiveColor, setXtreamCardLiveColor] = useState(APP_CONFIG.xtreamCardLiveColor || '#0073b7');
  const [xtreamCardResellersColor, setXtreamCardResellersColor] = useState(APP_CONFIG.xtreamCardResellersColor || '#605ca8');
  const [selectedXtreamPreset, setSelectedXtreamPreset] = useState<string>('classic-cyan');
  const [colorSubTab, setColorSubTab] = useState<'sigma' | 'xtream'>('sigma');

  // Tema Engine & Arquitetura
  const [themeStyle, setLocalThemeStyle] = useState<'default' | 'xtream-classic' | 'cyberpunk-neon' | 'stream-purple' | 'minimalist-light'>(getThemeStyle());
  const [sidebarStyle, setSidebarStyle] = useState<'classic' | 'modern' | 'compact'>(APP_CONFIG.sidebarStyle || 'classic');
  const [sidebarLayout, setSidebarLayout] = useState<'auto' | 'xtream' | 'sigma'>(APP_CONFIG.sidebarLayout || 'auto');
  const [xtreamMode, setXtreamMode] = useState<'light' | 'dark'>(APP_CONFIG.xtreamMode === 'dark' ? 'dark' : 'light');
  const [sigmaMode, setSigmaMode] = useState<'light' | 'dark'>(APP_CONFIG.sigmaMode === 'light' ? 'light' : 'dark');
  const [xtreamBackgroundColor, setXtreamBackgroundColor] = useState(APP_CONFIG.xtreamBackgroundColor || '#f4f6f9');
  const [xtreamDarkBackgroundColor, setXtreamDarkBackgroundColor] = useState(APP_CONFIG.xtreamDarkBackgroundColor || '#12151b');
  const [sigmaLightBackgroundColor, setSigmaLightBackgroundColor] = useState(APP_CONFIG.sigmaLightBackgroundColor || '#f4f6f9');
  const [loginTheme, setLoginTheme] = useState<'classic' | 'minimal' | 'split' | 'glass' | 'xtream' | 'vibrant'>(APP_CONFIG.loginTheme || 'classic');
  const [resellersDefaultView, setResellersDefaultView] = useState<'cards' | 'tree'>(APP_CONFIG.resellersDefaultView || 'cards');
  const [cardBorderRadius, setCardBorderRadius] = useState<'sm' | 'md' | 'lg' | 'xl'>(APP_CONFIG.cardBorderRadius || 'lg');
  const [glowEffects, setGlowEffects] = useState<boolean>(APP_CONFIG.glowEffects ?? true);

  // Aplicativos Oficiais
  const [playStoreUrl, setPlayStoreUrl] = useState(APP_CONFIG.playStoreUrl || '');
  const [primaryApkUrl, setPrimaryApkUrl] = useState(APP_CONFIG.primaryApkUrl || '');
  const [secondaryApkUrl, setSecondaryApkUrl] = useState(APP_CONFIG.secondaryApkUrl || '');
  const [webPlayerUrl, setWebPlayerUrl] = useState(APP_CONFIG.webPlayerUrl || '');
  const [appStoreUrl, setAppStoreUrl] = useState(APP_CONFIG.appStoreUrl || '');
  const [dnsStb, setDnsStb] = useState(APP_CONFIG.dnsStb || '');
  const [supportWhatsApp, setSupportWhatsApp] = useState(APP_CONFIG.supportWhatsApp || '');

  // Avisos & Comunicados
  const [announcementText, setAnnouncementText] = useState(APP_CONFIG.announcementText || '');
  const [announcementEnabled, setAnnouncementEnabled] = useState(APP_CONFIG.announcementEnabled || false);
  const [announcementLevel, setAnnouncementLevel] = useState<'info' | 'warning' | 'danger' | 'success'>(APP_CONFIG.announcementLevel || 'info');

  // CSS Personalizado
  const [customCss, setCustomCss] = useState(APP_CONFIG.customCss || '');

  // Estados Operacionais
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [logoTab, setLogoTab] = useState<'upload' | 'url' | 'gradient'>('upload');
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const franchiseDomain = getFranchiseDomain();

  // Carrega as configurações reais diretamente da API da franquia
  useEffect(() => {
    let isMounted = true;
    const loadBrandFromApi = async () => {
      setLoading(true);
      try {
        const endpoints = getBrandEndpoints();
        for (const url of endpoints) {
          try {
            const res = await fetch(url, { headers: { Accept: 'application/json' } });
            if (res.ok) {
              const data = await res.json();
              if (data && data.success && data.brand && isMounted) {
                const b = data.brand;
                if (b.appName) setAppName(b.appName);
                if (b.logoText) setLogoText(b.logoText);
                if (b.brandSlogan !== undefined) setBrandSlogan(b.brandSlogan);
                if (b.logoImageUrl !== undefined) setLogoImageUrl(b.logoImageUrl);
                if (b.faviconUrl !== undefined) setFaviconUrl(b.faviconUrl);
                if (b.logoIcon) setLogoIcon(b.logoIcon);
                if (b.primaryColor) setPrimaryColor(b.primaryColor);
                if (b.primaryHoverColor) setPrimaryHoverColor(b.primaryHoverColor);
                if (b.accentColor) setAccentColor(b.accentColor);
                if (b.logoGradientFrom) setGradientFrom(b.logoGradientFrom);
                if (b.logoGradientTo) setGradientTo(b.logoGradientTo);
                if (b.backgroundColor) setBackgroundColor(b.backgroundColor);
                if (b.cardColor) setCardColor(b.cardColor);
                if (b.sidebarColor) setSidebarColor(b.sidebarColor);
                if (b.activePresetId) setSelectedThemeId(b.activePresetId);
                if (b.themeStyle) {
                  setLocalThemeStyle(b.themeStyle);
                  setThemeStyle(b.themeStyle);
                }
                if (b.sidebarStyle) setSidebarStyle(b.sidebarStyle);
                if (b.sidebarLayout && ['auto', 'xtream', 'sigma'].includes(b.sidebarLayout)) {
                  setSidebarLayout(b.sidebarLayout);
                  updateAppConfig({ sidebarLayout: b.sidebarLayout });
                }
                if (b.resellersDefaultView) setResellersDefaultView(b.resellersDefaultView);
                if (b.cardBorderRadius) setCardBorderRadius(b.cardBorderRadius);
                if (b.glowEffects !== undefined) setGlowEffects(Boolean(b.glowEffects));
                if (b.customCss !== undefined) setCustomCss(b.customCss);

                // Cores do Xtream Classic
                if (b.xtreamPrimaryColor) setXtreamPrimaryColor(b.xtreamPrimaryColor);
                if (b.xtreamHeaderColor) setXtreamHeaderColor(b.xtreamHeaderColor);
                if (b.xtreamSidebarColor) setXtreamSidebarColor(b.xtreamSidebarColor);
                if (b.xtreamCardClientsColor) setXtreamCardClientsColor(b.xtreamCardClientsColor);
                if (b.xtreamCardActiveColor) setXtreamCardActiveColor(b.xtreamCardActiveColor);
                if (b.xtreamCardExpiredColor) setXtreamCardExpiredColor(b.xtreamCardExpiredColor);
                if (b.xtreamCardTrialColor) setXtreamCardTrialColor(b.xtreamCardTrialColor);
                if (b.xtreamCardLiveColor) setXtreamCardLiveColor(b.xtreamCardLiveColor);
                if (b.xtreamCardResellersColor) setXtreamCardResellersColor(b.xtreamCardResellersColor);
                if (b.xtreamMode) setXtreamMode(b.xtreamMode === 'dark' ? 'dark' : 'light');
                if (b.sigmaMode) setSigmaMode(b.sigmaMode === 'light' ? 'light' : 'dark');
                if (b.xtreamBackgroundColor) setXtreamBackgroundColor(b.xtreamBackgroundColor);
                if (b.xtreamDarkBackgroundColor) setXtreamDarkBackgroundColor(b.xtreamDarkBackgroundColor);
                if (b.sigmaLightBackgroundColor) setSigmaLightBackgroundColor(b.sigmaLightBackgroundColor);
                if (b.loginTheme && ['classic', 'minimal', 'split', 'glass', 'xtream', 'vibrant'].includes(b.loginTheme)) setLoginTheme(b.loginTheme);

                // Aplicativos e avisos
                if (b.playStoreUrl !== undefined) setPlayStoreUrl(b.playStoreUrl);
                if (b.primaryApkUrl !== undefined) setPrimaryApkUrl(b.primaryApkUrl);
                if (b.secondaryApkUrl !== undefined) setSecondaryApkUrl(b.secondaryApkUrl);
                if (b.webPlayerUrl !== undefined) setWebPlayerUrl(b.webPlayerUrl);
                if (b.appStoreUrl !== undefined) setAppStoreUrl(b.appStoreUrl);
                if (b.dnsStb !== undefined) setDnsStb(b.dnsStb);
                if (b.supportWhatsApp !== undefined) setSupportWhatsApp(b.supportWhatsApp);
                if (b.announcementText !== undefined) setAnnouncementText(b.announcementText);
                if (b.announcementEnabled !== undefined) setAnnouncementEnabled(Boolean(b.announcementEnabled));
                if (b.announcementLevel) setAnnouncementLevel(b.announcementLevel);

                updateAppConfig(b);
                break;
              }
            }
          } catch {}
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBrandFromApi();
    return () => {
      isMounted = false;
    };
  }, [franchiseDomain]);

  // Upload do Logotipo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ success: false, text: 'Por favor, selecione uma imagem válida (PNG, JPG, SVG, WebP).' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({ success: false, text: 'O tamanho da imagem não pode exceder 10MB.' });
      return;
    }

    setUploadingLogo(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setLogoImageUrl(base64Data);
      applyBrandStyles({ logoImageUrl: base64Data });

      try {
        const masterKey = localStorage.getItem('sigma_active_key') || localStorage.getItem('fastcdn_api_key') || localStorage.getItem('sigma_reseller_key') || localStorage.getItem('sigma_master_key') || APP_CONFIG.defaultApiKey;
        const sessionToken = localStorage.getItem('sigma_session_token') || localStorage.getItem('mediacms_session_token') || localStorage.getItem('token') || '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        };
        if (masterKey) headers['X-API-Key'] = masterKey;
        if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

        const endpoints = getBrandEndpoints('/api/v1/brand-settings/upload-logo');
        for (const url of endpoints) {
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify({ image: base64Data, filename: file.name, domain: getFranchiseDomain() })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.url) {
              setLogoImageUrl(data.url);
              applyBrandStyles({ logoImageUrl: data.url });
              break;
            }
          } catch {}
        }
        setStatusMsg({ success: true, text: 'Logotipo atualizado com sucesso!' });
      } catch (err: any) {
        setStatusMsg({ success: true, text: 'Logotipo carregado localmente.' });
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload do Favicon
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFavicon(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setFaviconUrl(base64Data);
      applyBrandStyles({ faviconUrl: base64Data });
      setUploadingFavicon(false);
      setStatusMsg({ success: true, text: 'Favicon atualizado!' });
    };
    reader.readAsDataURL(file);
  };

  // Aplicação instantânea de preset de cores
  const applyPreset = (preset: PresetTheme) => {
    setSelectedThemeId(preset.id);
    setPrimaryColor(preset.primary);
    setPrimaryHoverColor(preset.primaryHover);
    setAccentColor(preset.accent);
    setGradientFrom(preset.gradientFrom);
    setGradientTo(preset.gradientTo);
    setBackgroundColor(preset.background);
    setCardColor(preset.card);
    setSidebarColor(preset.sidebar);

    applyBrandStyles({
      primaryColor: preset.primary,
      primaryHoverColor: preset.primaryHover,
      accentColor: preset.accent,
      logoGradientFrom: preset.gradientFrom,
      logoGradientTo: preset.gradientTo,
      backgroundColor: preset.background,
      cardColor: preset.card,
      sidebarColor: preset.sidebar
    });

    setStatusMsg({
      success: true,
      text: `Paleta "${preset.name}" aplicada! Clique em "Salvar Personalização" para persistir no servidor.`
    });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Salvar tudo
  const handleSaveAll = async () => {
    setSaving(true);
    setStatusMsg(null);

    const savedTemplate = localStorage.getItem('sigma_client_details_template');
    const cfg: Record<string, any> = {
      appName: appName.trim(),
      appShortName: logoText.trim() || appName.trim(),
      logoText: logoText.trim(),
      brandSlogan: brandSlogan.trim(),
      faviconUrl: faviconUrl.trim(),
      logoImageUrl: logoImageUrl.trim(),
      logoIcon: logoIcon.trim() || '▶',
      primaryColor: primaryColor.trim(),
      primaryHoverColor: primaryHoverColor.trim() || primaryColor.trim(),
      accentColor: accentColor.trim(),
      backgroundColor: backgroundColor.trim(),
      cardColor: cardColor.trim(),
      sidebarColor: sidebarColor.trim(),
      themeStyle: themeStyle,
      sidebarStyle: sidebarStyle,
      sidebarLayout: sidebarLayout,
      resellersDefaultView: resellersDefaultView,
      cardBorderRadius: cardBorderRadius,
      glowEffects: glowEffects,
      customCss: customCss,
      activePresetId: selectedThemeId,
      logoGradientFrom: gradientFrom.trim(),
      logoGradientTo: gradientTo.trim(),
      supportWhatsApp: normalizePhoneNumber(supportWhatsApp),
      playStoreUrl: playStoreUrl.trim(),
      primaryApkUrl: primaryApkUrl.trim(),
      secondaryApkUrl: secondaryApkUrl.trim(),
      webPlayerUrl: webPlayerUrl.trim(),
      appStoreUrl: appStoreUrl.trim(),
      dnsStb: dnsStb.trim(),
      announcementText: announcementText.trim(),
      announcementEnabled: Boolean(announcementEnabled),
      announcementLevel: announcementLevel,
      // Cores do Xtream Classic
      xtreamPrimaryColor: xtreamPrimaryColor.trim(),
      xtreamHeaderColor: xtreamHeaderColor.trim(),
      xtreamSidebarColor: xtreamSidebarColor.trim(),
      xtreamCardClientsColor: xtreamCardClientsColor.trim(),
      xtreamCardActiveColor: xtreamCardActiveColor.trim(),
      xtreamCardExpiredColor: xtreamCardExpiredColor.trim(),
      xtreamCardTrialColor: xtreamCardTrialColor.trim(),
      xtreamCardLiveColor: xtreamCardLiveColor.trim(),
      xtreamCardResellersColor: xtreamCardResellersColor.trim(),
      xtreamBackgroundColor: xtreamBackgroundColor.trim(),
      xtreamDarkBackgroundColor: xtreamDarkBackgroundColor.trim(),
      xtreamMode: xtreamMode,
      sigmaMode: sigmaMode,
      sigmaLightBackgroundColor: sigmaLightBackgroundColor.trim(),
      loginTheme: loginTheme
    };

    if (savedTemplate && savedTemplate.trim().length > 10 && !savedTemplate.includes('atmos') && !savedTemplate.includes('IBOCONTROL')) {
      cfg.clientDetailsTemplate = savedTemplate.trim();
    }

    const isDemoPanelActive = checkIsDedicatedDemoPanel() || (typeof window !== 'undefined' && (localStorage.getItem('sigma_is_demo') === 'true' || localStorage.getItem('sigma_session_user') === 'demo'));

    // Aplica no cliente e no localStorage imediatamente
    localStorage.setItem('sigma_brand_config', JSON.stringify(cfg));
    updateAppConfig(cfg);
    setThemeStyle(themeStyle);
    applyBrandStyles(cfg);

    try {
      const masterKey = localStorage.getItem('sigma_active_key') || localStorage.getItem('fastcdn_api_key') || localStorage.getItem('sigma_reseller_key') || localStorage.getItem('sigma_master_key') || APP_CONFIG.defaultApiKey;
      const sessionToken = localStorage.getItem('sigma_session_token') || localStorage.getItem('mediacms_session_token') || localStorage.getItem('token') || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      };
      if (masterKey) headers['X-API-Key'] = masterKey;
      if (isDemoPanelActive && (!masterKey || masterKey === APP_CONFIG.defaultApiKey)) {
        headers['X-API-Key'] = 'fcdn_live_demo_visual_key';
      }
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const endpoints = getBrandEndpoints();
      let saved = false;
      let errorMsg = '';

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...cfg,
              domain: getFranchiseDomain() || 'demo.sigmast.site',
              isDemo: isDemoPanelActive,
              isDemoPanel: isDemoPanelActive
            })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data && data.success) {
            saved = true;
            if (data.brand) {
              updateAppConfig(data.brand);
            }
            break;
          } else {
            errorMsg = data.message || data.error || `Erro HTTP ${res.status}`;
          }
        } catch (e: any) {
          errorMsg = e.message || 'Falha na conexão com o servidor';
        }
      }

      if (saved) {
        setStatusMsg({ success: true, text: `Todas as configurações foram salvas com sucesso para (${franchiseDomain || 'Painel Demo'})!` });
      } else {
        if (isDemoPanelActive) {
          setStatusMsg({ success: true, text: 'Personalizações visuais salvas e aplicadas com sucesso no Painel Demo!' });
        } else {
          setStatusMsg({ success: false, text: errorMsg || 'Configurações aplicadas e salvas localmente.' });
        }
      }
    } catch (err: any) {
      if (isDemoPanelActive) {
        setStatusMsg({ success: true, text: 'Personalizações salvas no Painel Demo!' });
      } else {
        setStatusMsg({ success: false, text: err.message || 'Erro inesperado ao salvar via API.' });
      }
    } finally {
      setSaving(false);
      setTimeout(() => {
        setStatusMsg(prev => (prev?.success ? null : prev));
      }, 4000);
    }
  };

  const handleReset = async () => {
    if (!confirm('Deseja realmente restaurar os padrões visuais originais desta franquia?')) return;
    setSaving(true);
    setStatusMsg(null);

    const masterKey = localStorage.getItem('sigma_master_key') || localStorage.getItem('sigma_reseller_key') || APP_CONFIG.defaultApiKey;
    const sessionToken = localStorage.getItem('mediacms_session_token') || localStorage.getItem('token') || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (masterKey) headers['X-API-Key'] = masterKey;
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

    const endpoints = getBrandEndpoints();

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'reset', domain: getFranchiseDomain() })
        });
        if (res.ok) break;
      } catch {}
    }

    setSaving(false);
    setStatusMsg({ success: true, text: 'Configurações restauradas com sucesso!' });
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  // BLINDAGEM DE ACESSO: Apenas o Master legítimo deste painel específico pode visualizar ou editar
  const isMaster = isPanelMaster();
  if (!isMaster) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center mt-12 bg-[#14151C] border border-[#232530] rounded-2xl shadow-xl select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-lg shadow-amber-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acesso Exclusivo do Administrador Master</h2>
        <p className="text-xs text-[#92929F] mb-6 leading-relaxed">
          Esta tela de personalização é restrita ao administrador proprietário deste painel (<strong className="text-white">{getPanelMasterUsername()}</strong>).
          Seu usuário atual não possui permissão para alterar as configurações de marca ou temas neste domínio.
        </p>
        <button
          onClick={() => { window.location.hash = '#/dashboard'; }}
          className="px-6 py-2.5 rounded-xl bg-[#009EF7] text-white text-xs font-bold hover:bg-[#0086D1] transition shadow-md cursor-pointer"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none max-w-6xl pb-16 font-sans">
      
      {/* ─── HEADER PRINCIPAL COM STATUS DA FRANQUIA & AÇÕES RÁPIDAS ─── */}
      <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-black text-white tracking-tight">
                Personalizar Painel
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#50CD89]/15 text-[#50CD89] font-bold border border-[#50CD89]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#50CD89] animate-pulse" />
                {franchiseDomain || 'Domínio Ativo'}
              </span>
            </div>
            <p className="text-xs text-[#92929F]">
              Escolha o visual, coloque seu nome e logo, e clique em <strong className="text-white">Salvar</strong>. É só isso!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Botão de Preview em Tempo Real */}
            <button
              type="button"
              onClick={() => setShowLivePreviewModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 shadow-md transition-all cursor-pointer"
              title="Visualizar instantaneamente como a interface fica com as configurações selecionadas"
            >
              <Eye className="w-4 h-4" />
              <span>👁️ Prévia ao Vivo</span>
            </button>

            {/* Assistente Guiado */}
            <button
              type="button"
              onClick={() => setOnboardingModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#FFB800] bg-[#FFB800]/10 hover:bg-[#FFB800]/20 border border-[#FFB800]/30 shadow-md transition-all cursor-pointer"
              title="Abrir o assistente guiado de 3 passos"
            >
              <Sparkles className="w-4 h-4" />
              <span>🪄 Assistente</span>
            </button>

            {/* Salvar Tudo */}
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0086d1] shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Publicando...' : 'Salvar Personalização'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Alerta de Notificação / Status */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 border transition-all animate-fade-in ${
          statusMsg.success
            ? 'bg-[#50CD89]/10 text-[#50CD89] border-[#50CD89]/20'
            : 'bg-[#F1416C]/10 text-[#F1416C] border-[#F1416C]/20'
        }`}>
          {statusMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* ─── BARRA DE NAVEGAÇÃO DE ABAS REMODELADA ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#232530] text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('themes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'themes'
              ? 'bg-[#009EF7] text-white shadow-lg shadow-[#009EF7]/20'
              : 'text-[#92929F] hover:text-white hover:bg-[#14151C] border border-transparent'
          }`}
        >
          <Layout className="w-4 h-4 text-emerald-400" />
          <span>Aparência</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-[#009EF7] text-white shadow-lg shadow-[#009EF7]/20'
              : 'text-[#92929F] hover:text-white hover:bg-[#14151C] border border-transparent'
          }`}
        >
          <Image className="w-4 h-4 text-cyan-400" />
          <span>Nome & Logo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'colors'
              ? 'bg-[#009EF7] text-white shadow-lg shadow-[#009EF7]/20'
              : 'text-[#92929F] hover:text-white hover:bg-[#14151C] border border-transparent'
          }`}
        >
          <Palette className="w-4 h-4 text-amber-400" />
          <span>Cores</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('apps')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'apps'
              ? 'bg-[#009EF7] text-white shadow-lg shadow-[#009EF7]/20'
              : 'text-[#92929F] hover:text-white hover:bg-[#14151C] border border-transparent'
          }`}
        >
          <Smartphone className="w-4 h-4 text-[#50CD89]" />
          <span>Apps</span>
        </button>

        {(showAdvancedTabs || activeTab === 'modal') && (
        <button
          type="button"
          onClick={() => setActiveTab('modal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'modal'
              ? 'bg-[#009EF7] text-white shadow-lg shadow-[#009EF7]/20'
              : 'text-[#92929F] hover:text-white hover:bg-[#14151C] border border-transparent'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Mensagem WhatsApp</span>
        </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'announcements'
              ? 'bg-[#009EF7] text-white shadow-lg shadow-[#009EF7]/20'
              : 'text-[#92929F] hover:text-white hover:bg-[#14151C] border border-transparent'
          }`}
        >
          <Megaphone className="w-4 h-4 text-pink-400" />
          <span>Avisos</span>
        </button>

        {(showAdvancedTabs || activeTab === 'css') && (
        <button
          type="button"
          onClick={() => setActiveTab('css')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'css'
              ? 'bg-[#009EF7] text-white shadow-lg shadow-[#009EF7]/20'
              : 'text-[#92929F] hover:text-white hover:bg-[#14151C] border border-transparent'
          }`}
        >
          <Code2 className="w-4 h-4 text-blue-400" />
          <span>CSS Personalizado</span>
        </button>
        )}

        <button
          type="button"
          onClick={() => setShowAdvancedTabs(v => !v)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold text-[#7E8299] hover:text-white transition-all whitespace-nowrap cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showAdvancedTabs ? 'Ocultar avançado' : 'Opções avançadas'}</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ABA 1: TEMAS & ARQUITETURA DE LAYOUT (MULTI-THEME ENGINE)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-4 shadow-md">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4 text-[#009EF7]" />
                1. Escolha o visual do painel
              </h2>
              <p className="text-xs text-[#92929F] mt-1">
                Clique em um dos modelos abaixo. A mudança aparece na hora.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Tema 1: Xtream Server Clássico */}
              <div
                onClick={() => {
                  setLocalThemeStyle('xtream-classic');
                  setThemeStyle('xtream-classic');
                  setStatusMsg({ success: true, text: 'Tema "Xtream Server Clássico" ativado!' });
                }}
                className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer flex flex-col justify-between ${
                  themeStyle === 'xtream-classic'
                    ? 'bg-[#181C26] border-emerald-500 shadow-xl ring-2 ring-emerald-500'
                    : 'bg-[#0F1014] border-[#232530] hover:border-[#383E54]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Xtream Server Clássico
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                      OFICIAL IPTV
                    </span>
                  </div>

                  {/* Screenshot Real do Tema Xtream Server Clássico */}
                  <div className="w-full h-32 rounded-xl bg-[#f4f6f9] border border-gray-300 overflow-hidden mb-3.5 relative group shadow-inner">
                    <img
                      src={xtreamClassicDefaultImg}
                      alt="Tema Xtream Server Clássico - Padrão"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <p className="text-xs text-[#92929F] leading-relaxed">
                    Design clássico dos servidores Xtream UI: barra de servidor online no topo, menu lateral com pastas, 8 cards de métricas 100% reais, monitor de conexões e aplicativos homologados. Agora 100% personalizável em cores!
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#232530] flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span>{themeStyle === 'xtream-classic' ? '✓ Ativo no Painel' : 'Selecionar Xtream Clássico'}</span>
                  {themeStyle === 'xtream-classic' && <Check className="w-4 h-4" />}
                </div>
              </div>

              {/* Tema 2: Sigma Pro (Clean & Funcional) */}
              <div
                onClick={() => {
                  setLocalThemeStyle('default');
                  setThemeStyle('default');
                  setStatusMsg({ success: true, text: 'Tema "Sigma Pro" ativado!' });
                }}
                className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer flex flex-col justify-between ${
                  themeStyle === 'default'
                    ? 'bg-[#181C26] border-[#009EF7] shadow-xl ring-2 ring-[#009EF7]'
                    : 'bg-[#0F1014] border-[#232530] hover:border-[#383E54]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#009EF7]" />
                      Sigma Pro
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#009EF7]/20 text-[#009EF7] font-bold uppercase tracking-wider">
                      CLEAN SAAS
                    </span>
                  </div>

                  {/* Screenshot Real do Tema Sigma Pro */}
                  <div className="w-full h-32 rounded-xl bg-[#0B0C10] border border-[#1E202B] overflow-hidden mb-3.5 relative group shadow-inner">
                    <img
                      src={sigmaProDefaultImg}
                      alt="Tema Sigma Pro - Padrão"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <p className="text-xs text-[#92929F] leading-relaxed">
                    Visual moderno, clean e de alta produtividade. Superfícies sólidas foscas, bordas refinadas sem degradês pesados ou brilhos exagerados. Rápido, leve e funcional.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#232530] flex items-center justify-between text-xs font-bold text-[#009EF7]">
                  <span>{themeStyle === 'default' ? '✓ Ativo no Painel' : 'Selecionar Sigma Pro'}</span>
                  {themeStyle === 'default' && <Check className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* SEÇÃO: LAYOUT DA BARRA LATERAL (independente do tema) */}
            <div className="pt-6 border-t border-[#1E202B] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layout className="w-4 h-4 text-[#009EF7]" />
                  2. Escolha o menu lateral
                </h3>
                <p className="text-xs text-[#92929F] mt-0.5">
                  Você pode usar o menu de um modelo com o visual do outro. Na dúvida, deixe em Automático.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([
                  { id: 'auto', title: 'Automático', desc: 'Segue o tema ativo (Xtream Clássico → barra Xtream, Sigma Pro → barra Sigma).', tag: 'PADRÃO' },
                  { id: 'xtream', title: 'Barra Xtream Clássica', desc: 'Cabeçalho do servidor, pastas e cores personalizáveis do Xtream em qualquer tema.', tag: 'XTREAM' },
                  { id: 'sigma', title: 'Barra Sigma Pro', desc: 'Menu limpo e fosco com acordeões, em qualquer tema.', tag: 'SIGMA' }
                ] as const).map(opt => {
                  const active = sidebarLayout === opt.id;
                  const previewXtream = opt.id === 'xtream' || (opt.id === 'auto' && themeStyle === 'xtream-classic');
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSidebarLayout(opt.id);
                        updateAppConfig({ sidebarLayout: opt.id });
                        setStatusMsg({ success: true, text: `Barra lateral: ${opt.title}. Clique em Salvar para persistir.` });
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-3 ${
                        active
                          ? 'bg-[#181C26] border-[#009EF7] ring-2 ring-[#009EF7] shadow-xl'
                          : 'bg-[#0F1014] border-[#232530] hover:border-[#383E54]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{opt.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#009EF7]/15 text-[#009EF7] font-bold tracking-wider">{opt.tag}</span>
                      </div>
                      {/* Miniatura da barra com print real */}
                      <div className="h-36 rounded-xl bg-[#0B0C10] border border-[#1E202B] overflow-hidden relative flex items-center justify-center p-1">
                        {opt.id === 'xtream' ? (
                          <img 
                            src={sidebarXtreamClassicImg} 
                            alt="Barra Xtream Clássica" 
                            className="h-full w-full object-cover object-top rounded-lg"
                          />
                        ) : opt.id === 'sigma' ? (
                          <img 
                            src={sidebarSigmaProImg} 
                            alt="Barra Sigma Pro" 
                            className="h-full w-full object-cover object-top rounded-lg"
                          />
                        ) : (
                          <div className="relative w-full h-full rounded-lg overflow-hidden flex">
                            <div className="w-1/2 h-full overflow-hidden border-r border-[#1E202B]">
                              <img 
                                src={sidebarXtreamClassicImg} 
                                alt="Xtream" 
                                className="h-full w-full object-cover object-top"
                              />
                            </div>
                            <div className="w-1/2 h-full overflow-hidden">
                              <img 
                                src={sidebarSigmaProImg} 
                                alt="Sigma" 
                                className="h-full w-full object-cover object-top"
                              />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-1">
                              <span className="text-[9px] uppercase tracking-wider font-semibold text-white/90 bg-black/60 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-xs">
                                Automático
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-[#92929F] leading-relaxed">{opt.desc}</p>
                      <span className="text-xs font-bold text-[#009EF7] flex items-center justify-between">
                        {active ? '✓ Selecionado' : 'Selecionar'}
                        {active && <Check className="w-4 h-4" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO: MODO CLARO / ESCURO DE CADA TEMA */}
            <div className="pt-6 border-t border-[#1E202B] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <SunMedium className="w-4 h-4 text-[#FFB800]" />
                  3. Claro ou escuro?
                </h3>
                <p className="text-xs text-[#92929F] mt-0.5">
                  Cada modelo tem o seu modo claro e escuro. A mudança aparece na hora; clique em Salvar para manter.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  {
                    key: 'xtream', title: 'Xtream Clássico', mode: xtreamMode,
                    set: (m: 'light' | 'dark') => { setXtreamMode(m); updateAppConfig({ xtreamMode: m }); },
                    bgLabel: xtreamMode === 'dark' ? 'Fundo (modo escuro)' : 'Fundo (modo claro)',
                    bg: xtreamMode === 'dark' ? xtreamDarkBackgroundColor : xtreamBackgroundColor,
                    setBg: (v: string) => {
                      if (xtreamMode === 'dark') { setXtreamDarkBackgroundColor(v); updateAppConfig({ xtreamDarkBackgroundColor: v }); }
                      else { setXtreamBackgroundColor(v); updateAppConfig({ xtreamBackgroundColor: v }); }
                    },
                    bgEditable: true
                  },
                  {
                    key: 'sigma', title: 'Sigma Pro', mode: sigmaMode,
                    set: (m: 'light' | 'dark') => { setSigmaMode(m); updateAppConfig({ sigmaMode: m }); },
                    bgLabel: sigmaMode === 'light' ? 'Fundo (modo claro)' : 'Fundo (modo escuro)',
                    bg: sigmaMode === 'light' ? sigmaLightBackgroundColor : backgroundColor,
                    setBg: (v: string) => {
                      if (sigmaMode === 'light') { setSigmaLightBackgroundColor(v); updateAppConfig({ sigmaLightBackgroundColor: v }); }
                      else { setBackgroundColor(v); updateAppConfig({ backgroundColor: v }); }
                    },
                    bgEditable: true
                  }
                ] as const).map(item => (
                  <div key={item.key} className="p-4 bg-[#0F1014] border border-[#232530] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{item.title}</span>
                      <span className="text-[10px] text-[#7E8299]">{item.mode === 'dark' ? 'Escuro ativo' : 'Claro ativo'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => item.set('light')}
                        className={`py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          item.mode === 'light' ? 'bg-[#f4f6f9] text-[#1e293b] border-[#009EF7] ring-2 ring-[#009EF7]' : 'bg-[#14151C] text-[#92929F] border-[#232530] hover:border-[#383E54]'
                        }`}
                      >
                        <Sun className="w-4 h-4" /> Claro
                      </button>
                      <button
                        type="button"
                        onClick={() => item.set('dark')}
                        className={`py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          item.mode === 'dark' ? 'bg-[#1b1f27] text-white border-[#009EF7] ring-2 ring-[#009EF7]' : 'bg-[#14151C] text-[#92929F] border-[#232530] hover:border-[#383E54]'
                        }`}
                      >
                        <Moon className="w-4 h-4" /> Escuro
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[#92929F]">{item.bgLabel}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={item.bg}
                          onChange={e => item.setBg(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <span className="font-mono text-[11px] text-white">{item.bg}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO: TEMA DA TELA DE LOGIN */}
            <div className="pt-6 border-t border-[#1E202B] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[#50CD89]" />
                  4. Tela de login
                </h3>
                <p className="text-xs text-[#92929F] mt-0.5">
                  Escolha como a tela de entrada aparece. Ela usa automaticamente a sua logo e as suas cores.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {([
                  { id: 'classic', name: 'Clássico', desc: 'Escuro com cartão central', pageBg: '#0F1014', cardBg: '#14151C', light: false },
                  { id: 'minimal', name: 'Minimalista', desc: 'Claro e limpo', pageBg: '#f4f6f9', cardBg: '#ffffff', light: true },
                  { id: 'split', name: 'Dividido', desc: 'Marca de um lado, login do outro', pageBg: '#0F1014', cardBg: 'transparent', light: false },
                  { id: 'glass', name: 'Vidro', desc: 'Translúcido com brilho de cor', pageBg: '#0F1014', cardBg: 'rgba(255,255,255,0.08)', light: false },
                  { id: 'xtream', name: 'Xtream', desc: 'Barra colorida no topo', pageBg: '#f4f6f9', cardBg: '#ffffff', light: true },
                  { id: 'vibrant', name: 'Vibrante', desc: 'Degradê da marca com cartão branco', pageBg: '#4c2a85', cardBg: '#ffffff', light: true }
                ] as const).map(opt => {
                  const active = loginTheme === opt.id;
                  const accentPreview = themeStyle === 'xtream-classic' ? xtreamPrimaryColor : primaryColor;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setLoginTheme(opt.id);
                        updateAppConfig({ loginTheme: opt.id });
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                        active ? 'bg-[#181C26] border-[#009EF7] ring-2 ring-[#009EF7]' : 'bg-[#0F1014] border-[#232530] hover:border-[#383E54]'
                      }`}
                    >
                      <div className="h-20 rounded-lg overflow-hidden relative flex items-center justify-center" style={{ backgroundColor: opt.pageBg }}>
                        {opt.id === 'split' && <div className="absolute inset-y-0 left-0 w-1/2" style={{ backgroundColor: accentPreview }} />}
                        {opt.id === 'glass' && <div className="absolute -top-4 -left-4 w-14 h-14 rounded-full blur-xl opacity-60" style={{ backgroundColor: accentPreview }} />}
                        {opt.id === 'xtream' && <div className="absolute top-0 inset-x-0 h-3" style={{ backgroundColor: xtreamHeaderColor, borderBottom: `2px solid ${accentPreview}` }} />}
                        <div
                          className={`relative z-10 w-12 rounded-md p-1.5 space-y-1 border ${opt.id === 'split' ? 'ml-auto mr-2' : ''}`}
                          style={{ backgroundColor: opt.cardBg, borderColor: opt.light ? '#e2e8f0' : 'rgba(255,255,255,0.12)' }}
                        >
                          <div className="h-1 rounded-xs" style={{ backgroundColor: opt.light ? '#cbd5e1' : '#2a2d3a' }} />
                          <div className="h-1 rounded-xs" style={{ backgroundColor: opt.light ? '#cbd5e1' : '#2a2d3a' }} />
                          <div className="h-1.5 rounded-xs" style={{ backgroundColor: accentPreview }} />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white flex items-center justify-between">
                          {opt.name}
                          {active && <Check className="w-3.5 h-3.5 text-[#009EF7]" />}
                        </span>
                        <span className="text-[10px] text-[#7E8299] leading-tight block mt-0.5">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#7E8299]">
                Dica: depois de salvar, abra o painel em uma aba anônima para ver a tela de login.
              </p>
            </div>

            <details className="pt-6 border-t border-[#1E202B] group">
              <summary className="cursor-pointer text-sm font-bold text-white list-none flex items-center gap-2 mb-5">
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-[#00c0ef]" />
                🎨 Cores do Xtream Clássico
                <span className="text-[11px] font-normal text-[#92929F]">(clique para escolher uma paleta pronta ou ajustar)</span>
              </summary>
            {/* SEÇÃO DEDICADA: PERSONALIZAÇÃO DE CORES DO XTREAM SERVER CLÁSSICO */}
            <div className="space-y-5">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#00c0ef]" />
                    Personalização de Cores do Xtream Server Clássico
                  </h3>
                  <p className="text-xs text-[#92929F] mt-0.5">
                    Modifique as cores da barra superior, barra lateral e cada um dos 8 cards de métricas do tema clássico.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const classic = XTREAM_COLOR_PRESETS[0];
                    setXtreamPrimaryColor(classic.primary);
                    setXtreamHeaderColor(classic.header);
                    setXtreamSidebarColor(classic.sidebar);
                    setXtreamCardClientsColor(classic.cardClients);
                    setXtreamCardActiveColor(classic.cardActive);
                    setXtreamCardExpiredColor(classic.cardExpired);
                    setXtreamCardTrialColor(classic.cardTrial);
                    setXtreamCardLiveColor(classic.cardLive);
                    setXtreamCardResellersColor(classic.cardResellers);
                    setSelectedXtreamPreset('classic-cyan');
                    setStatusMsg({ success: true, text: 'Cores padrão do Xtream restauradas!' });
                    setTimeout(() => setStatusMsg(null), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#232530] bg-[#0F1014] hover:bg-[#1A1D27] text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer w-fit"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restaurar Padrão Xtream</span>
                </button>
              </div>

              {/* Paletas Prontas de 1-Clique para Xtream */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-white">Paletas Prontas para Xtream (1-Clique):</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {XTREAM_COLOR_PRESETS.map(preset => {
                    const isSelected = selectedXtreamPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedXtreamPreset(preset.id);
                          setXtreamPrimaryColor(preset.primary);
                          setXtreamHeaderColor(preset.header);
                          setXtreamSidebarColor(preset.sidebar);
                          setXtreamCardClientsColor(preset.cardClients);
                          setXtreamCardActiveColor(preset.cardActive);
                          setXtreamCardExpiredColor(preset.cardExpired);
                          setXtreamCardTrialColor(preset.cardTrial);
                          setXtreamCardLiveColor(preset.cardLive);
                          setXtreamCardResellersColor(preset.cardResellers);
                          setStatusMsg({ success: true, text: `Paleta "${preset.name}" aplicada ao Xtream!` });
                          setTimeout(() => setStatusMsg(null), 2500);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#181C26] border-[#00c0ef] ring-1 ring-[#00c0ef]'
                            : 'bg-[#0F1014] border-[#232530] hover:border-[#383E54]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: preset.primary }} />
                          <span className="w-3 h-3 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: preset.header }} />
                          <span className="w-3 h-3 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: preset.sidebar }} />
                        </div>
                        <span className="text-[11px] font-bold text-white truncate block">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ajuste Fino de Cada Cor do Xtream */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs pt-1">
                {/* 1. Cor Primária / Destaque Xtream */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Cor Primária Xtream (Destaques)</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamPrimaryColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamPrimaryColor}
                      onChange={e => setXtreamPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamPrimaryColor}
                      onChange={e => setXtreamPrimaryColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* 2. Barra Superior / Topbar */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Barra Superior / Topbar Servidor</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamHeaderColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamHeaderColor}
                      onChange={e => setXtreamHeaderColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamHeaderColor}
                      onChange={e => setXtreamHeaderColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* 3. Fundo da Barra Lateral */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Fundo da Barra Lateral Xtream</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamSidebarColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamSidebarColor}
                      onChange={e => setXtreamSidebarColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamSidebarColor}
                      onChange={e => setXtreamSidebarColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* 4. Card Clientes Cadastrados */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Card Clientes Cadastrados</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamCardClientsColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamCardClientsColor}
                      onChange={e => setXtreamCardClientsColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamCardClientsColor}
                      onChange={e => setXtreamCardClientsColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* 5. Card Clientes Ativos */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Card Clientes Ativos</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamCardActiveColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamCardActiveColor}
                      onChange={e => setXtreamCardActiveColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamCardActiveColor}
                      onChange={e => setXtreamCardActiveColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* 6. Card Clientes Vencidos */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Card Clientes Vencidos</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamCardExpiredColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamCardExpiredColor}
                      onChange={e => setXtreamCardExpiredColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamCardExpiredColor}
                      onChange={e => setXtreamCardExpiredColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* 7. Card Testes Rápidos */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Card Testes Rápidos</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamCardTrialColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamCardTrialColor}
                      onChange={e => setXtreamCardTrialColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamCardTrialColor}
                      onChange={e => setXtreamCardTrialColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* 8. Card Conexões Ao Vivo */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Card Conexões Ao Vivo</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamCardLiveColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamCardLiveColor}
                      onChange={e => setXtreamCardLiveColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamCardLiveColor}
                      onChange={e => setXtreamCardLiveColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* 9. Card Revendedores */}
                <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                  <label className="text-[#92929F] font-medium flex items-center justify-between">
                    <span>Card Revendedores</span>
                    <span className="font-mono text-[11px] text-white font-bold">{xtreamCardResellersColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={xtreamCardResellersColor}
                      onChange={e => setXtreamCardResellersColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={xtreamCardResellersColor}
                      onChange={e => setXtreamCardResellersColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
            </details>

            <details className="pt-4 border-t border-[#1E202B] group">
              <summary className="cursor-pointer text-xs font-bold text-[#92929F] hover:text-white list-none flex items-center gap-2 mb-4">
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                Mais ajustes (opcional)
              </summary>
            {/* Ajustes Específicos do Tema Selecionado */}
            <div className="pt-4 border-t border-[#1E202B] space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#009EF7]" />
                Comportamento & Particularidades do Tema ({themeStyle})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Visualização de Revendas */}
                <div className="p-3.5 bg-[#0F1014] border border-[#232530] rounded-xl space-y-2">
                  <label className="font-semibold text-white block">Visualização Padrão de Revendas</label>
                  <p className="text-[11px] text-[#7E8299]">Como a tela de revendas é exibida inicialmente</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setResellersDefaultView('cards')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        resellersDefaultView === 'cards'
                          ? 'bg-[#009EF7] text-white border-[#009EF7]'
                          : 'bg-[#14151C] text-[#92929F] border-[#232530]'
                      }`}
                    >
                      Cards Modernos
                    </button>
                    <button
                      type="button"
                      onClick={() => setResellersDefaultView('tree')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        resellersDefaultView === 'tree'
                          ? 'bg-[#009EF7] text-white border-[#009EF7]'
                          : 'bg-[#14151C] text-[#92929F] border-[#232530]'
                      }`}
                    >
                      Árvore Tradicional
                    </button>
                  </div>
                </div>

                {/* Estilo da Barra Lateral */}
                <div className="p-3.5 bg-[#0F1014] border border-[#232530] rounded-xl space-y-2">
                  <label className="font-semibold text-white block">Estilo da Barra Lateral</label>
                  <p className="text-[11px] text-[#7E8299]">Formato dos menus e categorias no desktop</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSidebarStyle('classic')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        sidebarStyle === 'classic'
                          ? 'bg-[#009EF7] text-white border-[#009EF7]'
                          : 'bg-[#14151C] text-[#92929F] border-[#232530]'
                      }`}
                    >
                      Pastas / Clássica
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarStyle('modern')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        sidebarStyle === 'modern'
                          ? 'bg-[#009EF7] text-white border-[#009EF7]'
                          : 'bg-[#14151C] text-[#92929F] border-[#232530]'
                      }`}
                    >
                      Moderna Flutuante
                    </button>
                  </div>
                </div>

                {/* Arredondamento dos Cards */}
                <div className="p-3.5 bg-[#0F1014] border border-[#232530] rounded-xl space-y-2">
                  <label className="font-semibold text-white block">Arredondamento dos Cards (Bordas)</label>
                  <p className="text-[11px] text-[#7E8299]">Raio de curvatura das caixas do sistema</p>
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {(['sm', 'md', 'lg', 'xl'] as const).map(radius => (
                      <button
                        key={radius}
                        type="button"
                        onClick={() => setCardBorderRadius(radius)}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                          cardBorderRadius === radius
                            ? 'bg-[#009EF7] text-white border-[#009EF7]'
                            : 'bg-[#14151C] text-[#92929F] border-[#232530]'
                        }`}
                      >
                        {radius.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </details>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ABA 2: MARCA & LOGOTIPO (BRANDING SUITE)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          {/* Card: Nomes da Marca */}
          <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-4 shadow-md">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Type className="w-4 h-4 text-[#009EF7]" />
                Identidade & Nomes do Painel
              </h2>
              <p className="text-xs text-[#92929F] mt-1">
                Defina como a sua franquia se apresenta na tela de login, título do navegador, menus e rodapé.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs text-[#92929F] mb-1.5 font-medium">
                  Nome Completo do Painel <span className="text-[#5E6278]">(Aba & Login)</span>
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={e => setAppName(e.target.value)}
                  placeholder="Ex.: TV FAST - Painel de Gestão"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-[#92929F] mb-1.5 font-medium">
                  Nome Curto / Sigla <span className="text-[#5E6278]">(Menu & Topo)</span>
                </label>
                <input
                  type="text"
                  value={logoText}
                  onChange={e => setLogoText(e.target.value)}
                  placeholder="Ex.: TV FAST"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs text-[#92929F] mb-1.5 font-medium">
                  Slogan / Subtítulo <span className="text-[#5E6278]">(Exibido no Dashboard)</span>
                </label>
                <input
                  type="text"
                  value={brandSlogan}
                  onChange={e => setBrandSlogan(e.target.value)}
                  placeholder="Ex.: O streaming mais veloz do Brasil"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card: Logotipo Principal */}
          <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Image className="w-4 h-4 text-cyan-400" />
                  Logotipo Oficial da Marca
                </h2>
                <p className="text-xs text-[#92929F] mt-0.5">
                  Suba o arquivo da sua marca ou configure um emblema estilizado com gradiente de cores.
                </p>
              </div>

              {/* Seletor de Modo */}
              <div className="flex items-center bg-[#0F1014] border border-[#232530] rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setLogoTab('upload')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                    logoTab === 'upload' ? 'bg-[#009EF7] text-white shadow-xs' : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Upload de Arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setLogoTab('url')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                    logoTab === 'url' ? 'bg-[#009EF7] text-white shadow-xs' : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Link Externo (URL)
                </button>
                <button
                  type="button"
                  onClick={() => setLogoTab('gradient')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                    logoTab === 'gradient' ? 'bg-[#009EF7] text-white shadow-xs' : 'text-[#92929F] hover:text-white'
                  }`}
                >
                  Degradê & Ícone
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-2">
              {/* Box de Pré-visualização do Logotipo */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-5 bg-[#0F1014] border border-[#232530] rounded-2xl min-h-[140px] text-center">
                {logoImageUrl ? (
                  <div className="relative group flex items-center justify-center">
                    <img src={logoImageUrl} alt="Logo Preview" className="max-h-20 max-w-full object-contain rounded-md" />
                    <button
                      type="button"
                      onClick={() => setLogoImageUrl('')}
                      className="absolute -top-3 -right-3 p-1.5 rounded-full bg-[#F1416C] text-white hover:bg-rose-600 shadow-md transition-transform hover:scale-110 cursor-pointer"
                      title="Remover logotipo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
                    >
                      {logoIcon || '▶'}
                    </div>
                    <span className="text-[11px] font-bold text-white">{logoText || appName}</span>
                    <span className="text-[10px] text-emerald-400">Emblema Vetorial Ativo</span>
                  </div>
                )}
              </div>

              {/* Controles Conforme a Aba */}
              <div className="md:col-span-8 space-y-3">
                {logoTab === 'upload' && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-full py-4 px-4 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-xs font-bold text-cyan-300 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>{uploadingLogo ? 'Enviando arquivo...' : 'Escolher Imagem do Computador (PNG transparente ou SVG)'}</span>
                    </button>
                    <p className="text-[11px] text-[#7E8299] text-center">
                      Formato recomendado: Imagem com fundo transparente (PNG ou SVG) de até 200px de largura e 60px de altura.
                    </p>
                  </div>
                )}

                {logoTab === 'url' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#92929F] font-medium">URL Direta da Imagem Hospedada:</label>
                    <div className="flex items-center bg-[#0F1014] border border-[#232530] rounded-xl px-3 py-2 text-xs focus-within:border-[#009EF7] transition-all">
                      <Link2 className="w-4 h-4 text-[#5E6278] mr-2 shrink-0" />
                      <input
                        type="url"
                        value={logoImageUrl}
                        onChange={e => setLogoImageUrl(e.target.value)}
                        placeholder="https://sua-empresa.com/imagens/logo.png"
                        className="w-full bg-transparent text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {logoTab === 'gradient' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#92929F] block">Ícone / Símbolo</label>
                      <input
                        type="text"
                        value={logoIcon}
                        onChange={e => setLogoIcon(e.target.value)}
                        placeholder="Ex: ▶, TV, ⚡, ✦"
                        maxLength={4}
                        className="w-full px-3 py-2 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white text-center font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#92929F] block">Cor Inicial (Degradê)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={gradientFrom}
                          onChange={e => setGradientFrom(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={gradientFrom}
                          onChange={e => setGradientFrom(e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#0F1014] border border-[#232530] rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#92929F] block">Cor Final (Degradê)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={gradientTo}
                          onChange={e => setGradientTo(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={gradientTo}
                          onChange={e => setGradientTo(e.target.value)}
                          className="w-full px-2 py-1.5 bg-[#0F1014] border border-[#232530] rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Favicon da Aba do Navegador */}
          <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-3 shadow-md">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                Ícone da Aba do Navegador (Favicon)
              </h2>
              <p className="text-xs text-[#92929F] mt-0.5">
                Suba um ícone quadrado (PNG ou ICO) para aparecer na aba do Chrome, Edge, Safari e favoritos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/x-icon,image/svg+xml"
                onChange={handleFaviconUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                disabled={uploadingFavicon}
                className="px-4 py-2.5 rounded-xl border border-[#232530] bg-[#0F1014] hover:bg-[#1E222D] text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all"
              >
                {uploadingFavicon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-emerald-400" />}
                <span>Carregar Favicon</span>
              </button>

              <div className="flex-1 w-full">
                <input
                  type="url"
                  value={faviconUrl}
                  onChange={e => setFaviconUrl(e.target.value)}
                  placeholder="Ou cole a URL direta: https://sua-empresa.com/favicon.png"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>

              {faviconUrl && (
                <div className="w-8 h-8 rounded-lg bg-[#0F1014] border border-[#232530] flex items-center justify-center p-1 shrink-0">
                  <img src={faviconUrl} alt="Favicon" className="w-5 h-5 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ABA 3: PALETA DE CORES (COLOR ENGINE 1-CLIQUE & FINO)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          {/* Seletor de Motor de Cores: Sigma Pro vs Xtream Classic */}
          <div className="flex items-center gap-2 p-1 bg-[#14151C] border border-[#232530] rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setColorSubTab('sigma')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                colorSubTab === 'sigma'
                  ? 'bg-[#009EF7] text-white shadow-xs'
                  : 'text-[#92929F] hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#009EF7]" />
              <span>Cores do Sigma Pro (Dark SaaS)</span>
            </button>
            <button
              type="button"
              onClick={() => setColorSubTab('xtream')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                colorSubTab === 'xtream'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#92929F] hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Cores do Xtream Server Clássico</span>
            </button>
          </div>

          {/* Subaba 1: Cores do Sigma Pro */}
          {colorSubTab === 'sigma' && (
            <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    Paletas Prontas do Sigma Pro (1-Clique)
                  </h2>
                  <p className="text-xs text-[#92929F] mt-0.5">
                    Estilize as cores de acento, botões e cartões do tema Sigma Pro.
                  </p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#009EF7]/15 text-[#009EF7] font-bold border border-[#009EF7]/30 w-fit">
                  {selectedThemeId ? `Paleta: ${PRESET_THEMES.find(t => t.id === selectedThemeId)?.name || 'Custom'}` : 'Cor Customizada'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                {PRESET_THEMES.map(theme => {
                  const isSelected = selectedThemeId === theme.id || primaryColor.toLowerCase() === theme.primary.toLowerCase();
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => applyPreset(theme)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'bg-[#1C2030] border-[#009EF7] shadow-lg ring-1 ring-[#009EF7]'
                          : 'bg-[#0F1014] border-[#232530] hover:border-[#383E54]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.primary }} />
                          <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: theme.accent }} />
                          <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: theme.background }} />
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#232530] text-[#92929F] font-bold">
                          {theme.badge}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                          {theme.name}
                        </p>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-[#7E8299] mt-1 line-clamp-1">{theme.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Ajuste Fino de Cores Sigma Pro */}
              <div className="pt-4 border-t border-[#1E202B] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#009EF7]" />
                  Ajuste Fino de Cores do Sigma Pro
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  {/* Cor Primária */}
                  <div className="p-3.5 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Cor Primária (Botões e Menus)</span>
                      <span className="font-mono text-[11px] text-white font-bold">{primaryColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={e => {
                          setPrimaryColor(e.target.value);
                          setPrimaryHoverColor(e.target.value);
                          applyBrandStyles({ primaryColor: e.target.value, primaryHoverColor: e.target.value });
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={e => {
                          setPrimaryColor(e.target.value);
                          applyBrandStyles({ primaryColor: e.target.value });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Cor de Destaque */}
                  <div className="p-3.5 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Cor de Destaque (Accent/Badges)</span>
                      <span className="font-mono text-[11px] text-white font-bold">{accentColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={e => {
                          setAccentColor(e.target.value);
                          applyBrandStyles({ accentColor: e.target.value });
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={e => {
                          setAccentColor(e.target.value);
                          applyBrandStyles({ accentColor: e.target.value });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Tom de Fundo */}
                  <div className="p-3.5 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Fundo da Página (Background)</span>
                      <span className="font-mono text-[11px] text-white font-bold">{backgroundColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={e => {
                          setBackgroundColor(e.target.value);
                          applyBrandStyles({ backgroundColor: e.target.value });
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={e => {
                          setBackgroundColor(e.target.value);
                          applyBrandStyles({ backgroundColor: e.target.value });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subaba 2: Cores do Xtream Server Clássico */}
          {colorSubTab === 'xtream' && (
            <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    Paletas & Cores do Xtream Server Clássico
                  </h2>
                  <p className="text-xs text-[#92929F] mt-0.5">
                    Personalize a barra de servidor, menu lateral e todos os 8 cards de métricas do tema Xtream UI.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const classic = XTREAM_COLOR_PRESETS[0];
                    setXtreamPrimaryColor(classic.primary);
                    setXtreamHeaderColor(classic.header);
                    setXtreamSidebarColor(classic.sidebar);
                    setXtreamCardClientsColor(classic.cardClients);
                    setXtreamCardActiveColor(classic.cardActive);
                    setXtreamCardExpiredColor(classic.cardExpired);
                    setXtreamCardTrialColor(classic.cardTrial);
                    setXtreamCardLiveColor(classic.cardLive);
                    setXtreamCardResellersColor(classic.cardResellers);
                    setSelectedXtreamPreset('classic-cyan');
                    setStatusMsg({ success: true, text: 'Cores padrão do Xtream restauradas!' });
                    setTimeout(() => setStatusMsg(null), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#232530] bg-[#0F1014] hover:bg-[#1A1D27] text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer w-fit"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restaurar Padrão Xtream</span>
                </button>
              </div>

              {/* Paletas Prontas Xtream */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
                {XTREAM_COLOR_PRESETS.map(preset => {
                  const isSelected = selectedXtreamPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedXtreamPreset(preset.id);
                        setXtreamPrimaryColor(preset.primary);
                        setXtreamHeaderColor(preset.header);
                        setXtreamSidebarColor(preset.sidebar);
                        setXtreamCardClientsColor(preset.cardClients);
                        setXtreamCardActiveColor(preset.cardActive);
                        setXtreamCardExpiredColor(preset.cardExpired);
                        setXtreamCardTrialColor(preset.cardTrial);
                        setXtreamCardLiveColor(preset.cardLive);
                        setXtreamCardResellersColor(preset.cardResellers);
                        setStatusMsg({ success: true, text: `Paleta "${preset.name}" aplicada ao Xtream!` });
                        setTimeout(() => setStatusMsg(null), 2500);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#181C26] border-[#00c0ef] ring-1 ring-[#00c0ef]'
                          : 'bg-[#0F1014] border-[#232530] hover:border-[#383E54]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: preset.primary }} />
                        <span className="w-3 h-3 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: preset.header }} />
                        <span className="w-3 h-3 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: preset.sidebar }} />
                      </div>
                      <span className="text-[11px] font-bold text-white truncate block">{preset.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Ajuste Individual de Cores Xtream */}
              <div className="pt-4 border-t border-[#1E202B] space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Ajuste Fino de Cada Cor do Xtream
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  {/* Cor Primária */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Cor Primária Xtream (Destaques)</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamPrimaryColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamPrimaryColor}
                        onChange={e => setXtreamPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamPrimaryColor}
                        onChange={e => setXtreamPrimaryColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Barra Superior / Topbar */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Barra Superior / Topbar Servidor</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamHeaderColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamHeaderColor}
                        onChange={e => setXtreamHeaderColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamHeaderColor}
                        onChange={e => setXtreamHeaderColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Fundo da Barra Lateral */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Fundo da Barra Lateral Xtream</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamSidebarColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamSidebarColor}
                        onChange={e => setXtreamSidebarColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamSidebarColor}
                        onChange={e => setXtreamSidebarColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Card Clientes Cadastrados */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Card Clientes Cadastrados</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamCardClientsColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamCardClientsColor}
                        onChange={e => setXtreamCardClientsColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamCardClientsColor}
                        onChange={e => setXtreamCardClientsColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Card Clientes Ativos */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Card Clientes Ativos</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamCardActiveColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamCardActiveColor}
                        onChange={e => setXtreamCardActiveColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamCardActiveColor}
                        onChange={e => setXtreamCardActiveColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Card Clientes Vencidos */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Card Clientes Vencidos</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamCardExpiredColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamCardExpiredColor}
                        onChange={e => setXtreamCardExpiredColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamCardExpiredColor}
                        onChange={e => setXtreamCardExpiredColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Card Testes Rápidos */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Card Testes Rápidos</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamCardTrialColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamCardTrialColor}
                        onChange={e => setXtreamCardTrialColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamCardTrialColor}
                        onChange={e => setXtreamCardTrialColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Card Conexões Ao Vivo */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Card Conexões Ao Vivo</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamCardLiveColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamCardLiveColor}
                        onChange={e => setXtreamCardLiveColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamCardLiveColor}
                        onChange={e => setXtreamCardLiveColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Card Revendedores */}
                  <div className="p-3 bg-[#0F1014] border border-[#232530] rounded-xl space-y-1.5">
                    <label className="text-[#92929F] font-medium flex items-center justify-between">
                      <span>Card Revendedores</span>
                      <span className="font-mono text-[11px] text-white font-bold">{xtreamCardResellersColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={xtreamCardResellersColor}
                        onChange={e => setXtreamCardResellersColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={xtreamCardResellersColor}
                        onChange={e => setXtreamCardResellersColor(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#14151C] border border-[#232530] rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ABA 4: APLICATIVOS DA FRANQUIA & PLAYERS
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'apps' && (
        <div className="space-y-5">
          <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-4 shadow-md">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#50CD89]" />
                Aplicativos Oficiais e Links de Download da Franquia
              </h2>
              <p className="text-xs text-[#92929F] mt-1">
                Esses links são disponibilizados no dashboard para seus clientes e revendedores, além de serem injetados nas mensagens prontas de WhatsApp!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Google Play Store */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">Google Play Store (App Oficial)</label>
                  <VariableTagBadge tag="{app_playstore}" />
                </div>
                <input
                  type="url"
                  value={playStoreUrl}
                  onChange={e => setPlayStoreUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>

              {/* APK Principal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">Link Direto do APK Principal (Android TV / Box / Celular)</label>
                  <VariableTagBadge tag="{app_apk}" />
                </div>
                <input
                  type="url"
                  value={primaryApkUrl}
                  onChange={e => setPrimaryApkUrl(e.target.value)}
                  placeholder="https://suafranquia.com/app.apk"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>

              {/* APK Secundário */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">Link Direto do APK Secundário / Alternativo</label>
                  <VariableTagBadge tag="{app_apk_secundario}" />
                </div>
                <input
                  type="url"
                  value={secondaryApkUrl}
                  onChange={e => setSecondaryApkUrl(e.target.value)}
                  placeholder="https://suafranquia.com/player2.apk"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>

              {/* WebPlayer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">URL do WebPlayer no Navegador</label>
                  <VariableTagBadge tag="{app_webplayer}" />
                </div>
                <input
                  type="url"
                  value={webPlayerUrl}
                  onChange={e => setWebPlayerUrl(e.target.value)}
                  placeholder="http://player.suafranquia.com"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>

              {/* Loja de Aplicativos */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">Apple App Store ou Loja Própria</label>
                  <VariableTagBadge tag="{app_appstore}" />
                </div>
                <input
                  type="url"
                  value={appStoreUrl}
                  onChange={e => setAppStoreUrl(e.target.value)}
                  placeholder="http://loja.suafranquia.com"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>

              {/* DNS STB */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">Servidor / DNS STB Padrão</label>
                  <VariableTagBadge tag="{dns_stb}" />
                </div>
                <input
                  type="text"
                  value={dnsStb}
                  onChange={e => setDnsStb(e.target.value)}
                  placeholder="Ex.: fastcdn.fit ou dns.suafranquia.com"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono"
                />
              </div>

              {/* WhatsApp de Suporte */}
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">WhatsApp de Atendimento & Suporte</label>
                  <VariableTagBadge tag="{whatsapp_suporte}" />
                </div>
                <input
                  type="text"
                  value={supportWhatsApp}
                  onChange={e => handlePhoneInputChange(e, setSupportWhatsApp)}
                  onPaste={e => handlePhoneInputPaste(e, setSupportWhatsApp)}
                  onBlur={() => handlePhoneInputBlur(supportWhatsApp, setSupportWhatsApp)}
                  placeholder="Ex: (51) 99336-1718 ou 5511999999999"
                  className="w-full px-3.5 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>
            </div>

            {/* Bloco Explicativo das Variáveis */}
            <div className="p-4 bg-[#0F1014] border border-[#232530] rounded-xl space-y-2 mt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="w-4 h-4 text-[#FFB800]" />
                <span>Variáveis Dinâmicas para Mensagens de WhatsApp & Modelos</span>
              </div>
              <p className="text-xs text-[#92929F] leading-relaxed">
                Você pode usar estas variáveis no seu <strong className="text-white">Modelo WhatsApp</strong> (na aba ao lado). Ao enviar dados para o cliente, o sistema substitui automaticamente cada tag pelo link correspondente configurado nesta tela:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="flex items-center justify-between bg-[#14151C] px-3 py-1.5 rounded-lg border border-[#232530]">
                  <span className="text-[#00E5FF] font-bold">{'{app_playstore}'}</span>
                  <span className="text-[#92929F] text-[10px]">Google Play Store</span>
                </div>
                <div className="flex items-center justify-between bg-[#14151C] px-3 py-1.5 rounded-lg border border-[#232530]">
                  <span className="text-[#00E5FF] font-bold">{'{app_apk}'}</span>
                  <span className="text-[#92929F] text-[10px]">APK Principal</span>
                </div>
                <div className="flex items-center justify-between bg-[#14151C] px-3 py-1.5 rounded-lg border border-[#232530]">
                  <span className="text-[#00E5FF] font-bold">{'{app_apk_secundario}'}</span>
                  <span className="text-[#92929F] text-[10px]">APK Secundário</span>
                </div>
                <div className="flex items-center justify-between bg-[#14151C] px-3 py-1.5 rounded-lg border border-[#232530]">
                  <span className="text-[#00E5FF] font-bold">{'{app_webplayer}'}</span>
                  <span className="text-[#92929F] text-[10px]">WebPlayer Web</span>
                </div>
                <div className="flex items-center justify-between bg-[#14151C] px-3 py-1.5 rounded-lg border border-[#232530]">
                  <span className="text-[#00E5FF] font-bold">{'{app_appstore}'}</span>
                  <span className="text-[#92929F] text-[10px]">Apple App Store</span>
                </div>
                <div className="flex items-center justify-between bg-[#14151C] px-3 py-1.5 rounded-lg border border-[#232530]">
                  <span className="text-[#00E5FF] font-bold">{'{whatsapp_suporte}'}</span>
                  <span className="text-[#92929F] text-[10px]">WhatsApp Suporte</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ABA 5: MODELO WHATSAPP DO CLIENTE (TEMPLATE EDITOR)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'modal' && (
        <ClientModalTemplateEditor />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ABA 6: AVISOS & COMUNICADOS DA REDE
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'announcements' && (
        <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#FFB800]" />
                Barra de Avisos e Comunicados da Rede
              </h2>
              <p className="text-xs text-[#92929F] mt-1">
                Exibe um aviso de alta visibilidade no topo do painel para toda a sua equipe e revendedores.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={announcementEnabled}
                onChange={e => setAnnouncementEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#232530] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#009EF7]"></div>
              <span className="ml-2 text-xs font-semibold text-white">
                {announcementEnabled ? 'Ativado' : 'Desativado'}
              </span>
            </label>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-[#92929F] font-medium block mb-1">Texto do Comunicado:</label>
              <textarea
                rows={3}
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="Ex.: 🔔 Manutenção programada nos servidores hoje às 02h. Tempo estimado: 15 minutos."
                className="w-full px-4 py-3 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] leading-relaxed"
              />
            </div>

            {announcementEnabled && announcementText && (
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-cyan-300 flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 text-[#009EF7] shrink-0" />
                <span className="font-medium">{announcementText}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ABA 7: INJEÇÃO DE CSS PERSONALIZADO (POWER USER)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'css' && (
        <div className="bg-[#14151C] border border-[#232530] rounded-2xl p-5 space-y-4 shadow-md">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              Injeção de CSS Personalizado (Custom Stylesheet)
            </h2>
            <p className="text-xs text-[#92929F] mt-1">
              Escreva regras CSS para personalizar fontes, ocultar itens específicos ou redefinir qualquer classe do painel. As regras são injetadas em tempo real!
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={12}
              value={customCss}
              onChange={e => {
                setCustomCss(e.target.value);
                applyBrandStyles({ customCss: e.target.value });
              }}
              placeholder={`/* Exemplo de CSS personalizado */\nbody {\n  font-family: 'Poppins', sans-serif;\n}\n\n.xtream-stat-card {\n  border-radius: 12px;\n}`}
              className="w-full px-4 py-3 bg-[#090b10] border border-[#232530] rounded-xl text-xs text-emerald-400 font-mono placeholder-gray-600 focus:outline-none focus:border-[#009EF7] leading-relaxed"
            />
            <p className="text-[11px] text-[#7E8299]">
              Dica: Use <code>!important</code> se desejar sobrepor regras de estilos padrão de componentes.
            </p>
          </div>
        </div>
      )}

      {/* ─── FOOTER COM BOTÕES PRINCIPAIS DE SALVAR E RESTAURAR ─── */}
      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0086d1] shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Publicando alterações...' : 'Salvar Todas as Configurações'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-[#92929F] bg-[#14151C] border border-[#232530] hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Padrão da Franquia</span>
        </button>
      </div>

      {/* ─── MODAL DE PREVIEW EM TEMPO REAL ─── */}
      {showLivePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in select-none">
          <div className="w-full max-w-4xl bg-[#0F1014] border border-[#232530] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#232530] bg-[#14151C]">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Simulação em Tempo Real da Interface</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30">
                  {themeStyle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLivePreviewModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 bg-[#090b10]">
              {/* Barra de Topo Simulada */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between shadow-md"
                style={{
                  backgroundColor: themeStyle === 'xtream-classic' ? '#2c3338' : '#14151C',
                  borderColor: themeStyle === 'xtream-classic' ? '#3e474f' : '#232530'
                }}
              >
                <div className="flex items-center gap-3">
                  {logoImageUrl ? (
                    <img src={logoImageUrl} alt="Logo" className="h-8 object-contain" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-black shadow-md"
                      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
                    >
                      {logoIcon || '▶'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{logoText || appName}</h4>
                    <p className="text-[10px] text-gray-400">{brandSlogan || 'Painel de Gestão White-Label'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    ● Servidor Online
                  </span>
                </div>
              </div>

              {/* Grid Simulado de Cards de Estatísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className="p-3.5 rounded-xl text-white shadow-sm flex flex-col justify-between"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-[10px] uppercase font-bold text-white/90">Clientes Cadastrados</span>
                  <span className="text-2xl font-black mt-1">1.482</span>
                  <span className="text-[10px] text-white/80 mt-1">Ver clientes →</span>
                </div>

                <div
                  className="p-3.5 rounded-xl text-white shadow-sm flex flex-col justify-between"
                  style={{ backgroundColor: '#00a65a' }}
                >
                  <span className="text-[10px] uppercase font-bold text-white/90">Clientes Ativos</span>
                  <span className="text-2xl font-black mt-1">1.340</span>
                  <span className="text-[10px] text-white/80 mt-1">Ver ativos →</span>
                </div>

                <div
                  className="p-3.5 rounded-xl text-white shadow-sm flex flex-col justify-between"
                  style={{ backgroundColor: accentColor }}
                >
                  <span className="text-[10px] uppercase font-bold text-white/90">Conexões Ao Vivo</span>
                  <span className="text-2xl font-black mt-1">487</span>
                  <span className="text-[10px] text-white/80 mt-1">Monitor ao vivo →</span>
                </div>

                <div
                  className="p-3.5 rounded-xl text-white shadow-sm flex flex-col justify-between"
                  style={{ backgroundColor: '#dd4b39' }}
                >
                  <span className="text-[10px] uppercase font-bold text-white/90">Vencidos / Bloqueados</span>
                  <span className="text-2xl font-black mt-1">142</span>
                  <span className="text-[10px] text-white/80 mt-1">Ver bloqueados →</span>
                </div>
              </div>

              {/* Botões e Badges Simulados */}
              <div className="p-4 bg-[#14151C] border border-[#232530] rounded-xl space-y-3">
                <span className="text-xs font-bold text-white block">Botões e Componentes de Ação</span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    style={{ backgroundColor: primaryColor }}
                    className="py-2 px-4 rounded-xl text-xs font-bold text-white shadow-md"
                  >
                    Botão de Ação Primária
                  </button>

                  <span
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}40` }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                    Badge de Destaque
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#14151C] border-t border-[#232530] flex justify-end">
              <button
                type="button"
                onClick={() => setShowLivePreviewModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0086d1] cursor-pointer"
              >
                Fechar Prévia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assistente Guiado */}
      <FranchiseOnboardingModal
        isOpen={onboardingModalOpen}
        onClose={() => setOnboardingModalOpen(false)}
        onCompleted={() => {
          setStatusMsg({ success: true, text: 'Franquia configurada com sucesso pelo assistente!' });
          setTimeout(() => window.location.reload(), 800);
        }}
      />
    </div>
  );
};
