import React from 'react';
import { History, TrendingUp, TrendingDown, Flame, Award } from 'lucide-react';
import { TradeHistoryItem } from '../types';

interface TradeHistoryTableProps {
  history: TradeHistoryItem[];
  pair: string;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({
  history,
  pair,
}) => {
  const closedTrades = history.filter((h) => h.side.startsWith('close'));
  const winTrades = closedTrades.filter((h) => (h.pnl || 0) > 0);
  const totalPnL = closedTrades.reduce((acc, h) => acc + (h.pnl || 0), 0);
  const winRate = closedTrades.length ? ((winTrades.length / closedTrades.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-[#080d1a]/95 border border-cyan-900/40 rounded-lg p-4 flex flex-col box-glow-cyan font-mono text-xs">
      {/* Title & Stats Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-cyan-950/80">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="font-['Orbitron',sans-serif] font-bold text-xs text-cyan-200">
            LIBRO DE ÓRDENES // HISTORIAL DE FUTUROS PERPETUOS
          </span>
          <span className="text-[10px] bg-slate-900 text-gray-400 px-1.5 py-0.5 rounded border border-gray-800">
            {history.length} operaciones
          </span>
        </div>

        {/* Performance Badges */}
        <div className="flex items-center gap-3 text-[11px] flex-wrap">
          <div className="bg-slate-900/90 px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5">
            <span className="text-gray-400">Win Rate:</span>
            <span className={`font-bold ${parseFloat(winRate) >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {winRate}%
            </span>
            <span className="text-gray-400 text-[10px]">({winTrades.length}/{closedTrades.length})</span>
          </div>

          <div className="bg-slate-900/90 px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5">
            <span className="text-gray-400">PnL Neto Sesión:</span>
            <span className={`font-bold ${totalPnL >= 0 ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} USDT
            </span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-gray-400 uppercase tracking-wider">
              <th className="py-2 px-2">Hora</th>
              <th className="py-2 px-2">Posición</th>
              <th className="py-2 px-2">Apalancamiento</th>
              <th className="py-2 px-2">Precio Ej.</th>
              <th className="py-2 px-2">Margen / Capital</th>
              <th className="py-2 px-2">P&amp;L Neto (ROE %)</th>
              <th className="py-2 px-2">Disparador / Motivo</th>
              <th className="py-2 px-2 text-right">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-[11px]">
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                  Aún no hay ejecuciones de futuros registradas. Abre un Long o Short manual o activa el piloto 24/7.
                </td>
              </tr>
            ) : (
              [...history].reverse().map((item) => {
                const isLong = item.side === 'long' || item.side === 'close_long';
                const isClose = item.side.startsWith('close');
                const hasPnL = item.pnl !== null;
                const isWin = (item.pnl || 0) >= 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2 px-2 text-gray-400 whitespace-nowrap">{item.t}</td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isLong
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {isLong ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                        {item.side.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <span className="text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-900/40 text-[10px]">
                        {item.leverage}X
                      </span>
                    </td>
                    <td className="py-2 px-2 font-bold text-gray-200 whitespace-nowrap">
                      ${item.px.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-gray-300 whitespace-nowrap">${item.amtQuote.toFixed(2)} USDT</td>
                    <td className="py-2 px-2 whitespace-nowrap font-bold">
                      {hasPnL ? (
                        <span className={isWin ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'}>
                          {isWin ? '+' : ''}${item.pnl?.toFixed(2)} ({isWin ? '+' : ''}{item.pnlPct?.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="text-gray-500">En curso</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-gray-300 max-w-xs truncate" title={item.why}>
                      {item.why}
                    </td>
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <span className="text-[10px] text-cyan-400/80 font-mono">
                        {item.txHash ? `${item.txHash.slice(0, 6)}...${item.txHash.slice(-4)}` : '0x---'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
