import React, { useState, useMemo } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { Customer } from '../../types';
import { isDirectCustomer, isRealCustomer, parseExpiryDate, generateExpiryReminderMessage, isExpiringSoon, getCustomerPrice } from '../../utils/customerMetrics';
import { apiService } from '../../services/apiService';
import { APP_CONFIG, isHostedOnGithub, getFranchiseDomain, useBrandConfig } from '../../config/appConfig';
import {
  Search, Plus, RefreshCw, Tv, MoreVertical, Trash2, Ban,
  LayoutGrid, List, Calendar, Package, Server, Sparkles, Zap, SlidersHorizontal,
  AlertTriangle, X, ChevronLeft, ChevronRight, ChevronDown, Phone, Users, Filter,
  Edit2,
  DollarSign,
  CheckCircle2,
  UserCheck,
  Layers,
  ShieldCheck,
  Shield,
  FileText,
  KeyRound,
  Smartphone,
  Tv2,
  Pencil,
  Monitor,
  MonitorUp,
  CalendarPlus,
  CalendarClock,
  ToggleRight,
  ToggleLeft,
  Check,
  Clock,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  RotateCcw,
  Square,
  Download,
  Share2
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { RenewModal } from '../../components/modals/RenewModal';
import { PlaylistModal } from '../../components/modals/PlaylistModal';
import { AddCourtesyDaysModal } from '../../components/modals/AddCourtesyDaysModal';
import { ChangePackageModal } from '../../components/modals/ChangePackageModal';
import { QuickTestModal } from '../../components/modals/QuickTestModal';
import { EditCustomerModal } from '../../components/modals/EditCustomerModal';
import { QuickReminderModal } from '../../components/modals/QuickReminderModal';
import { CustomerNotesModal } from '../../components/modals/CustomerNotesModal';
import { AppActivationModal } from '../../components/modals/AppActivationModal';
import { MaxPlayerDetailsModal } from '../../components/modals/MaxPlayerDetailsModal';
import { BulkRenewModal } from '../../components/modals/BulkRenewModal';
import { BulkCourtesyModal } from '../../components/modals/BulkCourtesyModal';
import { BulkChangePackageModal } from '../../components/modals/BulkChangePackageModal';
import { BulkChangeScreensModal } from '../../components/modals/BulkChangeScreensModal';
import { BulkSetPriceModal } from '../../components/modals/BulkSetPriceModal';

const STATUS_TABS = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ACTIVE', label: 'Ativos' },
  { key: 'TRIAL', label: 'Testes' },
  { key: 'EXPIRED', label: 'Vencidos' },
  { key: 'BLOCKED', label: 'Bloqueados' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ACTIVE:  { bg: 'bg-[#50CD89]/15', text: 'text-[#50CD89]', border: 'border-[#50CD89]/30', label: 'ATIVO' },
  TRIAL:   { bg: 'bg-[#FF9900]/15', text: 'text-[#FF9900]', border: 'border-[#FF9900]/30', label: 'TESTE' },
  EXPIRED: { bg: 'bg-[#F1416C]/15', text: 'text-[#F1416C]', border: 'border-[#F1416C]/30', label: 'VENCIDO' },
  BLOCKED: { bg: 'bg-[#7239EA]/15', text: 'text-[#7239EA]', border: 'border-[#7239EA]/30', label: 'BLOQUEADO' },
};

const PAGE_SIZE = 20;

export const CustomersListing: React.FC = () => {
  const { customers, profile, deleteCustomer, toggleBlockCustomer, updateCustomer, refreshLiveData, isLoadingLive, reactivateMaxPlayer } = useSigmaStore();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search.replace(/^.*\?/, ''));
  const urlReseller = urlParams.get('reseller') || '';
  const urlScope = (urlParams.get('scope') || '').toUpperCase();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeOperationalFilters, setActiveOperationalFilters] = useState<Set<string>>(new Set());

  const toggleOperationalFilter = (filterKey: string) => {
    setActiveOperationalFilters(prev => {
      const next = new Set(prev);
      if (next.has(filterKey)) next.delete(filterKey);
      else next.add(filterKey);
      return next;
    });
  };

  const clearAllFilters = () => {
    setStatusFilter('ALL');
    setActiveOperationalFilters(new Set());
    setSearchTerm('');
    setResellerFilter('');
    setScopeFilter('DIRECT');
  };

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    if (filterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterMenuOpen]);
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'DIRECT' | 'RESELLERS'>(
    urlReseller ? 'RESELLERS' : (urlScope === 'ALL' || urlScope === 'RESELLERS' || urlScope === 'DIRECT' ? (urlScope as any) : 'DIRECT')
  );
  const [resellerFilter, setResellerFilter] = useState(urlReseller);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [bulkRenewOpen, setBulkRenewOpen] = useState(false);
  const [bulkCourtesyOpen, setBulkCourtesyOpen] = useState(false);
  const [bulkPackageOpen, setBulkPackageOpen] = useState(false);
  const [bulkScreensOpen, setBulkScreensOpen] = useState(false);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const brand = useBrandConfig();
  const franchisePrimary = brand.primaryColor || APP_CONFIG.primaryColor || '#009EF7';

  // URLs de streaming para cópias diretas de M3U e dados de acesso
  const dnsDomain = (APP_CONFIG.defaultDns || '').trim();
  const rawBase = (APP_CONFIG.panelUrl || '').trim();
  const serverUrl = useMemo(() => {
    if (dnsDomain) {
      return dnsDomain.startsWith('http') ? dnsDomain : `http://${dnsDomain}`;
    }
    if (rawBase && rawBase.length > 3) {
      return rawBase.startsWith('http') ? rawBase : `http://${rawBase}`;
    }
    return APP_CONFIG.apiBaseUrl || 'https://fastcdn.fit';
  }, [dnsDomain, rawBase]);

  const cleanServerDomain = useMemo(() => {
    try {
      return new URL(serverUrl).host;
    } catch {
      return serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || 'lurkcdn.online:80';
    }
  }, [serverUrl]);

  const shortBase = cleanServerDomain.includes('lurkcdn.online')
    ? 'http://e.lurkcdn.online'
    : `http://${cleanServerDomain}`;

  const [copyFeedback, setCopyFeedback] = useState<{ [key: string]: string }>({});
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [sortExpiryOrder, setSortExpiryOrder] = useState<'asc' | 'desc' | null>(null);
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const showToast = (msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => {
      setGlobalToast(prev => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleCopyM3u = async (c: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${serverUrl}/get.php?username=${encodeURIComponent(c.username)}&password=${encodeURIComponent(c.password || '')}&type=m3u_plus&output=mpegts`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback(prev => ({ ...prev, [c.id]: 'M3U Copiada!' }));
      showToast('Link M3U completo copiado!');
      setTimeout(() => {
        setCopyFeedback(prev => {
          const next = { ...prev };
          delete next[c.id];
          return next;
        });
      }, 2000);
    } catch {}
  };

  const handleCopyShortM3u = async (c: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${shortBase}/p/${encodeURIComponent(c.username)}/${encodeURIComponent(c.password || '')}/m3u`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback(prev => ({ ...prev, [c.id]: 'M3U Curta Copiada!' }));
      showToast('Link M3U curto copiado!');
      setTimeout(() => {
        setCopyFeedback(prev => {
          const next = { ...prev };
          delete next[c.id];
          return next;
        });
      }, 2000);
    } catch {}
  };

  const isCustomerExpired = (c: any) => {
    if (c.status === 'EXPIRED') return true;
    const exp = parseExpiryDate(c);
    return exp ? exp.getTime() < Date.now() : false;
  };

  const handleCopyCredentials = async (c: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const partner = (c.partnerApp || c.partner_app) as any;
    const isMax = Boolean(partner && (partner.appName?.toLowerCase().includes('max') || partner.appUser) && !isCustomerExpired(c));
    const maxUser = partner?.appUser || c.username;
    const maxPass = partner?.appPassword || c.password || '******';

    let text = `🎉 *Seus Dados de Acesso:*\n\n👤 *Usuário:* ${c.username}\n🔑 *Senha:* ${c.password || '******'}\n📅 *Vencimento:* ${c.expires_at || ''}\n📶 *Telas:* ${c.connections_max || c.max_connections || 1}\n🌐 *Servidor:* ${serverUrl}\n\n📺 *Lista M3U (Link Curto):*\n${shortBase}/p/${encodeURIComponent(c.username)}/${encodeURIComponent(c.password || '')}/m3u\n\n📺 *Lista Completa (M3U):*\n${serverUrl}/get.php?username=${encodeURIComponent(c.username)}&password=${encodeURIComponent(c.password || '')}&type=m3u_plus&output=mpegts`;

    if (isMax) {
      text += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n🚀 *Acesso Max Player:*\n👤 *Usuário MaxPlayer:* ${maxUser}\n🔑 *Senha MaxPlayer:* ${maxPass}\n🌐 *DNS / Provedor:* fastcdn.fit\n━━━━━━━━━━━━━━━━━━━━━━`;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(prev => ({ ...prev, [c.id]: 'Dados Copiados!' }));
      showToast('Dados de acesso copiados com sucesso!');
      setTimeout(() => {
        setCopyFeedback(prev => {
          const next = { ...prev };
          delete next[c.id];
          return next;
        });
      }, 2000);
    } catch {}
  };



  const handleReactivateMaxPlayer = async (c: any) => {
    try {
      const res = await reactivateMaxPlayer(c.username || c.id, 30);
      if (res.success) {
        showToast(res.message);
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(`Erro ao reativar MaxPlayer: ${err.message || 'Falha de comunicação'}`);
    }
  };

  const handleDeactivateMaxPlayer = async (c: any, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Deseja realmente desativar o aplicativo MaxPlayer do cliente ${c.username}?`)) {
      return;
    }
    try {
      await apiService.revokePartnerApp({
        username: c.username,
        customerId: c.id,
        appType: 'maxplayer',
        appName: 'MaxPlayer'
      });
      const existingPartner = (c.partnerApp || c.partner_app || {}) as any;
      const deactivatedPartner = {
        ...existingPartner,
        appName: 'MaxPlayer',
        status: 'inactive',
        is_active: false,
        is_inactive: true,
        is_deactivated: true,
        deactivatedAt: new Date().toISOString(),
        deactivationReason: 'Desativado pelo revendedor'
      };
      await updateCustomer(c.id, {
        partnerApp: deactivatedPartner,
        partner_app: deactivatedPartner
      });
      alert(`Aplicativo MaxPlayer desativado com sucesso para ${c.username}!`);
      refreshLiveData();
    } catch (err: any) {
      alert(`Erro ao desativar MaxPlayer: ${err.message || 'Falha de comunicação'}`);
    }
  };

  const handleDeactivateDevice = async (c: any, dev: any, skipConfirm = false) => {
    const devName = dev?.appName || dev?.app_name || 'Aplicativo Parceiro';
    const devMac = dev?.mac || '';
    if (!skipConfirm && !window.confirm(`Deseja realmente desativar e desvincular o aplicativo ${devName} (MAC: ${devMac}) do cliente ${c.username}?`)) {
      return;
    }
    try {
      await apiService.revokePartnerApp({
        username: c.username,
        customerId: c.id,
        mac: devMac,
        gerenciaAppId: dev?.gerenciaAppId || dev?.id,
        appType: 'gerenciaapp',
        appName: devName
      });
      // Remove somente esse dispositivo da lista de dispositivos do cliente
      const cleanDevMac = String(devMac).replace(/[^a-f\d]/gi, '').toUpperCase();
      const remainingDevices = ((c.partnerDevices || []) as any[]).filter((d: any) => {
        const dClean = String(d.mac || '').replace(/[^a-f\d]/gi, '').toUpperCase();
        return dClean !== cleanDevMac;
      });

      // Preserva o partnerApp se for MaxPlayer, senão aponta para o próximo dispositivo restante
      const existingPartner = c.partnerApp || c.partner_app;
      const isMax = Boolean(existingPartner?.appName?.toLowerCase().includes('max') || (existingPartner?.appUser && !existingPartner?.mac));
      let newPartner = existingPartner;
      if (!isMax) {
        newPartner = remainingDevices.length > 0 ? remainingDevices[0] : null;
      }

      await updateCustomer(c.id, {
        partnerApp: newPartner,
        partner_app: newPartner,
        partnerDevices: remainingDevices
      });
      alert(`Aplicativo ${devName} (MAC: ${devMac}) desativado com sucesso!`);
      refreshLiveData();
    } catch (err: any) {
      alert(`Erro ao desativar dispositivo: ${err.message || 'Falha de comunicação'}`);
    }
  };

  const handleDeactivateApp = async (c: any, skipConfirm = false) => {
    const partner = (c.partnerApp || c.partner_app) as any;
    const isMax = Boolean(partner?.appName?.toLowerCase().includes('max') || (partner?.appUser && !partner?.mac));
    if (isMax) {
      return handleDeactivateMaxPlayer(c, skipConfirm);
    }
    if (partner?.mac) {
      return handleDeactivateDevice(c, partner, skipConfirm);
    }
    // Fallback genérico
    const appName = partner?.appName || 'Aplicativo Parceiro';
    if (!skipConfirm && !window.confirm(`Deseja realmente desativar o aplicativo ${appName} do cliente ${c.username}?`)) {
      return;
    }
    try {
      await apiService.revokePartnerApp({ username: c.username, customerId: c.id });
      await updateCustomer(c.id, { partnerApp: null, partner_app: null, partnerDevices: [] });
      alert(`Aplicativo desativado com sucesso!`);
      refreshLiveData();
    } catch (err: any) {
      alert(`Erro ao desativar: ${err.message || 'Falha de comunicação'}`);
    }
  };

  const [renewTarget, setRenewTarget] = useState<Customer | null>(null);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [playlistTarget, setPlaylistTarget] = useState<Customer | null>(null);
  const [reminderTarget, setReminderTarget] = useState<Customer | null>(null);
  const [courtesyTarget, setCourtesyTarget] = useState<Customer | null>(null);
  const [packageTarget, setPackageTarget] = useState<Customer | null>(null);
  const [notesTarget, setNotesTarget] = useState<Customer | null>(null);
  const [quickTestOpen, setQuickTestOpen] = useState(false);
  const [appActivationTarget, setAppActivationTarget] = useState<Customer | null>(null);
  const [maxPlayerDetailsTarget, setMaxPlayerDetailsTarget] = useState<Customer | null>(null);

  // Verifica se está no domínio tvfast.lat (franquia parceira) ou é admin
  const franchiseDomain = getFranchiseDomain();
  const isPartnerFranchise = (
    franchiseDomain.includes('tvfast.lat') ||
    franchiseDomain.includes('painel-fast-iptv') ||
    (profile && (profile.role === 'admin' || (profile.username && profile.username.toLowerCase() === 'andre2056') || (profile as any)?.is_admin === true))
  );


  const handleOpenReminder = async (c: Customer) => {
    setReminderTarget(c);
    try {
      const msg = generateExpiryReminderMessage(c);
      await navigator.clipboard.writeText(msg);
    } catch {}
  };

  // Sanitização rigorosa: revendedores e administradores NUNCA aparecem como clientes nem são contabilizados
  const sanitizedCustomers = React.useMemo(() => {
    return (customers || []).filter(isRealCustomer);
  }, [customers]);

  // Lista única de donos/revendedores presentes nos clientes (apenas sub-revendas da rede, excluindo carteira direta)
  const uniqueResellers = React.useMemo(() => {
    const set = new Set<string>();
    sanitizedCustomers.forEach((c: any) => {
      const rName = (c.reseller_username || '').trim();
      const rLower = rName.toLowerCase();
      if (
        rName &&
        rLower !== 'revendedor' &&
        rLower !== 'admin' &&
        rLower !== 'direto' &&
        rLower !== 'andre2056' &&
        !isDirectCustomer(c, profile)
      ) {
        set.add(rName);
      }
    });
    return Array.from(set).sort();
  }, [sanitizedCustomers, profile]);

  const hasResellerData = uniqueResellers.length > 1;

  // Totais para separação Carteira Direta vs Sub-Revendas
  const totalAll = sanitizedCustomers.length;
  const totalDirect = sanitizedCustomers.filter((c: any) => isDirectCustomer(c, profile)).length;
  const totalResellers = totalAll - totalDirect;

  // Parser inteligente de busca textual e comandos (vence:3, sem:zap, telas:2, etc.)
  const parseSearchQuery = (query: string, customer: any, now: number) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    // Comandos de vencimento
    if (q.startsWith('vence:') || q === 'hoje' || q === 'vencido' || q === 'vencidos') {
      const expDate = parseExpiryDate(customer);
      const isExp = isCustomerExpired(customer);
      if (q === 'hoje' || q === 'vence:hoje' || q === 'vence:1') {
        if (!expDate || isExp) return false;
        const diffDays = (expDate.getTime() - now) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 1;
      }
      if (q === 'vence:3' || q === 'vence:3d') {
        if (!expDate || isExp) return false;
        const diffDays = (expDate.getTime() - now) / (1000 * 60 * 60 * 24);
        return diffDays > 0 && diffDays <= 3;
      }
      if (q === 'vence:7' || q === 'vence:7d') {
        if (!expDate || isExp) return false;
        const diffDays = (expDate.getTime() - now) / (1000 * 60 * 60 * 24);
        return diffDays > 0 && diffDays <= 7;
      }
      if (q === 'vencido' || q === 'vencidos' || q === 'vence:0') {
        return isExp;
      }
    }

    if (q === 'sem:zap' || q === 'sem:whatsapp' || q === 'semzap') {
      return !customer.whatsapp || customer.whatsapp.trim().length < 6;
    }

    if (q === 'sem:nome' || q === 'semnome') {
      return !customer.name || customer.name.trim() === '' || customer.name.toLowerCase() === 'desconhecido' || customer.name.toLowerCase() === 'usuário teste';
    }

    if (q.startsWith('telas:') || q.startsWith('tela:') || q === 'multitela') {
      const match = q.match(/tela[s]?:(\d+)/);
      const req = match ? parseInt(match[1], 10) : 2;
      return (customer.connections_max || 1) >= req;
    }

    if (q === 'sem:valor' || q === 'sem:preco' || q === 'zero') {
      return getCustomerPrice(customer) === 0;
    }

    if (q === 'parceiro' || q === 'com:parceiro' || q === 'app:parceiro' || q === 'apps') {
      const p = customer.partnerApp || customer.partner_app;
      const devs = (customer as any).partnerDevices || [];
      return Boolean(p || devs.length > 0);
    }

    if (q === 'sem:parceiro' || q === 'semparceiro') {
      const p = customer.partnerApp || customer.partner_app;
      const devs = (customer as any).partnerDevices || [];
      return !p && devs.length === 0;
    }

    if (q === 'inativo' || q === 'inativos' || q === 'vencido' || q === 'vencidos') {
      return isCustomerExpired(customer);
    }

    if (q === 'ativo' || q === 'ativos') {
      return !isCustomerExpired(customer) && customer.status !== 'BLOCKED';
    }

    // Busca textual ampla padrão com suporte a dados de apps parceiros, MAC e revendedor
    const cleanMacSearch = q.replace(/[^a-z0-9]/g, '');
    const p = (customer.partnerApp || customer.partner_app) as any;
    const devs = ((customer as any).partnerDevices || []) as any[];

    const matchesPartner = Boolean(
      (p && (
        (p.appName && p.appName.toLowerCase().includes(q)) ||
        (p.app_name && p.app_name.toLowerCase().includes(q)) ||
        (p.appUser && p.appUser.toLowerCase().includes(q)) ||
        (p.mac && cleanMacSearch && p.mac.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanMacSearch))
      )) ||
      (devs.some(d =>
        (d.appName && d.appName.toLowerCase().includes(q)) ||
        (d.mac && cleanMacSearch && d.mac.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanMacSearch)) ||
        (d.clientUsername && d.clientUsername.toLowerCase().includes(q))
      )) ||
      (customer.mac && cleanMacSearch && customer.mac.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanMacSearch))
    );

    return (
      (customer.username || '').toLowerCase().includes(q) ||
      ((customer.name || '').toLowerCase().includes(q)) ||
      (customer.whatsapp && customer.whatsapp.includes(q)) ||
      (customer.notes && customer.notes.toLowerCase().includes(q)) ||
      ((customer.dono || '').toLowerCase().includes(q)) ||
      ((customer.reseller_username || '').toLowerCase().includes(q)) ||
      matchesPartner
    );
  };

  const filtered = sanitizedCustomers.filter((c: any) => {
    const now = Date.now();
    const matchSearch = parseSearchQuery(searchTerm, c, now);

    const matchStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'TRIAL'
          ? (c.status === 'TRIAL' || c.is_trial)
          : statusFilter === 'ACTIVE'
            ? (c.status === 'ACTIVE' || (c.status === 'TRIAL' && c.is_trial))
            : c.status === statusFilter;
    
    // Filtro por escopo (Todos / Diretos / Sub-Revendas)
    const isDirect = isDirectCustomer(c, profile);

    const matchScope =
      scopeFilter === 'ALL'
        ? true
        : scopeFilter === 'DIRECT'
          ? isDirect
          : !isDirect;

    const matchReseller = !resellerFilter || (c.reseller_username || '').toLowerCase() === resellerFilter.toLowerCase();

    // Filtros operacionais combináveis (interseção estrita quando múltiplos ativos)
    if (activeOperationalFilters.size > 0) {
      const expDate = parseExpiryDate(c);
      const isExp = isCustomerExpired(c);
      const diffDays = expDate ? (expDate.getTime() - now) / (1000 * 60 * 60 * 24) : null;

      if (activeOperationalFilters.has('EXPIRING_TODAY')) {
        if (!expDate || isExp || diffDays === null || diffDays < 0 || diffDays > 1) return false;
      }
      if (activeOperationalFilters.has('EXPIRING_3')) {
        if (!expDate || isExp || diffDays === null || diffDays <= 0 || diffDays > 3) return false;
      }
      if (activeOperationalFilters.has('EXPIRING_7')) {
        if (!expDate || isExp || diffDays === null || diffDays <= 0 || diffDays > 7) return false;
      }
      if (activeOperationalFilters.has('EXPIRED')) {
        if (!isExp) return false;
      }
      if (activeOperationalFilters.has('ACTIVE_ONLY')) {
        if (isExp || c.status === 'BLOCKED') return false;
      }
      if (activeOperationalFilters.has('WITH_PARTNER_APP')) {
        const p = c.partnerApp || c.partner_app;
        const devs = (c as any).partnerDevices || [];
        if (!p && devs.length === 0) return false;
      }
      if (activeOperationalFilters.has('WITHOUT_PARTNER_APP')) {
        const p = c.partnerApp || c.partner_app;
        const devs = (c as any).partnerDevices || [];
        if (p || devs.length > 0) return false;
      }
      if (activeOperationalFilters.has('NO_WHATSAPP')) {
        if (c.whatsapp && c.whatsapp.trim().length >= 6) return false;
      }
      if (activeOperationalFilters.has('NO_NAME')) {
        if (c.name && c.name.trim() !== '' && c.name.toLowerCase() !== 'desconhecido' && c.name.toLowerCase() !== 'usuário teste') return false;
      }
      if (activeOperationalFilters.has('MULTI_SCREEN')) {
        if ((c.connections_max || 1) < 2) return false;
      }
      if (activeOperationalFilters.has('NO_PRICE')) {
        if (getCustomerPrice(c) > 0) return false;
      }
      if (activeOperationalFilters.has('NEVER_CONNECTED')) {
        if (c.last_activity || c.lastActivity || Number(c.telas_ativas || 0) > 0) return false;
      }
    }

    return matchSearch && matchStatus && matchScope && matchReseller;
  });

  // Ordenação inteligente por proximidade de vencimento:
  // 1. Clientes ativos/a vencer aparecem primeiro, ordenados do que vence antes (ex: 1 dia) até os com mais tempo
  // 2. Clientes vencidos são empurrados para o final da lista (e entre si, os que venceram mais recentemente aparecem primeiro)
  const sortedCustomers = React.useMemo(() => {
    const now = Date.now();

    const getExpiryTime = (c: any): number => {
      const parsed = parseExpiryDate(c);
      return parsed ? parsed.getTime() : Infinity;
    };

    return [...filtered].sort((a: any, b: any) => {
      const timeA = getExpiryTime(a);
      const timeB = getExpiryTime(b);

      if (sortExpiryOrder === 'asc') {
        if (timeA !== timeB) return timeA - timeB;
        return (a.username || '').localeCompare(b.username || '');
      }
      if (sortExpiryOrder === 'desc') {
        if (timeA !== timeB) return timeB - timeA;
        return (a.username || '').localeCompare(b.username || '');
      }

      const isExpA = a.status === 'EXPIRED' || timeA <= now;
      const isExpB = b.status === 'EXPIRED' || timeB <= now;

      // 1. Clientes ativos/válidos vêm antes de clientes vencidos
      if (!isExpA && isExpB) return -1;
      if (isExpA && !isExpB) return 1;

      // 2. Ambos são ativos: quem vence mais cedo vem primeiro (menor timestamp)
      // Ex: faltam poucas horas < faltam 1 dia (amanhã) < faltam 3 dias < faltam 30 dias < ilimitado (Infinity)
      if (!isExpA && !isExpB) {
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return (a.username || '').localeCompare(b.username || '');
      }

      // 3. Ambos estão vencidos: quem venceu mais recentemente vem primeiro (maior timestamp)
      // Ex: venceu ontem (-1d) antes de quem venceu há 30 dias (-30d)
      if (timeA !== timeB) {
        if (timeA === Infinity) return 1;
        if (timeB === Infinity) return -1;
        return timeB - timeA;
      }

      return (a.username || '').localeCompare(b.username || '');
    });
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / PAGE_SIZE));
  const paged = sortedCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filter changes
  React.useEffect(() => { setPage(1); }, [searchTerm, statusFilter, activeOperationalFilters, scopeFilter, resellerFilter]);

  // Sync URL reseller & scope params when location changes
  React.useEffect(() => {
    const params = new URLSearchParams(location.search.replace(/^.*\?/, ''));
    const reseller = params.get('reseller') || '';
    const scope = (params.get('scope') || '').toUpperCase();
    if (reseller) {
      setResellerFilter(reseller);
      setScopeFilter('RESELLERS');
    } else if (scope === 'ALL' || scope === 'RESELLERS' || scope === 'DIRECT') {
      setScopeFilter(scope as any);
      setResellerFilter('');
    } else {
      // Prioriza sempre abrir o filtro em Meus Clientes Diretos ao entrar na tela
      setScopeFilter('DIRECT');
      setResellerFilter('');
    }
  }, [location.key, location.search]);

  // Base para contagem das abas de status (respeita busca, escopo e revendedor, mas não o statusFilter atual)
  const baseForCounts = customers.filter((c: any) => {
    const matchSearch =
      (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((c.name || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.whatsapp && c.whatsapp.includes(searchTerm));

    const isDirect = isDirectCustomer(c, profile);
    const matchScope =
      scopeFilter === 'ALL'
        ? true
        : scopeFilter === 'DIRECT'
          ? isDirect
          : !isDirect;

    const matchReseller = !resellerFilter || (c.reseller_username || '').toLowerCase() === resellerFilter.toLowerCase();
    return matchSearch && matchScope && matchReseller;
  });

  const counts = {
    ALL: baseForCounts.length,
    ACTIVE: baseForCounts.filter((c: any) => c.status === 'ACTIVE' || (c.status === 'TRIAL' && c.is_trial)).length,
    TRIAL: baseForCounts.filter((c: any) => c.status === 'TRIAL' || c.is_trial).length,
    EXPIRED: baseForCounts.filter((c: any) => c.status === 'EXPIRED').length,
    BLOCKED: baseForCounts.filter((c: any) => c.status === 'BLOCKED').length,
  };

  // Contagens operacionais para os modos de trabalho (Cobrança, Organização e Financeiro)
  const operationalCounts = useMemo(() => {
    const now = Date.now();
    let today = 0;
    let in3d = 0;
    let in7d = 0;
    let expired = 0;
    let activeOnly = 0;
    let withPartner = 0;
    let withoutPartner = 0;
    let noZap = 0;
    let noName = 0;
    let multi = 0;
    let noPrice = 0;
    let never = 0;

    baseForCounts.forEach((c: any) => {
      const expDate = parseExpiryDate(c);
      const isExp = isCustomerExpired(c);
      if (isExp) {
        expired++;
      } else {
        if (c.status !== 'BLOCKED') activeOnly++;
        if (expDate) {
          const diffMs = expDate.getTime() - now;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays <= 1) today++;
          if (diffDays > 0 && diffDays <= 3) in3d++;
          if (diffDays > 0 && diffDays <= 7) in7d++;
        }
      }

      const hasApp = Boolean(c.partnerApp || c.partner_app || ((c as any).partnerDevices && (c as any).partnerDevices.length > 0));
      if (hasApp) withPartner++;
      else withoutPartner++;

      if (!c.whatsapp || c.whatsapp.trim().length < 6) noZap++;
      if (!c.name || c.name.trim() === '' || c.name.toLowerCase() === 'desconhecido' || c.name.toLowerCase() === 'usuário teste') noName++;
      if ((c.connections_max || 1) >= 2) multi++;
      if (getCustomerPrice(c) === 0) noPrice++;
      if (!c.last_activity && !c.lastActivity && Number(c.telas_ativas || 0) === 0) never++;
    });

    return {
      today,
      in3d,
      in7d,
      expired,
      activeOnly,
      withPartner,
      withoutPartner,
      noZap,
      noName,
      multi,
      noPrice,
      never,
      totalPending: today + in3d + expired + noZap
    };
  }, [baseForCounts]);

  const getStatusBadge = (status: Customer['status'], isExpired?: boolean) => {
    if (status === 'BLOCKED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7239EA]/15 text-[#7239EA] border border-[#7239EA]/30 inline-flex items-center gap-1">
          <Ban className="w-2.5 h-2.5 shrink-0" />
          <span>BLOQUEADO</span>
        </span>
      );
    }
    if (isExpired || status === 'EXPIRED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1416C]/15 text-[#F1416C] border border-[#F1416C]/30 inline-flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 shrink-0 text-[#F1416C]" />
          <span>VENCIDO</span>
        </span>
      );
    }
    if (status === 'TRIAL') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 inline-flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 shrink-0" />
          <span>TESTE</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#50CD89]/15 text-[#50CD89] border border-[#50CD89]/30 inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#50CD89] animate-pulse shrink-0" />
        <span>ATIVO</span>
      </span>
    );
  };

  const getExpiryBadge = (c: Customer) => {
    const expDate = parseExpiryDate(c);
    if (!expDate) return null;
    const now = Date.now();
    const diffMs = expDate.getTime() - now;
    const isExp = c.status === 'EXPIRED' || diffMs <= 0;

    if (isExp) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F1416C]/15 text-[#F1416C] border border-[#F1416C]/30">
          Vencido
        </span>
      );
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours <= 12) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F1416C]/20 text-[#F1416C] border border-[#F1416C]/40 animate-pulse">
          {Math.max(1, diffHours)}h restantes
        </span>
      );
    }
    if (diffHours <= 24) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40">
          Vence hoje
        </span>
      );
    }
    if (diffDays <= 2) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30">
          1 dia restante
        </span>
      );
    }
    if (diffDays <= 5) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30">
          {diffDays} dias
        </span>
      );
    }

    return null;
  };

  const handleDelete = async (customer: Customer) => {
    setDeletingId(customer.id);
    setDeleteConfirm(null);
    await deleteCustomer(customer.id, 'Removido pelo painel');
    setDeletingId(null);
  };

  const handleToggleBlock = async (customer: Customer) => {
    setBlockingId(customer.id);
    setActionMenuOpenId(null);
    await toggleBlockCustomer(customer.id);
    setBlockingId(null);
  };

  const handleToggleSelectCustomer = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllPaged = () => {
    const pagedIds = paged.map((c: any) => c.id);
    const allSelected = pagedIds.every((id: string) => selectedCustomerIds.has(id));
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pagedIds.forEach((id: string) => next.delete(id));
      } else {
        pagedIds.forEach((id: string) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkBlock = async () => {
    if (selectedCustomerIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      for (const id of Array.from(selectedCustomerIds)) {
        const cust = customers.find(c => c.id === id);
        if (cust && cust.status !== 'BLOCKED') {
          await toggleBlockCustomer(id);
        }
      }
      showToast(`${selectedCustomerIds.size} clientes bloqueados com sucesso!`);
      setSelectedCustomerIds(new Set());
    } catch {
      showToast('Erro ao bloquear clientes em massa.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUnblock = async () => {
    if (selectedCustomerIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      for (const id of Array.from(selectedCustomerIds)) {
        const cust = customers.find(c => c.id === id);
        if (cust && (cust.status === 'BLOCKED' || cust.status === 'EXPIRED')) {
          await toggleBlockCustomer(id);
        }
      }
      showToast(`${selectedCustomerIds.size} clientes desbloqueados e reativados!`);
      setSelectedCustomerIds(new Set());
    } catch {
      showToast('Erro ao desbloquear clientes em massa.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomerIds.size === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir os ${selectedCustomerIds.size} clientes selecionados?`)) return;
    setBulkActionLoading(true);
    try {
      for (const id of Array.from(selectedCustomerIds)) {
        await deleteCustomer(id, 'Exclusão em massa');
      }
      showToast(`${selectedCustomerIds.size} clientes excluídos com sucesso!`);
      setSelectedCustomerIds(new Set());
    } catch {
      showToast('Erro ao excluir clientes em massa.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const selectedCustomersList = useMemo(() => {
    return customers.filter(c => selectedCustomerIds.has(c.id));
  }, [customers, selectedCustomerIds]);

  const handleBulkExportWhatsApp = () => {
    if (selectedCustomersList.length === 0) return;
    const lines = [
      `📋 *CLIENTES SELECIONADOS (${selectedCustomersList.length})*`,
      `📅 Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      '----------------------------------------'
    ];
    selectedCustomersList.forEach((c, idx) => {
      lines.push(`${idx + 1}. *${c.username}* | Venc: ${c.expires_at || '-'} | Telas: ${c.connections_max || 1}${c.whatsapp ? ` | Zap: ${c.whatsapp}` : ''}`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
    showToast(`Lista de ${selectedCustomersList.length} clientes copiada para o WhatsApp!`);
  };

  const handleBulkExportCsv = () => {
    if (selectedCustomersList.length === 0) return;
    const headers = ['Usuário', 'Nome', 'WhatsApp', 'Status', 'Vencimento', 'Telas', 'Plano'];
    const rows = selectedCustomersList.map(c => [
      `"${c.username}"`,
      `"${c.name || ''}"`,
      `"${c.whatsapp || ''}"`,
      `"${c.status}"`,
      `"${c.expires_at || ''}"`,
      `"${c.connections_max || 1}"`,
      `"${c.package_name || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clientes_selecionados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Arquivo CSV exportado com sucesso!`);
  };

  return (
    <div className="space-y-5" onClick={() => setActionMenuOpenId(null)}>
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#14151C] border border-[#F1416C]/30 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F1416C]/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#F1416C]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirmar Exclusão</h3>
                <p className="text-xs text-[#92929F]">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-xs text-[#92929F] mb-5 leading-relaxed">
              Tem certeza que deseja excluir o cliente{' '}
              <span className="text-white font-bold font-mono">{deleteConfirm.username}</span>?
              O cliente será removido do servidor e movido para a lixeira.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-white text-xs font-semibold border border-[#232530] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-[#F1416C] hover:bg-[#e0385f] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Clientes & Testes</h1>
          <p className="text-xs text-[#92929F] mt-0.5">
            {resellerFilter ? (
              <>Revendedor: <span className="text-[#009EF7] font-semibold">{resellerFilter}</span> — {counts.ALL} clientes • {counts.ACTIVE} ativos</>
            ) : scopeFilter === 'DIRECT' ? (
              <><span className="text-white font-semibold">Carteira Direta:</span> {totalDirect} clientes • {counts.ACTIVE} ativos • {counts.EXPIRED} vencidos</>
            ) : scopeFilter === 'RESELLERS' ? (
              <><span className="text-white font-semibold">Clientes de Revendas:</span> {totalResellers} clientes • {counts.ACTIVE} ativos • {counts.EXPIRED} vencidos{hasResellerData && ` • ${uniqueResellers.length} revendedores`}</>
            ) : (
              <>{totalAll} clientes no total • {counts.ACTIVE} ativos • {counts.EXPIRED} vencidos{hasResellerData && ` • ${uniqueResellers.length} revendedores`}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => refreshLiveData()}
            disabled={isLoadingLive}
            className="p-2 bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white border border-[#232530] rounded-lg transition-all disabled:opacity-50"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setQuickTestOpen(true)}
            className="px-3.5 py-2 bg-[#1A1C24] hover:bg-[#232530] text-white border border-[#232530] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: APP_CONFIG.primaryColor }} />
            <span className="hidden sm:inline">Teste Rápido</span>
          </button>
          <Link
            to="/customers/add"
            className="px-4 py-2 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:brightness-110"
            style={{ backgroundColor: APP_CONFIG.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </Link>
          {/* View mode toggle com destaque */}
          <div className="flex items-center bg-[#1A1C24] border border-[#232530] rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards' ? 'text-white shadow-sm' : 'text-[#92929F] hover:text-white'
              }`}
              style={viewMode === 'cards' ? { backgroundColor: franchisePrimary } : undefined}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'text-white shadow-sm' : 'text-[#92929F] hover:text-white'
              }`}
              style={viewMode === 'table' ? { backgroundColor: franchisePrimary } : undefined}
              title="Visualização em Tabela"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🧭 Barra Unificada de Filtros e Modos de Operação (Compacta no Topo) */}
      <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-2 sm:p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-2.5">
        {/* Linha 1 (Mobile) / Esquerda (Desktop): Abas de Carteira + Status + Fila Operacional */}
        <div className="flex items-center gap-2 w-full lg:w-auto min-w-0 flex-1">
          {/* Scroll horizontal único contendo Carteira e Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
            {/* 1. Abas de Escopo: Meus Clientes / Revendas / Toda a Rede */}
            <div className="flex items-center gap-1 bg-[#1A1C24] p-1 rounded-lg border border-[#232530] shrink-0">
              <button
                onClick={() => { setScopeFilter('DIRECT'); setResellerFilter(''); }}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  scopeFilter === 'DIRECT' && !resellerFilter
                    ? 'text-white shadow-xs'
                    : 'text-[#92929F] hover:text-white'
                }`}
                style={scopeFilter === 'DIRECT' && !resellerFilter ? { backgroundColor: APP_CONFIG.primaryColor } : undefined}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span><span className="hidden sm:inline">Meus </span>Clientes</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/40 font-mono font-bold">{totalDirect}</span>
              </button>

              <button
                onClick={() => { setScopeFilter('RESELLERS'); }}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  scopeFilter === 'RESELLERS'
                    ? 'text-white shadow-xs'
                    : 'text-[#92929F] hover:text-white'
                }`}
                style={scopeFilter === 'RESELLERS' ? { backgroundColor: APP_CONFIG.primaryColor } : undefined}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Revendas</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/40 font-mono font-bold">{totalResellers}</span>
              </button>

              <button
                onClick={() => { setScopeFilter('ALL'); setResellerFilter(''); }}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  scopeFilter === 'ALL' && !resellerFilter
                    ? 'text-white shadow-xs'
                    : 'text-[#92929F] hover:text-white'
                }`}
                style={scopeFilter === 'ALL' && !resellerFilter ? { backgroundColor: APP_CONFIG.primaryColor } : undefined}
              >
                <Layers className="w-3.5 h-3.5" />
                <span><span className="hidden sm:inline">Toda a </span>Rede</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/40 font-mono font-bold">{totalAll}</span>
              </button>
            </div>

            <div className="h-6 w-px bg-[#232530] shrink-0" />

            {/* 2. Abas de Status Clássico: Todos / Ativos / Vencidos / Testes / Bloqueados */}
            <div className="flex items-center gap-1 bg-[#1A1C24] p-1 rounded-lg border border-[#232530] shrink-0">
              {STATUS_TABS.map(tab => {
                const isSelected = statusFilter === tab.key;
                const countVal = counts[tab.key as keyof typeof counts] || 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'text-white shadow-xs'
                        : 'text-[#92929F] hover:text-white'
                    }`}
                    style={isSelected ? { backgroundColor: APP_CONFIG.primaryColor } : undefined}
                  >
                    <span>{tab.label === 'Bloqueados' ? <>Bloq<span className="hidden sm:inline">ueados</span></> : tab.label}</span>
                    <span className={`font-mono text-[10px] px-1 py-0.2 rounded ${isSelected ? 'bg-black/30 text-white' : 'bg-black/20 text-[#5E6278]'}`}>
                      {countVal}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-6 w-px bg-[#232530] shrink-0" />

          {/* 3. Botão Popover Compacto: Fila Operacional & Modos de Trabalho (Fixado na ponta direita) */}
          <div className="relative shrink-0" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setFilterMenuOpen(prev => !prev)}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                activeOperationalFilters.size > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                  : 'bg-[#1A1C24] text-[#92929F] border-[#232530] hover:text-white hover:bg-[#202230]'
              }`}
              title="Fila operacional do dia e filtros de organização"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Fila & Filtros</span>
              <span className="sm:hidden">Fila</span>
              {operationalCounts.totalPending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/25 text-amber-300 font-mono font-bold">
                  {operationalCounts.totalPending}
                </span>
              )}
              {activeOperationalFilters.size > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary text-white font-mono font-bold" style={{ backgroundColor: APP_CONFIG.primaryColor }}>
                  {activeOperationalFilters.size}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-[#5E6278] transition-transform ${filterMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu Popover suspenso posicionado à direita para nunca estourar a tela no mobile */}
            {filterMenuOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-[#161722] border border-[#262838] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#232530]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Fila & Modos de Trabalho</h4>
                      <p className="text-[10px] text-[#92929F]">{operationalCounts.totalPending} clientes com ação recomendada</p>
                    </div>
                  </div>
                  <Link
                    to="/renewals"
                    className="px-2 py-1 rounded text-[11px] font-semibold bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 flex items-center gap-1 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Cobrar WhatsApp</span>
                  </Link>
                </div>

                {/* Seção 1: Cobrança */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-[#7E8299] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Rotina de Cobrança
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('EXPIRING_TODAY')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('EXPIRING_TODAY')
                          ? 'bg-rose-500/20 text-rose-200 border-rose-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Vence hoje
                      </span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-rose-300">
                        {operationalCounts.today}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('EXPIRING_3')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('EXPIRING_3')
                          ? 'bg-rose-500/20 text-rose-200 border-rose-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>⏳ Vence em 3d</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-rose-300">
                        {operationalCounts.in3d}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('EXPIRING_7')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('EXPIRING_7')
                          ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>📅 Vence em 7d</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-amber-300">
                        {operationalCounts.in7d}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('EXPIRED')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('EXPIRED')
                          ? 'bg-red-500/20 text-red-200 border-red-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>⚠️ Já vencidos</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-red-300">
                        {operationalCounts.expired}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Seção 2: Organização */}
                <div className="mb-2">
                  <div className="text-[10px] font-bold text-[#7E8299] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                    Organização da Base
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('NO_WHATSAPP')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('NO_WHATSAPP')
                          ? 'bg-purple-500/20 text-purple-200 border-purple-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>📱 Sem WhatsApp</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-purple-300">
                        {operationalCounts.noZap}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('NO_NAME')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('NO_NAME')
                          ? 'bg-blue-500/20 text-blue-200 border-blue-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>👤 Sem nome</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-blue-300">
                        {operationalCounts.noName}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('MULTI_SCREEN')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('MULTI_SCREEN')
                          ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>📺 Multi-telas (2+)</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-indigo-300">
                        {operationalCounts.multi}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('NO_PRICE')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('NO_PRICE')
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>💰 Sem valor</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-emerald-300">
                        {operationalCounts.noPrice}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('NEVER_CONNECTED')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer col-span-2 ${
                        activeOperationalFilters.has('NEVER_CONNECTED')
                          ? 'bg-zinc-500/20 text-zinc-200 border-zinc-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>💤 Nunca conectou / fantasma</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-zinc-300">
                        {operationalCounts.never}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Seção 3: Aplicativos Parceiros & Status */}
                <div className="mb-2">
                  <div className="text-[10px] font-bold text-[#7E8299] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-emerald-400" />
                    Apps Parceiros & Status
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('WITH_PARTNER_APP')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('WITH_PARTNER_APP')
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>🚀 Com App Parceiro</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-emerald-300">
                        {operationalCounts.withPartner}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('WITHOUT_PARTNER_APP')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer ${
                        activeOperationalFilters.has('WITHOUT_PARTNER_APP')
                          ? 'bg-zinc-500/20 text-zinc-200 border-zinc-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>Sem App Parceiro</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-zinc-300">
                        {operationalCounts.withoutPartner}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleOperationalFilter('ACTIVE_ONLY')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all cursor-pointer col-span-2 ${
                        activeOperationalFilters.has('ACTIVE_ONLY')
                          ? 'bg-teal-500/20 text-teal-200 border-teal-500/50 font-bold'
                          : 'bg-[#1B1D28] text-gray-400 border-[#232530] hover:text-white'
                      }`}
                    >
                      <span>✅ Apenas Ativos Conectados</span>
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 text-teal-300">
                        {operationalCounts.activeOnly}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Footer do Dropdown */}
                {activeOperationalFilters.size > 0 && (
                  <div className="pt-2 border-t border-[#232530] flex items-center justify-between">
                    <span className="text-[11px] text-[#92929F]">
                      {activeOperationalFilters.size} filtro{activeOperationalFilters.size > 1 ? 's' : ''} ativo{activeOperationalFilters.size > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveOperationalFilters(new Set())}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Linha 2 (Mobile) / Direita (Desktop): Campo de Busca Rápida + Filtro por Revendedor + Limpeza Geral */}
        <div className="flex items-center gap-2 w-full lg:w-auto lg:min-w-[260px] lg:max-w-xs shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#5E6278] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar ou comandos: vence:3, sem:zap..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-[#5E6278] focus:outline-none transition-colors"
              style={{ borderColor: searchTerm ? APP_CONFIG.primaryColor : undefined }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-[#5E6278] hover:text-white cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filtro por Revendedor (quando em escopo RESELLERS) */}
          {hasResellerData && scopeFilter !== 'DIRECT' && (
            <select
              value={resellerFilter}
              onChange={(e) => {
                setResellerFilter(e.target.value);
                if (e.target.value) setScopeFilter('RESELLERS');
              }}
              className="bg-[#1A1C24] border border-[#232530] text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none max-w-[130px] cursor-pointer shrink-0"
              title="Filtrar por revendedor específico"
            >
              <option value="">Todas revendas</option>
              {uniqueResellers.map((r) => {
                const cCount = customers.filter((c: any) => (c.reseller_username || '').toLowerCase() === r.toLowerCase()).length;
                return (
                  <option key={r} value={r}>
                    {r} ({cCount})
                  </option>
                );
              })}
            </select>
          )}

          {/* Limpar Todos os Filtros */}
          {(searchTerm || resellerFilter || activeOperationalFilters.size > 0 || statusFilter !== 'ALL' || scopeFilter !== 'DIRECT') && (
            <button
              onClick={clearAllFilters}
              className="p-1.5 rounded-lg text-xs text-[#92929F] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
              title="Limpar todos os filtros"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Barra de Pills para Filtrar Revenda Específica (Zero Emojis) */}
      {scopeFilter === 'RESELLERS' && uniqueResellers.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-[#14151C] rounded-xl border border-[#1E202B] scrollbar-none">
          <span className="text-[11px] text-[#92929F] font-semibold px-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#5E6278]" />
            Revenda:
          </span>
          <button
            onClick={() => setResellerFilter('')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              !resellerFilter
                ? 'bg-[#232530] text-white border border-[#3F4254]'
                : 'text-[#92929F] hover:text-white hover:bg-[#1A1C24]'
            }`}
          >
            Todas ({totalResellers})
          </button>
          {uniqueResellers.map(r => {
            const rCount = customers.filter((c: any) => !isDirectCustomer(c, profile) && (c.reseller_username || '').toLowerCase() === r.toLowerCase()).length;
            if (rCount === 0) return null;
            const isSelected = resellerFilter.toLowerCase() === r.toLowerCase();
            return (
              <button
                key={r}
                onClick={() => setResellerFilter(isSelected ? '' : r)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#232530] text-white border border-[#3F4254]'
                    : 'text-[#92929F] hover:text-white hover:bg-[#1A1C24]'
                }`}
              >
                <Users className="w-3 h-3 text-[#5E6278]" />
                <span>{r}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 text-[#92929F]">{rCount}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Banner de filtro ativo por revendedor */}
      {resellerFilter && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1C24] border border-[#232530] rounded-xl text-xs">
          <Filter className="w-3.5 h-3.5" style={{ color: APP_CONFIG.primaryColor }} />
          <span className="text-[#92929F]">Filtrando revenda:</span>
          <span className="text-white font-bold font-mono">{resellerFilter}</span>
          <button
            onClick={() => setResellerFilter('')}
            className="ml-auto text-[#92929F] hover:text-white p-0.5 cursor-pointer"
            title="Remover filtro de revendedor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tags de Filtros Operacionais Ativos (Ultra-compacto) */}
      {activeOperationalFilters.size > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
          <span className="text-[11px] text-[#5E6278] font-semibold px-1 shrink-0">Filtros ativos:</span>
          {activeOperationalFilters.has('EXPIRING_TODAY') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-semibold">
              ⚡ Vence hoje ({operationalCounts.today})
              <button type="button" onClick={() => toggleOperationalFilter('EXPIRING_TODAY')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('EXPIRING_3') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-semibold">
              ⏳ Vence em 3d ({operationalCounts.in3d})
              <button type="button" onClick={() => toggleOperationalFilter('EXPIRING_3')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('EXPIRING_7') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold">
              📅 Vence em 7d ({operationalCounts.in7d})
              <button type="button" onClick={() => toggleOperationalFilter('EXPIRING_7')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('EXPIRED') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-semibold">
              ⚠️ Já vencidos ({operationalCounts.expired})
              <button type="button" onClick={() => toggleOperationalFilter('EXPIRED')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('NO_WHATSAPP') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-semibold">
              📱 Sem WhatsApp ({operationalCounts.noZap})
              <button type="button" onClick={() => toggleOperationalFilter('NO_WHATSAPP')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('NO_NAME') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-semibold">
              👤 Sem nome ({operationalCounts.noName})
              <button type="button" onClick={() => toggleOperationalFilter('NO_NAME')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('MULTI_SCREEN') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold">
              📺 Multi-telas ({operationalCounts.multi})
              <button type="button" onClick={() => toggleOperationalFilter('MULTI_SCREEN')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('NO_PRICE') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold">
              💰 Sem valor ({operationalCounts.noPrice})
              <button type="button" onClick={() => toggleOperationalFilter('NO_PRICE')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('NEVER_CONNECTED') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-500/20 text-zinc-300 border border-zinc-500/40 text-[11px] font-semibold">
              💤 Nunca conectou ({operationalCounts.never})
              <button type="button" onClick={() => toggleOperationalFilter('NEVER_CONNECTED')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('WITH_PARTNER_APP') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold">
              🚀 Com App Parceiro ({operationalCounts.withPartner})
              <button type="button" onClick={() => toggleOperationalFilter('WITH_PARTNER_APP')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('WITHOUT_PARTNER_APP') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-500/20 text-zinc-300 border border-zinc-500/40 text-[11px] font-semibold">
              Sem App Parceiro ({operationalCounts.withoutPartner})
              <button type="button" onClick={() => toggleOperationalFilter('WITHOUT_PARTNER_APP')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {activeOperationalFilters.has('ACTIVE_ONLY') && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-semibold">
              ✅ Apenas Ativos ({operationalCounts.activeOnly})
              <button type="button" onClick={() => toggleOperationalFilter('ACTIVE_ONLY')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          <button
            type="button"
            onClick={() => setActiveOperationalFilters(new Set())}
            className="text-[11px] text-[#92929F] hover:text-rose-400 underline ml-1 cursor-pointer"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Results count */}
      {filtered.length === 0 ? (
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-10 text-center">
          <Search className="w-8 h-8 text-[#5E6278] mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Nenhum cliente encontrado</p>
          <p className="text-xs text-[#92929F] mt-1">Tente ajustar os filtros de busca.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-[#5E6278]">
            Exibindo <span className="text-white font-semibold">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> de <span className="text-white font-semibold">{filtered.length}</span> clientes
          </p>

          {/* CARDS VIEW (default for mobile & responsive) */}
          {viewMode === 'cards' && (
            <div className="space-y-3">
              {/* Barra de Selecionar Todos da Página no Modo Cards */}
              <div className="flex items-center justify-between px-1 text-xs text-gray-400">
                <button
                  type="button"
                  onClick={handleSelectAllPaged}
                  className="flex items-center gap-2 hover:text-white font-semibold transition-colors cursor-pointer bg-[#14151C] px-3 py-1.5 rounded-lg border border-[#1E202B]"
                >
                  {paged.length > 0 && paged.every((c: any) => selectedCustomerIds.has(c.id)) ? (
                    <CheckSquare className="w-4 h-4 text-[#009EF7]" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-500" />
                  )}
                  <span>Selecionar todos da página ({paged.length})</span>
                </button>
                {selectedCustomerIds.size > 0 && (
                  <span className="text-[#009EF7] font-semibold text-xs">
                    {selectedCustomerIds.size} cliente(s) selecionado(s)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {paged.map((c: any) => {
                const isExp = isCustomerExpired(c);
                const isSelected = selectedCustomerIds.has(c.id);
                const lateralStripe = isExp
                  ? 'border-l-4 border-l-rose-500/80'
                  : c.status === 'BLOCKED'
                    ? 'border-l-4 border-l-purple-500'
                    : c.status === 'TRIAL'
                      ? 'border-l-4 border-l-amber-500'
                      : 'border-l-4 border-l-emerald-500';

                return (
                <div
                  key={c.id}
                  className={`bg-[#14151C] border border-[#1E202B] rounded-xl p-4 hover:border-[#009EF7]/30 transition-all group relative ${lateralStripe} ${
                    isSelected ? 'ring-2 ring-[#009EF7] bg-[#161a25]' : ''
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Checkbox de Seleção no Card */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectCustomer(c.id, e)}
                          className="p-0.5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                          title={isSelected ? "Desmarcar cliente" : "Selecionar cliente"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#009EF7]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                          )}
                        </button>
                        <span className="font-bold text-white font-mono text-sm truncate">{c.username}</span>
                        {getStatusBadge(c.status, isExp)}
                        {/* Badge MaxPlayer Ativo */}
                        {(c.partnerApp?.appName?.toLowerCase().includes('max') || c.partner_app?.appName?.toLowerCase().includes('max') || c.partnerApp?.status === 'active' || c.partner_app?.status === 'active') && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMaxPlayerDetailsTarget(c); }}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer hover:scale-105 shadow-xs"
                            style={{
                              backgroundColor: `${franchisePrimary}20`,
                              borderColor: `${franchisePrimary}40`,
                              color: franchisePrimary,
                              borderWidth: 1
                            }}
                            title="Conta MaxPlayer Ativa! Clique para ver os dados de acesso"
                          >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: franchisePrimary }}></span>
                            <Tv2 className="w-3 h-3" style={{ color: franchisePrimary }} />
                            <span>MaxPlayer Ativo</span>
                          </button>
                        )}
                        {/* Botão facilitado de Acessos / Notas do Cliente */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setNotesTarget(c); }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer hover:scale-105 ${
                            c.notes && c.notes.trim()
                              ? 'bg-[#FFB800]/15 hover:bg-[#FFB800]/25 text-[#FFB800] border border-[#FFB800]/30 shadow-xs'
                              : 'bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white border border-[#262833]'
                          }`}
                          title={c.notes && c.notes.trim() ? "Ver códigos de acesso remoto e notas internas" : "Adicionar códigos de acesso remoto / notas"}
                        >
                          <FileText className={`w-3 h-3 ${c.notes && c.notes.trim() ? 'text-[#FFB800]' : 'text-[#92929F]'}`} />
                          <span>{c.notes && c.notes.trim() ? 'Acessos / Notas' : '+ Notas'}</span>
                        </button>
                        {c.reseller_username && (
                          isDirectCustomer(c, profile) ? (
                            <span className="px-2 py-0.5 rounded bg-[#1A1C24] text-white text-[10px] font-semibold border border-[#232530] inline-flex items-center gap-1 font-mono" title="Cliente Direto">
                              <ShieldCheck className="w-3 h-3" style={{ color: APP_CONFIG.primaryColor }} />
                              <span>{profile?.username || 'Andre2056'}</span>
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResellerFilter(c.reseller_username);
                                setScopeFilter('RESELLERS');
                              }}
                              className="px-2 py-0.5 rounded bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white text-[10px] font-semibold border border-[#232530] hover:border-[#3F4254] transition-all inline-flex items-center gap-1 cursor-pointer font-mono"
                              title="Filtrar clientes deste revendedor"
                            >
                              <Users className="w-2.5 h-2.5 text-[#92929F]" />
                              <span>{c.reseller_username}</span>
                            </button>
                          )
                        )}
                      </div>
                      {c.name && c.name !== c.username && (
                        <p className="text-xs text-[#92929F] truncate mt-0.5">{c.name}</p>
                      )}
                    </div>
                    {/* Action menu */}
                    <div className="relative shrink-0 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === c.id ? null : c.id); }}
                        className="p-1.5 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1A1C24] transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {actionMenuOpenId === c.id && (
                        <div className="absolute right-0 top-8 w-52 bg-[#15171E] border border-[#262833] rounded-xl shadow-2xl z-50 py-1.5 text-left">
                          <button onClick={() => { setEditTarget(c); setActionMenuOpenId(null); }}
                            className="w-full px-3 py-2 text-xs text-white hover:bg-[#1A1C24] flex items-center gap-2 font-medium">
                            <Edit2 className="w-3.5 h-3.5 text-[#009EF7]" /> Editar Cliente
                          </button>
                          <button onClick={() => { setPlaylistTarget(c); setActionMenuOpenId(null); }}
                            className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2">
                            <Tv className="w-3.5 h-3.5 text-[#009EF7]" /> Detalhes do Cliente / Acesso
                          </button>
                          <button onClick={() => { setNotesTarget(c); setActionMenuOpenId(null); }}
                            className="w-full px-3 py-2 text-xs text-[#FFB800] hover:bg-[#FFB800]/10 flex items-center gap-2 font-medium">
                            <KeyRound className="w-3.5 h-3.5" /> Acessos Remotos & Notas
                          </button>
                          <div className="my-1 border-t border-[#262833]" />
                          <button onClick={(e) => { handleCopyM3u(c, e); setActionMenuOpenId(null); }}
                            className="w-full px-3 py-2 text-xs text-[#E6A800] hover:bg-[#E6A800]/10 flex items-center gap-2 font-medium">
                            <Copy className="w-3.5 h-3.5" /> Copiar M3U Completa
                          </button>
                          <button onClick={(e) => { handleCopyShortM3u(c, e); setActionMenuOpenId(null); }}
                            className="w-full px-3 py-2 text-xs text-[#00B074] hover:bg-[#00B074]/10 flex items-center gap-2 font-medium">
                            <Copy className="w-3.5 h-3.5" /> Copiar M3U Curta
                          </button>
                          <div className="my-1 border-t border-[#262833]" />
                          <button onClick={() => { setCourtesyTarget(c); setActionMenuOpenId(null); }}
                            className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#50CD89]" /> Adicionar Cortesia / Confiança
                          </button>
                          <button onClick={() => { setPackageTarget(c); setActionMenuOpenId(null); }}
                            className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-[#FF9900]" /> Alterar Pacote / Conexões
                          </button>
                          <button onClick={() => { setAppActivationTarget(c); setActionMenuOpenId(null); }}
                            className="w-full px-3 py-2 text-xs hover:bg-[#1A1C24] flex items-center gap-2 font-medium"
                            style={{ color: franchisePrimary }}>
                            <Tv2 className="w-3.5 h-3.5" style={{ color: franchisePrimary }} /> Ativar Aplicativo
                          </button>
                          <div className="my-1 border-t border-[#262833]" />
                          <button
                            onClick={() => handleToggleBlock(c)}
                            disabled={blockingId === c.id}
                            className="w-full px-3 py-2 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 disabled:opacity-50"
                          >
                            {blockingId === c.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5 text-[#FF9900]" />}
                            {(c.status === 'BLOCKED' || c.status === 'EXPIRED') ? 'Desbloquear e Reativar' : 'Bloquear'}
                          </button>
                          <button
                            onClick={() => { setDeleteConfirm(c); setActionMenuOpenId(null); }}
                            disabled={deletingId === c.id}
                            className="w-full px-3 py-2 text-xs text-[#F1416C] hover:bg-[#F1416C]/10 flex items-center gap-2 disabled:opacity-50"
                          >
                            {deletingId === c.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Excluir Cliente
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="space-y-1.5 text-[11px] text-[#92929F]">
                    <div className="flex items-center justify-between">
                      <span>Vencimento:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-semibold">{c.expires_at}</span>
                        {getExpiryBadge(c)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pacote:</span>
                      <span className="text-white truncate max-w-[60%] text-right">{c.package_name || c.package}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Telas:</span>
                      <span className="font-mono flex items-center gap-1.5">
                        {Number(c.connections_count || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {c.connections_count}/{c.connections_max}
                          </span>
                        ) : (
                          <span className="text-[#92929F]">
                            {c.connections_count}/{c.connections_max}
                          </span>
                        )}
                      </span>
                    </div>
                    {isDirectCustomer(c, profile) ? (
                      <div className="flex items-center justify-between">
                        <span>Mensalidade:</span>
                        {c.subscription_value && Number(c.subscription_value) > 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditTarget(c); }}
                            className="text-[#50CD89] font-bold font-mono hover:underline inline-flex items-center gap-1 cursor-pointer"
                            title="Editar valor da mensalidade"
                          >
                            {Number(c.subscription_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            <Edit2 className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditTarget(c); }}
                            className="px-1.5 py-0.5 rounded bg-[#1A1C24] text-[#92929F] hover:text-white hover:border-[#009EF7]/40 text-[11px] font-mono font-bold border border-[#232530] transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Valor mensal fixo padrão R$ 00,00. Clique para alterar."
                          >
                            <span>R$ 00,00</span>
                            <Edit2 className="w-2.5 h-2.5 opacity-50" />
                          </button>
                        )}
                      </div>
                    ) : null}
                    {c.whatsapp && (
                      <div className="flex items-center justify-between">
                        <span>WhatsApp:</span>
                        <a
                          href={`https://wa.me/${c.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#50CD89] flex items-center gap-1 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3 h-3" /> {c.whatsapp}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Bloco de Acesso MaxPlayer Ativo */}
                  {/* Bloco de Acesso MaxPlayer (Ativo ou Vencido) */}
                  {Boolean(
                    c.partnerApp?.appName?.toLowerCase().includes('max') ||
                    c.partner_app?.appName?.toLowerCase().includes('max') ||
                    (c.partnerApp?.appUser && !c.partnerApp?.mac)
                  ) && (() => {
                    const isExpClient = isCustomerExpired(c);
                    const partner = c.partnerApp || c.partner_app;
                    const rawStatus = String(partner?.status || '').toLowerCase();
                    const expTime = partner?.expiresAt || partner?.expires_at;
                    let isOverThreeDays = false;
                    if (expTime) {
                      const expMs = new Date(expTime).getTime();
                      if (!isNaN(expMs) && (Date.now() - expMs >= 3 * 24 * 3600 * 1000)) {
                        isOverThreeDays = true;
                      }
                    } else if (isExpClient) {
                      const clientExp = parseExpiryDate(c);
                      if (clientExp && (Date.now() - clientExp.getTime() >= 3 * 24 * 3600 * 1000)) {
                        isOverThreeDays = true;
                      }
                    }
                    const isInactive = rawStatus === 'inactive' || rawStatus === 'deactivated' || Boolean(partner?.deactivatedAt) || isOverThreeDays;
                    const appExp = !isInactive && (rawStatus === 'expired' || isExpClient);

                    return (
                      <div
                        className="mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2.5"
                        style={{
                          backgroundColor: isInactive
                            ? 'rgba(245, 158, 11, 0.08)'
                            : appExp ? 'rgba(239, 68, 68, 0.08)' : `${franchisePrimary}12`,
                          borderColor: isInactive
                            ? 'rgba(245, 158, 11, 0.25)'
                            : appExp ? 'rgba(239, 68, 68, 0.25)' : `${franchisePrimary}35`
                        }}
                      >
                        <div className="min-w-0">
                          <div
                            className="flex items-center gap-1.5 text-[11px] font-bold"
                            style={{
                              color: isInactive ? '#F59E0B' : appExp ? '#F87171' : franchisePrimary
                            }}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isInactive ? 'bg-amber-400' : appExp ? 'bg-red-400' : 'animate-pulse'
                              }`}
                              style={!isInactive && !appExp ? { backgroundColor: franchisePrimary } : undefined}
                            ></span>
                            <Tv2 className="w-3.5 h-3.5" style={{ color: isInactive ? '#F59E0B' : appExp ? '#F87171' : franchisePrimary }} />
                            <span>MaxPlayer {isInactive ? 'Inativo (>3d)' : appExp ? '(Vencido)' : 'Ativo'}</span>
                            {isInactive && (
                              <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">• Sem custo de revenda</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-300 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Usuário: <strong className="text-white font-bold">{c.partnerApp?.appUser || c.partner_app?.appUser || c.username}</strong></span>
                            <span>Senha: <strong className="text-white font-bold">{c.partnerApp?.appPassword || c.partner_app?.appPassword || c.password || '******'}</strong></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMaxPlayerDetailsTarget(c); }}
                            className="px-2 py-1 rounded-lg text-white text-[10px] font-bold transition-all cursor-pointer shadow-xs hover:opacity-90"
                            style={{
                              backgroundColor: isInactive ? '#374151' : appExp ? '#DC2626' : franchisePrimary,
                              borderColor: isInactive ? '#4B5563' : appExp ? '#EF4444' : `${franchisePrimary}60`,
                              borderWidth: 1
                            }}
                            title="Ver dados de acesso e enviar mensagem no WhatsApp"
                          >
                            Ver / Enviar
                          </button>
                          {isInactive ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleReactivateMaxPlayer(c); }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                              title="Reativar aplicativo MaxPlayer deste cliente"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reativar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeactivateMaxPlayer(c); }}
                              className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[10px] font-bold transition-all cursor-pointer"
                              title="Desativar aplicativo MaxPlayer deste cliente"
                            >
                              Desativar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dispositivos GerenciaApp (Ativos ou Vencidos) */}
                  {(() => {
                    const rawDevs = (c.partnerDevices && Array.isArray(c.partnerDevices) && c.partnerDevices.length > 0)
                      ? c.partnerDevices
                      : ((c.partnerApp?.mac || c.partner_app?.mac) && !c.partnerApp?.appName?.toLowerCase().includes('max')
                          ? [c.partnerApp || c.partner_app]
                          : []);
                    const seen = new Set<string>();
                    const devices = rawDevs.filter((d: any) => {
                      if (!d || !d.mac) return false;
                      const cleanMac = String(d.mac).replace(/[^a-f\d]/gi, '').toUpperCase();
                      if (seen.has(cleanMac)) return false;
                      seen.add(cleanMac);
                      const name = String(d.appName || d.app_name || '').toLowerCase();
                      return !name.includes('max');
                    });

                    return devices.map((dev: any, devIdx: number) => {
                      const devName = dev.appName || dev.app_name || 'App Parceiro';
                      const isExpClient = isCustomerExpired(c);
                      const isDevExpired = dev.status === 'expired' || isExpClient;
                      return (
                        <div
                          key={dev.mac || devIdx}
                          className="mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2.5"
                          style={{
                            backgroundColor: isDevExpired ? 'rgba(239, 68, 68, 0.08)' : `${franchisePrimary}12`,
                            borderColor: isDevExpired ? 'rgba(239, 68, 68, 0.25)' : `${franchisePrimary}35`
                          }}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: isDevExpired ? '#F87171' : franchisePrimary }}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isDevExpired ? 'bg-red-400' : 'animate-pulse'}`} style={!isDevExpired ? { backgroundColor: franchisePrimary } : undefined}></span>
                              <Tv2 className="w-3.5 h-3.5" style={{ color: isDevExpired ? '#F87171' : franchisePrimary }} />
                              <span>{devName} {isDevExpired ? '(Vencido)' : 'Ativo'}</span>
                            </div>
                            <div className="text-[11px] text-gray-300 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>MAC: <strong className="text-white font-bold">{dev.mac}</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeactivateDevice(c, dev); }}
                              className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[10px] font-bold transition-all cursor-pointer"
                              title={`Desativar aplicativo ${devName} (${dev.mac}) deste cliente`}
                            >
                              Desativar
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* AÇÕES PRINCIPAIS RÁPIDAS (5 AÇÕES) */}
                  <div className="mt-3 pt-3 border-t border-[#1E202B]/80 flex items-center justify-between gap-1.5">
                    {/* 1. Copiar Dados (Destaque Principal com cor da franquia) */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyCredentials(c, e)}
                      className="flex-1 py-2 px-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 hover:opacity-90 cursor-pointer"
                      style={{
                        backgroundColor: franchisePrimary,
                        boxShadow: `0 2px 10px ${franchisePrimary}35`
                      }}
                      title="Copiar dados de acesso completos"
                    >
                      {copyFeedback[c.id]?.includes('Dados') ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[11px] truncate">{copyFeedback[c.id] || 'Copiar Dados'}</span>
                    </button>

                    {/* 2. Renovar */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setRenewTarget(c); }}
                      className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 transition-all flex items-center justify-center active:scale-95 cursor-pointer shrink-0"
                      title="Renovar assinatura com créditos"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>

                    {/* 3. WhatsApp */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenReminder(c); }}
                      className="p-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 hover:border-[#25D366]/50 transition-all flex items-center justify-center active:scale-95 cursor-pointer shrink-0"
                      title="Enviar aviso ou mensagem no WhatsApp"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    </button>

                    {/* 4. Editar */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditTarget(c); }}
                      className="p-2 rounded-xl bg-[#1A1C24] hover:bg-[#232530] text-gray-300 hover:text-white border border-[#262833] transition-all flex items-center justify-center active:scale-95 cursor-pointer shrink-0"
                      title="Editar dados cadastrais do cliente"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* 5. Toggle Ativo / Bloqueado */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleBlock(c); }}
                      disabled={blockingId === c.id}
                      className={`p-2 rounded-xl border transition-all flex items-center justify-center active:scale-95 cursor-pointer shrink-0 disabled:opacity-50 ${
                        (c.status === 'BLOCKED' || c.status === 'EXPIRED')
                          ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                      }`}
                      title={(c.status === 'BLOCKED' || c.status === 'EXPIRED') ? 'Clique para desbloquear e reativar cliente' : 'Clique para bloquear acesso do cliente'}
                    >
                      {blockingId === c.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (c.status === 'BLOCKED' || c.status === 'EXPIRED') ? (
                        <ToggleLeft className="w-4 h-4" />
                      ) : (
                        <ToggleRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
              </div>
            </div>
        )}

          {/* TABLE VIEW */}
          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-[#14151C] border border-[#1E202B] rounded-xl overflow-visible relative">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1E202B] text-[#92929F] text-[11px] uppercase tracking-wider bg-[#14151C]">
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleSelectAllPaged}
                          className="text-[#92929F] hover:text-white transition-colors cursor-pointer"
                          title="Selecionar todos os clientes desta página"
                        >
                          {paged.length > 0 && paged.every((c: any) => selectedCustomerIds.has(c.id)) ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold">Usuário</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">
                        <button
                          type="button"
                          onClick={() => setSortExpiryOrder(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                          className="flex items-center gap-1.5 hover:text-white transition-colors uppercase tracking-wider font-semibold cursor-pointer"
                          title="Alternar ordenação por data de vencimento"
                        >
                          <span>Vencimento</span>
                          {sortExpiryOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : sortExpiryOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-[#5E6278]" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 font-semibold text-center">Telas</th>
                      <th className="py-3 px-4 font-semibold">Mensalidade</th>
                      <th className="py-3 px-4 font-semibold text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E202B]/60">
                    {paged.map((c: any) => {
                      const isExp = isCustomerExpired(c);
                      const isSelected = selectedCustomerIds.has(c.id);

                      return (
                      <tr
                        key={c.id}
                        className={`hover:bg-[#1A1C24]/50 transition-colors group ${isSelected ? 'bg-emerald-500/5' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelectCustomer(c.id, e)}
                            className="text-[#92929F] hover:text-white transition-colors cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white font-mono text-xs">{c.username}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setNotesTarget(c); }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer hover:scale-105 ${
                                c.notes && c.notes.trim()
                                  ? 'bg-[#FFB800]/15 hover:bg-[#FFB800]/25 text-[#FFB800] border border-[#FFB800]/30 shadow-xs'
                                  : 'bg-[#1A1C24] hover:bg-[#232530] text-[#92929F] hover:text-white border border-[#262833]'
                              }`}
                              title={c.notes && c.notes.trim() ? "Ver códigos de acesso remoto e notas internas" : "Adicionar códigos de acesso remoto / notas"}
                            >
                              <FileText className={`w-3 h-3 ${c.notes && c.notes.trim() ? 'text-[#FFB800]' : 'text-[#92929F]'}`} />
                              <span>{c.notes && c.notes.trim() ? 'Notas' : '+'}</span>
                            </button>
                            {/* MaxPlayer Badge */}
                            {Boolean(
                              c.partnerApp?.appName?.toLowerCase().includes('max') ||
                              c.partner_app?.appName?.toLowerCase().includes('max') ||
                              (c.partnerApp?.appUser && !c.partnerApp?.mac)
                            ) && (() => {
                              const partner = c.partnerApp || c.partner_app;
                              const rawStatus = String(partner?.status || '').toLowerCase();
                              const expTime = partner?.expiresAt || partner?.expires_at;
                              let isOverThreeDays = false;
                              if (expTime) {
                                const expMs = new Date(expTime).getTime();
                                if (!isNaN(expMs) && (Date.now() - expMs >= 3 * 24 * 3600 * 1000)) {
                                  isOverThreeDays = true;
                                }
                              } else if (isExp) {
                                const clientExp = parseExpiryDate(c);
                                if (clientExp && (Date.now() - clientExp.getTime() >= 3 * 24 * 3600 * 1000)) {
                                  isOverThreeDays = true;
                                }
                              }
                              const isInactive = rawStatus === 'inactive' || rawStatus === 'deactivated' || Boolean(partner?.deactivatedAt) || isOverThreeDays;

                              return (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setMaxPlayerDetailsTarget(c); }}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer hover:scale-105 shadow-xs"
                                  style={isInactive ? {
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                    borderColor: 'rgba(245, 158, 11, 0.4)',
                                    color: '#F59E0B',
                                    borderWidth: 1
                                  } : isExp ? {
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    borderColor: 'rgba(239, 68, 68, 0.4)',
                                    color: '#F87171',
                                    borderWidth: 1
                                  } : {
                                    backgroundColor: `${franchisePrimary}20`,
                                    borderColor: `${franchisePrimary}40`,
                                    color: franchisePrimary,
                                    borderWidth: 1
                                  }}
                                  title={isInactive ? "MaxPlayer Inativo (>3 dias • Sem custo na revenda). Clique para ver/reativar" : isExp ? "Conta MaxPlayer Vencida! Clique para ver dados" : "Conta MaxPlayer Ativa! Clique para ver dados de acesso"}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-amber-400' : isExp ? 'bg-red-400' : 'animate-pulse'}`} style={!isInactive && !isExp ? { backgroundColor: franchisePrimary } : undefined}></span>
                                  <Tv2 className="w-3 h-3" />
                                  <span>MaxPlayer {isInactive ? '(Inativo)' : isExp ? '(Vencido)' : ''}</span>
                                </button>
                              );
                            })()}

                            {/* GerenciaApp / Partner Device Badges */}
                            {(() => {
                              const rawDevs = (c.partnerDevices && Array.isArray(c.partnerDevices) && c.partnerDevices.length > 0)
                                ? c.partnerDevices
                                : ((c.partnerApp?.mac || c.partner_app?.mac) && !c.partnerApp?.appName?.toLowerCase().includes('max')
                                    ? [c.partnerApp || c.partner_app]
                                    : []);
                              const seen = new Set<string>();
                              return rawDevs.filter((d: any) => {
                                if (!d || !d.mac) return false;
                                const clean = String(d.mac).replace(/[^a-f\d]/gi, '').toUpperCase();
                                if (seen.has(clean)) return false;
                                seen.add(clean);
                                return !String(d.appName || '').toLowerCase().includes('max');
                              }).map((d: any, idx: number) => {
                                const dName = d.appName || d.app_name || 'App';
                                const devExp = isExp || d.status === 'expired';
                                return (
                                  <span
                                    key={d.mac || idx}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 border ${
                                      devExp
                                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    }`}
                                    title={`${dName} - MAC: ${d.mac}`}
                                  >
                                    <Smartphone className="w-2.5 h-2.5" />
                                    <span>{dName}</span>
                                    <span className="font-mono text-[9px] opacity-75">{d.mac.slice(-5)}</span>
                                  </span>
                                );
                              });
                            })()}
                          </div>
                          {c.name && c.name !== c.username && (
                            <p className="text-[11px] text-[#92929F] truncate">{c.name}</p>
                          )}
                          {c.whatsapp && (
                            <div className="text-[11px] text-[#50CD89] flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /><span>{c.whatsapp}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(c.status, isExp)}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{c.expires_at}</span>
                            {getExpiryBadge(c)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono border inline-flex items-center gap-1.5 ${
                            Number(c.connections_count || 0) > 0
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                              : 'bg-[#1A1C24] text-[#92929F] border-[#232530]'
                          }`}>
                            {Number(c.connections_count || 0) > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                            {c.connections_count}/{c.connections_max}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isDirectCustomer(c, profile) ? (
                            c.subscription_value && Number(c.subscription_value) > 0 ? (
                              <button
                                onClick={() => setEditTarget(c)}
                                className="px-2 py-0.5 rounded bg-[#50CD89]/15 text-[#50CD89] hover:bg-[#50CD89]/25 text-xs font-bold font-mono border border-[#50CD89]/30 transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Clique para editar valor da mensalidade"
                              >
                                {Number(c.subscription_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                <Edit2 className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditTarget(c)}
                                className="px-2 py-0.5 rounded bg-[#1A1C24] text-[#92929F] hover:text-white hover:border-[#009EF7]/40 text-xs font-mono font-bold border border-[#232530] transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Valor mensal fixo padrão R$ 00,00. Clique para alterar."
                              >
                                <span>R$ 00,00</span>
                                <Edit2 className="w-2.5 h-2.5 opacity-50" />
                              </button>
                            )
                          ) : (
                            <span className="text-[11px] text-[#5E6278] italic">Revenda</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right relative">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Copiar Dados */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyCredentials(c, e)}
                              className="px-2.5 py-1 rounded-lg text-white text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 hover:opacity-90 cursor-pointer"
                              style={{
                                backgroundColor: franchisePrimary
                              }}
                              title="Copiar dados de acesso completos"
                            >
                              <Copy className="w-3 h-3" />
                              <span className="hidden sm:inline">Copiar</span>
                            </button>

                            {/* Renovar */}
                            <button
                              type="button"
                              onClick={() => setRenewTarget(c)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="Renovar assinatura com créditos"
                            >
                              <CalendarPlus className="w-3 h-3" />
                              <span className="hidden md:inline">Renovar</span>
                            </button>

                            {/* WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleOpenReminder(c)}
                              className="px-2.5 py-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Enviar aviso ou mensagem no WhatsApp"
                            >
                              <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                              </svg>
                            </button>

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => setEditTarget(c)}
                              className="p-1.5 rounded-lg bg-[#1A1C24] hover:bg-[#232530] text-gray-300 hover:text-white border border-[#262833] transition-all cursor-pointer"
                              title="Editar cliente"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Menu ⋮ com mais opções */}
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === c.id ? null : c.id); }}
                                className="p-1.5 rounded-lg text-[#92929F] hover:text-white hover:bg-[#1A1C24] transition-all cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {actionMenuOpenId === c.id && (
                                <div className="absolute right-0 top-7 w-52 bg-[#15171E] border border-[#262833] rounded-xl shadow-2xl z-50 py-1.5 text-left">
                                  <button onClick={() => { setPlaylistTarget(c); setActionMenuOpenId(null); }} className="w-full px-3 py-1.5 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2">
                                    <Tv className="w-3.5 h-3.5 text-[#009EF7]" /> Detalhes / Playlist
                                  </button>
                                  <button onClick={() => { setNotesTarget(c); setActionMenuOpenId(null); }} className="w-full px-3 py-1.5 text-xs text-[#FFB800] hover:bg-[#FFB800]/10 flex items-center gap-2 font-medium">
                                    <KeyRound className="w-3.5 h-3.5" /> Acessos Remotos & Notas
                                  </button>
                                  <div className="my-1 border-t border-[#262833]" />
                                  <button onClick={(e) => { handleCopyM3u(c, e); setActionMenuOpenId(null); }} className="w-full px-3 py-1.5 text-xs text-[#E6A800] hover:bg-[#E6A800]/10 flex items-center gap-2 font-medium">
                                    <Copy className="w-3.5 h-3.5" /> Copiar M3U Completa
                                  </button>
                                  <button onClick={(e) => { handleCopyShortM3u(c, e); setActionMenuOpenId(null); }} className="w-full px-3 py-1.5 text-xs text-[#00B074] hover:bg-[#00B074]/10 flex items-center gap-2 font-medium">
                                    <Copy className="w-3.5 h-3.5" /> Copiar M3U Curta
                                  </button>
                                  <div className="my-1 border-t border-[#262833]" />
                                  <button onClick={() => { setCourtesyTarget(c); setActionMenuOpenId(null); }} className="w-full px-3 py-1.5 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-[#50CD89]" /> Adicionar Cortesia
                                  </button>
                                  <button onClick={() => { setPackageTarget(c); setActionMenuOpenId(null); }} className="w-full px-3 py-1.5 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-[#FF9900]" /> Alterar Pacote / Conexões
                                  </button>
                                  <button onClick={() => { setAppActivationTarget(c); setActionMenuOpenId(null); }} className="w-full px-3 py-1.5 text-xs hover:bg-[#1A1C24] flex items-center gap-2 font-medium" style={{ color: franchisePrimary }}>
                                    <Tv2 className="w-3.5 h-3.5" style={{ color: franchisePrimary }} /> Ativar Aplicativo
                                  </button>
                                  <div className="my-1 border-t border-[#262833]" />
                                  <button onClick={() => handleToggleBlock(c)} disabled={blockingId === c.id} className="w-full px-3 py-1.5 text-xs text-[#92929F] hover:text-white hover:bg-[#1A1C24] flex items-center gap-2 disabled:opacity-50">
                                    <Ban className="w-3.5 h-3.5 text-[#FF9900]" />{(c.status === 'BLOCKED' || c.status === 'EXPIRED') ? 'Desbloquear e Reativar' : 'Bloquear'}
                                  </button>
                                  <button onClick={() => { setDeleteConfirm(c); setActionMenuOpenId(null); }} className="w-full px-3 py-1.5 text-xs text-[#F1416C] hover:bg-[#F1416C]/10 flex items-center gap-2">
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir Cliente
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Floating Bulk Action Bar */}
          {selectedCustomerIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#161822]/95 border border-[#2E3245] backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3.5 flex-wrap animate-in fade-in slide-in-from-bottom-3 max-w-[95vw]">
              <div className="text-xs text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span><strong className="text-white font-bold">{selectedCustomerIds.size}</strong> selecionado(s)</span>
              </div>
              <div className="h-4 w-px bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. RENOVAR EM MASSA */}
                <button
                  type="button"
                  onClick={() => setBulkRenewOpen(true)}
                  disabled={bulkActionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                  title="Renovar todos os clientes selecionados debitando créditos"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Renovar</span>
                </button>

                {/* 2. ESTENDER DIAS (CORTESIA) */}
                <button
                  type="button"
                  onClick={() => setBulkCourtesyOpen(true)}
                  disabled={bulkActionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Adicionar dias de cortesia ou tolerância sem custo de créditos"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Estender Dias</span>
                </button>

                {/* ALTERAR PACOTE */}
                <button
                  type="button"
                  onClick={() => setBulkPackageOpen(true)}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Alterar pacote/bouquet de todos os clientes selecionados"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pacote</span>
                </button>

                {/* ALTERAR TELAS */}
                <button
                  type="button"
                  onClick={() => setBulkScreensOpen(true)}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Alterar limite de telas simultâneas de todos os clientes selecionados"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Telas</span>
                </button>

                {/* DEFINIR MENSALIDADE */}
                <button
                  type="button"
                  onClick={() => setBulkPriceOpen(true)}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Definir mensalidade em R$ de todos os clientes selecionados"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Valor</span>
                </button>

                {/* 3. EXPORTAR WHATSAPP / CSV */}
                <button
                  type="button"
                  onClick={handleBulkExportWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copiar lista dos selecionados formatada para o WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copiar Zap</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkExportCsv}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Exportar arquivo CSV com os clientes selecionados"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV</span>
                </button>

                <div className="h-4 w-px bg-white/10 hidden md:block" />

                {/* 4. BLOQUEAR */}
                <button
                  type="button"
                  onClick={handleBulkBlock}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bloquear</span>
                </button>

                {/* 5. DESBLOQUEAR */}
                <button
                  type="button"
                  onClick={handleBulkUnblock}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desbloquear</span>
                </button>

                {/* 6. EXCLUIR */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excluir</span>
                </button>

                {/* 7. LIMPAR */}
                <button
                  type="button"
                  onClick={() => setSelectedCustomerIds(new Set())}
                  className="px-2.5 py-1.5 rounded-xl bg-[#202330] hover:bg-[#282C3D] text-gray-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}

          {/* Global Toast */}
          {globalToast && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#15171E] border border-emerald-500/40 text-white rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-xs font-semibold">{globalToast}</span>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-[#14151C] border border-[#1E202B] text-[#92929F] hover:text-white disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#92929F]">
                Página <span className="text-white font-semibold">{page}</span> de <span className="text-white font-semibold">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-[#14151C] border border-[#1E202B] text-[#92929F] hover:text-white disabled:opacity-40 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {editTarget && <EditCustomerModal customer={editTarget} isOpen={!!editTarget} onClose={() => setEditTarget(null)} />}
      {renewTarget && <RenewModal customer={renewTarget} onClose={() => setRenewTarget(null)} />}
      {playlistTarget && <PlaylistModal customer={playlistTarget} onClose={() => setPlaylistTarget(null)} />}
      {notesTarget && <CustomerNotesModal customer={notesTarget} isOpen={!!notesTarget} onClose={() => setNotesTarget(null)} />}
      {reminderTarget && <QuickReminderModal customer={reminderTarget} isOpen={!!reminderTarget} onClose={() => setReminderTarget(null)} />}
      {courtesyTarget && <AddCourtesyDaysModal customer={courtesyTarget} isOpen={!!courtesyTarget} onClose={() => setCourtesyTarget(null)} />}
      {packageTarget && <ChangePackageModal customer={packageTarget} isOpen={!!packageTarget} onClose={() => setPackageTarget(null)} />}
      {appActivationTarget && (
        <AppActivationModal
          customer={appActivationTarget}
          onClose={() => setAppActivationTarget(null)}
          onSuccess={() => setAppActivationTarget(null)}
        />
      )}
      {maxPlayerDetailsTarget && (
        <MaxPlayerDetailsModal
          customer={maxPlayerDetailsTarget}
          isOpen={!!maxPlayerDetailsTarget}
          onClose={() => setMaxPlayerDetailsTarget(null)}
          onDeactivate={(cust) => handleDeactivateMaxPlayer(cust, true)}
          onReactivate={() => {
            const t = maxPlayerDetailsTarget;
            setMaxPlayerDetailsTarget(null);
            setAppActivationTarget(t);
          }}
        />
      )}
      <QuickTestModal
        isOpen={quickTestOpen}
        onClose={() => setQuickTestOpen(false)}
        onSuccess={(newCust) => {
          setQuickTestOpen(false);
          setPlaylistTarget(newCust);
        }}
      />

      {/* Modal de Renovação em Massa */}
      <BulkRenewModal
        isOpen={bulkRenewOpen}
        selectedCustomers={selectedCustomersList}
        onClose={() => setBulkRenewOpen(false)}
        onComplete={() => {
          setSelectedCustomerIds(new Set());
          showToast('Renovação em massa concluída com sucesso!');
        }}
      />

      {/* Modal de Cortesia em Massa */}
      <BulkCourtesyModal
        isOpen={bulkCourtesyOpen}
        selectedCustomers={selectedCustomersList}
        onClose={() => setBulkCourtesyOpen(false)}
        onComplete={() => {
          setSelectedCustomerIds(new Set());
          showToast('Dias extras adicionados com sucesso!');
        }}
      />

      {/* Modal de Alteração de Pacote em Massa */}
      <BulkChangePackageModal
        isOpen={bulkPackageOpen}
        selectedCustomers={selectedCustomersList}
        onClose={() => setBulkPackageOpen(false)}
        onComplete={() => {
          setSelectedCustomerIds(new Set());
          showToast('Pacote atualizado para todos os clientes selecionados!');
        }}
      />

      {/* Modal de Alteração de Telas em Massa */}
      <BulkChangeScreensModal
        isOpen={bulkScreensOpen}
        selectedCustomers={selectedCustomersList}
        onClose={() => setBulkScreensOpen(false)}
        onComplete={() => {
          setSelectedCustomerIds(new Set());
          showToast('Limite de telas atualizado para todos os clientes selecionados!');
        }}
      />

      {/* Modal de Definição de Mensalidade em Massa */}
      <BulkSetPriceModal
        isOpen={bulkPriceOpen}
        selectedCustomers={selectedCustomersList}
        onClose={() => setBulkPriceOpen(false)}
        onComplete={() => {
          setSelectedCustomerIds(new Set());
          showToast('Mensalidade gravada para todos os clientes selecionados!');
        }}
      />
    </div>
  );
};
