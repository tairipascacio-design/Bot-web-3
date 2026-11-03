import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Gauge,
  Wallet,
  Target,
  Zap,
  Skull,
  ShieldCheck,
  Sun,
  Flame,
  ArrowDownLeft,
} from 'lucide-react';
import { AppState } from '../types';
import { sound } from '../services/sound';

interface TelemetryCardsProps {
  state: AppState;
  onOpenSunshineVault: () => void;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({ state, onOpenSunshineVault }) => {
  const price = state.price;
  const mom = state.mom;
  const pos = state.pos;
  const cfg = state.cfg;
  const vault = state.sunshineVault;
  const isUp = mom >= 0;

  // Session min / max price
  const prices = state.px.map((p) => p.p);
  const minPrice = prices.length ? Math.min(...prices) : price || 0;
  const maxPrice = prices.length ? Math.max(...prices) : price || 0;

  // Position metrics for Futures
  const isProfitable = pos ? pos.roePct >= 0 : false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* CARD 1: Futures Price & Range */}
      <div className="bg-[#0b1120]/90 border border-cyan-900/50 rounded-lg p-3.5 box-glow-cyan relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="flex items-center gap-1.5 uppercase font-semibold text-cyan-400">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Futuros {cfg.pair}
          </span>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
            {cfg.leverage}X APALANCAMIENTO
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-1">
          <span className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight glow-cyan">
            {price ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---.--'}
          </span>
          <span className="text-xs font-mono text-gray-400">USDT</span>
        </div>

        {/* Range bar */}
        <div className="mt-2 text-[10px] text-gray-400 font-mono flex items-center justify-between">
          <span className="text-rose-400">L: ${minPrice.toFixed(0)}</span>
          <div className="h-1 flex-1 mx-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400"
              style={{
                width: maxPrice > minPrice && price ? `${Math.min(100, Math.max(0, ((price - minPrice) / (maxPrice - minPrice)) * 100))}%` : '50%',
              }}
            />
          </div>
          <span className="text-emerald-400">H: ${maxPrice.toFixed(0)}</span>
        </div>
      </div>

      {/* CARD 2: Momentum Dial & Signal */}
      <div className="bg-[#0b1120]/90 border border-cyan-900/50 rounded-lg p-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="flex items-center gap-1.5 uppercase font-semibold text-gray-300">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            Momentum 60s
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            Gatillo: ±{cfg.thr}%
          </span>
        </div>

        <div className="flex items-center gap-2 my-1">
          <div className={`p-1.5 rounded ${isUp ? 'bg-emerald-950/80 text-emerald-400' : 'bg-rose-950/80 text-rose-400'}`}>
            {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <span
            className={`text-2xl lg:text-3xl font-extrabold font-mono tracking-tight ${
              isUp ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'
            }`}
          >
            {isUp ? '+' : ''}{mom.toFixed(3)}%
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-gray-400">
          <div className="relative w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
            <div className="w-1/2 h-full flex justify-end bg-slate-900 relative">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: mom < 0 ? `${Math.min(100, (Math.abs(mom) / (cfg.thr * 2)) * 100)}%` : '0%' }}
              />
            </div>
            <div className="w-0.5 h-full bg-gray-600 z-10" />
            <div className="w-1/2 h-full bg-slate-900 relative">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: mom > 0 ? `${Math.min(100, (mom / (cfg.thr * 2)) * 100)}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: Active Futures Position */}
      <div
        className={`bg-[#0b1120]/90 border rounded-lg p-3.5 transition relative overflow-hidden ${
          pos ? (isProfitable ? 'border-emerald-600/70 box-glow-green' : 'border-rose-600/70 box-glow-red') : 'border-cyan-900/50'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="flex items-center gap-1.5 uppercase font-semibold text-gray-300">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            Posición de Futuros
          </span>
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              pos
                ? pos.side === 'long'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                : 'bg-slate-900 text-gray-400'
            }`}
          >
            {pos ? `${pos.side.toUpperCase()} ${pos.leverage}X` : 'SIN POSICIÓN'}
          </span>
        </div>

        {pos ? (
          <div>
            <div className="flex items-baseline justify-between my-0.5">
              <span
                className={`text-xl font-bold font-mono ${
                  isProfitable ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'
                }`}
              >
                {isProfitable ? '+' : ''}{pos.roePct.toFixed(2)}% ROE
                <span className="text-xs ml-1 font-normal text-gray-400">
                  ({isProfitable ? '+' : ''}${pos.pnlUsd.toFixed(2)})
                </span>
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Entrada: <strong className="text-gray-200">${pos.entry.toFixed(2)}</strong>
              </span>
            </div>

            <div className="mt-2 text-[10px] font-mono grid grid-cols-2 gap-1 text-gray-400 pt-1 border-t border-slate-800">
              <span className="text-rose-400 flex items-center gap-1">
                <Skull className="w-3 h-3 text-rose-400 shrink-0" />
                Liq: ${pos.liqPrice.toFixed(2)}
              </span>
              <span className="text-emerald-400 text-right">
                Margen: ${pos.margin} (${pos.notional.toFixed(0)})
              </span>
            </div>
          </div>
        ) : (
          <div className="my-2">
            <div className="text-sm font-mono text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bóveda lista (${vault.usdtBalance.toFixed(2)} USDT)</span>
            </div>
            <div className="mt-2 text-[10px] font-mono text-gray-400">
              Próximo trade: <strong className="text-amber-300">${cfg.margin} USDT @ {cfg.leverage}X</strong>
            </div>
          </div>
        )}
      </div>

      {/* CARD 4: Sunshine Vault & Balance */}
      <div className="bg-[#0b1120]/90 border border-amber-500/50 rounded-lg p-3.5 relative overflow-hidden box-glow-amber">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span className="flex items-center gap-1.5 uppercase font-semibold text-amber-400">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            Bóveda Sunshine (Real)
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onOpenSunshineVault();
            }}
            className="text-[10px] font-mono text-amber-300 bg-amber-950/80 hover:bg-amber-900 px-1.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-1"
          >
            <ArrowDownLeft className="w-3 h-3" />
            <span>Depositar</span>
          </button>
        </div>

        <div className="space-y-1 font-mono text-xs my-1">
          <div className="flex justify-between items-center text-gray-300">
            <span className="text-gray-400">USDT Disponible:</span>
            <span className="font-bold text-white text-sm text-emerald-400">
              ${vault.usdtBalance.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span className="text-gray-400">Gas en Bóveda:</span>
            <span className="font-bold text-cyan-300">
              {vault.ethBalance.toFixed(4)} ETH
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span className="text-gray-400">Ganancia Acumulada:</span>
            <span className={`font-bold ${vault.accumulatedProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
              {vault.accumulatedProfit >= 0 ? '+' : ''}${vault.accumulatedProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
