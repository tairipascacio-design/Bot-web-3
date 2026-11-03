import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TelemetryCards } from './components/TelemetryCards';
import { PriceChart } from './components/PriceChart';
import { FuturesControls } from './components/FuturesControls';
import { LiquidationRadar } from './components/LiquidationRadar';
import { AiBrainPanel } from './components/AiBrainPanel';
import { StrategyConfig } from './components/StrategyConfig';
import { TerminalLogs } from './components/TerminalLogs';
import { TradeHistoryTable } from './components/TradeHistoryTable';
import { SunshineVaultModal } from './components/SunshineVaultModal';
import { HyperliquidModal } from './components/HyperliquidModal';
import { PairPresetsModal } from './components/PairPresetsModal';
import { DownloadApkModal } from './components/DownloadApkModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { Zap, Key, Sun, Smartphone } from 'lucide-react';
import { AppState, BotConfig, PairPreset } from './types';
import { sound } from './services/sound';
import { POPULAR_PRESETS } from './constants/presets';

const INITIAL_STATE: AppState = {
  ts: Date.now(),
  price: 94850.25,
  mom: 0.18,
  on: false,
  pos: null,
  cfg: {
    ba: POPULAR_PRESETS[0].ba,
    qa: POPULAR_PRESETS[0].qa,
    rt: POPULAR_PRESETS[0].rt,
    qt: POPULAR_PRESETS[0].qt,
    fee: 3000,
    size: 50,
    slip: 0.5,
    every: 8,
    mode: 'rules',
    thr: 0.25,
    tp: 2.5,
    sl: 1.2,
    conf: 0.75,
    ap: 'exact',
    aiEvery: 25,
    simulationMode: false, // MODO REAL ACTIVO
    futuresEnabled: true,
    pair: 'BTC/USDT',
    leverage: 10,
    margin: 100,
    marginType: 'isolated',
    trailingStopPct: 0.8,
    autoDeleverage: true,
  },
  hist: [],
  logs: [
    { t: new Date().toISOString().slice(11, 19), m: '⚡ NEON GHOST // Autopilot de Futuros Perpetuos v0.3.0 listo', c: 'cyan' },
    { t: new Date().toISOString().slice(11, 19), m: '☀️ Bóveda Sunshine on-chain activa en modo real', c: 'up' },
  ],
  pnlPct: null,
  pnlUsd: null,
  px: [],
  wallet: null,
  isSimulation: false,
  sunshineVault: {
    address: '0xE6eFB50cf3F3E0E7AF836afAbe9A7424E213A640',
    ethBalance: 0.0,
    usdtBalance: 0.0,
    usdcBalance: 0.0,
    totalDeposited: 0.0,
    totalWithdrawn: 0.0,
    accumulatedProfit: 0.0,
    lastDepositTs: null,
    lastDepositAmt: null,
  },
  bal: 'USDT: $0.00 · ETH: 0.0000',
  hasAiKey: true,
  aiThinking: false,
  lastAiSignal: null,
  liquidationRadar: [],
  err: '',
  chain: 'Arbitrum One / EVM (Modo Real)',
  chainId: 42161,
  uptime: 0,
  tokenSymbols: {
    base: 'BTC',
    quote: 'USDT',
  },
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isSunshineOpen, setIsSunshineOpen] = useState(false);
  const [sunshineTab, setSunshineTab] = useState<'deposit' | 'withdraw' | 'exportKey' | 'importKey'>('exportKey');
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isDownloadApkOpen, setIsDownloadApkOpen] = useState(false);
  const [isHyperliquidOpen, setIsHyperliquidOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'up' | 'dn' | 'info' } | null>(null);

  const { isInstallable: canInstallPwa, install: installPwa } = usePWAInstall();

  const showToast = (message: string, type: 'up' | 'dn' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // WebSocket Connection & state sync
  const connectWs = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state' && data.payload) {
            setState((prev) => {
              if (data.payload.hist && data.payload.hist.length > (prev.hist?.length || 0)) {
                const latest = data.payload.hist[data.payload.hist.length - 1];
                if (latest.side.includes('close')) sound.playSell();
                else sound.playBuy();
              }
              return { ...prev, ...data.payload };
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      };
      ws.onerror = () => ws.close();
    } catch {
      reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
    }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const payload = await res.json();
        setState((prev) => ({ ...prev, ...payload }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    connectWs();
    const interval = setInterval(fetchState, 3000);
    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWs, fetchState]);

  // Master Arm / Disarm Bot
  const handleToggleBot = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ on: !state.on }),
      });
      const data = await res.json();
      if (data.ok) {
        setState((prev) => ({ ...prev, on: data.on }));
        showToast(data.on ? '⚡ Piloto de Futuros 24/7 ARMADO' : '🛑 Piloto de Futuros DESARMADO', data.on ? 'up' : 'dn');
      }
    } catch {
      showToast('Error de conexión', 'dn');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Panic Close All
  const handlePanicCloseAll = async () => {
    if (!state.pos) return;
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/sellall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Liquidación de pánico ejecutada. Posición de futuros cerrada.', 'up');
        fetchState();
      } else {
        showToast(data.error || 'Error al cerrar posición', 'dn');
      }
    } catch {
      showToast('Error al enviar orden de pánico', 'dn');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Futures Position Manually
  const handleOpenFuturesPosition = async (side: 'long' | 'short', leverage: number, margin: number) => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/futures/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, leverage, margin, reason: `Manual Terminal ${side.toUpperCase()}` }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Posición ${side.toUpperCase()} ${leverage}X abierta con éxito ($${margin} USDT)`, 'up');
        fetchState();
      } else {
        showToast(data.error || 'Fallo al abrir posición de futuros', 'dn');
      }
    } catch {
      showToast('Error de red al abrir futuros', 'dn');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Close Futures Position Manually
  const handleCloseFuturesPosition = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/futures/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cierre manual desde terminal' }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Posición de futuros cerrada con éxito', 'up');
        fetchState();
      } else {
        showToast(data.error || 'Fallo al cerrar posición', 'dn');
      }
    } catch {
      showToast('Error de red al cerrar', 'dn');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Deposit into Sunshine Vault
  const handleDepositVault = async (amount: number) => {
    try {
      const res = await fetch('/api/vault/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.ok) {
        setState((prev) => ({ ...prev, sunshineVault: data.vault }));
        showToast(`Depósito de $${amount} USDT acreditado a la Bóveda Sunshine`, 'up');
      }
    } catch {
      showToast('Error al depositar', 'dn');
    }
  };

  // Real On-Chain Withdraw from Sunshine Vault
  const handleWithdrawVault = async (destinationAddress: string, amount: number, token: 'USDT' | 'ETH' = 'USDT') => {
    try {
      const res = await fetch('/api/vault/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationAddress, amount, token }),
      });
      const data = await res.json();
      if (data.ok) {
        setState((prev) => ({ ...prev, sunshineVault: data.vault }));
        showToast(`🚀 Retiro on-chain de ${amount} ${token} transmitido con éxito`, 'up');
        return { ok: true, txHash: data.txHash, etherscanUrl: data.etherscanUrl };
      } else {
        showToast(data.error || 'Error al retirar on-chain', 'dn');
        return { ok: false, error: data.error };
      }
    } catch {
      showToast('Error de conexión al retirar', 'dn');
      return { ok: false, error: 'Error de red o conexión al servidor' };
    }
  };

  // Reset Sunshine Vault (purge simulated credits)
  const handleResetVault = async () => {
    try {
      const res = await fetch('/api/vault/reset', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setState((prev) => ({ ...prev, sunshineVault: data.vault, hist: [] }));
        showToast('Bóveda reseteada: Créditos eliminados, saldo en $0.00 Real', 'info');
        return true;
      }
      return false;
    } catch {
      showToast('Error al resetear bóveda', 'dn');
      return false;
    }
  };

  // Sync Sunshine Vault with on-chain RPC
  const handleSyncVault = async () => {
    try {
      const res = await fetch('/api/vault/sync', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setState((prev) => ({ ...prev, sunshineVault: data.vault }));
        showToast(`Billetera sincronizada con RPC: $${data.vault.usdtBalance.toFixed(2)} USDT detectados`, 'up');
        return true;
      }
      return false;
    } catch {
      showToast('Error al sincronizar con blockchain', 'dn');
      return false;
    }
  };

  // Save Strategy Config
  const handleSaveConfig = async (newCfg: Partial<BotConfig>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg),
      });
      const data = await res.json();
      if (data.ok) {
        setState((prev) => ({ ...prev, cfg: data.cfg }));
        showToast('Parámetros de futuros actualizados en vivo', 'up');
        return true;
      }
      return false;
    } catch {
      showToast('Error de red al actualizar parámetros', 'dn');
      return false;
    }
  };

  // Run AI Learning
  const handleRunLearning = async () => {
    try {
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.ok) {
        showToast('IA Gemini: Estrategia de futuros calibrada', 'up');
        fetchState();
        return data;
      } else {
        return { ok: false, error: data.error };
      }
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  };

  // Audio Toggle
  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    sound.setEnabled(next);
    showToast(next ? 'Audio sintético activado' : 'Audio silenciado', 'info');
  };

  return (
    <div className="min-h-screen bg-[#05070c] text-gray-200 flex flex-col relative selection:bg-amber-500 selection:text-black">
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 cyber-grid opacity-30 pointer-events-none z-0" />
      <div className="fixed inset-0 scanline z-50 pointer-events-none opacity-25" />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-2.5 rounded-lg shadow-2xl font-mono text-xs border backdrop-blur flex items-center gap-2 transition-all duration-300 animate-bounce ${
            toast.type === 'up'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 box-glow-green'
              : toast.type === 'dn'
              ? 'bg-rose-950/90 text-rose-300 border-rose-500 box-glow-red'
              : 'bg-amber-950/90 text-amber-300 border-amber-500 box-glow-amber'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-ping" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        state={state}
        onToggleBot={handleToggleBot}
        onPanicSellAll={handlePanicCloseAll}
        onOpenSunshineVault={() => {
          setSunshineTab('deposit');
          setIsSunshineOpen(true);
        }}
        onOpenKeyModal={() => {
          setSunshineTab('exportKey');
          setIsSunshineOpen(true);
        }}
        onOpenHyperliquidModal={() => setIsHyperliquidOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenDownloadApk={() => setIsDownloadApkOpen(true)}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        isActionLoading={isActionLoading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 pb-24 md:pb-6 space-y-4 relative z-10">
        {/* Telemetry Cards Row */}
        <TelemetryCards
          state={state}
          onOpenSunshineVault={() => setIsSunshineOpen(true)}
        />

        {/* Chart + Futures Trading Cockpit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PriceChart
              data={state.px}
              pos={state.pos}
              cfg={state.cfg}
              history={state.hist}
              baseSymbol={state.tokenSymbols.base}
              quoteSymbol={state.tokenSymbols.quote}
            />
          </div>
          <div className="flex flex-col gap-4">
            <FuturesControls
              pos={state.pos}
              cfg={state.cfg}
              vault={state.sunshineVault}
              currentPrice={state.price}
              onOpenPosition={handleOpenFuturesPosition}
              onClosePosition={handleCloseFuturesPosition}
              onPanicCloseAll={handlePanicCloseAll}
              onUpdateConfig={handleSaveConfig}
              isActionLoading={isActionLoading}
            />
            <AiBrainPanel
              lastSignal={state.lastAiSignal}
              aiThinking={state.aiThinking}
              hasAiKey={state.hasAiKey}
              cfg={state.cfg}
              onRunLearning={handleRunLearning}
            />
          </div>
        </div>

        {/* PLUS / GIFT: Liquidation Radar & Heatmap Matrix */}
        <LiquidationRadar
          clusters={state.liquidationRadar}
          currentPrice={state.price}
          pos={state.pos}
          cfg={state.cfg}
          pair={state.cfg.pair}
        />

        {/* Strategy Matrix + Live Console Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StrategyConfig
            config={state.cfg}
            onSaveConfig={handleSaveConfig}
          />
          <TerminalLogs logs={state.logs} />
        </div>

        {/* Executed Orders History Table */}
        <TradeHistoryTable
          history={state.hist}
          pair={state.cfg.pair}
        />
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-cyan-900/40 bg-[#070b14]/90 px-4 py-2.5 text-xs font-mono text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <span>NEON GHOST Futuros Perpetuos (24/7)</span>
          <span>•</span>
          <span className="text-amber-400">Apalancamiento hasta 100X</span>
          <span>•</span>
          <span className="text-emerald-400">Modo Real On-Chain</span>
          <span>•</span>
          <span className="text-purple-400">Gemini Neural Core</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Uptime: {Math.floor(state.uptime / 60)}m {state.uptime % 60}s</span>
          <span>•</span>
          <span className={state.on ? 'text-emerald-400 font-bold' : 'text-amber-500'}>
            {state.on ? 'PILOTO FUTUROS ARMADO' : 'STANDBY'}
          </span>
        </div>
      </footer>

      {/* Sunshine Deposit Vault Modal */}
      <SunshineVaultModal
        isOpen={isSunshineOpen}
        onClose={() => setIsSunshineOpen(false)}
        vault={state.sunshineVault}
        onDeposit={handleDepositVault}
        onWithdraw={handleWithdrawVault}
        onResetVault={handleResetVault}
        onSyncVault={handleSyncVault}
        initialTab={sunshineTab}
      />

      {/* Presets Modal */}
      <PairPresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        currentConfig={state.cfg}
        onSelectPreset={async (preset) => {
          await handleSaveConfig({
            ba: preset.ba,
            qa: preset.qa,
            rt: preset.rt,
            qt: preset.qt,
            fee: preset.fee,
            simulationMode: false,
          });
          return true;
        }}
      />

      {/* Android APK & ZIP Download Modal */}
      <DownloadApkModal
        isOpen={isDownloadApkOpen}
        onClose={() => setIsDownloadApkOpen(false)}
        onInstallPwa={installPwa}
        canInstallPwa={canInstallPwa}
      />

      {/* Hyperliquid L1 Perps Modal */}
      <HyperliquidModal
        isOpen={isHyperliquidOpen}
        onClose={() => setIsHyperliquidOpen(false)}
        botAddress={state.sunshineVault.address}
      />

      {/* Mobile Android Quick Bar (Sticky at bottom on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b16]/95 border-t border-cyan-500/40 backdrop-blur px-2 py-2 flex items-center justify-around gap-1 shadow-2xl">
        <button
          onClick={() => {
            sound.playClick();
            setIsHyperliquidOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1 px-2 rounded text-cyan-300 hover:text-cyan-200 active:scale-95 transition"
        >
          <Zap className="w-4 h-4 text-cyan-400 mb-0.5 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase">Hyperliquid</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setSunshineTab('exportKey');
            setIsSunshineOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1 px-2 rounded text-amber-400 hover:text-amber-300 active:scale-95 transition"
        >
          <Key className="w-4 h-4 text-amber-400 mb-0.5" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase">Mi Clave</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setSunshineTab('deposit');
            setIsSunshineOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1 px-2 rounded text-emerald-400 hover:text-emerald-300 active:scale-95 transition"
        >
          <Sun className="w-4 h-4 text-emerald-400 mb-0.5" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase">Bóveda</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setIsDownloadApkOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1 px-2 rounded text-purple-300 hover:text-purple-200 active:scale-95 transition"
        >
          <Smartphone className="w-4 h-4 text-purple-400 mb-0.5" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase">App Android</span>
        </button>
      </div>
    </div>
  );
}
