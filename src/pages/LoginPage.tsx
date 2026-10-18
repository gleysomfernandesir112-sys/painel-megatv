import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSigmaStore } from '../store/SigmaStore';
import { APP_CONFIG, useBrandConfig, updateAppConfig, getBrandApiEndpoints } from '../config/appConfig';
import { User, Lock, ArrowRight, AlertCircle, RefreshCw, Eye, EyeOff, Sparkles } from 'lucide-react';
import { checkIsDedicatedDemoPanel } from '../utils/demoData';

type LoginVariant = 'classic' | 'minimal' | 'split' | 'glass' | 'xtream' | 'vibrant';

interface LoginPalette {
  light: boolean;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  muted: string;
  inputBg: string;
  inputBorder: string;
  accent: string;
  accentText: string;
}

/** Escolhe a cor de texto (claro/escuro) com melhor contraste sobre um fundo hex. */
const readableOn = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.65 ? '#0f172a' : '#ffffff';
};

export const LoginPage: React.FC = () => {
  const { loginWithCredentials, isLoadingLive, liveError, enterDemoMode } = useSigmaStore();
  const brand = useBrandConfig();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.toLowerCase().includes('demo') || search.toLowerCase().includes('demo=1') || search.toLowerCase().includes('demo=true')) {
        enterDemoMode();
        navigate('/dashboard');
      }
    }
  }, [enterDemoMode, navigate]);

  useEffect(() => {
    const fetchBrand = async () => {
      try {
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
      } catch {}
    };
    fetchBrand();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Informe seu usuário.');
      return;
    }
    if (!password.trim()) {
      setError('Informe sua senha.');
      return;
    }

    const result = await loginWithCredentials(username.trim(), password, rememberMe);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Usuário ou senha inválidos.');
    }
  };

  const variant: LoginVariant = (['classic', 'minimal', 'split', 'glass', 'xtream', 'vibrant'] as const).includes(brand.loginTheme as LoginVariant)
    ? (brand.loginTheme as LoginVariant)
    : 'classic';

  // Cores definidas pelo master
  const isXtreamBrand = brand.themeStyle === 'xtream-classic';
  const accent = (isXtreamBrand ? brand.xtreamPrimaryColor : brand.primaryColor) || APP_CONFIG.primaryColor || '#009EF7';
  const darkBg = brand.backgroundColor || '#0F1014';
  const darkCard = brand.cardColor || '#14151C';

  const palettes: Record<LoginVariant, LoginPalette> = {
    classic: {
      light: false, pageBg: darkBg, cardBg: darkCard, cardBorder: '#1E202B', text: '#ffffff', muted: '#92929F',
      inputBg: '#1A1C24', inputBorder: '#232530', accent, accentText: readableOn(accent)
    },
    glass: {
      light: false, pageBg: darkBg, cardBg: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(255,255,255,0.12)', text: '#ffffff', muted: '#a1a1b5',
      inputBg: 'rgba(255,255,255,0.06)', inputBorder: 'rgba(255,255,255,0.14)', accent, accentText: readableOn(accent)
    },
    split: {
      light: false, pageBg: darkBg, cardBg: 'transparent', cardBorder: 'transparent', text: '#ffffff', muted: '#92929F',
      inputBg: '#1A1C24', inputBorder: '#232530', accent, accentText: readableOn(accent)
    },
    minimal: {
      light: true, pageBg: brand.sigmaLightBackgroundColor || '#f4f6f9', cardBg: '#ffffff', cardBorder: '#e2e8f0', text: '#0f172a', muted: '#64748b',
      inputBg: '#f8fafc', inputBorder: '#cbd5e1', accent, accentText: readableOn(accent)
    },
    vibrant: {
      light: true, pageBg: accent, cardBg: '#ffffff', cardBorder: 'transparent', text: '#1e293b', muted: '#64748b',
      inputBg: 'transparent', inputBorder: '#e2e8f0', accent, accentText: readableOn(accent)
    },
    xtream: {
      light: true, pageBg: brand.xtreamBackgroundColor || '#f4f6f9', cardBg: '#ffffff', cardBorder: '#e2e8f0', text: '#1e293b', muted: '#64748b',
      inputBg: '#ffffff', inputBorder: '#cbd5e1', accent, accentText: readableOn(accent)
    }
  };
  const p = palettes[variant];

  const Logo = ({ size = 'md', onAccent = false }: { size?: 'md' | 'lg'; onAccent?: boolean }) => (
    brand.logoImageUrl ? (
      <img
        src={brand.logoImageUrl}
        alt={brand.appName}
        className={`${size === 'lg' ? 'h-20' : 'h-14 sm:h-16'} mx-auto object-contain`}
      />
    ) : (
      <div
        className={`inline-flex items-center justify-center rounded-2xl font-black shadow-xl logo-gradient-box ${size === 'lg' ? 'w-20 h-20 text-4xl' : 'w-14 h-14 text-2xl'}`}
        style={{
          color: '#ffffff',
          background: `linear-gradient(135deg, ${brand.logoGradientFrom}, ${brand.logoGradientTo})`,
          ...(onAccent ? { boxShadow: '0 0 0 4px rgba(255,255,255,0.25)' } : {})
        }}
      >
        {brand.logoIcon}
      </div>
    )
  );

  const form = (
    <form onSubmit={handleLogin} className="space-y-4">
      {(error || liveError) && (
        <div className="p-3.5 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl text-xs text-[#F1416C] flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{error || liveError}</div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: p.muted }}>
          Usuário
        </label>
        <div className="relative">
          <User className="w-4 h-4 absolute left-3.5 top-3" style={{ color: p.muted }} />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu_usuario"
            autoComplete="username"
            autoCapitalize="none"
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-colors border"
            style={{ backgroundColor: p.inputBg, borderColor: p.inputBorder, color: p.text }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: p.muted }}>
          Senha
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3.5 top-3" style={{ color: p.muted }} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none transition-colors border"
            style={{ backgroundColor: p.inputBg, borderColor: p.inputBorder, color: p.text }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 transition-colors"
            style={{ color: p.muted }}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 cursor-pointer" style={{ color: p.muted }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded"
            style={{ accentColor: p.accent }}
          />
          <span>Lembrar neste navegador</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoadingLive}
        className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
        style={{ backgroundColor: p.accent, color: p.accentText }}
      >
        {isLoadingLive ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Autenticando no Servidor...</span>
          </>
        ) : (
          <>
            <ArrowRight className="w-4 h-4" />
            <span>Acessar Painel</span>
          </>
        )}
      </button>

      {checkIsDedicatedDemoPanel() && (
        <button
          type="button"
          onClick={() => {
            enterDemoMode();
            navigate('/dashboard');
          }}
          className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer hover:opacity-90"
          style={{
            borderColor: p.cardBorder !== 'transparent' ? p.cardBorder : 'rgba(255,255,255,0.15)',
            color: p.muted,
            backgroundColor: p.light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'
          }}
          title="Navegue por todas as telas com dados fictícios para testes e capturas de tela"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Acessar Modo Demonstração (Visual)</span>
        </button>
      )}
    </form>
  );

  const footer = (
    <p className="text-[11px] text-center mt-5" style={{ color: p.muted }}>
      {APP_CONFIG.appName} v{APP_CONFIG.appVersion} • Conexão Segura SSL
    </p>
  );

  // ── Variante: Dividido (painel da marca à esquerda, formulário à direita) ──
  if (variant === 'split') {
    return (
      <div className="min-h-screen flex flex-col md:flex-row select-none" style={{ backgroundColor: p.pageBg }}>
        <div
          className="md:w-1/2 flex flex-col items-center justify-center text-center p-10 md:min-h-screen"
          style={{ backgroundColor: accent, color: readableOn(accent) }}
        >
          <Logo size="lg" onAccent />
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-5">{brand.appName}</h1>
          <p className="text-sm mt-2 opacity-80 max-w-xs">
            {brand.brandSlogan || 'Painel Administrativo & Gestão de Revendas'}
          </p>
        </div>
        <div className="md:w-1/2 flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <h2 className="text-xl font-bold mb-1" style={{ color: p.text }}>Acesso ao Painel</h2>
            <p className="text-xs mb-6" style={{ color: p.muted }}>
              Entre com suas credenciais de Administrador ou Revenda.
            </p>
            {form}
            {footer}
          </div>
        </div>
      </div>
    );
  }

  // ── Variante: Vibrante (degradê da marca, cartão branco, campos sublinhados e botão em pílula) ──
  if (variant === 'vibrant') {
    const top = `color-mix(in srgb, ${brand.logoGradientTo || accent} 55%, #000)`;
    const bottom = `color-mix(in srgb, ${accent} 70%, #000)`;
    const underline = (focused?: boolean) => ({
      borderBottom: `2px solid ${focused ? accent : '#e2e8f0'}`,
      color: '#1e293b'
    });
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 select-none"
        style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)` }}
      >
        <div className="mb-8 text-center">
          <Logo size="lg" />
          {!brand.logoImageUrl && (
            <h1 className="text-2xl font-black tracking-tight text-white mt-3">{brand.appName}</h1>
          )}
        </div>

        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white rounded-lg shadow-2xl p-8 space-y-6"
        >
          {(error || liveError) && (
            <div className="p-3 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-lg text-xs text-[#F1416C] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error || liveError}</div>
            </div>
          )}

          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>Usuário</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className="w-full bg-transparent py-2 text-sm focus:outline-none"
              style={underline(!!username)}
            />
          </label>

          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: password ? accent : '#94a3b8' }}>Senha</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-transparent py-2 pr-8 text-sm focus:outline-none"
                style={underline(!!password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-700">
            <span
              className="relative inline-block w-9 h-5 rounded-full transition-colors shrink-0"
              style={{ backgroundColor: rememberMe ? '#16a34a' : '#cbd5e1' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: rememberMe ? '18px' : '2px' }}
              />
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </span>
            Lembrar neste navegador
          </label>

          <button
            type="submit"
            disabled={isLoadingLive}
            className="w-full py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: accent,
              color: readableOn(accent),
              boxShadow: `0 8px 20px -6px ${accent}`
            }}
          >
            {isLoadingLive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Entrar</span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-center mt-6 text-white/60">
          {APP_CONFIG.appName} v{APP_CONFIG.appVersion} • Conexão Segura SSL
        </p>
      </div>
    );
  }
  // ── Variante: Xtream (barra superior colorida + cartão branco) ──
  if (variant === 'xtream') {
    const headerBg = brand.xtreamHeaderColor || '#2c3338';
    return (
      <div className="min-h-screen flex flex-col select-none" style={{ backgroundColor: p.pageBg }}>
        <div className="h-16 flex items-center justify-center gap-3 px-4 shadow-md" style={{ backgroundColor: headerBg, borderBottom: `3px solid ${accent}` }}>
          {brand.logoImageUrl ? (
            <img src={brand.logoImageUrl} alt={brand.appName} className="h-9 object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-black logo-gradient-box"
              style={{ background: `linear-gradient(135deg, ${brand.logoGradientFrom}, ${brand.logoGradientTo})` }}>
              {brand.logoIcon}
            </div>
          )}
          <span className="text-white font-extrabold tracking-tight">{brand.logoText || brand.appName}</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="rounded-lg border shadow-sm p-6 space-y-5" style={{ backgroundColor: p.cardBg, borderColor: p.cardBorder, borderTop: `3px solid ${accent}` }}>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: p.text }}>
                  <Lock className="w-4 h-4" style={{ color: accent }} />
                  Acesso ao Painel
                </h2>
                <p className="text-xs mt-0.5" style={{ color: p.muted }}>
                  Entre com suas credenciais de Administrador ou Revenda.
                </p>
              </div>
              {form}
            </div>
            {footer}
          </div>
        </div>
      </div>
    );
  }

  // ── Variantes de cartão central: Clássico (escuro), Minimalista (claro), Vidro (translúcido) ──
  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden select-none"
      style={{ backgroundColor: p.pageBg }}
    >
      {variant === 'classic' && (
        <>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10" style={{ backgroundColor: accent }} />
        </>
      )}
      {variant === 'glass' && (
        <>
          <div className="absolute -top-20 -left-20 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none opacity-30" style={{ backgroundColor: accent }} />
          <div className="absolute -bottom-24 -right-16 w-[26rem] h-[26rem] rounded-full blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: brand.logoGradientTo || accent }} />
        </>
      )}

      <div className="w-full max-w-sm sm:max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-3"><Logo /></div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: p.text }}>{brand.appName}</h1>
          <p className="text-xs mt-1 font-medium" style={{ color: p.muted }}>
            {brand.brandSlogan || 'Painel Administrativo & Gestão de Revendas'}
          </p>
        </div>

        <div
          className={`rounded-2xl p-6 sm:p-8 space-y-5 border ${p.light ? 'shadow-xl' : 'shadow-2xl'} ${variant === 'glass' ? 'backdrop-blur-xl' : ''}`}
          style={{ backgroundColor: p.cardBg, borderColor: p.cardBorder }}
        >
          <div className="pb-4 border-b" style={{ borderColor: p.cardBorder }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: p.text }}>
              <Lock className="w-4 h-4" style={{ color: accent }} />
              <span>Acesso ao Painel</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: p.muted }}>
              Entre com suas credenciais de Administrador ou Revenda.
            </p>
          </div>
          {form}
        </div>

        {footer}
      </div>
    </div>
  );
};
