import React, { useState } from 'react';
import { useSigmaStore } from '../store/SigmaStore';
import { ShieldCheck, ShieldAlert, Smartphone, Send, Mail, CheckCircle2, Lock } from 'lucide-react';

export const AccountSecurity: React.FC = () => {
  const { profile, setTwoFactor } = useSigmaStore();
  const [selectedMethod, setSelectedMethod] = useState<'app' | 'telegram' | 'email'>('app');

  const handleToggle2FA = () => {
    setTwoFactor(!profile.two_factor_enabled);
  };

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Segurança da Conta & 2FA</h1>
        <p className="text-xs text-[#92929F] mt-1">
          Proteja seu painel administrativo com verificação em duas etapas e logs de auditoria.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2FA Status Card */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E202B] pb-3">
            <h2 className="text-sm font-bold text-white">Status do 2FA</h2>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              profile.two_factor_enabled
                ? 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                : 'bg-[#F1416C]/15 text-[#F1416C] border-[#F1416C]/30'
            }`}>
              {profile.two_factor_enabled ? 'Ativado' : 'Desativado'}
            </span>
          </div>

          <p className="text-xs text-[#92929F]">
            A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta exigindo um código de verificação a cada login.
          </p>

          <button
            onClick={handleToggle2FA}
            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
              profile.two_factor_enabled
                ? 'bg-[#F1416C] text-white hover:bg-[#d6305a]'
                : 'bg-[#009EF7] text-white hover:bg-[#0095E8]'
            }`}
          >
            {profile.two_factor_enabled ? 'Desativar 2FA' : 'Ativar Proteção 2FA'}
          </button>
        </div>

        {/* 2FA Methods */}
        <div className="lg:col-span-2 bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Métodos de Verificação Disponíveis</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => setSelectedMethod('app')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMethod === 'app'
                  ? 'bg-[#009EF7]/10 border-[#009EF7]'
                  : 'bg-[#1A1C24] border-[#232530] hover:border-[#323545]'
              }`}
            >
              <Smartphone className="w-5 h-5 text-[#009EF7] mb-2" />
              <div className="text-xs font-bold text-white">Aplicativo Authenticator</div>
              <div className="text-[11px] text-[#92929F] mt-1">Google Auth, Authy ou 1Password</div>
            </div>

            <div
              onClick={() => setSelectedMethod('telegram')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMethod === 'telegram'
                  ? 'bg-[#009EF7]/10 border-[#009EF7]'
                  : 'bg-[#1A1C24] border-[#232530] hover:border-[#323545]'
              }`}
            >
              <Send className="w-5 h-5 text-[#009EF7] mb-2" />
              <div className="text-xs font-bold text-white">Telegram Bot</div>
              <div className="text-[11px] text-[#92929F] mt-1">Receba códigos via Telegram Bot</div>
            </div>

            <div
              onClick={() => setSelectedMethod('email')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMethod === 'email'
                  ? 'bg-[#009EF7]/10 border-[#009EF7]'
                  : 'bg-[#1A1C24] border-[#232530] hover:border-[#323545]'
              }`}
            >
              <Mail className="w-5 h-5 text-[#009EF7] mb-2" />
              <div className="text-xs font-bold text-white">E-mail Cadastrado</div>
              <div className="text-[11px] text-[#92929F] mt-1">Códigos enviados por e-mail</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
