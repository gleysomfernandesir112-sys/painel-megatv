import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { X, Copy, Check, MessageSquare, Phone, Send, Clock, User } from 'lucide-react';
import { generateExpiryReminderMessage, getExpiryCountdown } from '../../utils/customerMetrics';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../../utils/phone';

interface QuickReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const QuickReminderModal: React.FC<QuickReminderModalProps> = ({ isOpen, onClose, customer }) => {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (customer && isOpen) {
      const initialMsg = generateExpiryReminderMessage(customer);
      setMessage(initialMsg);
      setPhone(customer.whatsapp || '');
      setCopied(false);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const countdown = getExpiryCountdown(customer);

  const cleanPhone = (num: string): string => {
    return num.replace(/\D/g, '');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback para document.execCommand
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendWhatsApp = () => {
    const rawNumber = normalizePhoneNumber(phone);
    const encodedText = encodeURIComponent(message);

    let url = '';
    if (rawNumber) {
      url = `https://api.whatsapp.com/send?phone=${rawNumber}&text=${encodedText}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#14151C] border border-[#1E202B] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1E202B] flex items-center justify-between bg-[#111218]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Mensagem Rápida de Vencimento</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30">
                  WhatsApp
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#92929F] mt-0.5">
                <span className="font-mono text-white">{customer.username}</span>
                {customer.name && customer.name !== customer.username && (
                  <span>• {customer.name}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#92929F] hover:text-white rounded-lg hover:bg-[#1E202B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Customer Summary Bar */}
          <div className="bg-[#1A1C24] border border-[#232530] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#FFA800]" />
              <span className="text-[#92929F]">Vencimento:</span>
              <span className="text-white font-semibold">{customer.expires_at}</span>
            </div>
            {countdown && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  countdown.tone === 'danger'
                    ? 'bg-[#F1416C]/15 text-[#F1416C] border-[#F1416C]/30'
                    : countdown.tone === 'warning'
                    ? 'bg-[#FFA800]/15 text-[#FFA800] border-[#FFA800]/30'
                    : 'bg-[#50CD89]/15 text-[#50CD89] border-[#50CD89]/30'
                }`}
              >
                {countdown.label}
              </span>
            )}
          </div>

          {/* WhatsApp Message Preview Bubble */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#92929F]">
              <span className="font-semibold text-white">Texto da Mensagem:</span>
              <span className="text-[11px] text-[#5E6278]">Você pode editar o texto abaixo antes de copiar/enviar</span>
            </div>

            <div className="relative rounded-xl border border-[#232530] bg-[#0E1015] p-3">
              {/* WhatsApp Balloon Visual */}
              <div className="bg-[#005C4B]/20 border border-[#005C4B]/40 rounded-xl p-3 text-white text-xs whitespace-pre-wrap font-sans leading-relaxed">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full bg-transparent text-white text-xs resize-none focus:outline-none placeholder-[#5E6278]"
                  placeholder="Escreva sua mensagem personalizada..."
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Destination Phone */}
          <div className="space-y-1">
            <label className="text-xs text-[#92929F] flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-[#50CD89]" />
              <span>Número de WhatsApp do Cliente (opcional para envio direto):</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => handlePhoneInputChange(e, setPhone)}
              onPaste={(e) => handlePhoneInputPaste(e, setPhone)}
              onBlur={() => handlePhoneInputBlur(phone, setPhone)}
              placeholder="Ex: (51) 99336-1718 ou 5551999998888"
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#25D366]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1E202B] bg-[#111218] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white border border-[#232530] text-xs font-semibold transition-all cursor-pointer"
          >
            Fechar
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                copied
                  ? 'bg-[#50CD89] text-white'
                  : 'bg-[#1E202B] hover:bg-[#2B2D3D] text-white border border-[#2B2D3D]'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-[#92929F]" />}
              <span>{copied ? 'Copiado! ✓' : 'Copiar Mensagem'}</span>
            </button>

            {/* Send WhatsApp Button */}
            <button
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-green-500/20"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
