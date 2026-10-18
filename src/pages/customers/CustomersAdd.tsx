import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSigmaStore } from '../../store/SigmaStore';
import { fastCdnApi, FastCdnLista } from '../../services/fastcdn';
import { APP_CONFIG } from '../../config/appConfig';
import { PlaylistModal } from '../../components/modals/PlaylistModal';
import { AppActivationModal } from '../../components/modals/AppActivationModal';
import { Customer } from '../../types';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../../utils/phone';
import {
  ArrowLeft,
  DollarSign,
  UserPlus,
  Sparkles,
  Shuffle,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Tv,
  Tv2,
  Calendar,
  Layers,
  MessageCircle,
  Copy,
  Check,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const CustomersAdd: React.FC = () => {
  const { profile, addCustomer, refreshLiveData, saveCustomerPrice } = useSigmaStore();
  const navigate = useNavigate();

  // Mode: Official Client (creates with credits) vs Fast Test (0 credits)
  const [isTrial, setIsTrial] = useState(false);
  const [showExtraFields, setShowExtraFields] = useState(false);

  // Form Fields
  const [loginUsuario, setLoginUsuario] = useState('');
  const [senhaUsuario, setSenhaUsuario] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [conectado, setConectado] = useState(1);
  const [durationType, setDurationType] = useState<'meses' | 'dias'>('meses');
  const [meses, setMeses] = useState(1);
  const [dias, setDias] = useState(30);
  const [horas, setHoras] = useState(4);
  const [tipoTeste, setTipoTeste] = useState<'padrao' | 'maxplayer'>('padrao');
  const [bouquetId, setBouquetId] = useState(APP_CONFIG.defaultBouquetId);
  const [notas, setNotas] = useState('');
  const [subscriptionValue, setSubscriptionValue] = useState<number>(0);

  // Live packages from API
  const [bouquets, setBouquets] = useState<FastCdnLista[]>([
    { id: 'bq_completo', nome: 'COMPLETO C/ ADULTOS', padrao: true },
    { id: 'bq_sem_adulto', nome: 'COMPLETO S/ ADULTOS', padrao: false }
  ]);

  // Loading & Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showMaxPlayerModal, setShowMaxPlayerModal] = useState(false);

  // Generate random credentials on mount (min 8 chars, strong alphanumeric)
  const generateRandomUser = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    const prefix = isTrial ? (tipoTeste === 'maxplayer' ? 'tstmax' : 'teste') : 'usr';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setLoginUsuario(`${prefix}_${rand}`);
  };

  const generateRandomPass = () => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    setSenhaUsuario(rand.toString());
  };

  useEffect(() => {
    generateRandomUser();
    generateRandomPass();

    // Fetch live bouquets
    fastCdnApi.getListas().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setBouquets(list);
        setBouquetId(list[0].id);
      }
    }).catch(() => {});
  }, [isTrial, tipoTeste]);

  // Validações em tempo real - Usuário com no mínimo 8 caracteres
  const validUsername = loginUsuario.trim().length >= 8 && !/\s/.test(loginUsuario) && /^[a-zA-Z0-9_.-]+$/.test(loginUsuario.trim());
  const validPassword = senhaUsuario.trim().length >= 4;
  const normalizedWa = normalizePhoneNumber(whatsapp);
  const validWhatsapp = !whatsapp || /^\d{10,15}$/.test(normalizedWa);

  // Total Credit Calculation & Unlimited Credit Check
  const isUnlimited = profile.unlimited_credits || profile.creditos_ilimitados || profile.credits === 'ilimitado' || profile.role === 'master';
  const totalCostCredits = isTrial ? 0 : (durationType === 'dias' ? 1 : conectado * meses);
  const hasEnoughCredits = isUnlimited || Number(profile.credits) >= totalCostCredits;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validUsername) {
      setError('Login inválido: no mínimo 8 caracteres, sem espaços, apenas letras, números, _ . -');
      return;
    }
    if (!validPassword) {
      setError('A senha deve ter no mínimo 4 caracteres.');
      return;
    }
    const cleanWhatsapp = normalizePhoneNumber(whatsapp);
    if (!isTrial && !validWhatsapp && cleanWhatsapp) {
      setError('WhatsApp inválido. Use apenas números com DDD (ex: 5551999998888 ou +55 51 9336-1718).');
      return;
    }
    if (!isTrial && !hasEnoughCredits) {
      setError(`Saldo insuficiente! Você possui ${profile.credits} créditos e esta operação necessita de ${totalCostCredits} créditos.`);
      return;
    }

    setLoading(true);

    try {
      const sessionUser = (typeof window !== 'undefined' ? localStorage.getItem('sigma_session_user') : null) || profile?.username;
      if (isTrial) {
        const isMax = tipoTeste === 'maxplayer';
        const effectiveHours = isMax ? 72 : horas;
        const res = await fastCdnApi.criarTeste({
          horas: effectiveHours,
          dias: isMax ? 3 : undefined,
          nome_usuario: nomeUsuario.trim() || loginUsuario.trim(),
          login_usuario: loginUsuario.trim(),
          senha_usuario: senhaUsuario.trim(),
          whatsapp: cleanWhatsapp,
          bouquet_id: bouquetId,
          reseller_username: sessionUser || undefined,
          revendedor: sessionUser || undefined,
          tipo_teste: isMax ? 'maxplayer' : 'padrao',
          is_maxplayer: isMax
        });

        const createdUser = res.usuario || res.cliente || res.teste || res;
        const finalUser = createdUser.login_usuario || createdUser.username || loginUsuario.trim();
        const finalPass = createdUser.senha_usuario || createdUser.password || senhaUsuario.trim();
        const pApp = createdUser.partnerApp || createdUser.partner_app || res.partnerApp || (isMax ? {
          appName: 'MaxPlayer',
          appUser: finalUser,
          appPassword: finalPass,
          dns: 'fastcdn.fit',
          status: 'active',
          is_active: true,
          activatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
        } : undefined);

        const newCust: Customer = {
          id: createdUser.id || finalUser,
          username: finalUser,
          password: finalPass,
          name: nomeUsuario.trim() || createdUser.nome_usuario || finalUser,
          whatsapp: cleanWhatsapp || createdUser.whatsapp || '',
          status: 'TRIAL',
          created_at: new Date().toISOString(),
          expires_at: createdUser.vencimento || `${effectiveHours} Horas a partir de agora`,
          expiration: createdUser.vencimento,
          exp_date: createdUser.vencimento,
          vencimento: createdUser.vencimento,
          connections_count: 1,
          connections_max: 1,
          max_connections: 1,
          package: isMax ? 'TESTE GRÁTIS MAX PLAYER (3 DIAS)' : (bouquets.find(b => b.id === bouquetId)?.nome || 'TESTE GRÁTIS'),
          package_name: isMax ? 'TESTE GRÁTIS MAX PLAYER (3 DIAS)' : (bouquets.find(b => b.id === bouquetId)?.nome || 'TESTE GRÁTIS'),
          reseller_username: sessionUser || (profile as any)?.username || 'Direto',
          is_trial: true,
          partnerApp: pApp,
          partner_app: pApp
        };

        setCreatedCustomer(newCust);
        if (isMax) {
          setShowMaxPlayerModal(true);
        } else {
          setShowPlaylistModal(true);
        }
      } else {
        const cleanNotes = notas.trim();
        const finalNotes = subscriptionValue > 0 && !cleanNotes.includes('[Valor:')
          ? (cleanNotes ? `${cleanNotes} [Valor: R$ ${subscriptionValue.toFixed(2)}]` : `[Valor: R$ ${subscriptionValue.toFixed(2)}]`)
          : cleanNotes;

        const res = await fastCdnApi.criarCliente({
          login_usuario: loginUsuario.trim(),
          senha_usuario: senhaUsuario.trim(),
          nome_usuario: nomeUsuario.trim() || loginUsuario.trim(),
          conectado: conectado,
          meses: durationType === 'meses' ? meses : undefined,
          dias: durationType === 'dias' ? dias : undefined,
          whatsapp: cleanWhatsapp,
          notas: finalNotes,
          bouquet_id: bouquetId,
          reseller_username: sessionUser || undefined,
          revendedor: sessionUser || undefined,
          id_lista: bouquetId,
          subscription_value: subscriptionValue > 0 ? subscriptionValue : undefined,
          subscriptionValue: subscriptionValue > 0 ? subscriptionValue : undefined
        });

        if (subscriptionValue > 0) {
          await saveCustomerPrice(loginUsuario.trim(), subscriptionValue);
        }

        const createdUser = res.usuario || res.cliente || res;
        const durLabel = durationType === 'dias' ? `${dias} dia(s)` : `${meses} mês(es)`;
        const newCust: Customer = {
          id: createdUser.id || createdUser.login_usuario || loginUsuario.trim(),
          username: createdUser.login_usuario || createdUser.username || loginUsuario.trim(),
          password: createdUser.senha_usuario || createdUser.password || senhaUsuario.trim(),
          name: nomeUsuario.trim() || createdUser.nome_usuario || loginUsuario.trim(),
          whatsapp: cleanWhatsapp || createdUser.whatsapp || '',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          expires_at: createdUser.vencimento || `Válido por ${durLabel}`,
          expiration: createdUser.vencimento,
          exp_date: createdUser.vencimento,
          vencimento: createdUser.vencimento,
          connections_count: conectado,
          connections_max: conectado,
          max_connections: conectado,
          package: bouquets.find(b => b.id === bouquetId)?.nome || 'COMPLETO C/ ADULTOS',
          package_name: bouquets.find(b => b.id === bouquetId)?.nome || 'COMPLETO C/ ADULTOS',
          reseller_username: sessionUser || (profile as any)?.username || 'Direto',
          subscription_value: subscriptionValue > 0 ? subscriptionValue : undefined,
          is_trial: false
        };

        setCreatedCustomer(newCust);
        setShowPlaylistModal(true);
      }

      await refreshLiveData();
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com a API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 select-none">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-2 bg-[#14151C] hover:bg-[#1E202B] border border-[#1E202B] rounded-xl text-[#92929F] hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Criar Conta IPTV</h1>
            <p className="text-xs text-[#92929F] mt-0.5">
              Provisionamento direto no servidor.
            </p>
          </div>
        </div>

        {/* Available Credits Badge */}
        <div className="bg-[#14151C] border border-[#1E202B] px-4 py-2 rounded-xl flex items-center gap-2 text-xs">
          <span className="text-[#92929F]">Seu Saldo:</span>
          <span className="font-bold text-[#50CD89] font-mono">
            {isUnlimited ? '∞ Ilimitado' : `${profile.credits} Créditos`}
          </span>
        </div>
      </div>

      {/* Success View */}
      {createdCustomer ? (
        <div className="bg-[#14151C] border border-[#50CD89]/30 rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in text-center">
          <div className="p-4 bg-[#50CD89]/10 rounded-xl border border-[#50CD89]/30 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#50CD89] mx-auto mb-2" />
            <h2 className="text-base font-bold text-white">
              {createdCustomer.is_trial ? 'Teste Rápido Gerado com Sucesso!' : 'Cliente Oficial Criado com Sucesso!'}
            </h2>
            <p className="text-xs text-[#92929F] mt-1">
              Conta de <span className="text-white font-mono font-bold">{createdCustomer.username}</span> ativada no servidor.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowPlaylistModal(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-1.115-.06-.274-.087-.63-.223-1.09-.425-1.964-.863-3.232-2.855-3.329-2.986-.096-.13-7.96-1.06 7.96-1.06.002 0 .804-1.066.804-1.066s.181-.24.32-.423c.139-.183.186-.312.279-.516.093-.204.047-.384-.023-.523-.07-.139-.628-1.512-.86-2.072-.226-.547-.457-.472-.628-.481-.162-.008-.348-.01-.534-.01-.186 0-.488.07-.744.348-.256.279-.976.954-.976 2.326s1 2.697 1.139 2.883c.14.186 1.968 3.006 4.77 4.215.666.288 1.187.46 1.593.589.67.213 1.28.183 1.762.111.538-.08 1.65-.674 1.883-1.326.233-.652.233-1.21.163-1.326-.07-.116-.256-.186-.535-.325z" />
              </svg>
              <span>Abrir Mensagem WhatsApp / Dados de Acesso</span>
            </button>

            {!createdCustomer.is_trial && (
              <button
                type="button"
                onClick={() => setShowMaxPlayerModal(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#8950FC]/15 hover:bg-[#8950FC]/25 text-[#b588ff] border border-[#8950FC]/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Ativar aplicativo (MaxPlayer / Parceiros) para este cliente"
              >
                <Tv2 className="w-4 h-4 text-[#b588ff]" />
                <span>Ativar Aplicativo</span>
              </button>
            )}

            <button
              onClick={() => {
                setCreatedCustomer(null);
                generateRandomUser();
                generateRandomPass();
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-white text-xs font-semibold border border-[#232530] transition-all cursor-pointer"
            >
              Criar Outro Cliente
            </button>

            <Link
              to="/customers"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#009EF7] hover:bg-[#0095E8] text-white text-xs font-bold transition-all inline-flex items-center justify-center"
            >
              Ver Meus Clientes
            </Link>
          </div>
        </div>
      ) : (
        /* Form Card */
        <form onSubmit={handleSubmit} className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-6 shadow-2xl space-y-6">
          {/* Top Toggle: Cliente Oficial vs Teste Rápido */}
          <div className="grid grid-cols-2 gap-3 bg-[#161822] p-2 rounded-2xl border border-[#232530]">
            <button
              type="button"
              onClick={() => setIsTrial(false)}
              className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer border ${
                !isTrial
                  ? 'bg-blue-600/15 border-[#009EF7] text-white shadow-md shadow-blue-500/10'
                  : 'bg-[#14151C] text-[#92929F] border-[#232530] hover:text-white'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${!isTrial ? 'bg-[#009EF7] text-white' : 'bg-[#1E202B] text-[#92929F]'}`}>
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="block font-bold">Cliente Oficial</span>
                <span className="block text-[10px] text-[#92929F] font-normal">Debita créditos da conta</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsTrial(true)}
              className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer border ${
                isTrial
                  ? 'bg-emerald-600/15 border-[#50CD89] text-white shadow-md shadow-emerald-500/10'
                  : 'bg-[#14151C] text-[#92929F] border-[#232530] hover:text-white'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isTrial ? 'bg-[#50CD89] text-white' : 'bg-[#1E202B] text-[#92929F]'}`}>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="block font-bold">Teste Rápido</span>
                <span className="block text-[10px] text-[#92929F] font-normal">0 Créditos / Totalmente Grátis</span>
              </div>
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl text-xs text-[#F1416C] flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Login do Usuário */}
            <div>
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                Login do Usuário *
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={loginUsuario}
                  onChange={(e) => setLoginUsuario(e.target.value.replace(/\s/g, ''))}
                  placeholder="Ex: cliente123"
                  className={`w-full bg-[#1A1C24] border rounded-xl px-3.5 pr-10 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none font-mono transition-colors ${
                    loginUsuario.length > 0
                      ? validUsername ? 'border-[#50CD89]' : 'border-[#F1416C]'
                      : 'border-[#232530] focus:border-[#009EF7]'
                  }`}
                />
                <button
                  type="button"
                  onClick={generateRandomUser}
                  className="absolute right-2 p-1.5 rounded-lg text-[#5E6278] hover:text-white hover:bg-[#232530] transition-colors"
                  title="Gerar login aleatório"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>
              {loginUsuario.length > 0 && !validUsername && (
                <p className="text-[10px] text-[#F1416C] mt-1">Mínimo 8 caracteres, sem espaços, apenas letras, números, _ . -</p>
              )}
            </div>

            {/* Senha */}
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
                  placeholder="Ex: 123456"
                  className={`w-full bg-[#1A1C24] border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none font-mono transition-colors ${
                    senhaUsuario.length > 0
                      ? validPassword ? 'border-[#50CD89]' : 'border-[#F1416C]'
                      : 'border-[#232530] focus:border-[#009EF7]'
                  }`}
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 rounded-lg text-[#5E6278] hover:text-white hover:bg-[#232530]"
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
            </div>

            {/* Pacote / Bouquet */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                Pacote / Bouquet de Canais
              </label>
              <select
                value={bouquetId}
                onChange={(e) => setBouquetId(e.target.value)}
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#009EF7] cursor-pointer"
              >
                {bouquets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* If Official Client: Meses & Conexões */}
            {!isTrial ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#92929F] uppercase tracking-wider">
                      Tempo de Validade
                    </label>
                    <div className="flex items-center gap-1 bg-[#16171F] p-0.5 rounded-lg border border-[#232530]">
                      <button
                        type="button"
                        onClick={() => setDurationType('meses')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                          durationType === 'meses' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
                        }`}
                      >
                        Meses
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationType('dias')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                          durationType === 'dias' ? 'bg-[#009EF7] text-white' : 'text-[#92929F] hover:text-white'
                        }`}
                      >
                        Dias
                      </button>
                    </div>
                  </div>

                  {durationType === 'meses' ? (
                    <select
                      value={meses}
                      onChange={(e) => setMeses(Number(e.target.value))}
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#009EF7] cursor-pointer"
                    >
                      <option value={1}>1 Mês (30 dias)</option>
                      <option value={2}>2 Meses (60 dias)</option>
                      <option value={3}>3 Meses (Trimestral)</option>
                      <option value={6}>6 Meses (Semestral)</option>
                      <option value={12}>12 Meses (Anual)</option>
                    </select>
                  ) : (
                    <select
                      value={dias}
                      onChange={(e) => setDias(Number(e.target.value))}
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#009EF7] cursor-pointer"
                    >
                      <option value={7}>7 Dias (Semanal)</option>
                      <option value={15}>15 Dias (Quinzenal)</option>
                      <option value={30}>30 Dias (Mensal)</option>
                      <option value={45}>45 Dias</option>
                      <option value={60}>60 Dias (Bimestral)</option>
                      <option value={90}>90 Dias (Trimestral)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                    Quantidade de Telas / Conexões
                  </label>
                  <select
                    value={conectado}
                    onChange={(e) => setConectado(Number(e.target.value))}
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#009EF7] cursor-pointer"
                  >
                    <option value={1}>1 Tela Simultânea</option>
                    <option value={2}>2 Telas Simultâneas</option>
                    <option value={3}>3 Telas Simultâneas</option>
                    <option value={4}>4 Telas Simultâneas</option>
                    <option value={5}>5 Telas Simultâneas</option>
                  </select>
                </div>
              </>
            ) : (
              /* If Fast Test: Mode and Duration */
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-2">
                    Tipo de Teste Grátis
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTipoTeste('padrao')}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        tipoTeste === 'padrao'
                          ? 'bg-[#50CD89]/15 border-[#50CD89] text-white shadow-md shadow-emerald-500/10'
                          : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white'
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
                      onClick={() => setTipoTeste('maxplayer')}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        tipoTeste === 'maxplayer'
                          ? 'bg-[#8950FC]/15 border-[#8950FC] text-white shadow-md shadow-purple-500/10'
                          : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white'
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

                {tipoTeste === 'padrao' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                      Duração do Teste Gratuito
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 4, 6, 12].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHoras(h)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            horas === h
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
              </div>
            )}

            {/* Bloco Recolhível: Informações Extras (Opcional) */}
            <div className="md:col-span-2 border border-[#232530] rounded-xl overflow-hidden bg-[#161822]">
              <button
                type="button"
                onClick={() => setShowExtraFields(!showExtraFields)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#92929F] hover:text-white hover:bg-[#1A1C24] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Informações extras (Opcional - Nome, WhatsApp, Mensalidade, Anotações)</span>
                  {(nomeUsuario || whatsapp || subscriptionValue > 0 || notas) && (
                    <span className="w-2 h-2 rounded-full bg-[#009EF7]"></span>
                  )}
                </div>
                {showExtraFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showExtraFields && (
                <div className="p-4 pt-2 border-t border-[#232530] grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                  {/* Nome do Cliente */}
                  <div>
                    <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                      Nome Real / Apelido
                    </label>
                    <input
                      type="text"
                      value={nomeUsuario}
                      onChange={(e) => setNomeUsuario(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                      WhatsApp com DDD
                    </label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => handlePhoneInputChange(e, setWhatsapp)}
                      onPaste={(e) => handlePhoneInputPaste(e, setWhatsapp)}
                      onBlur={() => handlePhoneInputBlur(whatsapp, setWhatsapp)}
                      placeholder="Ex: (51) 99336-1718 ou 5551999998888"
                      className={`w-full bg-[#1A1C24] border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none transition-colors ${
                        whatsapp.length > 0
                          ? validWhatsapp ? 'border-[#50CD89]' : 'border-[#F1416C]'
                          : 'border-[#232530] focus:border-[#009EF7]'
                      }`}
                    />
                    {whatsapp.length > 0 && !validWhatsapp && (
                      <p className="text-[10px] text-[#F1416C] mt-1">Formato: informe o número com DDD (ex: 51 99999-8888)</p>
                    )}
                  </div>

                  {/* Valor da Assinatura */}
                  <div>
                    <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-[#50CD89]" />
                      <span>Valor da Mensalidade (R$)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={subscriptionValue || ''}
                      onChange={(e) => setSubscriptionValue(Number(e.target.value))}
                      placeholder="Ex: 35.00"
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono"
                    />
                    <p className="text-[10px] text-[#5E6278] mt-1">Valor cobrado mensalmente deste cliente.</p>
                  </div>

                  {/* Observações */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                      Anotações Internas
                    </label>
                    <textarea
                      rows={2}
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Observações visíveis apenas para você..."
                      className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl p-3 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Cost Summary & Submit Footer */}
          <div className="sticky bottom-4 z-20 backdrop-blur-md bg-[#14151C]/95 border border-[#232530] rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs w-full sm:w-auto justify-between sm:justify-start">
              <div>
                <span className="text-[#92929F] block text-[10px] uppercase font-bold tracking-wider">Custo da Operação</span>
                <span className={`font-bold text-sm ${isTrial ? 'text-[#50CD89]' : 'text-white'}`}>
                  {isTrial
                    ? '0 Créditos (Gratuito)'
                    : durationType === 'dias'
                      ? `${dias} dia(s) = ${totalCostCredits} Crédito`
                      : `${conectado} tela(s) × ${meses} mês(es) = ${totalCostCredits} Crédito(s)`}
                </span>
              </div>

              {!isTrial && (
                <div className="text-right sm:text-left">
                  <span className="text-[#92929F] block text-[10px] uppercase font-bold tracking-wider">Saldo Restante</span>
                  <span className={`font-bold font-mono text-sm ${hasEnoughCredits ? 'text-[#50CD89]' : 'text-[#F1416C]'}`}>
                    {isUnlimited ? '∞ Ilimitado' : `${Number(profile.credits) - totalCostCredits} Créditos`}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Link
                to="/customers"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#92929F] hover:bg-[#1A1C24] hover:text-white transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading || (!isTrial && !hasEnoughCredits)}
                className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-40 ${
                  isTrial
                    ? 'bg-[#50CD89] hover:bg-[#47be7d] shadow-emerald-500/20'
                    : 'bg-[#009EF7] hover:bg-[#0095E8] shadow-blue-500/20'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Provisionando na API...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{isTrial ? 'Gerar Teste Grátis' : 'Criar e Ativar Cliente'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Modal Playlist com os dados de acesso e mensagem WhatsApp personalizada */}
      {showPlaylistModal && createdCustomer && (
        <PlaylistModal
          customer={createdCustomer}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}

      {/* Modal Ativação de Aplicativo sob demanda */}
      {showMaxPlayerModal && createdCustomer && (
        <AppActivationModal
          customer={createdCustomer}
          onClose={() => setShowMaxPlayerModal(false)}
        />
      )}
    </div>
  );
};
