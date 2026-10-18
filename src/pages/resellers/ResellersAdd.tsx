import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSigmaStore } from '../../store/SigmaStore';
import { ResellerPassStore } from '../../utils/auth';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../../utils/phone';
import {
  ArrowLeft,
  Users,
  Shuffle,
  Eye,
  EyeOff,
  Coins,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Key,
  Lock,
  Copy,
  DollarSign,
  Tv,
  Calendar
} from 'lucide-react';

export const ResellersAdd: React.FC = () => {
  const { profile, addReseller, refreshLiveData, globalBillingSettings, updateResellerPricing } = useSigmaStore();
  const navigate = useNavigate();

  const [loginUsuario, setLoginUsuario] = useState('');
  const [senhaUsuario, setSenhaUsuario] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [creditos, setCreditos] = useState(10);
  const [pricePerClient, setPricePerClient] = useState(globalBillingSettings.default_price_per_client);
  const [pricePerScreen, setPricePerScreen] = useState(globalBillingSettings.default_price_per_extra_screen);
  const [dueDay, setDueDay] = useState(globalBillingSettings.default_due_day);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const generateRandomUser = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setLoginUsuario(`revenda${rand}`);
  };

  const generateRandomPass = () => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    setSenhaUsuario(rand.toString());
  };

  React.useEffect(() => {
    generateRandomUser();
    generateRandomPass();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (loginUsuario.trim().length < 3) {
      setError('O login da revenda deve ter no mínimo 3 caracteres.');
      return;
    }
    if (/\s/.test(loginUsuario.trim())) {
      setError('O login não pode conter espaços.');
      return;
    }
    if (senhaUsuario.trim().length < 6) {
      setError('A senha de acesso deve ter no mínimo 6 caracteres.');
      return;
    }
    const isUnlimited = profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado' || profile.role === 'master';
    if (!isUnlimited && creditos > Number(profile.credits)) {
      setError(`Saldo insuficiente para transferir ${creditos} créditos (você possui ${profile.credits} créditos).`);
      return;
    }

    setLoading(true);

    try {
      const cleanWhatsapp = normalizePhoneNumber(whatsapp);
      const res = await addReseller({
        username: loginUsuario.trim(),
        password: senhaUsuario.trim(),
        name: nomeUsuario.trim() || loginUsuario.trim(),
        credits: creditos,
        whatsapp: cleanWhatsapp
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      // Salva a mesma senha de acesso como hash SHA-256 para login e fallback offline
      await ResellerPassStore.set(loginUsuario.trim(), senhaUsuario.trim());

      // Salva a precificação personalizada para a nova revenda
      updateResellerPricing(loginUsuario.trim(), {
        reseller_username: loginUsuario.trim(),
        price_per_client: Number(pricePerClient) || globalBillingSettings.default_price_per_client,
        price_per_extra_screen: Number(pricePerScreen) || globalBillingSettings.default_price_per_extra_screen,
        due_day: Number(dueDay) || globalBillingSettings.default_due_day,
        include_subreseller_clients: true
      });

      setCreatedSuccess({
        username: loginUsuario.trim(),
        password: senhaUsuario.trim(),
        name: nomeUsuario.trim() || loginUsuario.trim(),
        credits: creditos,
        whatsapp: cleanWhatsapp
      });

      await refreshLiveData();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar sub-revenda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/resellers"
            className="p-2 bg-[#14151C] hover:bg-[#1E202B] border border-[#1E202B] rounded-xl text-[#92929F] hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Criar Nova Sub-Revenda</h1>
            <p className="text-xs text-[#92929F] mt-0.5">
              Cadastro de revendedor subordinado com painel e créditos próprios.
            </p>
          </div>
        </div>

        <div className="bg-[#14151C] border border-[#1E202B] px-4 py-2 rounded-xl flex items-center gap-2 text-xs">
          <span className="text-[#92929F]">Seu Saldo:</span>
          <span className="font-bold text-[#50CD89] font-mono">
            {profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado'
              ? '∞ Ilimitado'
              : `${profile.credits} Créditos`}
          </span>
        </div>
      </div>

      {createdSuccess ? (
        <div className="bg-[#14151C] border border-[#50CD89]/30 rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in">
          <div className="p-4 bg-[#50CD89]/10 rounded-xl border border-[#50CD89]/30 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#50CD89] mx-auto mb-2" />
            <h2 className="text-base font-bold text-white">Sub-Revenda Criada com Sucesso!</h2>
            <p className="text-xs text-[#92929F] mt-1">
              O revendedor foi registrado na API e já pode acessar o painel imediatamente.
            </p>
          </div>

          <div className="bg-[#1A1C24] p-4 rounded-xl border border-[#232530] space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-[#232530]/60 pb-2.5">
              <span className="text-[#92929F]">Login da Revenda:</span>
              <span className="text-white font-mono font-bold text-sm">{createdSuccess.username}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#232530]/60 pb-2.5">
              <span className="text-[#92929F]">Senha de Acesso:</span>
              <span className="text-[#009EF7] font-mono font-bold text-sm">{createdSuccess.password}</span>
            </div>
            {createdSuccess.name && createdSuccess.name !== createdSuccess.username && (
              <div className="flex justify-between items-center border-b border-[#232530]/60 pb-2.5">
                <span className="text-[#92929F]">Nome do Parceiro:</span>
                <span className="text-white font-medium">{createdSuccess.name}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-[#92929F]">Créditos Iniciais Transferidos:</span>
              <span className="text-[#50CD89] font-bold font-mono text-sm">+{createdSuccess.credits} Créditos</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#009EF7]/10 border border-[#009EF7]/20 rounded-xl flex items-center justify-between gap-3">
            <div className="text-xs text-[#009EF7] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Esta senha única é usada pelo revendedor tanto para entrar no painel quanto para integrações.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const text = `*DADOS DE ACESSO AO PAINEL*\n\n` +
                  `👤 *Usuário:* ${createdSuccess.username}\n` +
                  `🔑 *Senha:* ${createdSuccess.password}\n` +
                  `💎 *Créditos:* ${createdSuccess.credits}\n\n` +
                  `Link de acesso: ${window.location.origin}/#/login`;
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }}
              className="px-3.5 py-1.5 bg-[#009EF7] hover:bg-[#0095E8] text-white rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Acesso'}</span>
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setCreatedSuccess(null);
                generateRandomUser();
                generateRandomPass();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-white text-xs font-semibold border border-[#232530] transition-all cursor-pointer"
            >
              Criar Outra Revenda
            </button>
            <Link
              to="/resellers"
              className="px-5 py-2.5 rounded-xl bg-[#009EF7] hover:bg-[#0095E8] text-white text-xs font-bold transition-all"
            >
              Ver Lista de Revendas
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-6 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl text-xs text-[#F1416C] flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                Login do Revendedor *
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={loginUsuario}
                  onChange={(e) => setLoginUsuario(e.target.value.replace(/\s/g, ''))}
                  placeholder="Ex: revenda_sp"
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono"
                />
                <button
                  type="button"
                  onClick={generateRandomUser}
                  className="absolute right-2 p-1.5 rounded-lg text-[#5E6278] hover:text-white hover:bg-[#232530]"
                  title="Gerar login aleatório"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-[#5E6278] mt-1">Identificador exclusivo do revendedor no sistema</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                Senha de Acesso *
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={senhaUsuario}
                  onChange={(e) => setSenhaUsuario(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 pr-16 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 rounded-lg text-[#5E6278] hover:text-white hover:bg-[#232530]"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={generateRandomPass}
                    className="p-1.5 rounded-lg text-[#5E6278] hover:text-white hover:bg-[#232530]"
                    title="Gerar senha aleatória"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Strength bar */}
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 4].map(n => (
                  <div
                    key={n}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      senhaUsuario.length >= n * 2
                        ? (n <= 1 ? 'bg-[#F1416C]' : n === 2 ? 'bg-[#FFA800]' : 'bg-[#50CD89]')
                        : 'bg-[#232530]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#5E6278] mt-1">
                Senha única usada para logar no painel e autenticar integrações
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                Nome da Revenda / Parceiro (Opcional)
              </label>
              <input
                type="text"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                placeholder="Ex: Revenda Sul Telecom"
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                WhatsApp de Contato (Opcional)
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => handlePhoneInputChange(e, setWhatsapp)}
                onPaste={(e) => handlePhoneInputPaste(e, setWhatsapp)}
                onBlur={() => handlePhoneInputBlur(whatsapp, setWhatsapp)}
                placeholder="Ex: (51) 99336-1718 ou 5551999998888"
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                Créditos Iniciais a Transferir
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max={profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado' ? 999999 : Number(profile.credits)}
                  value={creditos}
                  onChange={(e) => setCreditos(Math.max(0, Number(e.target.value)))}
                  className="w-36 bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#009EF7] font-mono font-bold"
                />
                <div className="flex items-center gap-2">
                  {[5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCreditos(num)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        creditos === num
                          ? 'bg-[#009EF7] text-white border-[#009EF7]'
                          : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white'
                      }`}
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[#5E6278] mt-1.5">
                Esses créditos serão debitados do seu saldo ({profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado' ? 'Ilimitado' : profile.credits}) e transferidos imediatamente para a nova revenda.
              </p>
            </div>

            {/* Precificação Personalizada (Pós-pago / Ilimitado) */}
            <div className="md:col-span-2 p-4 bg-[#14151C] border border-[#232530] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#50CD89]/10 flex items-center justify-center text-[#50CD89]">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Configuração de Valores & Mensalidade</h3>
                    <p className="text-[11px] text-[#92929F]">Valores aplicados para cobrança pós-paga por cliente desta revenda.</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#50CD89]/15 text-[#50CD89] font-bold">
                  Personalizável
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-[#92929F] mb-1">
                    Valor / Cliente (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#5E6278]">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricePerClient}
                      onChange={(e) => setPricePerClient(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:border-[#50CD89] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#92929F] mb-1">
                    Valor / Tela Extra (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#5E6278]">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricePerScreen}
                      onChange={(e) => setPricePerScreen(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:border-[#009EF7] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#92929F] mb-1">
                    Dia Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(parseInt(e.target.value) || 10)}
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:border-[#FFC700] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E202B]">
            <Link
              to="/resellers"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24]"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || (!(profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado') && creditos > Number(profile.credits))}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#009EF7] hover:bg-[#0095E8] disabled:opacity-40 text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Cadastrando na API...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Criar Sub-Revenda</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
