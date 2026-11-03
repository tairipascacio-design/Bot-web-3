import React, { useState } from 'react';
import { ShoppingCart, DollarSign, ShieldAlert, Zap, AlertTriangle } from 'lucide-react';
import { Position, BotConfig } from '../types';
import { sound } from '../services/sound';

interface ManualControlsProps {
  pos: Position | null;
  cfg: BotConfig;
  onBuy: (amountQuote?: number) => Promise<boolean>;
  onSell: () => Promise<boolean>;
  onPanicSellAll: () => void;
  baseSymbol: string;
  quoteSymbol: string;
  isActionLoading: boolean;
}

export const ManualControls: React.FC<ManualControlsProps> = ({
  pos,
  cfg,
  onBuy,
  onSell,
  onPanicSellAll,
  baseSymbol,
  quoteSymbol,
  isActionLoading,
}) => {
  const [customSize, setCustomSize] = useState<number>(cfg.size);

  const handleManualBuy = async () => {
    sound.playBuy();
    await onBuy(customSize);
  };

  const handleManualSell = async () => {
    sound.playSell();
    await onSell();
  };

  return (
    <div className="bg-[#080d1a]/95 border border-cyan-900/40 rounded-lg p-4 relative flex flex-col box-glow-cyan">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-cyan-950/80">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-['Orbitron',sans-serif] text-xs font-bold tracking-wider text-amber-200">
            CONTROL TÁCTICO // INTERVENCIÓN MANUAL
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          Slippage: <strong className="text-gray-200">{cfg.slip}%</strong>
        </span>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {/* Quick Size Chips */}
        <div>
          <label className="block text-gray-400 mb-1.5 text-[11px]">Tamaño de orden rápida ({quoteSymbol})</label>
          <div className="grid grid-cols-4 gap-1.5">
            {[25, 50, 100, 250].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  sound.playClick();
                  setCustomSize(amt);
                }}
                className={`py-1 rounded text-center transition font-bold ${
                  customSize === amt
                    ? 'bg-cyan-600 text-white shadow-[0_0_8px_#06b6d4]'
                    : 'bg-slate-900 text-gray-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div>
          <div className="relative">
            <span className="absolute left-2.5 top-1.5 text-gray-400">$</span>
            <input
              type="number"
              step="5"
              min="5"
              value={customSize}
              onChange={(e) => setCustomSize(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded pl-6 pr-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400"
              placeholder="Monto personalizado"
            />
          </div>
        </div>

        {/* Execution Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* BUY BUTTON */}
          <button
            onClick={handleManualBuy}
            disabled={Boolean(pos) || isActionLoading || customSize <= 0}
            className={`py-2.5 px-3 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition text-xs ${
              !pos
                ? 'bg-emerald-600 hover:bg-emerald-500 text-black border border-emerald-300 box-glow-green cursor-pointer'
                : 'bg-slate-900/50 text-gray-400 border border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>COMPRAR {baseSymbol}</span>
          </button>

          {/* SELL BUTTON */}
          <button
            onClick={handleManualSell}
            disabled={!pos || isActionLoading}
            className={`py-2.5 px-3 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition text-xs ${
              pos
                ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 box-glow-red cursor-pointer animate-pulse'
                : 'bg-slate-900/50 text-gray-400 border border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>VENDER POSICIÓN</span>
          </button>
        </div>

        {/* Position Context / Warnings */}
        {pos ? (
          <div className="p-2 rounded bg-amber-950/40 border border-amber-600/40 text-amber-200 text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Posición abierta activa a ${pos.entry.toFixed(2)}. Haz clic en Vender o deja que el piloto tome TP/SL.</span>
          </div>
        ) : (
          <div className="text-[10px] text-gray-400 text-center">
            Liquidez lista en bóveda. Ejecución directa por SwapRouter de Uniswap V3.
          </div>
        )}
      </div>
    </div>
  );
};
