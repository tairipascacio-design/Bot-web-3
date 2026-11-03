import React from 'react';
import {
  ShieldAlert,
  Power,
  Volume2,
  VolumeX,
  Layers,
  Zap,
  Radio,
  Sun,
  Flame,
  ArrowDownLeft,
  Smartphone,
  Key,
} from 'lucide-react';
import { AppState } from '../types';
import { sound } from '../services/sound';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  state: AppState;
  onToggleBot: () => void;
  onPanicSellAll: () => void;
  onOpenSunshineVault: () => void;
  onOpenKeyModal?: () => void;
  onOpenHyperliquidModal?: () => void;
  onOpenPresets: () => void;
  onOpenDownloadApk: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  isActionLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onToggleBot,
  onPanicSellAll,
  onOpenSunshineVault,
  onOpenKeyModal,
  onOpenHyperliquidModal,
  onOpenPresets,
  onOpenDownloadApk,
  audioEnabled,
  onToggleAudio,
  isActionLoading,
}) => {
  const isArmed = state.on;
  const vault = state.sunshineVault;

  return (
    <header className="border-b border-cyan-900/40 bg-[#070b14]/90 backdrop-blur sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Network Badges */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  isArmed ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                } animate-cyber-pulse`}
              />
              <div className="absolute inset-0 rounded-full border border-cyan-400/30 scale-150 animate-ping opacity-30" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold tracking-widest text-lg text-white font-['Orbitron',sans-serif]">
                  NEON<span className="text-cyan-400 glow-cyan">GHOST</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  FUTUROS {state.cfg.leverage}X
                </span>
                <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold glow-green">
                  MODO REAL ON-CHAIN
                </span>
              </div>
              <div className="text-[11px] text-gray-400 flex items-center gap-2 font-mono">
                <span className="text-cyan-400/90 flex items-center gap-1 font-bold">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                  DEX: HYPERLIQUID L1 PERPS
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-300 font-bold">
                  Contrato: <span className="text-amber-400">{state.cfg.pair}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Controls & Sunshine Vault Access */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          {/* Download APK / App Package Button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenDownloadApk();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 text-cyan-300 border border-cyan-500/50 box-glow-cyan transition shadow-lg cursor-pointer"
            title="Descargar APK para Android o paquete ZIP con instalador"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>DESCARGAR APK / APP</span>
          </button>

          {/* Hyperliquid L1 Perps Direct Hub Button */}
          <button
            onClick={() => {
              sound.playClick();
              if (onOpenHyperliquidModal) onOpenHyperliquidModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-400/60 hover:border-cyan-300 box-glow-cyan transition font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
            title="Abrir Hub de Hyperliquid L1 (Mercados, saldo y guía de requisitos)"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>⚡ HYPERLIQUID L1</span>
          </button>

          {/* Sunshine Deposit Vault Button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenSunshineVault();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-gradient-to-r from-amber-950/80 to-slate-900 text-amber-300 border border-amber-500/60 hover:border-amber-400 box-glow-amber transition"
            title="Abrir Bóveda de Depósito Sunshine"
          >
            <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
            <div className="text-left font-mono">
              <span className="text-[10px] block text-gray-400 uppercase leading-none">Bóveda Sunshine</span>
              <span className="text-xs font-bold text-emerald-400 leading-tight">
                ${vault.usdtBalance.toFixed(2)} USDT
              </span>
            </div>
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400 ml-1" />
          </button>

          {/* Dedicated Private Key Copy / Export Button */}
          <button
            onClick={() => {
              sound.playClick();
              if (onOpenKeyModal) onOpenKeyModal();
              else onOpenSunshineVault();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            title="Ver y Copiar Clave Privada para MetaMask / Trust Wallet"
          >
            <Key className="w-4 h-4 text-black animate-pulse" />
            <span>🔑 CLAVE PRIVADA</span>
          </button>

          {/* Audio Synthesizer toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-2 rounded border transition ${
              audioEnabled
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900/60'
                : 'bg-slate-900/80 text-gray-400 border-gray-700/50 hover:text-gray-200'
            }`}
            title={audioEnabled ? 'Silenciar efectos sonoros' : 'Activar efectos sonoros'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Emergency Panic Close All */}
          <button
            onClick={() => {
              sound.playAlarm();
              onPanicSellAll();
            }}
            disabled={!state.pos || isActionLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
              state.pos
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500 hover:bg-rose-900 hover:text-white box-glow-red animate-pulse'
                : 'bg-slate-900/50 text-gray-500 border border-gray-800 cursor-not-allowed'
            }`}
            title="Cierra todas las posiciones de futuros y desarma el bot de inmediato"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Pánico: Cerrar Todo</span>
          </button>

          {/* Autopilot Master Arm / Disarm */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleBot();
            }}
            disabled={isActionLoading}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition shadow-lg ${
              isArmed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-black border border-emerald-300 box-glow-green font-extrabold'
                : 'bg-slate-900 text-amber-400 border border-amber-500/60 hover:bg-amber-950/50'
            }`}
          >
            <Power className={`w-4 h-4 ${isArmed ? 'animate-spin' : ''}`} />
            <span>{isArmed ? '⚡ PILOTO 24/7 ARMADO' : '🛑 STANDBY (ARM)'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
