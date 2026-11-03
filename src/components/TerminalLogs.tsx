import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Check, Trash2, Pause, Play, Search } from 'lucide-react';
import { TerminalLog } from '../types';

interface TerminalLogsProps {
  logs: TerminalLog[];
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs }) => {
  const [filter, setFilter] = useState<'all' | 'trades' | 'ai' | 'errors'>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'trades' && !(log.m.includes('Swap') || log.m.includes('COMPRA') || log.m.includes('VENTA'))) {
      return false;
    }
    if (filter === 'ai' && !(log.m.includes('AI') || log.m.includes('IA') || log.m.includes('NEURAL'))) {
      return false;
    }
    if (filter === 'errors' && !(log.c === 'dn' || log.m.toLowerCase().includes('fall') || log.m.toLowerCase().includes('error'))) {
      return false;
    }
    if (search && !log.m.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs.map((l) => `[${l.t}] ${l.m}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLogColor = (log: TerminalLog) => {
    if (log.c === 'up') return 'text-emerald-400 font-semibold';
    if (log.c === 'dn') return 'text-rose-400 font-semibold';
    if (log.c === 'cyan') return 'text-cyan-400';
    if (log.m.includes('AI') || log.m.includes('IA') || log.m.includes('NEURAL')) return 'text-purple-300';
    if (log.m.includes('ARMADO')) return 'text-emerald-300 font-bold';
    if (log.m.includes('DESARMADO')) return 'text-amber-300 font-bold';
    return 'text-gray-300';
  };

  return (
    <div className="bg-[#050811] border border-cyan-900/40 rounded-lg p-3.5 flex flex-col h-80 box-glow-cyan relative overflow-hidden font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-cyan-950/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-['Orbitron',sans-serif] font-bold text-xs text-cyan-300">
            CONSOLA DE TELEMETRÍA // LIVE LOGS
          </span>
          <span className="text-[10px] bg-slate-900 text-gray-400 px-1.5 py-0.2 rounded border border-gray-800">
            {filteredLogs.length} eventos
          </span>
        </div>

        {/* Filters and controls */}
        <div className="flex items-center gap-1.5">
          {/* Category Tabs */}
          <div className="flex bg-slate-900/90 rounded p-0.5 border border-slate-800 text-[10px]">
            {(['all', 'trades', 'ai', 'errors'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2 py-0.5 rounded uppercase font-bold transition ${
                  filter === tab ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Autoscroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded border text-[10px] ${
              autoScroll ? 'bg-cyan-950 text-cyan-300 border-cyan-600' : 'bg-slate-900 text-gray-400 border-slate-800'
            }`}
            title={autoScroll ? 'Pausar auto-scroll' : 'Reanudar auto-scroll'}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopyLogs}
            className="p-1 rounded bg-slate-900 text-gray-300 border border-slate-800 hover:text-white transition"
            title="Copiar logs al portapapeles"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Log Output Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-gray-400 italic py-8 text-center">
            No hay eventos registrados que coincidan con el filtro seleccionado.
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed hover:bg-slate-900/50 px-1 rounded transition flex items-start gap-2">
              <span className="text-gray-400 select-none shrink-0 font-mono">[{log.t}]</span>
              <span className={`break-all ${getLogColor(log)}`}>{log.m}</span>
            </div>
          ))
        )}
      </div>

      {/* Bottom Status Ticker */}
      <div className="pt-2 mt-2 border-t border-slate-900/80 flex items-center justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Stream socket activo</span>
        </span>
        <span>Auto-scroll: {autoScroll ? 'Activado' : 'Pausado'}</span>
      </div>
    </div>
  );
};
