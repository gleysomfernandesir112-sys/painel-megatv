import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_CONFIG } from '../config/appConfig';
import { fastCdnApi } from '../services/fastcdn';
import { MasterKeyStore } from '../utils/auth';
import {
  Key, ShieldCheck, ArrowRight, AlertCircle, RefreshCw,
  Eye, EyeOff, Settings, CheckCircle2
} from 'lucide-react';

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'key' | 'password' | 'done'>('key');

  // Step 1: API Key
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [masterUsername, setMasterUsername] = useState('');

  // Step 2: Panel Password
  const [panelPass, setPanelPass] = useState('');
  const [panelPassConfirm, setPanelPassConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [loadingPass, setLoadingPass] = useState(false);

  const handleValidateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    const trimmed = apiKey.trim();
    if (!trimmed || trimmed.length < 10) {
      setKeyError('Insira uma chave API válida (fcdn_live_...).');
      return;
    }
    setLoadingKey(true);
    try {
      fastCdnApi.setApiKey(trimmed, false); // temporary
      const resumo = await fastCdnApi.getResumo();
      if (!resumo || (resumo.status !== 'success' && resumo.creditos === undefined)) {
        throw new Error('Chave inválida ou sem permissão de acesso à API.');
      }
      const revInfo: any = resumo.revendedor || resumo;
      const login = revInfo.login || resumo.usuario || resumo.login || 'master';
      setMasterUsername(login);
      setStep('password');
    } catch (err: any) {
      setKeyError(err.message || 'Erro ao validar a chave. Verifique e tente novamente.');
      fastCdnApi.clearApiKey();
    } finally {
      setLoadingKey(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    if (panelPass.length < 6) {
      setPassError('A senha do painel deve ter no mínimo 6 caracteres.');
      return;
    }
    if (panelPass !== panelPassConfirm) {
      setPassError('As senhas não coincidem.');
      return;
    }
    setLoadingPass(true);
    try {
      MasterKeyStore.set(apiKey.trim());
      MasterKeyStore.setMasterUsername(masterUsername);
      await MasterKeyStore.setMasterPassword(panelPass);
      fastCdnApi.setApiKey(apiKey.trim(), true);
      setStep('done');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setPassError('Erro ao salvar configurações: ' + err.message);
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1014] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#009EF7]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#9C27B0]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E91E63] to-[#9C27B0] text-white text-2xl font-black shadow-xl shadow-pink-500/20 mb-3">
            {APP_CONFIG.logoIcon}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{APP_CONFIG.appName}</h1>
          <p className="text-xs text-[#92929F] mt-1 font-medium">Configuração Inicial do Painel</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {(['key', 'password', 'done'] as const).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                step === s ? 'bg-[#009EF7] border-[#009EF7] text-white' :
                (i < ['key', 'password', 'done'].indexOf(step)) ? 'bg-[#009EF7]/20 border-[#009EF7] text-[#009EF7]' :
                'bg-[#1A1C24] border-[#232530] text-[#5E6278]'
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`h-px w-8 ${i < ['key', 'password', 'done'].indexOf(step) ? 'bg-[#009EF7]' : 'bg-[#232530]'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: API Key */}
        {step === 'key' && (
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-7 shadow-2xl space-y-5">
            <div className="border-b border-[#1E202B] pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#009EF7]" />
                <span>Passo 1 — Chave API Master</span>
              </h2>
              <p className="text-xs text-[#92929F] mt-1 leading-relaxed">
                Insira a chave de API Master. Ela será salva de forma segura e usada para validar logins de revendedores.
              </p>
            </div>

            {keyError && (
              <div className="p-3.5 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl text-xs text-[#F1416C] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{keyError}</div>
              </div>
            )}

            <form onSubmit={handleValidateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                  Chave de API Master
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#5E6278] absolute left-3.5 top-3" />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="fcdn_live_..."
                    autoComplete="off"
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] font-mono tracking-wider"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-2.5 text-[#5E6278] hover:text-white">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingKey}
                className="w-full py-3 rounded-xl text-xs font-bold bg-[#009EF7] hover:bg-[#0095E8] disabled:opacity-50 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                {loadingKey ? <><RefreshCw className="w-4 h-4 animate-spin" /> Validando...</> : <><ShieldCheck className="w-4 h-4" /> Validar Chave</>}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Panel Password */}
        {step === 'password' && (
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-7 shadow-2xl space-y-5">
            <div className="border-b border-[#1E202B] pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#50CD89]" />
                <span>Passo 2 — Senha do Painel</span>
              </h2>
              <p className="text-xs text-[#92929F] mt-1 leading-relaxed">
                Chave validada com sucesso! Conta master: <span className="text-[#009EF7] font-bold">{masterUsername}</span>.<br />
                Agora defina a senha de login para o painel.
              </p>
            </div>

            {passError && (
              <div className="p-3.5 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl text-xs text-[#F1416C] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{passError}</div>
              </div>
            )}

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                  Senha do Painel (Master)
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={panelPass}
                    onChange={(e) => setPanelPass(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    className="w-full bg-[#1A1C24] border border-[#232530] rounded-xl pl-4 pr-10 py-2.5 text-sm text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-[#5E6278] hover:text-white">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                <div className="flex gap-1 mt-1.5">
                  {[1,2,3,4].map(n => (
                    <div key={n} className={`h-1 flex-1 rounded-full transition-all ${
                      panelPass.length >= n * 3 ? (n <= 2 ? 'bg-[#F1416C]' : n === 3 ? 'bg-[#FFA800]' : 'bg-[#50CD89]') : 'bg-[#232530]'
                    }`} />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#92929F] uppercase tracking-wider mb-1.5">
                  Confirmar Senha
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={panelPassConfirm}
                  onChange={(e) => setPanelPassConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  className={`w-full bg-[#1A1C24] border rounded-xl pl-4 pr-4 py-2.5 text-sm text-white placeholder-[#5E6278] focus:outline-none transition-colors ${
                    panelPassConfirm && panelPass !== panelPassConfirm ? 'border-[#F1416C]' : panelPassConfirm && panelPass === panelPassConfirm ? 'border-[#50CD89]' : 'border-[#232530] focus:border-[#009EF7]'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={loadingPass}
                className="w-full py-3 rounded-xl text-xs font-bold bg-[#50CD89] hover:bg-[#47be7d] disabled:opacity-50 text-white flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all cursor-pointer"
              >
                {loadingPass ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</> : <><Settings className="w-4 h-4" /> Finalizar Configuração</>}
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-7 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#50CD89]/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-[#50CD89]" />
            </div>
            <h2 className="text-base font-bold text-white">Painel Configurado!</h2>
            <p className="text-xs text-[#92929F]">Redirecionando para o login...</p>
          </div>
        )}

        <p className="text-center text-xs text-[#5E6278] mt-6">
          Já tem o painel configurado?{' '}
          <Link to="/login" className="text-[#009EF7] hover:underline">Fazer Login</Link>
        </p>
      </div>
    </div>
  );
};
