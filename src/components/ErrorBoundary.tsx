import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro não tratado:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    try {
      localStorage.removeItem('sigma_session_token');
      localStorage.removeItem('sigma_brand_config');
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F1014] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-[#F1416C]/10 border border-[#F1416C]/30 flex items-center justify-center text-[#F1416C] mb-4 shadow-lg shadow-red-950/20">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold mb-2">Ops! Algo inesperado aconteceu</h2>
          <p className="text-xs text-[#92929F] max-w-md mb-6 leading-relaxed">
            Ocorreu uma falha ao renderizar esta tela. Você pode recarregar o painel com segurança sem perder seus dados.
          </p>

          {this.state.error && (
            <div className="w-full max-w-lg p-3 bg-[#151722] border border-[#232534] rounded-xl text-left font-mono text-[11px] text-[#F1416C] mb-6 overflow-x-auto select-text">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl bg-[#009EF7] hover:bg-[#0086D1] text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Painel
            </button>

            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl bg-[#1A1C24] hover:bg-[#252834] text-[#92929F] hover:text-white text-xs font-semibold border border-[#262838] transition-all cursor-pointer"
            >
              Limpar Cache e Sair
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
