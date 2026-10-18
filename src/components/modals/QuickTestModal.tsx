import React, { useState } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { fastCdnApi } from '../../services/fastcdn';
import { APP_CONFIG, useBrandConfig } from '../../config/appConfig';
import { Sparkles, X, Copy, Check, CheckCircle2, AlertCircle, Clock, Tv2, Shuffle, User, KeyRound } from 'lucide-react';
import { Customer } from '../../types';
import { PlaylistModal } from './PlaylistModal';
import { MaxPlayerDetailsModal } from './MaxPlayerDetailsModal';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../../utils/phone';

interface QuickTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
}

export const QuickTestModal: React.FC<QuickTestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { refreshLiveData, profile } = useSigmaStore();
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || APP_CONFIG.primaryColor || '#009EF7';

  const [testType, setTestType] = useState<'standard' | 'maxplayer'>('standard');
  const [hours, setHours] = useState(4);
  const [customUsername, setCustomUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [leadName, setLeadName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bouquetId, setBouquetId] = useState(APP_CONFIG.defaultBouquetId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
  const [showMaxPlayerSuccess, setShowMaxPlayerSuccess] = useState(false);

  if (!isOpen) return null;

  const generateStrongUser = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    const prefix = testType === 'maxplayer' ? 'tstmax' : 'teste';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomUsername(`${prefix}_${rand}`);
  };

  const generatePass = () => {
    setCustomPassword(String(Math.floor(1000 + Math.random() * 9000)));
  };

  if (createdCustomer) {
    if (showMaxPlayerSuccess) {
      return (
        <MaxPlayerDetailsModal
          customer={createdCustomer}
          isOpen={true}
          onClose={() => {
            setCreatedCustomer(null);
            setShowMaxPlayerSuccess(false);
            onClose();
          }}
        />
      );
    }
    return (
      <PlaylistModal
        customer={createdCustomer}
        onClose={() => {
          setCreatedCustomer(null);
          onClose();
        }}
      />
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = customUsername.trim();
    if (cleanUser && cleanUser.length < 8) {
      setError('O nome de usuário deve ter no mínimo 8 caracteres para maior segurança.');
      return;
    }

    setLoading(true);
    try {
      const sessionUser = (typeof window !== 'undefined' ? localStorage.getItem('sigma_session_user') : null) || profile?.username;
      const cleanWhatsapp = normalizePhoneNumber(whatsapp);
      const isMax = testType === 'maxplayer';
      const effectiveHours = isMax ? 72 : hours;

      const res = await fastCdnApi.criarTeste({
        horas: effectiveHours,
        dias: isMax ? 3 : undefined,
        nome_usuario: leadName.trim() || (isMax ? 'Lead Max Player 3 Dias' : 'Lead WhatsApp Teste'),
        login_usuario: cleanUser || undefined,
        senha_usuario: customPassword.trim() || undefined,
        whatsapp: cleanWhatsapp,
        bouquet_id: bouquetId,
        reseller_username: sessionUser || undefined,
        revendedor: sessionUser || undefined,
        tipo_teste: isMax ? 'maxplayer' : 'padrao',
        is_maxplayer: isMax
      });

      const user = res.usuario || res.cliente || res.teste || res;
      const finalUsername = user.login_usuario || user.username || cleanUser;
      const finalPassword = user.senha_usuario || user.password || customPassword.trim();
      const pApp = user.partnerApp || user.partner_app || res.partnerApp || (isMax ? {
        appName: 'MaxPlayer',
        appUser: finalUsername,
        appPassword: finalPassword,
        dns: 'fastcdn.fit',
        status: 'active',
        is_active: true,
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
      } : undefined);

      const testCustomer: Customer = {
        id: user.id || finalUsername,
        username: finalUsername,
        password: finalPassword,
        name: leadName.trim() || user.nome_usuario || (isMax ? 'Lead Max Player 3 Dias' : 'Lead Teste'),
        whatsapp: cleanWhatsapp || user.whatsapp || '',
        status: 'TRIAL',
        created_at: new Date().toISOString(),
        expires_at: user.vencimento || `${effectiveHours} Horas a partir de agora`,
        expiration: user.vencimento,
        exp_date: user.vencimento,
        vencimento: user.vencimento,
        connections_count: 1,
        connections_max: 1,
        max_connections: 1,
        package: isMax ? 'TESTE GRÁTIS MAX PLAYER (3 DIAS)' : 'TESTE RÁPIDO IPTV',
        package_name: isMax ? 'TESTE GRÁTIS MAX PLAYER (3 DIAS)' : 'TESTE RÁPIDO IPTV',
        reseller_username: sessionUser || (profile as any)?.username || 'Direto',
        is_trial: true,
        partnerApp: pApp,
        partner_app: pApp
      };

      await refreshLiveData();

      if (onSuccess) {
        onSuccess(testCustomer);
        return;
      }

      setCreatedCustomer(testCustomer);
      if (isMax) {
        setShowMaxPlayerSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar teste na API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262833] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#50CD89]/15 flex items-center justify-center text-[#50CD89]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Gerar Teste Grátis</h3>
              <p className="text-[11px] text-[#92929F]">0 Créditos • Ativação Imediata</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#5E6278] hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl text-xs text-[#F1416C] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Test Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-2">
              Opção de Teste Grátis
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTestType('standard')}
                className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  testType === 'standard'
                    ? 'bg-[#50CD89]/15 border-[#50CD89] text-white shadow-md shadow-emerald-500/10'
                    : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white hover:border-[#383a48]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#50CD89]" />
                  <span>Teste IPTV Padrão</span>
                </div>
                <span className="text-[10px] text-[#92929F] font-normal">Duração em horas (2h a 12h)</span>
              </button>

              <button
                type="button"
                onClick={() => setTestType('maxplayer')}
                className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  testType === 'maxplayer'
                    ? 'bg-[#8950FC]/15 border-[#8950FC] text-white shadow-md shadow-purple-500/10'
                    : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white hover:border-[#383a48]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Tv2 className="w-4 h-4 text-[#a77dfc]" />
                  <span>Teste Grátis Max Player</span>
                </div>
                <span className="text-[10px] text-[#a77dfc] font-semibold">3 Dias (72h) com App Ativo</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Standard: Hours selector */}
            {testType === 'standard' ? (
              <div>
                <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                  Duração do Teste
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 12].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(h)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        hours === h
                          ? 'bg-[#50CD89] text-white border-[#50CD89]'
                          : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white'
                      }`}
                    >
                      {h} Horas
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Max Player Banner */
              <div className="p-3.5 bg-[#8950FC]/10 border border-[#8950FC]/30 rounded-xl text-xs flex items-start gap-3">
                <Tv2 className="w-5 h-5 text-[#a77dfc] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-white font-bold">Ativação Automática no Max Player (3 Dias)</div>
                  <p className="text-[11px] text-[#C4B5FD] leading-relaxed">
                    Cria a conta do cliente IPTV e ativa o aplicativo Max Player com <strong>3 dias gratuitos</strong> de acesso no servidor e no app.
                  </p>
                </div>
              </div>
            )}

            {/* Credenciais Opcionais / Usuário Seguro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#92929F] uppercase tracking-wider">
                    Usuário (Mín. 8 chars)
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongUser}
                    className="text-[10px] text-[#009EF7] hover:underline flex items-center gap-1 cursor-pointer"
                    title="Gerar usuário difícil com no mínimo 8 caracteres"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Gerar Forte</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value.replace(/\s/g, ''))}
                  placeholder="Automático (ou mín. 8 chars)"
                  className={`w-full bg-[#1A1C24] border rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none font-mono ${
                    customUsername && customUsername.length < 8
                      ? 'border-[#F1416C]'
                      : customUsername && customUsername.length >= 8
                      ? 'border-[#50CD89]'
                      : 'border-[#232530] focus:border-[#009EF7]'
                  }`}
                />
                {customUsername && customUsername.length < 8 && (
                  <p className="text-[10px] text-[#F1416C] mt-1">Mínimo 8 caracteres obrigatório</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#92929F] uppercase tracking-wider">
                    Senha (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={generatePass}
                    className="text-[10px] text-[#009EF7] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Gerar</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Automático (pode ser menor)"
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none font-mono focus:border-[#009EF7]"
                />
              </div>
            </div>

            {/* Lead Name */}
            <div>
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                Nome do Lead / Cliente (Opcional)
              </label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Ex: Carlos WhatsApp"
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                WhatsApp (Opcional)
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => handlePhoneInputChange(e, setWhatsapp)}
                onPaste={(e) => handlePhoneInputPaste(e, setWhatsapp)}
                onBlur={() => handlePhoneInputBlur(whatsapp, setWhatsapp)}
                placeholder="Ex: (51) 99336-1718 ou 5551999998888"
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
              />
            </div>

            <div className="p-3 bg-[#1A1C24] rounded-xl border border-[#232530] text-xs text-[#92929F] flex items-center justify-between">
              <span>Custo em Créditos:</span>
              <span className="text-[#50CD89] font-bold">0 Créditos (100% Grátis)</span>
            </div>

            <button
              type="submit"
              disabled={loading || (customUsername.trim().length > 0 && customUsername.trim().length < 8)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#50CD89] hover:bg-[#47be7d] disabled:opacity-50 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Gerando e ativando no servidor...</span>
                </>
              ) : (
                <>
                  {testType === 'maxplayer' ? <Tv2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  <span>{testType === 'maxplayer' ? 'Criar Teste Grátis Max Player (3 Dias)' : 'Gerar Teste Imediatamente'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
