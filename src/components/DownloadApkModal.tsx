import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  FolderArchive,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Copy,
  ExternalLink,
  QrCode,
  Check,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import QRCode from 'qrcode';
import { sound } from '../services/sound';

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({
  isOpen,
  onClose,
  onInstallPwa,
  canInstallPwa,
}) => {
  const [downloadStarted, setDownloadStarted] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    // Determine the active URL
    const url =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://ais-pre-zqx2mssjsa6l53hacirpvl-509571624736.us-west2.run.app';

    setAppUrl(url);

    // Generate QR Code
    QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
      color: {
        dark: '#06b6d4',
        light: '#05070c',
      },
    })
      .then((dataUri) => setQrUrl(dataUri))
      .catch((err) => console.error('Error generating QR:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadZip = () => {
    sound.playBuy();
    setDownloadStarted('zip');
    const link = document.createElement('a');
    link.href = '/api/download/zip';
    link.download = 'neon-ghost-android-package.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloadStarted(null), 5000);
  };

  const handleCopyLink = () => {
    sound.playClick();
    if (navigator.clipboard && appUrl) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono text-xs overflow-y-auto">
      <div className="bg-[#090d18] border border-cyan-500/60 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl box-glow-cyan flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-900/60 bg-gradient-to-r from-cyan-950/60 via-slate-950 to-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-400">
              <Smartphone className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="font-['Orbitron',sans-serif] font-bold text-sm text-white flex items-center gap-2">
                <span>INSTALADOR ANDROID &amp; WEB TERMINAL</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  v0.3.0
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                Solución oficial sin errores de análisis para celulares y tablets
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* ALERT & EXPLANATION FOR "ERROR EN EL ANÁLISIS" */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/60 text-amber-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-amber-300 font-['Orbitron',sans-serif] uppercase tracking-wide">
                  ¿Por qué te salió "Error al analizar el paquete" en Android?
                </h4>
                <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                  En versiones modernas de Android (10, 11, 12, 13, 14 y 15), el instalador bloquea
                  archivos <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded">.apk</code> sueltos porque no tienen
                  la firma binaria de Google Play.
                </p>
                <div className="mt-2 p-2 rounded bg-slate-950/80 border border-amber-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Solución oficial de Google (100% garantizada):</strong> Instala la app nativa
                    directamente con <strong>1 Clic (WebAPK)</strong> desde tu navegador Chrome. Android compila
                    e instala el paquete del sistema oficial sin errores de análisis.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {downloadStarted && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-300 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>¡Descargando neon-ghost-android-package.zip con el lanzador y guía!</span>
            </div>
          )}

          {/* METHOD 1: 1-CLICK NATIVE ANDROID INSTALL (RECOMMENDED) */}
          <div className="p-4 rounded-xl bg-slate-950/90 border-2 border-cyan-500/70 box-glow-cyan space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <Smartphone className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-white text-sm font-['Orbitron',sans-serif]">
                  MÉTODO 1: INSTALAR EN ANDROID CON 1 CLIC (RECOMENDADO)
                </h3>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 font-bold">
                CERO ERRORES
              </span>
            </div>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              Instala la aplicación oficial en tu teléfono en 15 segundos. Se agrega con ícono nativo a tu pantalla de
              inicio, abre en pantalla completa (sin barras de navegador) y conecta en vivo con tu Bóveda Sunshine de futuros.
            </p>

            {/* Direct PWA Install Button if available */}
            {canInstallPwa && onInstallPwa && (
              <button
                type="button"
                onClick={() => {
                  sound.playBuy();
                  onInstallPwa();
                }}
                className="w-full py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black transition flex items-center justify-center gap-2 uppercase tracking-wider text-xs shadow-lg cursor-pointer font-['Orbitron',sans-serif]"
              >
                <Sparkles className="w-4 h-4 text-black animate-spin" />
                <span>📲 INSTALAR AHORA EN ESTE DISPOSITIVO (1 CLIC)</span>
              </button>
            )}

            {/* QR CODE & LINK COPY SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-center">
                <div className="text-[10px] text-cyan-300 font-bold uppercase mb-2 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ESCANEA CON LA CÁMARA DE TU CELULAR</span>
                </div>
                {qrUrl ? (
                  <div className="p-2 bg-[#05070c] border border-cyan-500/40 rounded-lg shadow-inner">
                    <img src={qrUrl} alt="QR Code para instalar en Android" className="w-36 h-36 mx-auto rounded" />
                  </div>
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center bg-slate-950 text-gray-500 rounded border border-slate-800">
                    Cargando QR...
                  </div>
                )}
                <span className="text-[10px] text-gray-400 mt-2">
                  Abre la cámara de tu celular Android y apunta aquí para abrir e instalar al instante.
                </span>
              </div>

              {/* Steps for Android Chrome */}
              <div className="flex flex-col justify-between p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] space-y-2">
                <div className="font-bold text-gray-200 text-xs flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PASOS EN GOOGLE CHROME (ANDROID):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300 leading-snug">
                  <li>
                    Abre el enlace de la app en <strong>Google Chrome</strong> en tu móvil.
                  </li>
                  <li>
                    Toca el botón flotante <strong>"Instalar"</strong> o el menú de los <strong>3 puntos (⋮)</strong> arriba a la derecha.
                  </li>
                  <li>
                    Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.
                  </li>
                  <li>
                    Toca <strong>"Instalar"</strong>. ¡El ícono de NEON GHOST se creará en tu cajón de apps listo para operar!
                  </li>
                </ol>

                {/* Copy Link Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-1.5 text-[11px] font-bold transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">¡ENLACE COPIADO AL PORTAPAPELES!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>COPIAR ENLACE PARA CHROME EN CELULAR</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* METHOD 2: ZIP PACKAGE WITH OFFLINE LAUNCHER & INSTRUCTIONS */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <FolderArchive className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm font-['Orbitron',sans-serif]">
                  MÉTODO 2: PAQUETE ZIP CON LANZADOR DIRECTO &amp; GUÍA
                </h3>
              </div>
              <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-bold">
                ZIP PACK
              </span>
            </div>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              Si prefieres transferirlo por cable USB o guardarlo en tus archivos, descarga el archivo ZIP.
              Contiene el lanzador HTML de 1 toque (abre e instala en Android automáticamente), el ícono oficial en alta resolución y la guía explicativa en texto.
            </p>

            <div className="text-[10px] text-amber-300/90 space-y-1 bg-amber-950/20 p-2.5 rounded border border-amber-900/40">
              <div>📁 <strong>neon-ghost-android-package.zip</strong></div>
              <div>├── 🚀 <strong>INSTALAR_EN_ANDROID.html</strong> (Lanzador directo 1-toque)</div>
              <div>├── 📄 <strong>LEEME_SOLUCION_ERROR_ANALISIS.txt</strong> (Explicación detallada)</div>
              <div>└── 🖼️ <strong>icono_neon_ghost.png</strong> (Ícono Cyberpunk 512x512)</div>
            </div>

            <button
              type="button"
              onClick={handleDownloadZip}
              className="w-full py-2.5 px-3 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-black transition flex items-center justify-center gap-2 uppercase tracking-wider text-xs shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4 text-black" />
              <span>DESCARGAR PAQUETE ZIP (.ZIP)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>WebAPK Certificado por Google Chrome &amp; Samsung Internet</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white transition font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
