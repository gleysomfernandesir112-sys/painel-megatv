import React, { useState, useRef } from 'react';
import {
  Sparkles, Palette, Smartphone, Check, ArrowRight, ArrowLeft,
  Upload, Trash2, Image, MessageCircle, X, ShieldCheck, CheckCircle2,
  Rocket, HeartHandshake, Eye
} from 'lucide-react';
import { APP_CONFIG, updateAppConfig, getBrandApiEndpoints, getFranchiseDomain, applyBrandStyles } from '../../config/appConfig';
import { PRESET_THEMES, PresetTheme } from '../../config/presetThemes';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../../utils/phone';

export interface FranchiseOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const FranchiseOnboardingModal: React.FC<FranchiseOnboardingModalProps> = ({
  isOpen,
  onClose,
  onCompleted
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Identidade
  const [appName, setAppName] = useState(APP_CONFIG.appName || 'Meu Painel IPTV');
  const [logoText, setLogoText] = useState(APP_CONFIG.logoText || 'MEU IPTV');
  const [logoImageUrl, setLogoImageUrl] = useState(APP_CONFIG.logoImageUrl || '');
  const [logoIcon, setLogoIcon] = useState(APP_CONFIG.logoIcon || '▶');

  // Step 2: Cores e Tema
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    const found = PRESET_THEMES.find(t => t.primary.toLowerCase() === APP_CONFIG.primaryColor.toLowerCase());
    return found ? found.id : 'sapphire';
  });
  const [primaryColor, setPrimaryColor] = useState(APP_CONFIG.primaryColor || '#009EF7');
  const [primaryHoverColor, setPrimaryHoverColor] = useState(APP_CONFIG.primaryHoverColor || '#0086D1');
  const [accentColor, setAccentColor] = useState(APP_CONFIG.accentColor || '#00E5FF');
  const [gradientFrom, setGradientFrom] = useState(APP_CONFIG.logoGradientFrom || '#009EF7');
  const [gradientTo, setGradientTo] = useState(APP_CONFIG.logoGradientTo || '#7239EA');
  const [backgroundColor, setBackgroundColor] = useState(APP_CONFIG.backgroundColor || '#0B0E14');
  const [cardColor, setCardColor] = useState(APP_CONFIG.cardColor || '#121722');
  const [sidebarColor, setSidebarColor] = useState(APP_CONFIG.sidebarColor || '#0F131C');

  // Step 3: Suporte
  const [supportWhatsApp, setSupportWhatsApp] = useState(APP_CONFIG.supportWhatsApp || '');

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectTheme = (t: PresetTheme) => {
    setSelectedThemeId(t.id);
    setPrimaryColor(t.primary);
    setPrimaryHoverColor(t.primaryHover);
    setAccentColor(t.accent);
    setGradientFrom(t.gradientFrom);
    setGradientTo(t.gradientTo);
    setBackgroundColor(t.background);
    setCardColor(t.card);
    setSidebarColor(t.sidebar);

    // Aplica no DOM ao vivo para que o franqueado veja as cores mudarem na hora!
    applyBrandStyles({
      primaryColor: t.primary,
      primaryHoverColor: t.primaryHover,
      accentColor: t.accent,
      logoGradientFrom: t.gradientFrom,
      logoGradientTo: t.gradientTo,
      backgroundColor: t.background,
      cardColor: t.card,
      sidebarColor: t.sidebar
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido (PNG, JPG, SVG).');
      return;
    }

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const masterKey = localStorage.getItem('sigma_active_key') || localStorage.getItem('fastcdn_api_key') || localStorage.getItem('sigma_reseller_key') || APP_CONFIG.defaultApiKey;
        const sessionToken = localStorage.getItem('sigma_session_token') || localStorage.getItem('mediacms_session_token') || '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (masterKey) headers['X-API-Key'] = masterKey;
        if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

        const endpoints = getBrandApiEndpoints('/api/v1/brand-settings/upload-logo');
        let uploadedUrl = '';
        for (const url of endpoints) {
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                domain: getFranchiseDomain(),
                data: base64Data,
                filename: file.name
              })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.success && data?.logoUrl) {
              uploadedUrl = data.logoUrl;
              break;
            }
          } catch {}
        }

        const finalUrl = uploadedUrl || base64Data;
        setLogoImageUrl(finalUrl);
        updateAppConfig({ logoImageUrl: finalUrl });
      } catch {
        setLogoImageUrl(base64Data);
        updateAppConfig({ logoImageUrl: base64Data });
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinish = async () => {
    setSaving(true);
    const cfg = {
      appName: appName.trim(),
      appShortName: logoText.trim() || appName.trim(),
      logoText: logoText.trim(),
      logoImageUrl: logoImageUrl.trim(),
      logoIcon: logoIcon.trim() || '▶',
      primaryColor,
      primaryHoverColor,
      accentColor,
      logoGradientFrom: gradientFrom,
      logoGradientTo: gradientTo,
      backgroundColor,
      cardColor,
      sidebarColor,
      supportWhatsApp: normalizePhoneNumber(supportWhatsApp),
      onboardingCompleted: true,
      activePresetId: selectedThemeId
    };

    // Aplica no config local imediatamente
    updateAppConfig(cfg);

    try {
      const masterKey = localStorage.getItem('sigma_active_key') || localStorage.getItem('fastcdn_api_key') || localStorage.getItem('sigma_reseller_key') || APP_CONFIG.defaultApiKey;
      const sessionToken = localStorage.getItem('sigma_session_token') || localStorage.getItem('mediacms_session_token') || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (masterKey) headers['X-API-Key'] = masterKey;
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const endpoints = getBrandApiEndpoints('/api/v1/brand-settings');
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...cfg,
              domain: getFranchiseDomain()
            })
          });
          if (res.ok) break;
        } catch {}
      }
    } catch {}

    setSaving(false);
    setStep(4);
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('sigma_onboarding_dismissed', 'true');
    } catch {}
    onClose();
  };

  const selectedTheme = PRESET_THEMES.find(t => t.id === selectedThemeId) || PRESET_THEMES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#12141D] border border-[#232736] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho do Modal */}
        <div className="p-5 border-b border-[#1E2230] bg-[#161824] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg logo-gradient-box">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Personalização da Sua Franquia
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#50CD89]/20 text-[#50CD89] border border-[#50CD89]/30 font-semibold">
                  1º Acesso
                </span>
              </h2>
              <p className="text-xs text-[#92929F]">
                Configure a identidade da sua marca em 3 passos simples.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1E2230] transition-colors"
            title="Configurar mais tarde"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progresso dos Passos */}
        {step < 4 && (
          <div className="px-6 pt-4 pb-2 bg-[#12141D] border-b border-[#1E2230]">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className={step >= 1 ? 'text-theme-primary' : 'text-[#5E6278]'}>
                1. Identidade & Logo
              </span>
              <span className={step >= 2 ? 'text-theme-primary' : 'text-[#5E6278]'}>
                2. Paleta de Cores
              </span>
              <span className={step >= 3 ? 'text-theme-primary' : 'text-[#5E6278]'}>
                3. WhatsApp & Suporte
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#1C1F2B] rounded-full overflow-hidden">
              <div
                className="h-full bg-theme-primary transition-all duration-300"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Conteúdo Central */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* PASSO 1: IDENTIDADE & LOGO */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Como se chama a sua marca?</h3>
                <p className="text-xs text-[#92929F]">
                  Esses nomes aparecerão para todos os seus clientes e revendedores no topo e na tela de login.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#92929F] mb-1">
                    Nome Completo da Franquia
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={e => setAppName(e.target.value)}
                    placeholder="Ex.: NeoIPTV Oficial"
                    className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#232736] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-theme-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#92929F] mb-1">
                    Sigla ou Nome Curto
                  </label>
                  <input
                    type="text"
                    value={logoText}
                    onChange={e => setLogoText(e.target.value)}
                    placeholder="Ex.: NEO IPTV"
                    className="w-full px-3.5 py-2.5 bg-[#0D0F16] border border-[#232736] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-theme-primary transition-all font-bold"
                  />
                </div>
              </div>

              {/* Upload ou Prévia do Logotipo */}
              <div className="p-4 bg-[#0D0F16] border border-[#232736] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-theme-primary" />
                    Logotipo da Marca
                  </span>
                  <span className="text-[10px] text-[#5E6278]">Formato PNG ou SVG recomendado</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 rounded-xl bg-[#161824] border border-[#232736] flex items-center justify-center p-2 shrink-0">
                    {logoImageUrl ? (
                      <img src={logoImageUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-md logo-gradient-box"
                      >
                        {logoIcon}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-theme-primary hover:opacity-90 transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingLogo ? 'Enviando...' : 'Enviar Foto da Logo'}</span>
                      </button>

                      {logoImageUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoImageUrl('')}
                          className="p-2 rounded-lg text-[#F1416C] hover:bg-[#F1416C]/10 border border-[#F1416C]/20 transition-all"
                          title="Remover imagem e usar ícone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#92929F]">
                      Se você ainda não tiver logo pronta, não se preocupe! O sistema cria um ícone estilizado automático para você.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: COR DO PAINEL */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Escolha a cor do seu painel</h3>
                <p className="text-xs text-[#92929F]">
                  Clique na cor que você deseja para a sua marca. O painel muda na hora!
                </p>
              </div>

              {/* Grid dos 12 Temas Pro */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRESET_THEMES.map((theme) => {
                  const isSelected = selectedThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme)}
                      className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'bg-[#1C2030] border-theme-primary shadow-lg ring-1 ring-theme-primary'
                          : 'bg-[#0D0F16] border-[#232736] hover:border-[#383E54]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full shadow-xs border border-white/20"
                            style={{ backgroundColor: theme.primary }}
                          />
                          <span
                            className="w-3 h-3 rounded-full shadow-xs border border-white/10"
                            style={{ backgroundColor: theme.accent }}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shadow-xs border border-white/10"
                            style={{ backgroundColor: theme.background }}
                            title="Fundo"
                          />
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A1C28] text-[#92929F] font-bold">
                          {theme.badge}
                        </span>
                      </div>
                      
                      <div className="font-bold text-xs text-white truncate flex items-center justify-between">
                        <span>{theme.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-theme-primary shrink-0" />}
                      </div>
                      
                      <p className="text-[10px] text-[#7E8299] mt-1 line-clamp-1">
                        {theme.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Pré-visualização ao vivo dos elementos */}
              <div className="p-3.5 rounded-xl border border-[#232736] bg-[#0D0F16] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-theme-primary" />
                  <span className="text-white font-medium">Prévia do Tema Ativo:</span>
                  <span className="font-bold text-theme-primary">{selectedTheme.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-theme-primary">
                    Botão Ativo
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C2030] text-theme-primary border border-theme-primary/30">
                    Badge
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: WHATSAPP & SUPORTE */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Qual o seu WhatsApp de Suporte?</h3>
                <p className="text-xs text-[#92929F]">
                  Seus clientes e revendedores verão este número para solicitar renovações e suporte diretamente com você.
                </p>
              </div>

              <div className="p-4 bg-[#0D0F16] border border-[#232736] rounded-xl space-y-3">
                <label className="block text-xs font-medium text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#50CD89]" />
                  Número do WhatsApp de Atendimento
                </label>
                <input
                  type="text"
                  value={supportWhatsApp}
                  onChange={e => handlePhoneInputChange(e, setSupportWhatsApp)}
                  onPaste={e => handlePhoneInputPaste(e, setSupportWhatsApp)}
                  onBlur={() => handlePhoneInputBlur(supportWhatsApp, setSupportWhatsApp)}
                  placeholder="Ex: (51) 99336-1718 ou 5511999998888"
                  className="w-full px-3.5 py-2.5 bg-[#12141D] border border-[#232736] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#50CD89] transition-all font-mono"
                />
                <p className="text-[11px] text-[#92929F]">
                  Digite com o código do país e estado (apenas números). Exemplo: <strong>5511999998888</strong>.
                </p>

                {supportWhatsApp && (
                  <a
                    href={`https://wa.me/${supportWhatsApp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#50CD89] hover:underline font-semibold"
                  >
                    <span>Testar se o link abre seu WhatsApp</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="p-3.5 bg-[#50CD89]/10 border border-[#50CD89]/20 rounded-xl flex items-center gap-2.5 text-xs text-[#50CD89]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Tudo pronto! Ao clicar em finalizar, todas as configurações serão salvas na sua franquia com blindagem total.
                </span>
              </div>
            </div>
          )}

          {/* PASSO 4: CONCLUSÃO COMEMORATIVA */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-[#50CD89]/20 text-[#50CD89] border border-[#50CD89]/40 flex items-center justify-center mx-auto shadow-xl">
                <Rocket className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  Sua Franquia Está Totalmente Configurada!
                </h3>
                <p className="text-xs text-[#92929F] max-w-md mx-auto mt-1">
                  Parabéns! Sua marca agora possui identidade própria, cores exclusivas e atendimento configurado.
                </p>
              </div>

              <div className="p-4 bg-[#0D0F16] border border-[#232736] rounded-xl max-w-sm mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#92929F]">Marca:</span>
                  <span className="text-white font-bold">{appName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#92929F]">Tema Escolhido:</span>
                  <span className="text-theme-primary font-bold">{selectedTheme.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#92929F]">WhatsApp:</span>
                  <span className="text-[#50CD89] font-mono">{supportWhatsApp || 'Não informado'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onCompleted?.();
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-theme-primary hover:opacity-90 shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Acessar Meu Painel Agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

        {/* Rodapé de Ações */}
        {step < 4 && (
          <div className="p-4 border-t border-[#1E2230] bg-[#161824] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#92929F] hover:text-white hover:bg-[#1C2030] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-[#92929F] hover:text-white transition-colors cursor-pointer"
              >
                Configurar mais tarde
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-theme-primary hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-theme-primary hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{saving ? 'Salvando...' : 'Concluir Personalização 🚀'}</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
