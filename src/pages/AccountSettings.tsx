import React, { useState, useEffect } from 'react';
import { useSigmaStore } from '../store/SigmaStore';
import { useBrandConfig } from '../config/appConfig';
import { apiService } from '../services/apiService';
import { APP_CONFIG } from '../config/appConfig';
import { isPanelMaster } from '../utils/panelAuth';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../utils/phone';
import {
  User,
  Lock,
  MessageSquare,
  Globe,
  Save,
  CheckCircle2,
  DollarSign,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Wallet,
  Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AccountSettings: React.FC = () => {
  const { profile, updateProfile, isDemo } = useSigmaStore();
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || APP_CONFIG.primaryColor || '#009EF7';

  // Estados de dados pessoais
  const [name, setName] = useState(profile.name || '');
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Estados de alteração de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Estados de PIX e templates
  const myUserKey = (profile?.username || '').toLowerCase();
  const [pixKey, setPixKey] = useState(() => localStorage.getItem(`sigma_pix_key_${myUserKey}`) || '');
  const [pixName, setPixName] = useState(() => localStorage.getItem(`sigma_pix_name_${myUserKey}`) || '');
  const [resellerTemplate, setResellerTemplate] = useState(() => {
    return localStorage.getItem('sigma_reseller_template') ||
      `Olá revenda,\n\n*AVISO DE RECARGA DE CRÉDITOS*\n\nSeu login: *${profile.username}*\nSaldo atual: *${profile.credits} créditos*\n\nEvite o bloqueio dos seus clientes mantendo seu saldo em dia.`;
  });
  const [savingPix, setSavingPix] = useState(false);
  const [pixSuccess, setPixSuccess] = useState(false);

  // Feedback de link copiado
  const [copiedLink, setCopiedLink] = useState(false);

  // Sincroniza dados iniciais com o perfil atual
  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.whatsapp) setWhatsapp(profile.whatsapp);
    }
  }, [profile]);

  // Carrega dados frescos da conta via API ao abrir a tela
  useEffect(() => {
    let isMounted = true;
    apiService.getAccount().then((acc) => {
      if (isMounted && acc) {
        if (acc.name) setName(acc.name);
        if (acc.whatsapp) setWhatsapp(acc.whatsapp);
        updateProfile({
          name: acc.name || profile.name,
          whatsapp: acc.whatsapp || profile.whatsapp
        });
      }
    }).catch(() => {});

    // Carrega configuração de PIX do revendedor direto do backend se houver
    const token = localStorage.getItem('sigma_token') || localStorage.getItem('mediacms_session_token') || '';
    if (token) {
      fetch('/api/v1/reseller/payment-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-reseller-username': profile?.username || myUserKey || ''
        }
      })
        .then(r => r.json())
        .then(data => {
          if (isMounted && data?.config) {
            if (data.config.manualPixKey && !pixKey) {
              setPixKey(data.config.manualPixKey);
            }
            if (data.config.manualPixBeneficiary && !pixName) {
              setPixName(data.config.manualPixBeneficiary);
            }
          }
        })
        .catch(() => {});
    }

    return () => { isMounted = false; };
  }, []);

  const referralLink = `${APP_CONFIG.panelUrl}/#/cs/${profile.username || 'revendedor'}`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Salvar dados do perfil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);

    try {
      const cleanWa = normalizePhoneNumber(whatsapp);
      if (isDemo) {
        updateProfile({ name, whatsapp: cleanWa });
        setProfileSuccess('Dados do perfil salvos com sucesso (Modo Demonstração)!');
        setSavingProfile(false);
        setTimeout(() => setProfileSuccess(null), 4000);
        return;
      }

      const res = await apiService.updateAccount({
        name: name.trim(),
        whatsapp: cleanWa
      });

      if (res && res.success) {
        updateProfile({
          name: name.trim(),
          whatsapp: cleanWa
        });
        setProfileSuccess('Dados cadastrais atualizados com sucesso no servidor!');
      } else {
        setProfileError(res.message || 'Erro ao salvar alterações no servidor.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileSuccess(null), 4000);
    }
  };

  // Salvar alteração de senha
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.trim().length < 3) {
      setPasswordError('A nova senha deve ter no mínimo 3 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da nova senha não confere.');
      return;
    }

    setSavingPassword(true);

    try {
      if (isDemo) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('Senha alterada com sucesso (Modo Demonstração)!');
        setSavingPassword(false);
        setTimeout(() => setPasswordSuccess(null), 4000);
        return;
      }

      const res = await apiService.updateAccount({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim()
      });

      if (res && res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('Sua senha de acesso foi atualizada com sucesso!');
      } else {
        setPasswordError(res.message || 'Senha atual incorreta ou erro ao atualizar.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setSavingPassword(false);
      setTimeout(() => setPasswordSuccess(null), 4000);
    }
  };

  // Salvar preferências de PIX e modelos
  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPix(true);
    localStorage.setItem('sigma_reseller_template', resellerTemplate);
    if (myUserKey) {
      localStorage.setItem(`sigma_pix_key_${myUserKey}`, pixKey.trim());
      localStorage.setItem(`sigma_pix_name_${myUserKey}`, pixName.trim());
    }

    // Salva no backend para garantir que as cobranças automáticas e auto-renovações (/renew/:cliente) usem o PIX desta revenda
    try {
      const token = localStorage.getItem('sigma_token') || localStorage.getItem('mediacms_session_token') || '';
      await fetch('/api/v1/reseller/payment-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-reseller-username': profile.username || myUserKey || ''
        },
        body: JSON.stringify({
          manualPixKey: pixKey.trim(),
          manualPixBeneficiary: pixName.trim(),
          activeGateway: 'pix_manual',
          enabled: true
        })
      });
    } catch (err) {
      console.warn('Erro ao salvar configuração de pagamento no backend:', err);
    } finally {
      setSavingPix(false);
      setPixSuccess(true);
      setTimeout(() => setPixSuccess(false), 3000);
    }
  };

  const isMaster = isPanelMaster(profile.username, profile);

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <User className="w-5 h-5" style={{ color: franchisePrimary }} />
            Minha Conta & Perfil
          </h1>
          <p className="text-xs text-[#92929F] mt-1">
            Gerencie seus dados de acesso, nome público, alteração de senha e preferências de cobrança.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
            isMaster
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
          }`}>
            {isMaster ? 'Master Geral' : 'Revendedor'}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
            <Wallet className="w-3.5 h-3.5" />
            <span>
              {profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado'
                ? '∞ Ilimitado'
                : `${profile.credits ?? 0} cr`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA 1: DADOS DO PERFIL & INFORMAÇÕES */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Dados Cadastrais */}
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1E202B] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#1A1C24] border border-[#262833]">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Dados Pessoais & Cadastrais</h2>
                  <p className="text-[11px] text-[#92929F]">Informações exibidas para a sua rede e no painel</p>
                </div>
              </div>
            </div>

            {profileSuccess && (
              <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Usuário (Fixo) */}
                <div>
                  <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                    Nome de Usuário (Login)
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    disabled
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-gray-300 font-mono font-bold cursor-not-allowed select-none opacity-80"
                  />
                  <span className="text-[10px] text-[#5E6278] mt-1 block">O identificador de login é fixo no sistema.</span>
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                    Tipo de Acesso / Nível
                  </label>
                  <input
                    type="text"
                    value={isMaster ? 'Administrador Master' : 'Revendedor Oficial'}
                    disabled
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-bold cursor-not-allowed select-none opacity-80"
                  />
                  <span className="text-[10px] text-[#5E6278] mt-1 block">Hierarquia da sua conta no servidor.</span>
                </div>

                {/* Nome de Exibição (Editável) */}
                <div>
                  <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                    Nome de Exibição / Nome Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Silva ou Minha Revenda"
                    className="w-full bg-[#0F1014] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all"
                  />
                </div>

                {/* WhatsApp de Contato (Editável) */}
                <div>
                  <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                    WhatsApp Comercial / Contato
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => handlePhoneInputChange(e, setWhatsapp)}
                    onPaste={(e) => handlePhoneInputPaste(e, setWhatsapp)}
                    onBlur={() => handlePhoneInputBlur(whatsapp, setWhatsapp)}
                    placeholder="Ex: (51) 99336-1718 ou 5551999998888"
                    className="w-full bg-[#0F1014] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Link de Assinatura Clientes */}
              <div className="pt-2 border-t border-[#1E202B]">
                <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                  Seu Link de Cadastro / Assinatura de Clientes
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-[#009EF7] font-mono select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyReferral}
                    className="px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95"
                    style={{
                      backgroundColor: `${franchisePrimary}20`,
                      borderColor: `${franchisePrimary}50`,
                      color: franchisePrimary
                    }}
                    title="Copiar link de indicação"
                  >
                    {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-[#5E6278] mt-1 block">
                  Clientes que se cadastrarem através deste link serão vinculados à sua revenda.
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md active:scale-95"
                  style={{ backgroundColor: franchisePrimary }}
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Dados do Perfil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card: Alteração de Senha */}
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1E202B] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/25">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Alterar Senha de Acesso</h2>
                  <p className="text-[11px] text-[#92929F]">Mantenha sua conta protegida com uma senha forte</p>
                </div>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Senha Atual */}
                <div>
                  <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Sua senha atual"
                      className="w-full bg-[#0F1014] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-2.5 text-[#5E6278] hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 3 caracteres"
                      className="w-full bg-[#0F1014] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-[#5E6278] hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full bg-[#0F1014] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword || !newPassword}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md active:scale-95"
                >
                  {savingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Atualizando Senha...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Atualizar Senha de Acesso</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUNA 2: TEMPLATES WHATSAPP, PIX & ATALHOS DE SEGURANÇA */}
        <div className="space-y-6">
          {/* Card: Configuração de PIX e Modelos */}
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1E202B] pb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Recebimento PIX & Cobrança</h2>
            </div>

            {pixSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Preferências de PIX salvas!</span>
              </div>
            )}

            <form onSubmit={handleSavePix} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#92929F] mb-1">
                  Chave PIX para Faturas
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Ex: CPF, CNPJ, E-mail ou Telefone"
                  className="w-full bg-[#0F1014] border border-[#232530] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#92929F] mb-1">
                  Nome do Titular da Conta PIX
                </label>
                <input
                  type="text"
                  value={pixName}
                  onChange={(e) => setPixName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-[#0F1014] border border-[#232530] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-medium text-[#92929F] mb-1">
                  Modelo de Notificação WhatsApp
                </label>
                <textarea
                  rows={4}
                  value={resellerTemplate}
                  onChange={(e) => setResellerTemplate(e.target.value)}
                  className="w-full bg-[#0F1014] border border-[#232530] rounded-xl p-3 text-[11px] text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono leading-relaxed resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingPix}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Dados de Cobrança</span>
              </button>
            </form>
          </div>

          {/* Card: Central de Segurança & Sessões */}
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Segurança & Auditoria
            </h2>
            <p className="text-[11px] text-[#92929F] leading-relaxed">
              Monitore os acessos simultâneos e gerencie as chaves de verificação em duas etapas (2FA).
            </p>

            <div className="space-y-2 pt-2">
              <Link
                to="/account-security"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] border border-[#262833] text-xs font-semibold text-white flex items-center justify-between transition-all group"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Segurança da Conta & 2FA
                </span>
                <span className="text-[11px] text-[#92929F] group-hover:translate-x-0.5 transition-transform">➔</span>
              </Link>

              <Link
                to="/active-sessions"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] border border-[#262833] text-xs font-semibold text-white flex items-center justify-between transition-all group"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  Sessões Ativas & Conexões
                </span>
                <span className="text-[11px] text-[#92929F] group-hover:translate-x-0.5 transition-transform">➔</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
