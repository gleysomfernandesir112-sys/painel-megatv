import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { useSigmaStore } from '../../store/SigmaStore';
import { fastCdnApi, FastCdnLista } from '../../services/fastcdn';
import { APP_CONFIG } from '../../config/appConfig';
import { normalizePhoneNumber, handlePhoneInputChange, handlePhoneInputPaste, handlePhoneInputBlur } from '../../utils/phone';
import {
  UserCheck,
  X,
  Check,
  Eye,
  EyeOff,
  Phone,
  Layers,
  Tv,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  DollarSign
} from 'lucide-react';

interface EditCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  customer,
  isOpen,
  onClose
}) => {
  const { updateCustomer, refreshLiveData } = useSigmaStore();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [connections, setConnections] = useState(1);
  const [selectedBouquet, setSelectedBouquet] = useState(APP_CONFIG.defaultBouquetId);
  const [notes, setNotes] = useState('');
  const [subscriptionValue, setSubscriptionValue] = useState<number>(0);

  const [bouquets, setBouquets] = useState<FastCdnLista[]>([
    { id: 'bq_completo', nome: 'COMPLETO C/ ADULTOS', padrao: true },
    { id: 'bq_sem_adulto', nome: 'COMPLETO S/ ADULTOS', padrao: false }
  ]);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name || customer.username || '');
      setPassword('');
      setWhatsapp(customer.whatsapp || '');
      setConnections(customer.connections_max || customer.connections_count || 1);
      setSelectedBouquet(customer.package_id || customer.package || APP_CONFIG.defaultBouquetId);
      setNotes(customer.notes || '');
      setSubscriptionValue(Number((customer as any).subscription_value) || 0);
      setStatusMsg(null);
    }
  }, [customer]);

  useEffect(() => {
    fastCdnApi.getListas().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setBouquets(list);
      }
    }).catch(() => {});
  }, []);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const updates: Partial<Customer> = {
        name: name.trim(),
        whatsapp: normalizePhoneNumber(whatsapp),
        connections_max: Number(connections) || 1,
        package_id: selectedBouquet,
        package_name: bouquets.find(b => b.id === selectedBouquet)?.nome || selectedBouquet,
        package: selectedBouquet,
        notes: notes.trim(),
        subscription_value: subscriptionValue || 0
      } as any;

      if (password && password.trim().length >= 3) {
        updates.password = password.trim();
      }

      const res = await updateCustomer(customer.id, updates);
      setStatusMsg({ success: res.success, text: res.message });

      if (res.success) {
        await refreshLiveData();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Erro ao salvar alterações.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="bg-[#15171E] border border-[#262833] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262833] flex items-center justify-between shrink-0 bg-[#12131A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#009EF7]/15 flex items-center justify-center text-[#009EF7]">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Editar Cliente</h3>
              <p className="text-[11px] text-[#92929F]">Atualize as credenciais e configurações da conta</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#92929F] hover:text-white p-1 rounded-lg hover:bg-[#1A1C24] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Customer Badge */}
          <div className="bg-[#1A1C24] border border-[#232530] p-3 rounded-xl flex items-center justify-between text-xs">
            <div>
              <div className="text-[11px] text-[#92929F]">Usuário do Cliente</div>
              <div className="text-white font-mono font-bold text-sm">{customer.username}</div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#009EF7]/15 text-[#009EF7] text-[10px] font-bold border border-[#009EF7]/30 uppercase">
              {customer.status}
            </span>
          </div>

          {/* Nome de Exibição */}
          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: João Silva"
              className="w-full px-3.5 py-2.5 bg-[#14151C] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all"
            />
          </div>

          {/* Redefinir Senha */}
          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center justify-between">
              <span>Nova Senha</span>
              <span className="text-[10px] text-[#5E6278] font-normal">Deixe em branco para manter a atual</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a nova senha se desejar alterar"
                className="w-full px-3.5 py-2.5 bg-[#14151C] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6278] hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* WhatsApp & Telas em 2 Colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#50CD89]" />
                <span>WhatsApp</span>
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => handlePhoneInputChange(e, setWhatsapp)}
                onPaste={(e) => handlePhoneInputPaste(e, setWhatsapp)}
                onBlur={() => handlePhoneInputBlur(whatsapp, setWhatsapp)}
                placeholder="Ex: (51) 99336-1718 ou 5551999998888"
                className="w-full px-3.5 py-2.5 bg-[#14151C] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1">
                <Tv className="w-3.5 h-3.5 text-[#009EF7]" />
                <span>Conexões Simultâneas (Telas)</span>
              </label>
              <select
                value={connections}
                onChange={(e) => setConnections(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#14151C] border border-[#232530] rounded-xl text-xs text-white focus:outline-none focus:border-[#009EF7] transition-all"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Tela (Padrão)' : 'Telas simultâneas'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pacote / Bouquet */}
          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#FF9900]" />
              <span>Pacote de Conteúdo (Bouquet)</span>
            </label>
            <div className="space-y-1.5">
              {bouquets.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedBouquet(pkg.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedBouquet === pkg.id
                      ? 'bg-[#009EF7]/10 border-[#009EF7] text-white'
                      : 'bg-[#14151C] border-[#232530] text-[#92929F] hover:text-white hover:bg-[#1A1C24]'
                  }`}
                >
                  <div className="text-xs font-semibold">{pkg.nome}</div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedBouquet === pkg.id
                        ? 'border-[#009EF7] bg-[#009EF7] text-white'
                        : 'border-[#232530]'
                    }`}
                  >
                    {selectedBouquet === pkg.id && <Check className="w-3 h-3" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas Internas */}
          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#92929F]" />
              <span>Observações / Notas Internas</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Dispositivo Smart TV na sala, preferência por canais de esporte..."
              className="w-full px-3.5 py-2.5 bg-[#14151C] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all resize-none"
            />
          </div>

          {/* Valor de Assinatura */}
          <div>
            <label className="block text-xs font-semibold text-[#92929F] mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-[#50CD89]" />
              <span>Valor da Assinatura (R$)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={subscriptionValue}
              onChange={(e) => setSubscriptionValue(Number(e.target.value))}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 bg-[#14151C] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all font-mono"
            />
            <p className="text-[10px] text-[#5E6278] mt-1">Valor mensal que este cliente paga. Usado no cálculo de receita.</p>
          </div>

          {/* Feedback message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.success
                  ? 'bg-[#50CD89]/15 border border-[#50CD89]/30 text-[#50CD89]'
                  : 'bg-[#F1416C]/15 border border-[#F1416C]/30 text-[#F1416C]'
              }`}
            >
              {statusMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#262833]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#92929F] hover:text-white bg-[#1A1C24] hover:bg-[#232530] transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0095E8] shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
