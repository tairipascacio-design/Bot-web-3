export type FuturesSide = 'long' | 'short';

export interface FuturesPosition {
  id: string;
  side: FuturesSide;
  leverage: number;
  margin: number; // Collateral in USDT ($)
  notional: number; // margin * leverage
  entry: number;
  currentPrice: number;
  sizeUnits: number; // contracts / base tokens
  liqPrice: number;
  ts: number;
  pnlUsd: number;
  roePct: number; // Return on Equity = pnlUsd / margin * 100
  tpPrice: number;
  slPrice: number;
  trailingStop: number | null;
  pair: string;
}

export interface TradeHistoryItem {
  id: string;
  t: string;
  side: 'long' | 'short' | 'close_long' | 'close_short' | 'buy' | 'sell';
  px: number;
  amtQuote: number; // Margin or capital in USDT
  amtBase: number;
  leverage: number;
  pnl: number | null;
  pnlPct: number | null;
  why: string;
  txHash: string;
  simulated: boolean;
  pair: string;
}

export interface SunshineVault {
  address: string;
  ethBalance: number;
  usdtBalance: number;
  usdcBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  accumulatedProfit: number;
  lastDepositTs: number | null;
  lastDepositAmt: number | null;
}

export interface BotConfig {
  ba: string;
  qa: string;
  rt: string;
  qt: string;
  fee: number;
  size: number; // Legacy or capital size
  slip: number;
  every: number;
  mode: 'rules' | 'ai' | 'hybrid';
  thr: number;
  tp: number;
  sl: number;
  conf: number;
  ap: 'exact' | 'max';
  aiEvery: number;
  simulationMode: boolean; // MUST default to false for real mode!
  // FUTURES CONFIG
  futuresEnabled: boolean;
  pair: string; // e.g. "BTC/USDT", "ETH/USDT", "SOL/USDT"
  leverage: number; // e.g. 10x, 20x, 50x
  margin: number; // Margin collateral ($ USDT) per trade
  marginType: 'isolated' | 'cross';
  trailingStopPct: number; // e.g. 0.8%
  autoDeleverage: boolean; // Gift feature: auto reduce leverage during whale spikes
}

export interface TerminalLog {
  t: string;
  m: string;
  c: string;
}

export interface PricePoint {
  t: number;
  p: number;
}

export interface AiSignal {
  action: 'long' | 'short' | 'hold' | 'close';
  confidence: number;
  rationale: string;
  ts: number;
  targetPrice?: number;
  recommendedLeverage?: number;
}

export interface LiquidationCluster {
  price: number;
  volumeUsd: number;
  side: 'short_liq' | 'long_liq';
  intensity: number; // 0 to 1
}

export interface AppState {
  ts: number;
  price: number | null;
  mom: number;
  on: boolean;
  pos: FuturesPosition | null;
  cfg: BotConfig;
  hist: TradeHistoryItem[];
  logs: TerminalLog[];
  pnlPct: number | null;
  pnlUsd: number | null;
  px: PricePoint[];
  wallet: string | null;
  isSimulation: boolean;
  sunshineVault: SunshineVault;
  bal: string;
  hasAiKey: boolean;
  aiThinking: boolean;
  lastAiSignal: AiSignal | null;
  liquidationRadar: LiquidationCluster[];
  err: string;
  chain: string;
  chainId: number;
  uptime: number;
  tokenSymbols: {
    base: string;
    quote: string;
  };
}

export interface FuturesPairInfo {
  symbol: string;
  base: string;
  quote: string;
  maxLeverage: number;
  minMargin: number;
  defaultPrice: number;
  pricePrecision: number;
}

export interface PairPreset {
  name: string;
  network: string;
  chainId: number;
  baseSymbol: string;
  quoteSymbol: string;
  ba: string;
  qa: string;
  rt: string;
  qt: string;
  fee: number;
}

export type Position = FuturesPosition;

