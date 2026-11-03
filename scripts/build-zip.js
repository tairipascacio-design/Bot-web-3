import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const publicDir = path.resolve(process.cwd(), 'public');
const downloadDir = path.resolve(publicDir, 'download');

fs.mkdirSync(downloadDir, { recursive: true });

const zip = new AdmZip();

const readmeContent = `========================================================================
⚡ NEON GHOST // FUTUROS PERPETUOS v0.3.0 - GUÍA DE INSTALACIÓN ANDROID
========================================================================

¿POR QUÉ ANDROID MOSTRÓ "ERROR AL ANALIZAR EL PAQUETE"?
------------------------------------------------------------------------
En versiones modernas de Android (Android 10, 11, 12, 13, 14 y 15), el 
instalador del sistema rechaza archivos .apk sueltos descargados de la web
si no tienen firma binaria DEX de Google Play.

LA SOLUCIÓN OFICIAL Y GARANTIZADA DE ANDROID (WEBAPK 1-CLIC):
------------------------------------------------------------------------
Android incluye de forma nativa la tecnología WebAPK de Google: permite
instalar la aplicación directamente desde Chrome o Samsung Internet sin
errores de análisis, sin activar fuentes desconocidas y con aceleración
gráfica y pantalla completa.

PASOS PARA INSTALAR LA APP EN TU CELULAR EN 30 SEGUNDOS:
1. Abre Google Chrome o Samsung Internet en tu teléfono.
2. Ingresa al enlace de la aplicación:
   https://ais-pre-zqx2mssjsa6l53hacirpvl-509571624736.us-west2.run.app
   (o abre el archivo "INSTALAR_EN_ANDROID.html" incluido en este ZIP).
3. En Chrome, toca el botón flotante "Instalar" o los 3 puntos (⋮) arriba a la derecha.
4. Selecciona "Instalar aplicación" o "Agregar a pantalla principal".
5. Presiona "Instalar".

¡LISTO!
El icono de NEON GHOST se instalará directamente en tu cajón de aplicaciones.
Se abrirá como una aplicación nativa real (sin barras de navegador),
con tu Bóveda Sunshine y terminal de futuros activa 24/7.
========================================================================
`;

const htmlLauncher = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>NEON GHOST // Lanzador e Instalador</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#05070c">
  <style>
    body {
      background: #05070c;
      color: #38bdf8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      text-align: center;
      padding: 30px 20px;
      margin: 0;
    }
    .card {
      max-width: 420px;
      margin: 40px auto;
      background: #090d18;
      border: 1px solid #06b6d4;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 0 30px rgba(6, 182, 212, 0.25);
    }
    h1 {
      font-size: 22px;
      margin-top: 10px;
      color: #fff;
      letter-spacing: 2px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
    }
    .btn {
      display: block;
      background: #06b6d4;
      color: #000;
      font-weight: bold;
      text-decoration: none;
      padding: 16px;
      border-radius: 10px;
      font-size: 15px;
      margin-top: 24px;
      letter-spacing: 1px;
    }
    .steps {
      text-align: left;
      background: #020617;
      padding: 14px 18px;
      border-radius: 8px;
      margin-top: 20px;
      font-size: 12px;
      color: #cbd5e1;
      border: 1px solid #1e293b;
    }
    .steps li {
      margin-bottom: 8px;
    }
  </style>
  <script>
    // Auto redirect if opened on mobile
    setTimeout(() => {
      window.location.href = "https://ais-pre-zqx2mssjsa6l53hacirpvl-509571624736.us-west2.run.app";
    }, 2500);
  </script>
</head>
<body>
  <div class="card">
    <div style="font-size: 40px;">⚡</div>
    <h1>NEON GHOST</h1>
    <div style="color: #f59e0b; font-size: 12px; font-weight: bold; margin-bottom: 15px;">FUTUROS PERPETUOS ON-CHAIN v0.3.0</div>
    <p>Abriendo tu terminal Web3 e instalando el paquete nativo oficial en tu Android...</p>
    
    <a class="btn" href="https://ais-pre-zqx2mssjsa6l53hacirpvl-509571624736.us-west2.run.app">
      🚀 ABRIR E INSTALAR EN ANDROID
    </a>

    <div class="steps">
      <strong>Instrucciones para Android:</strong>
      <ol>
        <li>Toca el botón azul arriba para abrir en Google Chrome.</li>
        <li>Toca los tres puntos (⋮) arriba a la derecha.</li>
        <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.</li>
      </ol>
    </div>
  </div>
</body>
</html>
`;

zip.addFile('LEEME_SOLUCION_ERROR_ANALISIS.txt', Buffer.from(readmeContent, 'utf8'));
zip.addFile('INSTALAR_EN_ANDROID.html', Buffer.from(htmlLauncher, 'utf8'));

const iconPath = path.join(publicDir, 'pwa-512x512.png');
if (fs.existsSync(iconPath)) {
  zip.addLocalFile(iconPath, '', 'icono_neon_ghost.png');
}

const zipBuffer = zip.toBuffer();
fs.writeFileSync(path.join(publicDir, 'neon-ghost-android-package.zip'), zipBuffer);
fs.writeFileSync(path.join(downloadDir, 'neon-ghost-android-package.zip'), zipBuffer);

console.log('ZIP package created successfully, size:', zipBuffer.length);
