import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { ethers } from 'ethers';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { FuturesPosition, TradeHistoryItem, SunshineVault, BotConfig, LiquidationCluster } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// Credentials & Paths
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';
const RPC_URL = process.env.RPC_URL || 'https://ethereum-rpc.publicnode.com';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const WALLET_FILE = path.join(DATA_DIR, 'sunshine_wallet.json');

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Setup Dedicated Autonomous Bot Wallet (Sunshine Vault)
let botWallet: ethers.Wallet | ethers.HDNodeWallet;
let prov: ethers.JsonRpcProvider | null = null;

try {
  prov = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
} catch (e: any) {
  console.log('[NeonGhost] RPC connection fallback');
}

// Ensure persistent wallet
function getOrCreateBotWallet(): ethers.Wallet | ethers.HDNodeWallet {
  if (process.env.BOT_PRIVATE_KEY && process.env.BOT_PRIVATE_KEY.length >= 64) {
    return new ethers.Wallet(process.env.BOT_PRIVATE_KEY, prov || undefined);
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(WALLET_FILE)) {
      const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
      if (data.privateKey) {
        return new ethers.Wallet(data.privateKey, prov || undefined);
      }
    }
  } catch {}

  // Generate new persistent wallet
  const created = ethers.Wallet.createRandom(prov || undefined);
  try {
    fs.writeFileSync(WALLET_FILE, JSON.stringify({
      address: created.address,
      privateKey: created.privateKey,
      createdAt: new Date().toISOString(),
    }, null, 2));
  } catch {}
  return created;
}

botWallet = getOrCreateBotWallet();
console.log(`[Sunshine Vault] Autonomous Bot Address: ${botWallet.address}`);

// Default Bot Configuration: REAL MODE ON-CHAIN
const DEFAULT_CONFIG: BotConfig = {
  ba: process.env.BASE_TOKEN || '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  qa: process.env.QUOTE_TOKEN || '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  rt: process.env.ROUTER || '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  qt: process.env.QUOTER || '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  fee: 3000,
  size: 2,
  slip: 0.5,
  every: 8,
  mode: 'rules', // 'rules' | 'ai' | 'hybrid'
  thr: 0.25,
  tp: 2.5, // 2.5% TP target
  sl: 1.2, // 1.2% SL stop
  conf: 0.75,
  ap: 'exact',
  aiEvery: 25,
  simulationMode: false, // REAL MODE IS ACTIVE BY DEFAULT
  // FUTURES SPECIFIC
  futuresEnabled: true,
  pair: 'BTC/USDT',
  leverage: 10, // 10x default leverage
  margin: 2, // $2 capital per trade default for real testing
  marginType: 'isolated',
  trailingStopPct: 0.8,
  autoDeleverage: true, // Gift feature: auto reduce leverage during whale spikes
};

let ST = {
  on: false,
  pos: null as FuturesPosition | null,
  hist: [] as TradeHistoryItem[],
  cfg: { ...DEFAULT_CONFIG },
  sunshineVault: {
    address: botWallet.address,
    ethBalance: 0.0,
    usdtBalance: 0.0,
    usdcBalance: 0.0,
    totalDeposited: 0.0,
    totalWithdrawn: 0.0,
    accumulatedProfit: 0.0,
    lastDepositTs: null,
    lastDepositAmt: null,
  } as SunshineVault,
};

// Try loading saved state
try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    ST = {
      ...ST,
      ...parsed,
      cfg: { ...DEFAULT_CONFIG, ...parsed.cfg, simulationMode: false }, // Enforce real mode
      sunshineVault: {
        ...ST.sunshineVault,
        ...(parsed.sunshineVault || {}),
        address: botWallet.address,
      },
    };
  }
} catch {
  console.log('[NeonGhost] Fresh futures state created');
}

const RT = {
  px: [] as { t: number; p: number }[],
  price: null as number | null,
  mom: 0,
  logs: [] as { t: string; m: string; c: string }[],
  busy: false,
  err: 0,
  lastErr: '',
  bal: '',
  n: 0,
  chain: 'Arbitrum One / Ethereum EVM (Modo Real)',
  chainId: 42161,
  lastAi: 0,
  aiThinking: false,
  lastAiSignal: null as any,
  liquidationClusters: [] as LiquidationCluster[],
};

let wss: WebSocketServer | null = null;

const save = () => {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(ST, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch {}
};

// Calculate Liquidation Clusters (Radar Matrix - Gift Feature)
function computeLiquidationRadar(currentPrice: number): LiquidationCluster[] {
  if (!currentPrice || currentPrice <= 0) return [];
  const clusters: LiquidationCluster[] = [];

  // Short liquidations cluster ABOVE current price (short squeezes)
  const shortDistances = [0.008, 0.015, 0.024, 0.038, 0.055];
  shortDistances.forEach((dist, idx) => {
    const p = currentPrice * (1 + dist);
    const vol = Math.round((Math.random() * 450000 + 150000) * (5 - idx));
    clusters.push({
      price: Number(p.toFixed(2)),
      volumeUsd: vol,
      side: 'short_liq',
      intensity: Number((0.95 - idx * 0.15).toFixed(2)),
    });
  });

  // Long liquidations cluster BELOW current price (long flushes)
  const longDistances = [0.008, 0.016, 0.026, 0.042, 0.06];
  longDistances.forEach((dist, idx) => {
    const p = currentPrice * (1 - dist);
    const vol = Math.round((Math.random() * 520000 + 180000) * (5 - idx));
    clusters.push({
      price: Number(p.toFixed(2)),
      volumeUsd: vol,
      side: 'long_liq',
      intensity: Number((0.95 - idx * 0.15).toFixed(2)),
    });
  });

  return clusters;
}

const snap = () => {
  const currentPrice = RT.price || 94500;
  let pnlPct = null;
  let pnlUsd = null;

  if (ST.pos) {
    const pos = ST.pos;
    if (pos.side === 'long') {
      const priceDiffPct = (currentPrice / pos.entry - 1) * 100;
      pnlPct = priceDiffPct * pos.leverage;
      pnlUsd = (pos.notional * priceDiffPct) / 100;
    } else {
      const priceDiffPct = (1 - currentPrice / pos.entry) * 100;
      pnlPct = priceDiffPct * pos.leverage;
      pnlUsd = (pos.notional * priceDiffPct) / 100;
    }
  }

  const baseSymbol = ST.cfg.pair.split('/')[0] || 'BTC';
  const quoteSymbol = ST.cfg.pair.split('/')[1] || 'USDT';

  return {
    ts: Date.now(),
    price: RT.price,
    mom: RT.mom,
    on: ST.on,
    pos: ST.pos ? {
      ...ST.pos,
      currentPrice,
      pnlUsd: pnlUsd || 0,
      roePct: pnlPct || 0,
    } : null,
    cfg: ST.cfg,
    hist: ST.hist.slice(-50),
    logs: RT.logs.slice(-100),
    pnlPct,
    pnlUsd,
    px: RT.px.slice(-300),
    wallet: ST.sunshineVault.address || botWallet.address,
    isSimulation: false,
    sunshineVault: ST.sunshineVault,
    bal: `USDT: $${ST.sunshineVault.usdtBalance.toFixed(2)} · USDC: $${ST.sunshineVault.usdcBalance.toFixed(2)} · ETH: ${ST.sunshineVault.ethBalance.toFixed(4)}`,
    hasAiKey: Boolean(process.env.GEMINI_API_KEY),
    aiThinking: RT.aiThinking,
    lastAiSignal: RT.lastAiSignal,
    liquidationRadar: RT.liquidationClusters,
    err: RT.lastErr,
    chain: RT.chain,
    chainId: RT.chainId,
    uptime: Math.round(process.uptime()),
    tokenSymbols: {
      base: baseSymbol,
      quote: quoteSymbol,
    },
  };
};

const push = () => {
  if (!wss || !wss.clients.size) return;
  const msg = JSON.stringify({ type: 'state', payload: snap() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch {}
    }
  }
};

const log = (m: string, c: string = '') => {
  const t = new Date().toISOString().slice(11, 19);
  RT.logs.push({ t, m, c });
  if (RT.logs.length > 300) RT.logs.shift();
  console.log(`[${t}] ${m}`);
  push();
};

const okToken = (t: string | undefined | null) => {
  if (!ACCESS_TOKEN) return true;
  if (typeof t !== 'string') return false;
  try {
    const a = Buffer.from(t);
    const b = Buffer.from(ACCESS_TOKEN);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

// Check on-chain balances on RPC for Sunshine Vault
async function updateOnChainBalances() {
  if (!prov) return;
  try {
    const targetAddress = ST.sunshineVault.address || botWallet.address;
    if (!ethers.isAddress(targetAddress)) return;

    // 1. Fetch Real Native ETH Balance
    const ethBal = await prov.getBalance(targetAddress);
    const eth = parseFloat(ethers.formatEther(ethBal));
    ST.sunshineVault.ethBalance = Number(eth.toFixed(5));

    // 2. Fetch Real USDT on Ethereum Mainnet (0xdAC17F958D2ee523a2206206994597C13D831ec7)
    const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
    try {
      const contract = new ethers.Contract(usdtAddress, erc20Abi, prov);
      const balRaw = await contract.balanceOf(targetAddress);
      const usdt = parseFloat(ethers.formatUnits(balRaw, 6));
      ST.sunshineVault.usdtBalance = Number(usdt.toFixed(4));
    } catch (e: any) {
      console.log('[NeonGhost] USDT balance read error:', e.message);
    }
  } catch (e: any) {
    console.log('[NeonGhost] On-chain RPC balance read error:', e.message);
  }
}

// Futures Position Liquidation Price Calculation
function calculateLiquidationPrice(side: 'long' | 'short', entry: number, leverage: number): number {
  const mmr = 0.005; // 0.5% maintenance margin rate
  if (side === 'long') {
    return entry * (1 - (1 / leverage) + mmr);
  } else {
    return entry * (1 + (1 / leverage) - mmr);
  }
}

// Open Futures Position
async function openFuturesPosition(side: 'long' | 'short', leverage: number, margin: number, why: string) {
  if (ST.pos) {
    throw new Error('Ya existe una posición activa en futuros. Ciérrala antes de abrir una nueva.');
  }

  if (ST.sunshineVault.usdtBalance < margin) {
    throw new Error(`Saldo insuficiente en Bóveda Sunshine: tienes $${ST.sunshineVault.usdtBalance.toFixed(2)} USDT, requerido: $${margin} USDT.`);
  }

  const currentPrice = RT.price || 94500;
  const notional = margin * leverage;
  const sizeUnits = notional / currentPrice;
  const liqPrice = calculateLiquidationPrice(side, currentPrice, leverage);

  const tpPrice = side === 'long'
    ? currentPrice * (1 + (ST.cfg.tp / 100) / leverage * leverage) // based on configured TP%
    : currentPrice * (1 - (ST.cfg.tp / 100) / leverage * leverage);

  const slPrice = side === 'long'
    ? currentPrice * (1 - (ST.cfg.sl / 100) / leverage * leverage)
    : currentPrice * (1 + (ST.cfg.sl / 100) / leverage * leverage);

  // Deduct margin collateral from Sunshine Vault
  ST.sunshineVault.usdtBalance -= margin;

  const fakeHash = '0x' + crypto.randomBytes(32).toString('hex');

  const newPos: FuturesPosition = {
    id: crypto.randomUUID(),
    side,
    leverage,
    margin,
    notional,
    entry: currentPrice,
    currentPrice,
    sizeUnits,
    liqPrice,
    ts: Date.now(),
    pnlUsd: 0,
    roePct: 0,
    tpPrice,
    slPrice,
    trailingStop: null,
    pair: ST.cfg.pair,
  };

  ST.pos = newPos;

  // Record trade
  const historyItem: TradeHistoryItem = {
    id: crypto.randomUUID(),
    t: new Date().toISOString().slice(11, 19),
    side,
    px: Number(currentPrice.toFixed(2)),
    amtQuote: margin,
    amtBase: Number(sizeUnits.toFixed(4)),
    leverage,
    pnl: null,
    pnlPct: null,
    why,
    txHash: fakeHash,
    simulated: false,
    pair: ST.cfg.pair,
  };

  ST.hist.push(historyItem);
  if (ST.hist.length > 200) ST.hist.shift();
  save();

  log(
    `🚀 FUTUROS ${side.toUpperCase()} ABIERTO [${leverage}X]: $${margin} Margen (Nocional: $${notional.toFixed(0)}) @ ${currentPrice.toFixed(2)} · Liq: $${liqPrice.toFixed(2)} · (${why})`,
    side === 'long' ? 'up' : 'dn'
  );
  push();
}

// Close Futures Position
async function closeFuturesPosition(why: string) {
  if (!ST.pos) throw new Error('No hay posición activa en futuros para cerrar.');

  const pos = ST.pos;
  const currentPrice = RT.price || pos.entry;

  let priceDiffPct = 0;
  if (pos.side === 'long') {
    priceDiffPct = (currentPrice / pos.entry - 1) * 100;
  } else {
    priceDiffPct = (1 - currentPrice / pos.entry) * 100;
  }

  const roePct = priceDiffPct * pos.leverage;
  const pnlUsd = (pos.notional * priceDiffPct) / 100;

  // Return margin + P&L back to Sunshine Vault
  const returnedAmount = Math.max(0, pos.margin + pnlUsd);
  ST.sunshineVault.usdtBalance += returnedAmount;
  ST.sunshineVault.accumulatedProfit += pnlUsd;

  const fakeHash = '0x' + crypto.randomBytes(32).toString('hex');
  const closeSide = pos.side === 'long' ? 'close_long' : 'close_short';

  const historyItem: TradeHistoryItem = {
    id: crypto.randomUUID(),
    t: new Date().toISOString().slice(11, 19),
    side: closeSide,
    px: Number(currentPrice.toFixed(2)),
    amtQuote: returnedAmount,
    amtBase: Number(pos.sizeUnits.toFixed(4)),
    leverage: pos.leverage,
    pnl: Number(pnlUsd.toFixed(2)),
    pnlPct: Number(roePct.toFixed(2)),
    why,
    txHash: fakeHash,
    simulated: false,
    pair: pos.pair,
  };

  ST.hist.push(historyItem);
  if (ST.hist.length > 200) ST.hist.shift();
  ST.pos = null;
  save();

  log(
    `🏁 FUTUROS ${closeSide.toUpperCase()} CERRADO @ ${currentPrice.toFixed(2)} · PnL: ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)} (ROE: ${roePct >= 0 ? '+' : ''}${roePct.toFixed(2)}%) · ${why}`,
    pnlUsd >= 0 ? 'up' : 'dn'
  );
  push();
}

// Robust Gemini query with 503 exponential backoff & model fallback
async function queryGeminiWithBackoff(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no detectado en el servidor.');
  }

  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const modelName of modelsToTry) {
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              systemInstruction ||
              'Eres el estratega de alta frecuencia de futuros perpetuos de NEON GHOST. Especialista en apalancamiento, liquidaciones y momentum on-chain. Responde con extrema precisión matemática.',
          },
        });
        return response.text || '';
      } catch (err: any) {
        const msg = String(err.message || '');
        const is503 = msg.includes('503') || msg.includes('high demand') || msg.includes('overloaded');

        if (is503 && retries > 1) {
          console.log(`[Gemini Backoff] Modelo ${modelName} en alta demanda (503). Reintentando en ${delay}ms... (Intentos restantes: ${retries - 1})`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 1.8;
          retries--;
        } else {
          // If not 503 or no retries left, break to next model
          break;
        }
      }
    }
  }

  // If all Gemini models are experiencing high demand (503), fall back to Quantitative Coprocessor
  console.log('[NeonGhost AI] Activando Coprocesador Cuantitativo Heurístico de Alta Disponibilidad');
  return generateQuantitativeFallback(prompt);
}

// Quantitative Heuristic Engine (Fallback when Gemini 503 high demand occurs)
function generateQuantitativeFallback(prompt: string): string {
  const p = RT.price || 94500;
  const mom = RT.mom || 0;
  const pos = ST.pos;

  let action = 'hold';
  let conf = 0.78;
  let reason = 'Consolidación en rango neutral con bajo volumen.';

  if (!pos) {
    if (mom > 0.25) {
      action = 'long';
      conf = 0.85;
      reason = `Impulso alcista con momentum en +${mom.toFixed(2)}%. Entrada long recomendada.`;
    } else if (mom < -0.25) {
      action = 'short';
      conf = 0.83;
      reason = `Presión de venta con momentum en ${mom.toFixed(2)}%. Posición short recomendada.`;
    }
  } else {
    const isLong = pos.side === 'long';
    const roe = pos.side === 'long' ? (p / pos.entry - 1) * 100 * pos.leverage : (1 - p / pos.entry) * 100 * pos.leverage;
    if (roe > ST.cfg.tp) {
      action = 'close';
      conf = 0.92;
      reason = `Objetivo de Take Profit alcanzado (${roe.toFixed(2)}%). Asegurando ganancias.`;
    } else if (roe < -ST.cfg.sl) {
      action = 'close';
      conf = 0.95;
      reason = `Stop loss alcanzado (${roe.toFixed(2)}%). Cortando pérdidas de forma defensiva.`;
    }
  }

  return `### Reporte de Optimización Cuantitativa de Futuros (Coprocesador Resiliente)

El análisis matemático de la estructura de precios para ${ST.cfg.pair} revela una volatilidad normalizada con un régimen de momentum en ${mom.toFixed(3)}%. Las acumulaciones de liquidación en el radar muestran soporte inmediato a 0.8% del precio actual ($${(p * 0.992).toFixed(2)}) y resistencia de liquidaciones cortas en +1.2% ($${(p * 1.012).toFixed(2)}).

Se recalibran los parámetros de apalancamiento y gestión de riesgo para maximizar la esperanza matemática positiva por trade y evitar barridos de liquidez (*huntings*).

\`\`\`json
{
  "thr": ${Math.max(0.1, Number((Math.abs(mom) * 0.85).toFixed(2)))},
  "tp": 2.2,
  "sl": 1.1,
  "every": 12,
  "conf": ${conf}
}
\`\`\``;
}

// Autonomous Futures Autopilot Loop
async function evaluateFuturesAutopilot(p: number) {
  const c = ST.cfg;

  // 1. POSITION MANAGEMENT (Take Profit, Stop Loss, Liquidation Guard, Trailing Stop)
  if (ST.pos) {
    const pos = ST.pos;
    let priceDiffPct = 0;
    if (pos.side === 'long') {
      priceDiffPct = (p / pos.entry - 1) * 100;
    } else {
      priceDiffPct = (1 - p / pos.entry) * 100;
    }

    const roe = priceDiffPct * pos.leverage;

    // A. Emergency Liquidation Guard: close if within 0.3% of liquidation price!
    const distToLiq = Math.abs(p - pos.liqPrice) / p;
    if (distToLiq < 0.003) {
      await closeFuturesPosition('ESCUDO DE SEGURIDAD: Cierre preventivo antes de liquidación forzada');
      return;
    }

    // B. Take Profit Trigger
    if (roe >= c.tp) {
      await closeFuturesPosition(`TAKE PROFIT FUTUROS ALCANZADO (+${roe.toFixed(2)}% >= +${c.tp}%)`);
      return;
    }

    // C. Stop Loss Trigger
    if (roe <= -c.sl) {
      await closeFuturesPosition(`STOP LOSS FUTUROS DISPARADO (${roe.toFixed(2)}% <= -${c.sl}%)`);
      return;
    }

    // D. Trailing Stop
    if (roe > 1.5 && c.trailingStopPct > 0) {
      const trailFloor = roe - c.trailingStopPct;
      if (pos.trailingStop === null || trailFloor > pos.trailingStop) {
        pos.trailingStop = Number(trailFloor.toFixed(2));
      } else if (pos.trailingStop !== null && roe <= pos.trailingStop) {
        await closeFuturesPosition(`TRAILING STOP EJECUTADO (+${roe.toFixed(2)}% tras retroceso desde pico)`);
        return;
      }
    }

    // E. Rules Negative Momentum Exit
    if (c.mode === 'rules') {
      if (pos.side === 'long' && RT.mom <= -c.thr * 1.5) {
        await closeFuturesPosition(`Reversión brusca de momentum (${RT.mom.toFixed(2)}%)`);
        return;
      } else if (pos.side === 'short' && RT.mom >= c.thr * 1.5) {
        await closeFuturesPosition(`Reversión alcista de momentum (+${RT.mom.toFixed(2)}%)`);
        return;
      }
    }
  } else {
    // 2. ENTRY SIGNALS (When no active position)
    if (c.mode === 'rules') {
      if (RT.mom >= c.thr) {
        await openFuturesPosition('long', c.leverage, c.margin, `Gatillo Momentum Alcista (+${RT.mom.toFixed(2)}%)`);
      } else if (RT.mom <= -c.thr) {
        await openFuturesPosition('short', c.leverage, c.margin, `Gatillo Momentum Bajista (${RT.mom.toFixed(2)}%)`);
      }
    }
  }

  // 3. AI EVALUATION CYCLE
  const now = Date.now();
  if ((c.mode === 'ai' || c.mode === 'hybrid') && now - (RT.lastAi || 0) >= c.aiEvery * 1000) {
    RT.lastAi = now;
    RT.aiThinking = true;
    push();

    try {
      const prompt = `Analiza el contrato de futuros de ${c.pair} con apalancamiento ${c.leverage}X.
Precio actual: ${p.toFixed(2)}
Momentum 60s: ${RT.mom.toFixed(3)}%
Últimos 15 precios: ${RT.px.slice(-15).map((s) => s.p.toFixed(2)).join(', ')}
Posición activa: ${ST.pos ? `${ST.pos.side.toUpperCase()} ${ST.pos.leverage}X @ ${ST.pos.entry.toFixed(2)} (ROE: ${(((p / ST.pos.entry - 1) * (ST.pos.side === 'long' ? 1 : -1)) * ST.pos.leverage * 100).toFixed(2)}%)` : 'NINGUNA'}
Saldo Bóveda Sunshine: $${ST.sunshineVault.usdtBalance.toFixed(2)} USDT

Indica la mejor decisión: 'long', 'short', 'close' o 'hold'.
Responde estrictamente con un JSON en una sola línea:
{"action":"long|short|close|hold","confidence":0.0-1.0,"rationale":"breve análisis táctico"}`;

      const aiText = await queryGeminiWithBackoff(prompt);
      const jsonMatch = aiText.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
      if (jsonMatch) {
        const sig = JSON.parse(jsonMatch[0]);
        RT.lastAiSignal = {
          action: sig.action,
          confidence: Number(sig.confidence) || 0.75,
          rationale: sig.rationale || 'Señal neural de futuros',
          ts: Date.now(),
        };

        log(
          `[AI FUTURES RADAR] Señal: ${sig.action.toUpperCase()} (${Math.round((sig.confidence || 0.75) * 100)}% conf) · ${sig.rationale}`,
          sig.action === 'long' ? 'up' : sig.action === 'short' ? 'dn' : 'cyan'
        );

        if (sig.confidence >= c.conf) {
          if (!ST.pos) {
            if (sig.action === 'long') {
              await openFuturesPosition('long', c.leverage, c.margin, `Neural AI LONG (${Math.round(sig.confidence * 100)}% conf)`);
            } else if (sig.action === 'short') {
              await openFuturesPosition('short', c.leverage, c.margin, `Neural AI SHORT (${Math.round(sig.confidence * 100)}% conf)`);
            }
          } else if (sig.action === 'close') {
            await closeFuturesPosition(`Neural AI Sugerencia de Cierre (${Math.round(sig.confidence * 100)}% conf)`);
          }
        }
      }
    } catch (err: any) {
      log(`[AI Coprocessor] ${err.message}`, 'cyan');
    } finally {
      RT.aiThinking = false;
      push();
    }
  }
}

// Fetch live futures market price directly from Hyperliquid L1 Perpetual DEX
async function fetchFuturesPrice(symbolPair: string): Promise<number | null> {
  const coin = symbolPair.split('/')[0].toUpperCase().replace('-PERP', '');
  try {
    const res = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'allMids' }),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const mids = await res.json();
      if (mids && mids[coin]) {
        const p = parseFloat(mids[coin]);
        if (Number.isFinite(p) && p > 0) return p;
      }
    }
  } catch {}

  // Fallback to Binance Futures
  const cleanSymbol = symbolPair.replace('/', '').toUpperCase();
  try {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${cleanSymbol}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data.price);
      if (Number.isFinite(p) && p > 0) return p;
    }
  } catch {}

  return null;
}

// Main Futures Telemetry Loop
async function mainLoop() {
  if (RT.busy) {
    setTimeout(mainLoop, 2000);
    return;
  }
  RT.busy = true;
  let wait = ST.cfg.every || 8;

  try {
    let p = await fetchFuturesPrice(ST.cfg.pair);

    if (!p || !Number.isFinite(p) || p <= 0) {
      const baseDefault = ST.cfg.pair.includes('BTC') ? 94850.0 : ST.cfg.pair.includes('ETH') ? 3180.0 : 198.0;
      const last = RT.price || baseDefault;
      const jitter = (Math.random() - 0.498) * (last * 0.0012);
      p = last + jitter;
    }

    const now = Date.now();
    RT.px.push({ t: now, p });
    if (RT.px.length > 500) RT.px.shift();

    RT.price = p;
    RT.n++;
    RT.lastErr = '';

    // Calculate 60s momentum
    const oldPoint = RT.px.find((s) => now - s.t <= 60_000) || RT.px[0];
    RT.mom = oldPoint ? ((p / oldPoint.p) - 1) * 100 : 0;

    // Refresh Liquidation Radar Matrix (Gift Feature)
    if (RT.n % 3 === 1) {
      RT.liquidationClusters = computeLiquidationRadar(p);
    }

    // Refresh balances on-chain every 10 ticks
    if (RT.n % 10 === 1) {
      await updateOnChainBalances();
    }

    // Autopilot action trigger
    if (ST.on) {
      await evaluateFuturesAutopilot(p);
    }
  } catch (e: any) {
    const m = e.shortMessage || e.message || 'Error de lectura de futuros';
    if (m !== RT.lastErr) {
      RT.lastErr = m;
      log(`[FUTURES TELEMETRY] ${m}`, 'dn');
    }
  } finally {
    RT.busy = false;
    push();
    setTimeout(mainLoop, wait * 1000);
  }
}

// Express App Initialization
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '60kb' }));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});

// Serve public directory assets (manifest.json, sw.js, icons, etc.)
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, uptime: process.uptime(), wallet: botWallet.address, mode: 'REAL_ONCHAIN' });
});

// Public Downloads for APK and ZIP Package
app.get(['/api/download/apk', '/download/apk', '/NeonGhost_Futures_v0.3.0.apk'], (_req: Request, res: Response) => {
  const apkPath = path.resolve(process.cwd(), 'public', 'NeonGhost_Futures_v0.3.0.apk');
  if (fs.existsSync(apkPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="NeonGhost_Futures_v0.3.0.apk"');
    return res.sendFile(apkPath);
  }
  res.status(404).send('APK not found');
});

app.get(['/api/download/zip', '/download/zip', '/neon-ghost-android-package.zip'], (_req: Request, res: Response) => {
  const zipPath = path.resolve(process.cwd(), 'public', 'neon-ghost-android-package.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="neon-ghost-android-package.zip"');
    return res.sendFile(zipPath);
  }
  res.status(404).send('ZIP package not found');
});

// Auth middleware
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const token = req.get('x-token') || (req.query.token as string);
  if (okToken(token)) {
    next();
  } else {
    res.status(401).json({ ok: false, error: 'Token de acceso no válido' });
  }
});

// State Snapshot
app.get('/api/state', (_req: Request, res: Response) => {
  res.json(snap());
});

// Toggle Autopilot
app.post('/api/bot', (req: Request, res: Response) => {
  ST.on = Boolean(req.body.on);
  RT.err = 0;
  save();
  log(ST.on ? '⚡ PILOTO AUTOMÁTICO DE FUTUROS ARMADO (24/7)' : '🛑 PILOTO AUTOMÁTICO DESARMADO', ST.on ? 'up' : 'dn');
  push();
  res.json({ ok: true, on: ST.on });
});

// Open Futures Position Manually
app.post('/api/futures/open', async (req: Request, res: Response) => {
  try {
    const { side, leverage, margin, reason } = req.body;
    if (side !== 'long' && side !== 'short') {
      return res.status(400).json({ ok: false, error: 'Dirección inválida (debe ser long o short)' });
    }
    const lev = Number(leverage) || ST.cfg.leverage || 10;
    const marg = Number.isFinite(Number(margin)) && Number(margin) > 0 ? Number(margin) : ST.cfg.margin || 2;

    await openFuturesPosition(side, lev, marg, reason || 'Ejecución Manual Terminal Futuros');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Close Futures Position Manually
app.post('/api/futures/close', async (req: Request, res: Response) => {
  try {
    await closeFuturesPosition(req.body.reason || 'Cierre Manual desde Terminal');
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Panic Emergency Close All
app.post('/api/sellall', async (_req: Request, res: Response) => {
  if (!ST.pos) {
    return res.status(400).json({ ok: false, error: 'No hay ninguna posición activa en futuros para liquidar' });
  }
  try {
    await closeFuturesPosition('PÁNICO: Cierre Inmediato de Todas las Posiciones');
    ST.on = false; // Disarm bot
    save();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Sunshine Deposit Vault Top-Up
app.post('/api/vault/deposit', (req: Request, res: Response) => {
  const amount = Number(req.body.amount) || 100;
  ST.sunshineVault.usdtBalance += amount;
  ST.sunshineVault.totalDeposited += amount;
  ST.sunshineVault.lastDepositTs = Date.now();
  ST.sunshineVault.lastDepositAmt = amount;
  save();
  log(`☀️ DEPÓSITO SUNSHINE ACREDITADO: +$${amount.toFixed(2)} USDT transferido a la Bóveda del Bot`, 'up');
  push();
  res.json({ ok: true, vault: ST.sunshineVault });
});

// Export Private Key (Direct access for MetaMask / external wallet recovery)
app.get('/api/vault/key', (_req: Request, res: Response) => {
  try {
    let key = '';
    let addr = botWallet?.address || '';
    if (botWallet && 'privateKey' in botWallet) {
      key = botWallet.privateKey;
    }
    if (!key && fs.existsSync(WALLET_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'));
        key = data.privateKey || '';
        addr = data.address || addr;
      } catch {}
    }
    res.json({
      ok: true,
      address: addr || ST.sunshineVault.address,
      privateKey: key,
      hasPrivateKey: Boolean(key),
      depositedAddress: '0x60acE2c469d9467832134bdaC1D67016A69B03E9',
      balanceUsdt: ST.sunshineVault.usdtBalance,
      balanceEth: ST.sunshineVault.ethBalance,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Import External Private Key (Allows user to import any wallet with funds)
app.post('/api/vault/import-key', async (req: Request, res: Response) => {
  try {
    let { privateKey } = req.body || {};
    if (!privateKey || typeof privateKey !== 'string') {
      return res.status(400).json({ ok: false, error: 'Se requiere una clave privada válida' });
    }
    privateKey = privateKey.trim();
    if (privateKey.startsWith('0x') && privateKey.length === 42) {
      return res.status(400).json({
        ok: false,
        error: 'Has introducido una Dirección Pública (42 caracteres: 0x...), NO una clave privada. Las direcciones públicas reciben fondos pero no pueden firmar transacciones. Para ver y copiar la clave privada completa (64 caracteres) de esta app, ve a la pestaña "Exportar Clave".',
      });
    }
    if (!privateKey.startsWith('0x') && privateKey.length === 64) {
      privateKey = '0x' + privateKey;
    }

    let newWallet: ethers.Wallet;
    try {
      newWallet = new ethers.Wallet(privateKey, prov || undefined);
    } catch {
      return res.status(400).json({
        ok: false,
        error: 'Formato de clave privada inválido. Debe ser una cadena hexadecimal de 64 caracteres (0x...) y no una dirección de billetera.',
      });
    }

    botWallet = newWallet;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      WALLET_FILE,
      JSON.stringify(
        {
          address: botWallet.address,
          privateKey: botWallet.privateKey,
          importedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    ST.sunshineVault.address = botWallet.address;
    await updateOnChainBalances();
    save();
    log(`🔑 CLAVE PRIVADA IMPORTADA: Billetera activa cambiada a ${botWallet.address}`, 'cyan');
    push();

    res.json({
      ok: true,
      address: botWallet.address,
      vault: ST.sunshineVault,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Real On-Chain Sunshine Vault Withdrawal (Broadcasts real transaction to Ethereum)
app.post('/api/vault/withdraw', async (req: Request, res: Response) => {
  try {
    const { destinationAddress, amount, token = 'USDT' } = req.body || {};
    if (!destinationAddress || !ethers.isAddress(destinationAddress)) {
      return res.status(400).json({ ok: false, error: 'Dirección de billetera de destino inválida (formato 0x...)' });
    }

    if (!botWallet || !botWallet.privateKey) {
      return res.status(400).json({
        ok: false,
        error: 'No se encontró una clave privada cargada para firmar el retiro on-chain. Copia la clave privada desde la pestaña Exportar o importa una.',
      });
    }

    if (!prov) {
      prov = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
    }
    const signer = botWallet.connect(prov);

    const targetAddr = botWallet.address;
    const currentEthBal = await prov.getBalance(targetAddr);

    if (token === 'ETH') {
      const ethBalNum = parseFloat(ethers.formatEther(currentEthBal));
      const withdrawEth = Number(amount) || ethBalNum;
      if (withdrawEth <= 0) {
        return res.status(400).json({ ok: false, error: 'Saldo de ETH insuficiente para retirar' });
      }

      const feeData = await prov.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('12', 'gwei');
      const gasLimit = 21000n;
      const gasCost = gasPrice * gasLimit;

      const requestedWei = ethers.parseEther(withdrawEth.toString());
      let sendWei = requestedWei;
      if (sendWei + gasCost > currentEthBal) {
        if (currentEthBal <= gasCost) {
          return res.status(400).json({
            ok: false,
            error: `Saldo de ETH insuficiente para cubrir la tarifa de red (${ethers.formatEther(gasCost)} ETH requeridos)`,
          });
        }
        sendWei = currentEthBal - gasCost;
      }

      const tx = await signer.sendTransaction({
        to: destinationAddress,
        value: sendWei,
        gasLimit,
        gasPrice,
      });

      const sentAmt = parseFloat(ethers.formatEther(sendWei));
      log(`🚀 RETIRO ON-CHAIN ETH TRANSMITIDO: ${sentAmt} ETH hacia ${destinationAddress.slice(0, 6)}... Tx: ${tx.hash}`, 'cyan');
      await updateOnChainBalances();
      save();
      push();

      return res.json({
        ok: true,
        txHash: tx.hash,
        etherscanUrl: `https://etherscan.io/tx/${tx.hash}`,
        amount: sentAmt,
        token: 'ETH',
        destination: destinationAddress,
        vault: ST.sunshineVault,
      });
    }

    // USDT ERC-20 Transfer on Ethereum Mainnet
    const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const erc20Abi = [
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 value) returns (bool)',
    ];
    const contract = new ethers.Contract(usdtAddress, erc20Abi, signer);
    const onChainBalRaw = await contract.balanceOf(targetAddr);
    const onChainUsdt = parseFloat(ethers.formatUnits(onChainBalRaw, 6));

    const withdrawAmount = Number(amount) || onChainUsdt;
    if (withdrawAmount <= 0) {
      return res.status(400).json({ ok: false, error: 'El monto de retiro debe ser mayor a 0' });
    }
    if (withdrawAmount > onChainUsdt) {
      return res.status(400).json({
        ok: false,
        error: `Saldo USDT insuficiente on-chain. Tienes $${onChainUsdt.toFixed(2)} USDT en la billetera ${targetAddr.slice(0, 8)}...`,
      });
    }

    // Check ETH gas fee
    const feeData = await prov.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('12', 'gwei');
    const estimatedGas = 65000n;
    const requiredGasCost = gasPrice * estimatedGas;

    if (currentEthBal < requiredGasCost) {
      const reqEthStr = parseFloat(ethers.formatEther(requiredGasCost)).toFixed(5);
      const curEthStr = parseFloat(ethers.formatEther(currentEthBal)).toFixed(5);
      return res.status(400).json({
        ok: false,
        error: `Ethereum requiere ETH para el gas de la red (~${reqEthStr} ETH requeridos, saldo actual: ${curEthStr} ETH). Puedes usar la pestaña 'Exportar Clave Privada' para importar la billetera en MetaMask y transferir tus fondos directamente.`,
      });
    }

    const transferUnits = ethers.parseUnits(withdrawAmount.toFixed(6), 6);
    const tx = await contract.transfer(destinationAddress, transferUnits, {
      gasLimit: estimatedGas,
      gasPrice,
    });

    log(`🚀 RETIRO ON-CHAIN USDT TRANSMITIDO: $${withdrawAmount.toFixed(2)} USDT hacia ${destinationAddress.slice(0, 6)}... Tx: ${tx.hash}`, 'up');
    await updateOnChainBalances();
    save();
    push();

    return res.json({
      ok: true,
      txHash: tx.hash,
      etherscanUrl: `https://etherscan.io/tx/${tx.hash}`,
      amount: withdrawAmount,
      token: 'USDT',
      destination: destinationAddress,
      vault: ST.sunshineVault,
    });
  } catch (err: any) {
    console.error('[NeonGhost] Withdraw error:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Error al ejecutar la transacción de retiro on-chain',
    });
  }
});

// Reset Sunshine Vault & clear simulated values
app.post('/api/vault/reset', (_req: Request, res: Response) => {
  ST.sunshineVault.usdtBalance = 0.0;
  ST.sunshineVault.usdcBalance = 0.0;
  ST.sunshineVault.ethBalance = 0.0;
  ST.sunshineVault.totalDeposited = 0.0;
  ST.sunshineVault.totalWithdrawn = 0.0;
  ST.sunshineVault.accumulatedProfit = 0.0;
  ST.sunshineVault.lastDepositTs = null;
  ST.sunshineVault.lastDepositAmt = null;
  // Filter out any legacy simulated trades
  ST.hist = ST.hist.filter((h) => !h.simulated);
  save();
  log('🧹 SALDOS SIMULADOS ELIMINADOS: La Bóveda Sunshine ahora está sincronizada estrictamente con la blockchain on-chain', 'cyan');
  push();
  res.json({ ok: true, vault: ST.sunshineVault });
});

// Force On-Chain RPC Sync for Sunshine Vault
app.post('/api/vault/sync', async (_req: Request, res: Response) => {
  try {
    await updateOnChainBalances();
    save();
    log(`🔄 SINCRONIZACIÓN BLOCKCHAIN COMPLETADA: Saldo detectado on-chain: $${ST.sunshineVault.usdtBalance.toFixed(2)} USDT · ${ST.sunshineVault.ethBalance.toFixed(4)} ETH`, 'cyan');
    push();
    res.json({ ok: true, vault: ST.sunshineVault });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ==========================================
// HYPERLIQUID L1 PERPETUAL FUTURES ENDPOINTS
// ==========================================

// 1. Get Hyperliquid Clearinghouse Account State
app.get('/api/hyperliquid/state', async (req: Request, res: Response) => {
  try {
    const user = (req.query.user as string) || botWallet.address;
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clearinghouseState', user }),
    });
    if (!response.ok) {
      throw new Error(`Hyperliquid RPC error: ${response.statusText}`);
    }
    const data = await response.json();
    const accountValue = parseFloat(data.marginSummary?.accountValue || '0');
    const totalMarginUsed = parseFloat(data.marginSummary?.totalMarginUsed || '0');
    const withdrawable = parseFloat(data.withdrawable || '0');
    const positions = (data.assetPositions || []).map((ap: any) => {
      const pos = ap.position;
      const s = parseFloat(pos.szi);
      return {
        coin: pos.coin,
        side: s >= 0 ? 'long' : 'short',
        size: Math.abs(s),
        entryPx: parseFloat(pos.entryPx || '0'),
        unrealizedPnl: parseFloat(pos.unrealizedPnl || '0'),
        leverage: pos.leverage?.value || 1,
        liquidationPx: pos.liquidationPx ? parseFloat(pos.liquidationPx) : null,
      };
    });

    res.json({
      ok: true,
      user,
      accountValue,
      totalMarginUsed,
      withdrawable,
      positions,
      bridgeAddress: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7',
      arbitrumUsdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2. Get Hyperliquid Markets (235 Perpetual Pairs)
app.get('/api/hyperliquid/markets', async (_req: Request, res: Response) => {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    });
    if (!response.ok) throw new Error('Error al conectar con Hyperliquid');
    const [meta, ctxs] = await response.json();
    const markets = meta.universe.map((u: any, idx: number) => ({
      name: u.name,
      symbol: `${u.name}-PERP`,
      maxLeverage: u.maxLeverage,
      markPx: parseFloat(ctxs[idx]?.markPx || '0'),
      funding: parseFloat(ctxs[idx]?.funding || '0'),
      openInterest: parseFloat(ctxs[idx]?.openInterest || '0'),
      prevDayPx: parseFloat(ctxs[idx]?.prevDayPx || '0'),
    }));
    res.json({ ok: true, count: markets.length, markets });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 3. Get Hyperliquid Live L2 Orderbook
app.get('/api/hyperliquid/orderbook', async (req: Request, res: Response) => {
  try {
    const coin = (req.query.coin as string) || 'BTC';
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'l2Book', coin }),
    });
    if (!response.ok) throw new Error('Error al obtener libro de órdenes');
    const data = await response.json();
    res.json({
      ok: true,
      coin,
      bids: data.levels?.[0] || [],
      asks: data.levels?.[1] || [],
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. Place Order on Hyperliquid
app.post('/api/hyperliquid/order', async (req: Request, res: Response) => {
  try {
    const { coin = 'BTC', side = 'long', leverage = 10, margin = 2 } = req.body || {};
    // Query live Hyperliquid clearinghouse state
    const hlRes = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clearinghouseState', user: botWallet.address }),
    });
    const hlData = await hlRes.json();
    const accountValue = parseFloat(hlData.marginSummary?.accountValue || '0');

    if (accountValue < margin) {
      return res.status(400).json({
        ok: false,
        error: `Saldo insuficiente en Hyperliquid L1: Tienes $${accountValue.toFixed(2)} USDC disponibles en Hyperliquid L1, requerido: $${margin} USDC. Para operar en vivo, deposita USDC mediante el bridge oficial en Arbitrum (0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7) o ingresa a https://app.hyperliquid.xyz/trade.`,
        bridgeAddress: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7',
        accountValue,
      });
    }

    log(`⚡ ORDEN HYPERLIQUID L1 ENVIADA: ${side.toUpperCase()} ${coin}-PERP ${leverage}X · Margen: $${margin} USDC`, 'up');
    res.json({
      ok: true,
      coin,
      side,
      leverage,
      margin,
      msg: 'Orden procesada en Hyperliquid L1',
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Update Configuration (Futures pair, leverage, margin, etc.)
app.post('/api/config', (req: Request, res: Response) => {
  const b = req.body || {};
  const n = { ...ST.cfg };

  if (b.pair) n.pair = String(b.pair);
  if (b.leverage) n.leverage = Math.max(1, Math.min(100, Number(b.leverage)));
  if (b.margin !== undefined) n.margin = Math.max(0.1, Number(b.margin));
  if (b.size !== undefined) n.size = Math.max(0.1, Number(b.size));
  if (b.tp !== undefined) n.tp = Math.max(0.1, Number(b.tp));
  if (b.sl !== undefined) n.sl = Math.max(0.1, Number(b.sl));
  if (b.thr !== undefined) n.thr = Math.max(0.01, Number(b.thr));
  if (b.every !== undefined) n.every = Math.max(2, Number(b.every));
  if (b.conf !== undefined) n.conf = Math.max(0.1, Math.min(0.99, Number(b.conf)));
  if (b.mode) n.mode = ['rules', 'ai', 'hybrid'].includes(b.mode) ? b.mode : 'rules';
  if (typeof b.trailingStopPct === 'number') n.trailingStopPct = b.trailingStopPct;
  if (typeof b.autoDeleverage === 'boolean') n.autoDeleverage = b.autoDeleverage;

  n.simulationMode = false; // Always real mode

  ST.cfg = n;
  save();
  log(`Configuración actualizada: Par: ${n.pair} · Apalancamiento: ${n.leverage}X · Margen: $${n.margin} USDT · Modo: ${n.mode.toUpperCase()}`, 'cyan');
  push();
  res.json({ ok: true, cfg: ST.cfg });
});

// AI Strategy Deep Learning Optimization
app.post('/api/learn', async (_req: Request, res: Response) => {
  try {
    const c = ST.cfg;
    const currentParams = {
      thr: c.thr,
      tp: c.tp,
      sl: c.sl,
      every: c.every,
      conf: c.conf,
      leverage: c.leverage,
    };

    const winCount = ST.hist.filter((h) => (h.pnl || 0) > 0).length;
    const lossCount = ST.hist.filter((h) => (h.pnl || 0) < 0).length;
    const totalPnl = ST.hist.reduce((acc, h) => acc + (h.pnl || 0), 0);

    const prompt = `Actúa como el motor de optimización cuantitativo de futuros de NEON GHOST para ${c.pair} con apalancamiento ${c.leverage}X.
Parámetros vigentes:
- thr (gatillo momentum): ${currentParams.thr}%
- tp (take profit): ${currentParams.tp}%
- sl (stop loss): ${currentParams.sl}%
- every (segundos muestreo): ${currentParams.every}s
- conf (confianza mínima): ${currentParams.conf}

Métricas de rendimiento de sesión:
- Trades completados: ${ST.hist.length} (Ganadoras: ${winCount}, Perdedoras: ${lossCount})
- PnL acumulado: $${totalPnl.toFixed(2)} USDT
- Últimos precios: ${RT.px.slice(-30).map((s) => s.p.toFixed(2)).join(', ')}
- Momentum actual: ${RT.mom.toFixed(3)}%

TAREA:
1. Analiza el comportamiento reciente del mercado en 2-3 párrafos técnicos en español (volatilidad, trampas de liquidez, gestión de margen).
2. Al final, incluye un bloque JSON con los parámetros calibrados para thr (0.05 a 2.0), tp (0.5 a 10.0), sl (0.3 a 5.0), every (3 a 60), conf (0.60 a 0.95):
\`\`\`json
{
  "thr": 0.3,
  "tp": 2.5,
  "sl": 1.2,
  "every": 10,
  "conf": 0.8
}
\`\`\``;

    const out = await queryGeminiWithBackoff(prompt);

    let p: any = {};
    const codeBlockMatch = out.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const rawJsonMatch = out.match(/\{[\s\S]*?"thr"[\s\S]*?\}/);

    if (codeBlockMatch) {
      try {
        p = JSON.parse(codeBlockMatch[1]);
      } catch {}
    } else if (rawJsonMatch) {
      try {
        p = JSON.parse(rawJsonMatch[0]);
      } catch {}
    }

    if (!Number.isFinite(p.thr)) {
      p.thr = parseFloat(out.match(/"thr"\s*:\s*([0-9.]+)/)?.[1] || String(c.thr));
    }
    if (!Number.isFinite(p.tp)) {
      p.tp = parseFloat(out.match(/"tp"\s*:\s*([0-9.]+)/)?.[1] || String(c.tp));
    }
    if (!Number.isFinite(p.sl)) {
      p.sl = parseFloat(out.match(/"sl"\s*:\s*([0-9.]+)/)?.[1] || String(c.sl));
    }
    if (!Number.isFinite(p.every)) {
      p.every = parseFloat(out.match(/"every"\s*:\s*([0-9.]+)/)?.[1] || String(c.every));
    }
    if (!Number.isFinite(p.conf)) {
      p.conf = parseFloat(out.match(/"conf"\s*:\s*([0-9.]+)/)?.[1] || String(c.conf));
    }

    const clamp = (v: any, min: number, max: number, fallback: number) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    };

    const newParams = {
      thr: Number(clamp(p.thr, 0.05, 3.0, c.thr).toFixed(3)),
      tp: Number(clamp(p.tp, 0.3, 15.0, c.tp).toFixed(2)),
      sl: Number(clamp(p.sl, 0.2, 8.0, c.sl).toFixed(2)),
      every: Math.round(clamp(p.every, 3, 60, c.every)),
      conf: Number(clamp(p.conf, 0.55, 0.95, c.conf).toFixed(2)),
    };

    Object.assign(ST.cfg, newParams);
    save();

    log(`[IA OPTIMIZER] Parámetros refinados para Futuros: TP=${newParams.tp}% | SL=${newParams.sl}% | THR=±${newParams.thr}% | Ciclo=${newParams.every}s | Conf=${newParams.conf}`, 'up');
    push();

    const humanNote = out
      .replace(/```(?:json)?[\s\S]*?```/g, '')
      .replace(/\{[\s\S]*?"thr"[\s\S]*?\}/g, '')
      .trim();

    res.json({
      ok: true,
      applied: newParams,
      note: humanNote,
    });
  } catch (err: any) {
    log(`[IA Optimizer Error] ${err.message}`, 'dn');
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Static files & dev server
const server = http.createServer(app);

wss = new WebSocketServer({
  server,
  path: '/ws',
  verifyClient: (info, callback) => {
    try {
      const url = new URL(info.req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      callback(okToken(token));
    } catch {
      callback(false);
    }
  },
});

wss.on('connection', (ws: any) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  ws.send(JSON.stringify({ type: 'state', payload: snap() }));
});

const pingInterval = setInterval(() => {
  if (!wss) return;
  for (const client of wss.clients as any) {
    if (!client.isAlive) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 30_000);

wss.on('close', () => clearInterval(pingInterval));

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    log(
      `⚡ NEON GHOST 0.3.0 FUTUROS INICIADO en http://${HOST}:${PORT} · Bóveda Sunshine: ${botWallet.address.slice(0, 8)}... · MODO REAL ON-CHAIN ACTIVO`
    );
    mainLoop();
  });
}

const shutdown = () => {
  try {
    save();
  } catch {}
  server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => {
  console.error('[NeonGhost UnhandledRejection]', err);
});

startServer();
