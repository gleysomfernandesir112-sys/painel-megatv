import React, { useState, useEffect } from 'react';
import { useSigmaStore } from '../store/SigmaStore';
import { APP_CONFIG, isHostedOnGithub } from '../config/appConfig';
import { Megaphone, Plus, Trash2, Pin, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

import { apiService } from '../services/apiService';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success';
  pinned: boolean;
  created_at: string;
  author: string;
  franchiseKey?: string;
}

const TYPE_STYLES = {
  info: { border: 'border-[#009EF7]/30', bg: 'bg-[#009EF7]/10', icon: <AlertCircle className="w-4 h-4 text-[#009EF7]" />, label: 'Informativo' },
  warning: { border: 'border-[#FF9900]/30', bg: 'bg-[#FF9900]/10', icon: <AlertCircle className="w-4 h-4 text-[#FF9900]" />, label: 'Atenção' },
  success: { border: 'border-[#50CD89]/30', bg: 'bg-[#50CD89]/10', icon: <CheckCircle2 className="w-4 h-4 text-[#50CD89]" />, label: 'Novidade' },
};

const getAnnounceEndpoints = () => {
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const qs = currentDomain ? `?domain=${encodeURIComponent(currentDomain)}` : '';
  return isHostedOnGithub()
    ? [`${APP_CONFIG.apiBaseUrl}/api/v1/announcements${qs}`]
    : [`/fastcdn-api/api/v1/announcements${qs}`, `${APP_CONFIG.apiBaseUrl}/api/v1/announcements${qs}`];
};

import { isPanelMaster } from '../utils/panelAuth';

export const AnnouncementsPage: React.FC = () => {
  const { profile } = useSigmaStore();
  const isMaster = isPanelMaster(profile?.username, profile);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success'>('info');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Headers com isolamento de franquia / white-label
  const getHeaders = () => {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    const masterKey = localStorage.getItem('sigma_master_key') || APP_CONFIG.defaultApiKey;
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-franchise-domain': currentDomain,
      'X-API-Key': masterKey,
      'Authorization': `Bearer ${masterKey}`,
      ...apiService.getAuthHeaders()
    };
  };

  // Busca comunicados REAIS isolados por este painel white-label
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const endpoints = getAnnounceEndpoints();
      let loaded = false;
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: getHeaders() });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.announcements)) {
              setAnnouncements(data.announcements);
              loaded = true;
              break;
            }
          }
        } catch { /* fallback */ }
      }
      if (!loaded) setAnnouncements([]);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const endpoints = getAnnounceEndpoints();
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ title, body, type, pinned })
          });
          if (res.ok) {
            await fetchAnnouncements();
            setTitle(''); setBody(''); setPinned(false); setType('info');
            setShowForm(false);
            break;
          }
        } catch { /* try next */ }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const endpoints = getAnnounceEndpoints();
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ action: 'delete', id })
          });
          if (res.ok) {
            await fetchAnnouncements();
            break;
          }
        } catch { /* try next */ }
      }
    } catch {}
  };

  const handleTogglePin = async (id: string) => {
    try {
      const endpoints = getAnnounceEndpoints();
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ action: 'toggle_pin', id })
          });
          if (res.ok) {
            await fetchAnnouncements();
            break;
          }
        } catch { /* try next */ }
      }
    } catch {}
  };

  const sorted = [...announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="space-y-6 select-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Avisos e Notificações Oficiais</h1>
          <p className="text-xs text-[#92929F] mt-1">
            {isMaster ? 'Publique comunicados em tempo real para todos os revendedores.' : 'Comunicados oficiais emitidos pela administração.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAnnouncements} title="Atualizar avisos"
            className="p-2.5 rounded-xl text-[#92929F] hover:text-white bg-[#14151C] border border-[#232530] transition-all cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isMaster && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0095E8] transition-all cursor-pointer shrink-0">
              <Plus className="w-4 h-4" />
              Novo Comunicado
            </button>
          )}
        </div>
      </div>

      {/* Formulário do Master */}
      {isMaster && showForm && (
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Criar Comunicado Oficial</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#92929F] mb-1.5 font-medium">Título do Comunicado</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ex.: Manutenção programada nos servidores"
                className="w-full px-3 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all" />
            </div>
            <div>
              <label className="block text-xs text-[#92929F] mb-1.5 font-medium">Categoria</label>
              <select value={type} onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white focus:outline-none focus:border-[#009EF7] transition-all">
                <option value="info">Informativo</option>
                <option value="warning">Atenção</option>
                <option value="success">Novidade</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#92929F] mb-1.5 font-medium">Mensagem Completa</label>
            <textarea rows={3} value={body} onChange={e => setBody(e.target.value)}
              placeholder="Descreva o comunicado detalhadamente para seus revendedores..."
              className="w-full px-3 py-2.5 bg-[#0F1014] border border-[#232530] rounded-xl text-xs text-white placeholder-[#5E6278] focus:outline-none focus:border-[#009EF7] transition-all resize-none" />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#009EF7]" />
              <span className="text-xs text-[#92929F]">Fixar no topo</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#92929F] bg-[#1A1C24] hover:text-white transition-all cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0095E8] transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Publicando...' : 'Publicar Comunicado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listagem Real */}
      {loading ? (
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-10 text-center text-xs text-[#92929F]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#009EF7]" />
          Carregando comunicados oficiais do servidor...
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-[#14151C] border border-[#1E202B] rounded-2xl p-10 text-center max-w-lg mx-auto my-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1C24] border border-[#262833] flex items-center justify-center mx-auto text-[#009EF7] shadow-inner">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhum comunicado oficial ativo</h3>
            <p className="text-xs text-[#92929F] mt-1.5 leading-relaxed max-w-sm mx-auto">
              {isMaster
                ? 'Você ainda não publicou comunicados para este painel. Use avisos para manter seus revendedores informados sobre novidades, manutenções ou recargas.'
                : 'Não há comunicados urgentes emitidos pela administração no momento. Quando novos avisos forem postados, eles aparecerão aqui em tempo real.'}
            </p>
          </div>
          {isMaster && (
            <div className="pt-1">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#009EF7] hover:bg-[#0095E8] transition-all shadow-lg cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Primeiro Comunicado</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(ann => {
            const s = TYPE_STYLES[ann.type] || TYPE_STYLES.info;
            return (
              <div key={ann.id} className={`bg-[#14151C] border ${s.border} rounded-xl p-4 ${s.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">{s.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{ann.title}</span>
                        {ann.pinned && <span className="text-[10px] font-bold bg-[#009EF7]/20 text-[#009EF7] px-1.5 py-0.5 rounded border border-[#009EF7]/30 inline-flex items-center gap-1"><Pin className="w-2.5 h-2.5" /> Fixado</span>}
                        <span className="text-[10px] text-[#5E6278]">{ann.created_at} · Administração</span>
                      </div>
                      <p className="text-xs text-[#92929F] mt-1.5 leading-relaxed whitespace-pre-line">{ann.body}</p>
                    </div>
                  </div>
                  {isMaster && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleTogglePin(ann.id)} title={ann.pinned ? 'Desafixar' : 'Fixar no Topo'}
                        className="p-1.5 rounded-lg text-[#92929F] hover:text-[#009EF7] hover:bg-[#009EF7]/10 transition-all cursor-pointer">
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(ann.id)} title="Excluir comunicado"
                        className="p-1.5 rounded-lg text-[#92929F] hover:text-[#F1416C] hover:bg-[#F1416C]/10 transition-all cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
