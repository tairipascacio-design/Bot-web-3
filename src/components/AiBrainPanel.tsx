import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  PauseCircle,
  CheckCircle2,
  Cpu,
  AlertCircle,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { AiSignal, BotConfig } from '../types';
import { sound } from '../services/sound';

interface AiBrainPanelProps {
  lastSignal: AiSignal | null;
  aiThinking: boolean;
  hasAiKey: boolean;
  cfg: BotConfig;
  onRunLearning: () => Promise<{ ok: boolean; applied?: any; note?: string; error?: string }>;
}

export const AiBrainPanel: React.FC<AiBrainPanelProps> = ({
  lastSignal,
  aiThinking,
  hasAiKey,
  cfg,
  onRunLearning,
}) => {
  const [learningLoading, setLearningLoading] = useState(false);
  const [reportResult, setReportResult] = useState<{ applied: any; note: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLearnClick = async () => {
    sound.playAi();
    setLearningLoading(true);
    setErrorMsg(null);
    try {
      const res = await onRunLearning();
      if (res.ok && res.applied) {
        setReportResult({
          applied: res.applied,
          note: res.note || 'Optimización cuántica de parámetros para futuros completada con éxito.',
        });
      } else {
        setErrorMsg(res.error || 'No se pudo completar el análisis.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setLearningLoading(false);
    }
  };

  const getSignalBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'long':
        return {
          label: `ABRIR LONG (${cfg.leverage}X)`,
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 box-glow-green',
          icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
        };
      case 'short':
        return {
          label: `ABRIR SHORT (${cfg.leverage}X)`,
          bg: 'bg-rose-950/80 text-rose-300 border-rose-500/60 box-glow-red',
          icon: <TrendingDown className="w-4 h-4 text-rose-400" />,
        };
      case 'close':
        return {
          label: 'CERRAR POSICIÓN DE INMEDIATO',
          bg: 'bg-amber-950/80 text-amber-300 border-amber-500/60 box-glow-amber',
          icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
        };
      default:
        return {
          label: 'MANTENER EN ESPERA (HOLD)',
          bg: 'bg-slate-900/90 text-cyan-300 border-cyan-500/40',
          icon: <PauseCircle className="w-4 h-4 text-cyan-400" />,
        };
    }
  };

  return (
    <div className="bg-[#080d1a]/95 border border-cyan-900/40 rounded-lg p-4 relative overflow-hidden flex flex-col box-glow-cyan">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-cyan-950/80">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="font-['Orbitron',sans-serif] text-xs font-bold tracking-wider text-purple-200">
            NÚCLEO NEURAL GEMINI // FUTUROS PERPETUOS
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="px-1.5 py-0.5 rounded uppercase font-bold text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            {cfg.leverage}X
          </span>
        </div>
      </div>

      {/* Main Signal Display */}
      <div className="space-y-3">
        <div>
          <div className="text-[11px] text-gray-400 flex items-center justify-between mb-1">
            <span>Señal Neuronal para {cfg.pair}:</span>
            {aiThinking && (
              <span className="text-purple-400 animate-pulse flex items-center gap-1">
                <Cpu className="w-3 h-3 animate-spin" /> Escaneando libro de órdenes...
              </span>
            )}
          </div>

          {lastSignal ? (
            <div className="space-y-2">
              <div
                className={`flex items-center justify-between px-3 py-2 rounded border font-mono text-xs font-bold ${
                  getSignalBadge(lastSignal.action).bg
                }`}
              >
                <div className="flex items-center gap-2">
                  {getSignalBadge(lastSignal.action).icon}
                  <span>{getSignalBadge(lastSignal.action).label}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] opacity-80 uppercase block">Confianza</span>
                  <span>{Math.round(lastSignal.confidence * 100)}%</span>
                </div>
              </div>

              <div className="text-xs bg-slate-950/80 p-2.5 rounded border border-slate-800 text-gray-300 font-mono italic leading-relaxed">
                "{lastSignal.rationale}"
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 p-3 rounded border border-slate-900 text-xs text-gray-400 font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 opacity-60" />
              <span>El motor neural evalúa el par de futuros cada {cfg.aiEvery}s con protección anti-503.</span>
            </div>
          )}
        </div>

        {/* Learning Optimizer Button */}
        <div className="pt-2 border-t border-slate-900">
          <button
            onClick={handleLearnClick}
            disabled={learningLoading}
            className={`w-full py-2.5 px-3 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
              learningLoading
                ? 'bg-purple-950 text-purple-300 border border-purple-500/50 cursor-wait'
                : 'bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/60 box-glow-purple shadow-lg'
            }`}
          >
            <Sparkles className={`w-4 h-4 text-purple-400 ${learningLoading ? 'animate-spin' : ''}`} />
            <span>{learningLoading ? 'OPTIMIZANDO ESTRATEGIA DE FUTUROS...' : 'APRENDER DE MI HISTORIAL (DEEP OPTIMIZE)'}</span>
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 text-center mt-1.5 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Protegido con sistema de reintentos con backoff y coprocesador de alta demanda</span>
          </div>
        </div>

        {/* Error notification if any */}
        {errorMsg && (
          <div className="p-2.5 rounded bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Learning report preview */}
        {reportResult && (
          <div className="p-3 rounded bg-purple-950/30 border border-purple-500/40 text-xs font-mono space-y-2 mt-2">
            <div className="flex items-center justify-between text-purple-300 font-bold border-b border-purple-900/50 pb-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Calibración de Futuros Aplicada
              </span>
              <button
                onClick={() => setReportResult(null)}
                className="text-gray-400 hover:text-white text-[10px]"
              >
                ✕ CERRAR
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              <div className="bg-slate-900/90 p-1.5 rounded border border-purple-900">
                <span className="text-gray-400 block">Take Profit</span>
                <span className="text-emerald-400 font-bold">+{reportResult.applied.tp}%</span>
              </div>
              <div className="bg-slate-900/90 p-1.5 rounded border border-purple-900">
                <span className="text-gray-400 block">Stop Loss</span>
                <span className="text-rose-400 font-bold">-{reportResult.applied.sl}%</span>
              </div>
              <div className="bg-slate-900/90 p-1.5 rounded border border-purple-900">
                <span className="text-gray-400 block">Gatillo Momentum</span>
                <span className="text-amber-400 font-bold">±{reportResult.applied.thr}%</span>
              </div>
              <div className="bg-slate-900/90 p-1.5 rounded border border-purple-900">
                <span className="text-gray-400 block">Ciclo Escaneo</span>
                <span className="text-cyan-400 font-bold">{reportResult.applied.every}s</span>
              </div>
            </div>

            <p className="text-gray-300 text-[11px] leading-relaxed pt-1 whitespace-pre-line border-t border-purple-900/40">
              {reportResult.note}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
