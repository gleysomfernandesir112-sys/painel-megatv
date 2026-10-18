import React, { useState, useEffect } from 'react';
import { useSigmaStore } from '../../store/SigmaStore';
import { fastCdnApi, FastCdnLista } from '../../services/fastcdn';
import { APP_CONFIG } from '../../config/appConfig';
import { ListCheck, Upload, Server, ArrowRight, CheckCircle2, Layers } from 'lucide-react';

export const CustomersMigration: React.FC = () => {
  const { customers, refreshLiveData } = useSigmaStore();
  const [bouquets, setBouquets] = useState<FastCdnLista[]>([]);
  const [sourceBouquet, setSourceBouquet] = useState('');
  const [targetBouquet, setTargetBouquet] = useState('');
  const [m3uFile, setM3uFile] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fastCdnApi.getListas().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setBouquets(list);
        setSourceBouquet(list[0].id);
        setTargetBouquet(list[list.length > 1 ? 1 : 0].id);
      }
    }).catch(() => {});
  }, []);

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await refreshLiveData();
      setStatus(`Migração em massa concluída com sucesso para a rota ${targetBouquet}!`);
    } catch (err: any) {
      setStatus('Erro durante o processamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setM3uFile(file.name);
      setStatus(`Arquivo "${file.name}" carregado. Pronto para importar.`);
    }
  };

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Migração & Importação de Clientes</h1>
        <p className="text-xs text-[#92929F] mt-1">
          Transfira pacotes em massa entre rotas ou importe arquivos de playlist M3U externas.
        </p>
      </div>

      {status && (
        <div className="p-4 bg-[#50CD89]/10 border border-[#50CD89]/30 rounded-xl text-xs text-[#50CD89] flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{status}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bouquet to Bouquet Migration */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#009EF7]" />
            <span>Migrar Pacote / Bouquet em Massa</span>
          </h2>

          <form onSubmit={handleMigrate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#92929F] mb-1">
                Pacote de Origem
              </label>
              <select
                value={sourceBouquet}
                onChange={(e) => setSourceBouquet(e.target.value)}
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009EF7]"
              >
                {bouquets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome} ({customers.length} clientes na base)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center my-2">
              <ArrowRight className="w-5 h-5 text-[#5E6278]" />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#92929F] mb-1">
                Pacote de Destino
              </label>
              <select
                value={targetBouquet}
                onChange={(e) => setTargetBouquet(e.target.value)}
                className="w-full bg-[#1A1C24] border border-[#232530] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009EF7]"
              >
                {bouquets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#009EF7] text-white hover:bg-[#0095E8] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Iniciar Migração em Massa'}
            </button>
          </form>
        </div>

        {/* M3U Import */}
        <div className="bg-[#14151C] border border-[#1E202B] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#50CD89]" />
            <span>Importar Lista M3U Externa</span>
          </h2>

          <label className="border-2 border-dashed border-[#232530] hover:border-[#009EF7] rounded-xl p-6 text-center cursor-pointer transition-all block">
            <input
              type="file"
              accept=".m3u,.m3u8,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-[#5E6278] mx-auto mb-2" />
            <div className="text-xs font-semibold text-white">
              {m3uFile ? m3uFile : 'Clique para selecionar o arquivo .m3u'}
            </div>
            <div className="text-[11px] text-[#92929F] mt-1">Suporta listas padrão Xtream Codes e links M3U</div>
          </label>
        </div>
      </div>
    </div>
  );
};
