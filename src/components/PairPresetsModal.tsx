import React, { useState } from 'react';
import { Layers, X, Check, Globe, Shield, RefreshCw } from 'lucide-react';
import { POPULAR_PRESETS } from '../constants/presets';
import { PairPreset, BotConfig } from '../types';
import { sound } from '../services/sound';

interface PairPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: BotConfig;
  onSelectPreset: (preset: PairPreset, simulationMode: boolean) => Promise<boolean>;
}

export const PairPresetsModal: React.FC<PairPresetsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSelectPreset,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PairPreset>(POPULAR_PRESETS[0]);
  const [simulation, setSimulation] = useState<boolean>(currentConfig.simulationMode);
  const [applying, setApplying] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    sound.playClick();
    setApplying(true);
    await onSelectPreset(selectedPreset, simulation);
    setApplying(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-xs">
      <div className="bg-[#090d1a] border border-cyan-500/60 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl box-glow-cyan flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-900/60 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-['Orbitron',sans-serif] font-bold text-sm text-cyan-300">
              SELECCIONAR PAR DE TOKENS &amp; RED UNISWAP V3
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Mode Switcher: Live vs Simulation */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-gray-300 font-bold mb-2 flex items-center gap-1.5 text-xs">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Ambiente de Ejecución</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSimulation(true)}
                className={`py-2 px-3 rounded text-left transition border ${
                  simulation
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200 box-glow-purple font-bold'
                    : 'bg-slate-900 border-slate-800 text-gray-400 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs">MODO SIMULADOR</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Sin riesgo de fondos, cotizaciones reales en vivo</div>
              </button>

              <button
                type="button"
                onClick={() => setSimulation(false)}
                className={`py-2 px-3 rounded text-left transition border ${
                  !simulation
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 box-glow-green font-bold'
                    : 'bg-slate-900 border-slate-800 text-gray-400 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs">ON-CHAIN DIRECTO</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Ejecuta swaps reales con billetera o BOT_PRIVATE_KEY</div>
              </button>
            </div>
          </div>

          {/* Preset list */}
          <div>
            <div className="text-gray-400 mb-2 font-bold uppercase text-[11px] flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pares Predeterminados de Alta Liquidez</span>
            </div>

            <div className="space-y-2">
              {POPULAR_PRESETS.map((p, idx) => {
                const isSelected = selectedPreset.name === p.name;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      sound.playClick();
                      setSelectedPreset(p);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 text-white box-glow-cyan'
                        : 'bg-slate-950/60 border-slate-800 text-gray-300 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-2 text-xs">
                        <span>{p.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {p.network}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Fee: {p.fee / 10000}%
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 flex gap-3 font-mono">
                        <span>Base: {p.ba.slice(0, 10)}...</span>
                        <span>Quote: {p.qa.slice(0, 10)}...</span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected ? 'bg-cyan-500 border-cyan-300 text-black' : 'border-gray-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-cyan-900/60 bg-slate-950 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-900 text-gray-300 hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-wider box-glow-cyan transition flex items-center gap-1.5"
          >
            {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Aplicar Par Seleccionado</span>
          </button>
        </div>
      </div>
    </div>
  );
};
