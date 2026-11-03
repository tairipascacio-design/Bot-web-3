import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Sliders,
  ShieldAlert,
  AlertTriangle,
  Scale,
  DollarSign,
  Flame,
} from 'lucide-react';
import { FuturesPosition, BotConfig, SunshineVault } from '../types';
import { FUTURES_PAIRS } from '../constants/futuresPairs';
import { sound } from '../services/sound';

interface FuturesControlsProps {
  pos: FuturesPosition | null;
  cfg: BotConfig;
  vault: SunshineVault;
  currentPrice: number | null;
  onOpenPosition: (side: 'long' | 'short', leverage: number, margin: number) => Promise<void>;
  onClosePosition: () => Promise<void>;
  onPanicCloseAll: () => void;
  onUpdateConfig: (newCfg: Partial<BotConfig>) => Promise<boolean>;
  isActionLoading: boolean;
}

export const FuturesControls: React.FC<FuturesControlsProps> = ({
  pos,
  cfg,
  vault,
  currentPrice,
  onOpenPosition,
  onClosePosition,
  onPanicCloseAll,
  onUpdateConfig,
  isActionLoading,
}) => {
  const [selectedPair, setSelectedPair] = useState<string>(cfg.pair || 'BTC/USDT');
  const [leverage, setLeverage] = useState<number>(cfg.leverage || 10);
  const [marginInput, setMarginInput] = useState<string>(String(cfg.margin || 2));

  // Sync if external cfg changes and user is not actively modifying
  useEffect(() => {
    if (cfg.pair) setSelectedPair(cfg.pair);
    if (cfg.leverage) setLeverage(cfg.leverage);
    if (cfg.margin) setMarginInput(String(cfg.margin));
  }, [cfg.pair, cfg.leverage, cfg.margin]);

  const p = currentPrice || 94500;
  const numericMargin = parseFloat(marginInput) || 2;
  const notional = numericMargin * leverage;

  // Estimated liquidation prices
  const estLiqLong = p * (1 - (1 / leverage) + 0.005);
  const estLiqShort = p * (1 + (1 / leverage) - 0.005);

  const handlePairChange = async (newPair: string) => {
    sound.playClick();
    setSelectedPair(newPair);
    await onUpdateConfig({ pair: newPair });
  };

  const handleLeverageChange = async (lev: number) => {
    sound.playClick();
    setLeverage(lev);
    await onUpdateConfig({ leverage: lev });
  };

  const handleMarginChange = (val: string) => {
    setMarginInput(val);
    const parsed = parseFloat(val);
    if (Number.isFinite(parsed) && parsed > 0) {
      onUpdateConfig({ margin: parsed, size: parsed });
    }
  };

  const handleQuickMargin = (val: number) => {
    sound.playClick();
    setMarginInput(String(val));
    onUpdateConfig({ margin: val, size: val });
  };

  const handleOpenLong = async () => {
    sound.playBuy();
    await onOpenPosition('long', leverage, numericMargin);
  };

  const handleOpenShort = async () => {
    sound.playSell();
    await onOpenPosition('short', leverage, numericMargin);
  };

  return (
    <div className="bg-[#080d1a]/95 border border-cyan-900/40 rounded-lg p-4 relative flex flex-col box-glow-cyan font-mono text-xs">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-950/80">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="font-['Orbitron',sans-serif] text-xs font-bold tracking-wider text-amber-200">
            CABINA DE ÓRDENES // TRADING MANUAL
          </span>
        </div>
        <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
          EJECUCIÓN INMEDIATA
        </span>
      </div>

      <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
        Usa este panel para entrar o salir <strong>manualmente</strong> en Long o Short en cualquier momento.
      </p>

      <div className="space-y-3">
        {/* Pair Selector */}
        <div>
          <label className="block text-gray-400 mb-1 text-[11px] font-bold">Contrato de Futuros</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {FUTURES_PAIRS.map((pairItem) => (
              <button
                key={pairItem.symbol}
                type="button"
                onClick={() => handlePairChange(pairItem.symbol)}
                className={`py-1.5 px-2 rounded text-center transition font-bold ${
                  selectedPair === pairItem.symbol
                    ? 'bg-cyan-600 text-white shadow-[0_0_8px_#06b6d4] border border-cyan-300'
                    : 'bg-slate-900 text-gray-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {pairItem.symbol.split('/')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage Selector */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-gray-400 text-[11px] font-bold flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Apalancamiento:</span>
              <strong className="text-amber-300 text-sm">{leverage}X</strong>
            </label>
            {leverage >= 20 && (
              <span className="text-[10px] text-rose-400 flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3 h-3" /> Alto Riesgo
              </span>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {[2, 5, 10, 20, 50, 75, 100].map((lev) => (
              <button
                key={lev}
                type="button"
                onClick={() => handleLeverageChange(lev)}
                className={`py-1 rounded text-center transition font-bold text-[11px] ${
                  leverage === lev
                    ? 'bg-amber-500 text-black shadow-[0_0_8px_#f59e0b] border border-amber-300'
                    : 'bg-slate-900 text-gray-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {lev}X
              </button>
            ))}
          </div>

          <input
            type="range"
            min="1"
            max="100"
            value={leverage}
            onChange={(e) => handleLeverageChange(parseInt(e.target.value) || 1)}
            className="w-full mt-2 accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Margin Capital Input with Custom $2, $5, $10 chips */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-gray-400 text-[11px] font-bold">
              Margen / Capital (<span className="text-emerald-400">Pruébalo con $2, $5, $10 USDT</span>)
            </label>
            <span className="text-[10px] text-emerald-400 font-mono">
              Bóveda: ${vault.usdtBalance.toFixed(2)} USDT
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-2.5 top-1.5 text-gray-400">$</span>
            <input
              type="number"
              step="any"
              min="0.1"
              value={marginInput}
              onChange={(e) => handleMarginChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleMarginChange(marginInput);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded pl-6 pr-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400 font-bold"
              placeholder="2"
            />
          </div>

          {/* Micro-Test Quick Chips ($2, $5, $10, $25, $50) */}
          <div className="grid grid-cols-5 gap-1.5 mt-1.5">
            {[2, 5, 10, 25, 50].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickMargin(amt)}
                className={`py-1 rounded text-center transition font-bold text-[10px] border ${
                  numericMargin === amt
                    ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_8px_#f59e0b]'
                    : 'bg-slate-950 text-gray-300 hover:bg-slate-800 border-slate-800'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Pre-computation Card */}
        <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 text-[11px] space-y-1">
          <div className="flex justify-between text-gray-300">
            <span className="text-gray-400">Poder de Compra (Nocional):</span>
            <span className="font-bold text-amber-300">${notional.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span className="text-gray-400">Precio Est. Liq. (Long):</span>
            <span className="text-rose-400 font-bold">${estLiqLong.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span className="text-gray-400">Precio Est. Liq. (Short):</span>
            <span className="text-rose-400 font-bold">${estLiqShort.toFixed(2)}</span>
          </div>
        </div>

        {/* Execution Buttons */}
        {!pos ? (
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleOpenLong}
              disabled={isActionLoading || numericMargin <= 0 || vault.usdtBalance < numericMargin}
              className="py-3 px-3 rounded font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-black border border-emerald-300 box-glow-green cursor-pointer flex items-center justify-center gap-1.5 transition text-xs"
            >
              <TrendingUp className="w-4 h-4" />
              <span>ABRIR LONG ({leverage}X)</span>
            </button>

            <button
              onClick={handleOpenShort}
              disabled={isActionLoading || numericMargin <= 0 || vault.usdtBalance < numericMargin}
              className="py-3 px-3 rounded font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white border border-rose-300 box-glow-red cursor-pointer flex items-center justify-center gap-1.5 transition text-xs"
            >
              <TrendingDown className="w-4 h-4" />
              <span>ABRIR SHORT ({leverage}X)</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded bg-slate-950 border border-amber-500/50 flex items-center justify-between">
              <div>
                <span className={`font-bold uppercase ${pos.side === 'long' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pos.side} {pos.leverage}X @ ${pos.entry.toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400 block">
                  Margen: ${pos.margin} · Nocional: ${pos.notional.toFixed(0)}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-base font-bold ${pos.roePct >= 0 ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'}`}>
                  {pos.roePct >= 0 ? '+' : ''}{pos.roePct.toFixed(2)}%
                </span>
                <span className="text-[10px] text-gray-400 block">
                  ({pos.pnlUsd >= 0 ? '+' : ''}${pos.pnlUsd.toFixed(2)})
                </span>
              </div>
            </div>

            <button
              onClick={onClosePosition}
              disabled={isActionLoading}
              className="w-full py-2.5 rounded font-bold uppercase tracking-wider bg-rose-700 hover:bg-rose-600 text-white border border-rose-400 box-glow-red transition cursor-pointer"
            >
              CERRAR POSICIÓN DE FUTUROS AHORA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
