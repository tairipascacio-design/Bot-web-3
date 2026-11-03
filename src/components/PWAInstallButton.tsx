import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sound } from '../services/sound';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGenericGuide, setShowGenericGuide] = useState(false);

  // If already running standalone as an installed app, hide button
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700 text-gray-400 text-[10px] font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>APP INSTALADA</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    sound.playClick();
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowGenericGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 text-cyan-300 border border-cyan-500/50 box-glow-cyan transition shadow-lg cursor-pointer"
        title="Instalar NEON GHOST como App en tu teléfono o PC"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
        <span className="hidden sm:inline">DESCARGAR APP</span>
        <span className="sm:hidden">APP</span>
      </button>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-xs">
          <div className="w-full max-w-sm rounded-xl bg-[#090d18] border border-cyan-500/60 p-5 shadow-2xl box-glow-cyan space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Instalar en iPhone / iPad</span>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-gray-300 text-[11px] leading-relaxed">
              <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="p-1 rounded bg-slate-900 text-cyan-400 shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <strong>Paso 1:</strong> Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="p-1 rounded bg-slate-900 text-amber-400 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <strong>Paso 2:</strong> Desliza hacia abajo y presiona <strong>"Agregar a pantalla de inicio"</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="p-1 rounded bg-slate-900 text-emerald-400 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <strong>Paso 3:</strong> Presiona <strong>Agregar</strong> arriba a la derecha. ¡La app quedará instalada como icono en tu móvil!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Generic Browser Guide Modal if browser doesn't trigger prompt automatically */}
      {showGenericGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-xs">
          <div className="w-full max-w-sm rounded-xl bg-[#090d18] border border-cyan-500/60 p-5 shadow-2xl box-glow-cyan space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Instalación de la Aplicación</span>
              </div>
              <button
                onClick={() => setShowGenericGuide(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-gray-300 text-[11px] space-y-2 leading-relaxed">
              <p>
                Para instalar la app en tu navegador (Chrome, Edge, Brave o Android):
              </p>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1.5">
                <div>1. Haz clic en el icono de <strong>Instalar</strong> en la barra de direcciones de tu navegador (icono de computadora con flecha hacia abajo).</div>
                <div>2. O abre el menú del navegador <strong>(⋮)</strong> y selecciona <strong>"Instalar NEON GHOST"</strong> o <strong>"Agregar a pantalla principal"</strong>.</div>
              </div>
            </div>

            <button
              onClick={() => setShowGenericGuide(false)}
              className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase transition"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </>
  );
};
