import React from 'react';
import { Target, Skull, ShieldCheck, Zap, Crosshair, Gift, Compass } from 'lucide-react';
import { LiquidationCluster, FuturesPosition, BotConfig } from '../types';

interface LiquidationRadarProps {
  clusters: LiquidationCluster[];
  currentPrice: number | null;
  pos: FuturesPosition | null;
  cfg: BotConfig;
  pair: string;
}

export const LiquidationRadar: React.FC<LiquidationRadarProps> = ({
  clusters,
  currentPrice,
  pos,
  cfg,
  pair,
}) => {
  const p = currentPrice || 94500;

  const shortClusters = clusters.filter((c) => c.side === 'short_liq').sort((a, b) => b.price - a.price);
  const longClusters = clusters.filter((c) => c.side === 'long_liq').sort((a, b) => b.price - a.price);

  const totalShortVol = shortClusters.reduce((acc, c) => acc + c.volumeUsd, 0);
  const totalLongVol = longClusters.reduce((acc, c) => acc + c.volumeUsd, 0);

  return (
    <div className="bg-[#080d1a]/95 border border-amber-500/50 rounded-lg p-4 relative flex flex-col box-glow-amber font-mono text-xs overflow-hidden">
      {/* Gift badge in corner */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-amber-900/60">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-['Orbitron',sans-serif] text-xs font-bold tracking-wider text-amber-300">
            RADAR SNIPER DE LIQUIDACIONES // PLUS MATRIX
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 font-bold">
          <Gift className="w-3 h-3 text-amber-400" />
          <span>REGALO PLUS ACTIVADO</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
        Detecta en tiempo real las zonas donde se acumulan las órdenes de liquidación forzada de ballenas y traders apalancados. El bot snipea estas cascadas de liquidez.
      </p>

      {/* Radar Visual Feed */}
      <div className="space-y-3">
        {/* Short Liquidations Zone (Above current price) */}
        <div>
          <div className="flex justify-between items-center text-[10px] text-rose-400 mb-1">
            <span className="flex items-center gap-1 font-bold">
              <Skull className="w-3 h-3" />
              ZONA DE SHORT SQUEEZE (LIQUIDACIONES CORTAS):
            </span>
            <span>Total: ${(totalShortVol / 1000000).toFixed(2)}M USDT</span>
          </div>

          <div className="space-y-1">
            {shortClusters.map((cluster, idx) => {
              const diffPct = ((cluster.price / p - 1) * 100).toFixed(2);
              return (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <span className="w-16 text-gray-300">${cluster.price.toFixed(0)}</span>
                  <div className="flex-1 h-3 bg-slate-900 rounded overflow-hidden flex">
                    <div
                      className="h-full bg-gradient-to-r from-rose-900 to-rose-500 rounded"
                      style={{ width: `${Math.min(100, (cluster.volumeUsd / 2000000) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-rose-300">+{diffPct}%</span>
                  <span className="w-16 text-right text-gray-400">${(cluster.volumeUsd / 1000).toFixed(0)}k</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Price Marker */}
        <div className="py-1 px-3 rounded bg-amber-950/40 border border-amber-500/60 flex items-center justify-between text-[11px] font-bold">
          <span className="text-amber-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 animate-pulse" />
            PRECIO DE MERCADO {pair}:
          </span>
          <span className="text-white text-sm glow-amber">${p.toFixed(2)}</span>
        </div>

        {/* Long Liquidations Zone (Below current price) */}
        <div>
          <div className="flex justify-between items-center text-[10px] text-emerald-400 mb-1">
            <span className="flex items-center gap-1 font-bold">
              <Target className="w-3 h-3" />
              ZONA DE LONG FLUSH (LIQUIDACIONES LARGAS):
            </span>
            <span>Total: ${(totalLongVol / 1000000).toFixed(2)}M USDT</span>
          </div>

          <div className="space-y-1">
            {longClusters.map((cluster, idx) => {
              const diffPct = ((1 - cluster.price / p) * 100).toFixed(2);
              return (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <span className="w-16 text-gray-300">${cluster.price.toFixed(0)}</span>
                  <div className="flex-1 h-3 bg-slate-900 rounded overflow-hidden flex">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-900 to-emerald-500 rounded"
                      style={{ width: `${Math.min(100, (cluster.volumeUsd / 2000000) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-emerald-300">-{diffPct}%</span>
                  <span className="w-16 text-right text-gray-400">${(cluster.volumeUsd / 1000).toFixed(0)}k</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shield Status Bar */}
        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-slate-950 p-2 rounded border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Escudo Anti-Liquidación: <strong>ACTIVO</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-400 bg-slate-950 p-2 rounded border border-slate-800">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Auto-Desapalancamiento: <strong>{cfg.autoDeleverage ? 'ARMADO' : 'MANUAL'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
