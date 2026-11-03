import React, { useState, useMemo, useRef } from 'react';
import { Activity, Skull, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { PricePoint, FuturesPosition, BotConfig, TradeHistoryItem } from '../types';

interface PriceChartProps {
  data: PricePoint[];
  pos: FuturesPosition | null;
  cfg: BotConfig;
  history: TradeHistoryItem[];
  baseSymbol: string;
  quoteSymbol: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  pos,
  cfg,
  history,
  baseSymbol,
  quoteSymbol,
}) => {
  const [timeframe, setTimeframe] = useState<'30s' | '1m' | '5m' | 'all'>('1m');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; price: number; time: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter data by timeframe
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    const now = Date.now();
    let ms = 60_000;
    if (timeframe === '30s') ms = 30_000;
    if (timeframe === '5m') ms = 300_000;
    if (timeframe === 'all') ms = 3600_000;

    const subset = data.filter((d) => now - d.t <= ms);
    return subset.length > 1 ? subset : data.slice(-20);
  }, [data, timeframe]);

  // Calculate scales and indicators
  const { minPrice, maxPrice, pointsString, areaString, currentY, entryY, tpY, slY, liqY, currentPrice } = useMemo(() => {
    if (!filteredData.length) {
      return {
        minPrice: 0,
        maxPrice: 100,
        pointsString: '',
        areaString: '',
        currentY: 50,
        entryY: null,
        tpY: null,
        slY: null,
        liqY: null,
        currentPrice: 0,
      };
    }

    const prices = filteredData.map((d) => d.p);
    const curr = prices[prices.length - 1];

    let min = Math.min(...prices);
    let max = Math.max(...prices);

    // If there is an active futures position, include entry, tp, sl, and liq in the scale
    if (pos) {
      min = Math.min(min, pos.entry, pos.liqPrice, pos.tpPrice, pos.slPrice);
      max = Math.max(max, pos.entry, pos.liqPrice, pos.tpPrice, pos.slPrice);
    }

    // 8% vertical padding
    const padding = (max - min) * 0.08 || 1;
    min -= padding;
    max += padding;

    const width = 1000;
    const height = 400;

    const scaleX = (index: number) => {
      if (filteredData.length <= 1) return width / 2;
      return (index / (filteredData.length - 1)) * width;
    };

    const scaleY = (p: number) => {
      const diff = max - min || 1;
      return height - ((p - min) / diff) * height;
    };

    const pts = filteredData.map((d, i) => `${scaleX(i).toFixed(1)},${scaleY(d.p).toFixed(1)}`);
    const pointsStr = pts.join(' ');
    const areaStr = `0,${height} ${pointsStr} ${width},${height}`;

    const curY = scaleY(curr);
    const entY = pos ? scaleY(pos.entry) : null;
    const tY = pos ? scaleY(pos.tpPrice) : null;
    const sY = pos ? scaleY(pos.slPrice) : null;
    const lY = pos ? scaleY(pos.liqPrice) : null;

    return {
      minPrice: min,
      maxPrice: max,
      pointsString: pointsStr,
      areaString: areaStr,
      currentY: curY,
      entryY: entY,
      tpY: tY,
      slY: sY,
      liqY: lY,
      currentPrice: curr,
    };
  }, [filteredData, pos]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || !filteredData.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const index = Math.round(ratio * (filteredData.length - 1));
    const target = filteredData[index];
    if (target) {
      setHoveredPoint({
        x: (index / (filteredData.length - 1)) * 1000,
        y: 400 - ((target.p - minPrice) / (maxPrice - minPrice || 1)) * 400,
        price: target.p,
        time: new Date(target.t).toLocaleTimeString(),
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#080d1a]/95 border border-cyan-900/40 rounded-lg p-4 relative overflow-hidden flex flex-col box-glow-cyan"
    >
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-950/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-['Orbitron',sans-serif] tracking-wider">TICK STREAM PERPETUO // {cfg.pair}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-400">
            <span className="text-amber-400 font-bold">{cfg.leverage}X</span>
            <span className="text-gray-600">•</span>
            <span className="text-emerald-400 font-bold">
              ${currentPrice ? currentPrice.toFixed(2) : '---'}
            </span>
          </div>
        </div>

        {/* Timeframe switchers */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded border border-cyan-950 text-xs font-mono">
          {(['30s', '1m', '5m', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded transition text-xs font-bold ${
                timeframe === tf
                  ? 'bg-cyan-600 text-white shadow-[0_0_8px_#06b6d4]'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-slate-800'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-64 sm:h-80 select-none">
        <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />

        <svg
          viewBox="0 0 1000 400"
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="cyberAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="cyberStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((pct, idx) => (
            <line
              key={idx}
              x1="0"
              y1={400 * pct}
              x2="1000"
              y2={400 * pct}
              stroke="#1e293b"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          ))}

          {/* Take Profit Line */}
          {tpY !== null && (
            <g>
              <line x1="0" y1={tpY} x2="1000" y2={tpY} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.8" />
              <text x="8" y={Math.max(14, tpY - 4)} fill="#22c55e" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                TAKE PROFIT : ${pos!.tpPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* Stop Loss Line */}
          {slY !== null && (
            <g>
              <line x1="0" y1={slY} x2="1000" y2={slY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.8" />
              <text x="8" y={Math.min(390, slY + 14)} fill="#ef4444" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                STOP LOSS : ${pos!.slPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* Liquidation Price Line (Skull) */}
          {liqY !== null && (
            <g>
              <line x1="0" y1={liqY} x2="1000" y2={liqY} stroke="#dc2626" strokeWidth="2" strokeDasharray="3 3" opacity="0.9" />
              <text x="8" y={Math.min(390, Math.max(14, liqY - 4))} fill="#dc2626" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                ☠ PRECIO LIQUIDACIÓN : ${pos!.liqPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* Entry Line */}
          {entryY !== null && (
            <g>
              <line x1="0" y1={entryY} x2="1000" y2={entryY} stroke="#eab308" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
              <text x="8" y={Math.max(14, entryY - 4)} fill="#eab308" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                ENTRADA {pos!.side.toUpperCase()} : ${pos!.entry.toFixed(2)}
              </text>
            </g>
          )}

          {/* Area fill */}
          {areaString && <polygon points={areaString} fill="url(#cyberAreaGrad)" />}

          {/* Stroke Line */}
          {pointsString && (
            <polyline
              points={pointsString}
              fill="none"
              stroke="url(#cyberStrokeGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGlow)"
            />
          )}

          {/* Current Price Marker */}
          {currentY !== null && (
            <g>
              <line x1="0" y1={currentY} x2="1000" y2={currentY} stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
              <circle cx="1000" cy={currentY} r="5" fill="#06b6d4" className="animate-ping" opacity="0.6" />
              <circle cx="1000" cy={currentY} r="4" fill="#38bdf8" />
            </g>
          )}

          {/* Hover crosshair */}
          {hoveredPoint && (
            <g>
              <line x1={hoveredPoint.x} y1="0" x2={hoveredPoint.x} y2="400" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-950/95 border border-cyan-400 px-2.5 py-1.5 rounded shadow-xl font-mono text-xs text-white"
            style={{
              left: `${(hoveredPoint.x / 1000) * 100}%`,
              top: `${Math.max(30, (hoveredPoint.y / 400) * 100 - 4)}%`,
            }}
          >
            <div className="font-bold text-cyan-300">${hoveredPoint.price.toFixed(2)}</div>
            <div className="text-[10px] text-gray-400">{hoveredPoint.time}</div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-[11px] font-mono text-gray-400 mt-2 px-1">
        <span>Min: <strong className="text-gray-300">${minPrice.toFixed(2)}</strong></span>
        <span className="text-amber-400/80 hidden sm:inline">Modo Real On-Chain</span>
        <span>Max: <strong className="text-gray-300">${maxPrice.toFixed(2)}</strong></span>
      </div>
    </div>
  );
};
