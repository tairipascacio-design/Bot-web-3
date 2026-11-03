import React, { useState, useEffect } from 'react';
import { Sliders, Save, Shield, Zap, ChevronDown, ChevronUp, Flame, Crosshair, Check, Bot } from 'lucide-react';
import { BotConfig } from '../types';
import { sound } from '../services/sound';

interface StrategyConfigProps {
  config: BotConfig;
  onSaveConfig: (newCfg: Partial<BotConfig>) => Promise<boolean>;
}

export const StrategyConfig: React.FC<StrategyConfigProps> = ({ config, onSaveConfig }) => {
  const [form, setForm] = useState<BotConfig>({ ...config });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setForm({ ...config });
    }
  }, [config, isDirty]);

  const handleChange = (field: keyof BotConfig, value: any) => {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sound.playClick();
    setSaving(true);
    setSaveSuccess(false);

    const payload: Partial<BotConfig> = {
      ...form,
      margin: Math.max(0.1, Number(form.margin) || 2),
      size: Math.max(0.1, Number(form.margin) || 2),
      tp: Math.max(0.1, Number(form.tp) || 2.5),
      sl: Math.max(0.1, Number(form.sl) || 1.2),
      thr: Math.max(0.01, Number(form.thr) || 0.25),
      every: Math.max(2, Number(form.every) || 8),
      conf: Math.max(0.1, Math.min(0.99, Number(form.conf) || 0.75)),
    };

    const success = await onSaveConfig(payload);
    setSaving(false);
    if (success) {
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="bg-[#080d1a]/95 border border-cyan-900/40 rounded-lg p-4 relative flex flex-col box-glow-cyan font-mono text-xs">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-950/80">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <span className="font-['Orbitron',sans-serif] text-xs font-bold tracking-wider text-cyan-200">
            PARÁMETROS DEL PILOTO AUTOMÁTICO 24/7
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-[10px] text-amber-400 animate-pulse font-bold">
              ● Editando
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            Par activo: <strong className="text-amber-400">{config.pair}</strong>
          </span>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
        Reglas y límites matemáticos que el bot ejecutará automáticamente sin tu intervención cuando esté en <strong>PILOTO ARMADO</strong>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Row 1: Mode & Autopilot Margin */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-400 mb-1 text-[11px] font-bold">Modo del Piloto</label>
            <select
              value={form.mode}
              onChange={(e) => handleChange('mode', e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 font-bold"
            >
              <option value="rules">Reglas (Momentum + TP/SL)</option>
              <option value="ai">IA Neural (Gemini Autopilot)</option>
              <option value="hybrid">Híbrido (Reglas + IA)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 mb-1 text-[11px] font-bold">
              Capital Automático por Trade ($ USDT)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-gray-400">$</span>
              <input
                type="number"
                step="any"
                min="0.1"
                value={form.margin}
                onChange={(e) => handleChange('margin', parseFloat(e.target.value) || '')}
                className="w-full bg-slate-900 border border-slate-700 rounded pl-6 pr-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-400 font-bold"
                placeholder="2"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Take Profit & Stop Loss */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-emerald-400 mb-1 text-[11px] font-bold">Take Profit Objetivo (%)</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.1"
                max="100"
                value={form.tp}
                onChange={(e) => handleChange('tp', parseFloat(e.target.value) || '')}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
              />
              <span className="absolute right-2.5 top-1.5 text-gray-400">%</span>
            </div>
          </div>

          <div>
            <label className="block text-rose-400 mb-1 text-[11px] font-bold">Stop Loss Máximo (%)</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.1"
                max="50"
                value={form.sl}
                onChange={(e) => handleChange('sl', parseFloat(e.target.value) || '')}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-rose-300 font-bold focus:outline-none focus:border-rose-400"
              />
              <span className="absolute right-2.5 top-1.5 text-gray-400">%</span>
            </div>
          </div>
        </div>

        {/* Row 3: Momentum & Scan Interval */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-amber-400 mb-1 text-[11px] font-bold">Gatillo Momentum (±%)</label>
            <input
              type="number"
              step="any"
              min="0.01"
              max="10"
              value={form.thr}
              onChange={(e) => handleChange('thr', parseFloat(e.target.value) || '')}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400 font-bold"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1 text-[11px] font-bold">Ciclo de Análisis (seg)</label>
            <input
              type="number"
              step="1"
              min="2"
              max="120"
              value={form.every}
              onChange={(e) => handleChange('every', parseInt(e.target.value) || 8)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 font-bold"
            />
          </div>
        </div>

        {/* Row 4: Confianza Mínima IA & Trailing Stop */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-purple-400 mb-1 text-[11px] font-bold">
              Filtro de Confianza IA (0.50 - 0.95)
            </label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="0.99"
              value={form.conf}
              onChange={(e) => handleChange('conf', parseFloat(e.target.value) || 0.75)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-purple-300 font-bold focus:outline-none focus:border-purple-400"
            />
            <span className="text-[9px] text-gray-400 mt-0.5 block">
              Exige al menos {Math.round(form.conf * 100)}% de certeza a Gemini
            </span>
          </div>

          <div>
            <label className="block text-cyan-400 mb-1 text-[11px] font-bold">
              Trailing Stop Dinámico (%)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              max="10"
              value={form.trailingStopPct}
              onChange={(e) => handleChange('trailingStopPct', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[9px] text-gray-400 mt-0.5 block">
              Protege ganancias tras subida
            </span>
          </div>
        </div>

        {/* Auto-Deleverage Safety Shield Toggle */}
        <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/50 flex items-center justify-between">
          <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5" />
            Auto-Desapalancamiento Defensivo (Escudo de Ballenas):
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoDeleverage}
              onChange={(e) => handleChange('autoDeleverage', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-black border border-cyan-300 box-glow-cyan font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {saving ? (
              <Save className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-black stroke-[3]" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {saving
                ? 'GUARDANDO ESTRATEGIA...'
                : saveSuccess
                ? '✓ ESTRATEGIA ACTUALIZADA CON ÉXITO'
                : 'GUARDAR ESTRATEGIA DEL PILOTO'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
