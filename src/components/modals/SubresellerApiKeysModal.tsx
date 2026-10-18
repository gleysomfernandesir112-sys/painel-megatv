import React, { useState, useEffect } from 'react';
import { apiService, SubresellerApiKey } from '../../services/apiService';
import { X, Key, Plus, Trash2, Copy, Check, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface SubresellerApiKeysModalProps {
  reseller: {
    username: string;
    name?: string;
  };
  onClose: () => void;
}

export const SubresellerApiKeysModal: React.FC<SubresellerApiKeysModalProps> = ({
  reseller,
  onClose
}) => {
  const [keys, setKeys] = useState<SubresellerApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.listSubresellerApiKeys(reseller.username);
      setKeys(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Erro ao listar chaves de API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [reseller.username]);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    try {
      const res = await apiService.generateSubresellerApiKey(
        reseller.username,
        newKeyName.trim() || 'Chave WhatsApp Bot'
      );
      const generated = res.chave_api || res.key || res.token;
      if (generated) {
        setCreatedKey(generated);
      }
      setNewKeyName('');
      await fetchKeys();
    } catch (err: any) {
      setError(err.message || 'Erro ao emitir nova chave de API.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Tem certeza que deseja revogar esta chave de API? Bots configurados com ela perderão acesso imediatamente.')) {
      return;
    }
    try {
      await apiService.revokeSubresellerApiKey(keyId);
      await fetchKeys();
    } catch (err: any) {
      alert(err.message || 'Erro ao revogar chave de API.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262833] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#009EF7]/15 flex items-center justify-center text-[#009EF7]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Chaves de API para Bots & Integrações</h3>
              <p className="text-[11px] text-[#92929F]">Sub-Revenda: <span className="text-white font-mono">{reseller.username}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#5E6278] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-[#F1416C]/10 border border-[#F1416C]/30 rounded-xl text-xs text-[#F1416C] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* New Key Alert Banner */}
          {createdKey && (
            <div className="p-3.5 bg-[#50CD89]/10 border border-[#50CD89]/30 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-[#50CD89]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Nova Chave Emitida com Sucesso!</span>
                </span>
                <button onClick={() => setCreatedKey(null)} className="text-[#92929F] hover:text-white text-[11px]">
                  Fechar
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdKey}
                  className="flex-1 bg-[#14151C] border border-[#232530] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
                <button
                  onClick={() => copyToClipboard(createdKey, 'new_key')}
                  className="px-3 py-1.5 bg-[#50CD89] text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {copiedKeyId === 'new_key' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKeyId === 'new_key' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <p className="text-[10px] text-[#92929F]">
                Envie esta chave para configurar no WhatsAuto, WhatsApp Bot ou sistema de cobrança.
              </p>
            </div>
          )}

          {/* Form to generate new key */}
          <form onSubmit={handleGenerateKey} className="flex gap-2">
            <input
              type="text"
              placeholder="Identificação da chave (ex: WhatsAuto Bot)..."
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-[#1A1C24] border border-[#232530] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7]"
            />
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 bg-[#009EF7] hover:bg-[#0095E8] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Gerando...' : 'Emitir Chave'}</span>
            </button>
          </form>

          {/* Existing Keys List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#92929F] uppercase tracking-wider font-semibold">
              <span>Chaves Ativas do Parceiro</span>
              <button onClick={fetchKeys} className="hover:text-white p-1" title="Atualizar lista">
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-xs text-[#5E6278]">Carregando chaves...</div>
            ) : keys.length === 0 ? (
              <div className="p-6 bg-[#1A1C24] rounded-xl border border-[#232530] text-center text-xs text-[#5E6278]">
                Nenhuma chave de API emitida ainda para esta sub-revenda.
              </div>
            ) : (
              keys.map((k) => (
                <div key={k.id || k.key} className="p-3 bg-[#1A1C24] border border-[#232530] rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-semibold truncate">{k.name || 'Chave API'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30">
                        {k.status || 'ATIVA'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#5E6278] truncate mt-0.5">
                      {k.key ? `${k.key.substring(0, 16)}...` : 'fcdn_live_••••••••'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {k.key && (
                      <button
                        onClick={() => copyToClipboard(k.key, k.id)}
                        className="p-1.5 rounded-lg bg-[#14151C] hover:bg-[#232530] text-[#92929F] hover:text-white transition-all"
                        title="Copiar Chave Completa"
                      >
                        {copiedKeyId === k.id ? <Check className="w-3.5 h-3.5 text-[#50CD89]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="p-1.5 rounded-lg bg-[#14151C] hover:bg-[#F1416C]/20 text-[#92929F] hover:text-[#F1416C] transition-all"
                      title="Revogar Chave de API"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
