import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import {
  FileText, KeyRound, Copy, Check, Edit2, Save, X, ExternalLink,
  Sparkles, CheckCircle2, AlertCircle, Smartphone
} from 'lucide-react';
import { useSigmaStore } from '../../store/SigmaStore';

interface CustomerNotesModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerNotesModal: React.FC<CustomerNotesModalProps> = ({
  customer,
  isOpen,
  onClose
}) => {
  const { updateCustomer } = useSigmaStore();
  const [isEditing, setIsEditing] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLine, setCopiedLine] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    if (customer) {
      setNotesText(customer.notes || '');
      setIsEditing(false);
      setStatusMsg(null);
      setCopied(false);
      setCopiedLine(null);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleCopyAll = async () => {
    if (!notesText.trim()) return;
    try {
      await navigator.clipboard.writeText(notesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = notesText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopySingle = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedLine(text.trim());
      setTimeout(() => setCopiedLine(null), 1800);
    } catch {}
  };

  const handleSave = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await updateCustomer(customer.id, {
        notes: notesText.trim()
      });
      if (res.success) {
        customer.notes = notesText.trim();
        setStatusMsg({ success: true, text: 'Notas atualizadas com sucesso!' });
        setIsEditing(false);
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ success: false, text: res.message || 'Erro ao salvar notas.' });
      }
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Erro ao comunicar com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  // Helper para verificar se a linha tem cara de link ou código importante
  const lines = notesText.split('\n');
  const hasNotes = notesText.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 animate-fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262833] shrink-0 bg-[#161722]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFB800]/15 flex items-center justify-center text-[#FFB800] border border-[#FFB800]/30 shadow-sm">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm tracking-wide">
                  Acessos Remotos & Notas
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFB800]/15 text-[#FFB800] font-bold border border-[#FFB800]/30">
                  {customer.username}
                </span>
              </div>
              <p className="text-[11px] text-[#92929F] mt-0.5">
                Códigos de apps (IBO, Roku, Smart TV), credenciais e notas internas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1F212D] text-[#92929F] hover:text-white hover:bg-[#2A2C3C] flex items-center gap-1.5 transition-all cursor-pointer border border-[#282B38]"
                title="Editar notas"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#009EF7]" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1F212D] transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notificação Toast */}
        {statusMsg && (
          <div className={`mx-4 mt-3 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 animate-fade-in shrink-0 border ${
            statusMsg.success
              ? 'bg-[#50CD89]/10 text-[#50CD89] border-[#50CD89]/30'
              : 'bg-[#F1416C]/10 text-[#F1416C] border-[#F1416C]/30'
          }`}>
            {statusMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
        )}

        {/* Conteúdo Central */}
        <div className="p-4 md:p-5 overflow-y-auto space-y-4 flex-1">
          {isEditing ? (
            /* Modo de Edição */
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 bg-[#1A1C24] rounded-xl border border-[#282B38] text-[11px] text-[#92929F] space-y-1">
                <span className="text-white font-semibold flex items-center gap-1.5 text-[#FFB800]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Dica de Organização:
                </span>
                <p>
                  Você pode colar aqui os cômodos (SALA, QUARTO), endereços MAC, Device Keys, senhas de upstream ou links de ativação (ex: iboplayer.com).
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#92929F] uppercase tracking-wider">
                  Notas / Códigos de Acesso do Cliente:
                </label>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={10}
                  className="w-full rounded-xl p-3.5 text-xs font-mono text-[#E1E3EA] focus:outline-none leading-relaxed resize-y border border-[#282B38] focus:border-[#FFB800] transition-all"
                  style={{ backgroundColor: '#1A1C24', color: '#E1E3EA' }}
                  placeholder="Ex:&#10;SALA&#10;EC:2B:EB:F4:7E:AC&#10;270777&#10;https://iboplayer.com"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setNotesText(customer.notes || '');
                    setIsEditing(false);
                  }}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1C1E28] hover:bg-[#272A38] text-[#92929F] hover:text-white transition-all cursor-pointer border border-[#292B3A]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#FFB800] hover:bg-[#E5A600] text-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? 'Salvando...' : 'Salvar Notas'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Modo de Visualização */
            <div className="space-y-3">
              {hasNotes ? (
                <>
                  <div className="flex items-center justify-between text-[11px] text-[#92929F]">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#FFB800]" />
                      Códigos de ativação e anotações gravadas:
                    </span>
                    <span className="font-mono text-[10px] text-[#5E6278]">
                      {lines.length} linhas
                    </span>
                  </div>

                  {/* Caixa de Texto Principal com Fundo Cinza Escuro Fixo */}
                  <div
                    className="rounded-xl p-4 text-[12px] font-mono leading-relaxed max-h-[50vh] overflow-y-auto whitespace-pre-wrap select-text border border-[#282B38] shadow-inner"
                    style={{ backgroundColor: '#1A1C24', color: '#E1E3EA' }}
                  >
                    {lines.map((line, idx) => {
                      const trimmed = line.trim();
                      const isUrl = /^https?:\/\//i.test(trimmed);
                      const isRoom = /^(SALA|QUARTO|COZINHA|TV|DISPOSITIVO|ROKU|FIRE|SMART|IBO)/i.test(trimmed);
                      const isMac = /^([0-9a-f]{2}[:-]){5}([0-9a-f]{2})/i.test(trimmed);
                      const isCode = /^\d{5,8}$/.test(trimmed);

                      return (
                        <div key={idx} className="flex items-center justify-between group hover:bg-white/[0.03] px-1 py-0.5 rounded -mx-1 transition-colors">
                          <span className={`break-all ${
                            isRoom
                              ? 'text-[#FFB800] font-bold text-[13px] tracking-wide mt-1 inline-block'
                              : isMac
                              ? 'text-[#00E5FF] font-semibold'
                              : isCode
                              ? 'text-[#50CD89] font-bold'
                              : isUrl
                              ? 'text-[#009EF7] underline cursor-pointer'
                              : 'text-[#E1E3EA]'
                          }`}>
                            {line || '\u00A0'}
                          </span>

                          {/* Ações rápidas por linha (abrir link ou copiar código) */}
                          {trimmed.length > 0 && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 ml-2">
                              {isUrl ? (
                                <a
                                  href={trimmed}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-[#009EF7]/20 hover:bg-[#009EF7] text-[#009EF7] hover:text-white text-[10px] flex items-center gap-1 transition-all"
                                  title="Abrir link no navegador"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="text-[9px]">Abrir</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCopySingle(trimmed)}
                                  className="p-1 rounded bg-[#282B38] hover:bg-[#FFB800] text-[#92929F] hover:text-black text-[10px] transition-all cursor-pointer"
                                  title={`Copiar "${trimmed}"`}
                                >
                                  {copiedLine === trimmed ? (
                                    <Check className="w-3 h-3 text-[#50CD89]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Estado Vazio */
                <div className="p-8 text-center space-y-3 bg-[#1A1C24]/50 rounded-2xl border border-[#262833]">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFB800]/10 border border-[#FFB800]/20 flex items-center justify-center text-[#FFB800] mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Nenhum código ou nota cadastrada</h4>
                    <p className="text-xs text-[#92929F] mt-1 max-w-xs mx-auto">
                      Guarde aqui os dados de ativação remota (MAC, Device Key, links de portais como IBO Player) para facilitar a manutenção das listas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FFB800] hover:bg-[#E5A600] text-black inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Adicionar Códigos / Notas</span>
                  </button>
                </div>
              )}

              {/* Botões Inferiores */}
              {hasNotes && (
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#1C1E28] hover:bg-[#272A38] text-[#92929F] hover:text-white transition-all cursor-pointer border border-[#292B3A]"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="flex-1 py-2.5 px-4 bg-[#FFB800] hover:bg-[#E5A600] text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 transition-all cursor-pointer hover:scale-[1.01]"
                    title="Copiar todas as anotações do cliente"
                  >
                    {copied ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Todas as Notas Copiadas!' : 'Copiar Tudo'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
