import React, { useState, useEffect } from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Copy,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Wallet,
  ArrowRight,
  Layers,
  Sparkles,
  Smartphone,
  Lock,
} from 'lucide-react';
import { sound } from '../services/sound';

interface HyperliquidModalProps {
  isOpen: boolean;
  onClose: () => void;
  botAddress: string;
  onOpenDepositGuide?: () => void;
}

export const HyperliquidModal: React.FC<HyperliquidModalProps> = ({
  isOpen,
  onClose,
  botAddress,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'account' | 'markets'>('guide');
  const [loading, setLoading] = useState(false);
  const [copiedBridge, setCopiedBridge] = useState(false);
  const [accountData, setAccountData] = useState<{
    accountValue: number;
    totalMarginUsed: number;
    withdrawable: number;
    positions: any[];
  } | null>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [orderbook, setOrderbook] = useState<{ bids: any[]; asks: any[] } | null>(null);

  const BRIDGE_CONTRACT = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7';
  const ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

  // Fetch Hyperliquid account & market data
  useEffect(() => {
    if (isOpen) {
      fetchHyperliquidState();
      fetchMarkets();
    }
  }, [isOpen, botAddress]);

  // Fetch Orderbook when selectedCoin changes
  useEffect(() => {
    if (isOpen && activeTab === 'markets') {
      fetchOrderbook(selectedCoin);
    }
  }, [isOpen, activeTab, selectedCoin]);

  const fetchHyperliquidState = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hyperliquid/state');
      if (res.ok) {
        const data = await res.json();
        setAccountData(data);
      }
    } catch (e) {
      console.log('Error fetching Hyperliquid state:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkets = async () => {
    try {
      const res = await fetch('/api/hyperliquid/markets');
      if (res.ok) {
        const data = await res.json();
        setMarkets(data.markets || []);
      }
    } catch {}
  };

  const fetchOrderbook = async (coin: string) => {
    try {
      const res = await fetch(`/api/hyperliquid/orderbook?coin=${coin}`);
      if (res.ok) {
        const data = await res.json();
        setOrderbook(data);
      }
    } catch {}
  };

  if (!isOpen) return null;

  const handleCopyBridge = () => {
    sound.playClick();
    navigator.clipboard.writeText(BRIDGE_CONTRACT);
    setCopiedBridge(true);
    setTimeout(() => setCopiedBridge(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono text-xs">
      <div className="bg-[#070b16] border border-cyan-500/70 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl box-glow-cyan flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-900/60 bg-gradient-to-r from-cyan-950/60 via-slate-950 to-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 animate-pulse">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="font-['Orbitron',sans-serif] font-bold text-sm text-white flex items-center gap-2">
                <span>HYPERLIQUID L1 // FUTUROS PERPETUOS</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  DEX REAL L1
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                Apalancamiento real hasta 50X · Sin gas por orden · Libro de órdenes central descentralizado
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('guide');
            }}
            className={`flex-1 py-2.5 px-3 text-center font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>¿QUÉ NECESITO PARA OPERAR?</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('account');
            }}
            className={`flex-1 py-2.5 px-3 text-center font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'account'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>MI CUENTA EN HYPERLIQUID</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('markets');
            }}
            className={`flex-1 py-2.5 px-3 text-center font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'markets'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>MERCADOS L1 (235 PARES)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: EXACT REQUIREMENTS (TRANSPARENCY & CLARITY) */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-950 border border-cyan-500/50 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm font-['Orbitron',sans-serif]">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>¿QUÉ NECESITAS EXACTAMENTE PARA OPERAR EN HYPERLIQUID?</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Para que no tengas ninguna duda ni confusión, aquí tienes la lista exacta de lo que necesitas. No requieres crear cuentas con contraseña ni pagar suscripciones:
                </p>
              </div>

              {/* Requirement Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Wallet */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                    <Check className="w-4 h-4" />
                    <span>1. Tu Billetera EVM (Ya la tienes)</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Usa la misma clave privada que copiaste del bot o tu MetaMask. Tu dirección EVM es tu cuenta directa en Hyperliquid L1. No hay usuarios ni contraseñas.
                  </p>
                </div>

                {/* 2. Token / Network */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>2. Token: USDC en Arbitrum</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Hyperliquid utiliza <strong>USDC nativo en la red Arbitrum One</strong> como margen colateral (no USDT en Ethereum mainnet).
                  </p>
                </div>

                {/* 3. Saldo Mínimo */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase">
                    <DollarSignIcon className="w-4 h-4" />
                    <span>3. Saldo Mínimo Recomendado</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Puedes comenzar con tan solo <strong>$5 o $10 USDC</strong>. Con 10X o 20X de apalancamiento, $5 equivalen a una posición de $50 a $100 USD en BTC o ETH.
                  </p>
                </div>

                {/* 4. Gas Fees */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    <span>4. Cero Gas por Orden en L1</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    En Arbitrum solo requieres ~$0.10 de ETH para transferir al bridge. Dentro de Hyperliquid L1, <strong>las órdenes no consumen gas de red</strong> (son firmas EIP-712 gratuitas).
                  </p>
                </div>
              </div>

              {/* Uniswap vs Hyperliquid Truth Table */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white text-[11px] uppercase tracking-wider">
                  Diferencia Real: ¿Por qué Hyperliquid y NO Uniswap?
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded bg-rose-950/30 border border-rose-900/40 text-rose-200">
                    <span className="font-bold block text-rose-300">Uniswap V3:</span>
                    Es solo intercambio spot (comprar token A y recibir token B). No tiene apalancamiento, ni shorts reales, y las comisiones de gas en Ethereum son de $3 a $15 por swap.
                  </div>
                  <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-900/40 text-emerald-200">
                    <span className="font-bold block text-emerald-300">Hyperliquid L1:</span>
                    Es el DEX de futuros #1 del mundo. Permite Long y Short reales con hasta 50X de apalancamiento, libro de órdenes en milisegundos y cero gas por operación.
                  </div>
                </div>
              </div>

              {/* Direct 1-Click Action to Deposit */}
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 uppercase text-xs">
                    ¿Cómo fondear tu cuenta de Hyperliquid ahora mismo?
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">1 Minuto</span>
                </div>

                <div className="space-y-2 text-[11px] text-gray-300 leading-relaxed">
                  <p>
                    <strong>Paso 1:</strong> Abre el portal oficial de Hyperliquid en tu navegador o celular:{' '}
                    <a
                      href="https://app.hyperliquid.xyz/trade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <span>app.hyperliquid.xyz/trade</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                  <p>
                    <strong>Paso 2:</strong> Conecta tu billetera (MetaMask o Trust Wallet).
                  </p>
                  <p>
                    <strong>Paso 3:</strong> Haz clic en el botón <strong>"Deposit"</strong> en la esquina superior derecha y transfiere tus USDC desde Arbitrum. ¡El saldo aparecerá de inmediato en este bot!
                  </p>
                </div>

                {/* Arbitrum Bridge Contract Direct Address */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">
                    Dirección del Contrato Bridge Oficial de Hyperliquid en Arbitrum One:
                  </span>
                  <div className="p-2 rounded bg-black border border-slate-700 flex items-center justify-between gap-2 font-mono text-[11px] text-gray-200 break-all select-all">
                    <span>{BRIDGE_CONTRACT}</span>
                    <button
                      onClick={handleCopyBridge}
                      className="p-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold shrink-0 transition"
                      title="Copiar dirección del bridge"
                    >
                      {copiedBridge ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HYPERLIQUID L1 ACCOUNT STATE */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold uppercase text-[11px]">
                  Billetera Consultada en Hyperliquid L1:
                </span>
                <button
                  onClick={fetchHyperliquidState}
                  disabled={loading}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition text-[11px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-gray-300 break-all select-all">
                {botAddress}
              </div>

              {/* Balances */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-lg bg-slate-950 border border-cyan-900/50">
                  <span className="text-[10px] text-gray-400 block uppercase">Valor de Cuenta L1</span>
                  <span className="text-base font-bold text-cyan-300 font-mono">
                    ${(accountData?.accountValue || 0).toFixed(2)} USDC
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-cyan-900/50">
                  <span className="text-[10px] text-gray-400 block uppercase">Margen en Uso</span>
                  <span className="text-base font-bold text-amber-300 font-mono">
                    ${(accountData?.totalMarginUsed || 0).toFixed(2)} USDC
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-cyan-900/50">
                  <span className="text-[10px] text-gray-400 block uppercase">Disponible / Retirable</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    ${(accountData?.withdrawable || 0).toFixed(2)} USDC
                  </span>
                </div>
              </div>

              {/* Positions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white uppercase text-[11px] block">
                  Posiciones de Futuros Activas en Hyperliquid
                </span>

                {accountData?.positions && accountData.positions.length > 0 ? (
                  <div className="space-y-2">
                    {accountData.positions.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-slate-900/90 border border-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{p.coin}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                p.side === 'long' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                              }`}
                            >
                              {p.side} {p.leverage}X
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Entrada: ${p.entryPx} · Tamaño: {p.size}
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-bold block ${
                              p.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)} USD
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Liq: {p.liquidationPx ? `$${p.liquidationPx}` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    No hay contratos abiertos actualmente en Hyperliquid L1 para esta billetera.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE L1 MARKETS & ORDERBOOK */}
          {activeTab === 'markets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold uppercase text-[11px]">
                  Mercados Perpetuos en Vivo (Hyperliquid L1):
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">235 Mercados Conectados</span>
              </div>

              {/* Coin Quick Selector */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {['BTC', 'ETH', 'SOL', 'HYPE', 'SUI', 'DOGE'].map((coin) => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => setSelectedCoin(coin)}
                    className={`py-1.5 px-2 rounded font-bold text-center transition border ${
                      selectedCoin === coin
                        ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_8px_#06b6d4]'
                        : 'bg-slate-900 border-slate-800 text-gray-300 hover:bg-slate-800'
                    }`}
                  >
                    {coin}-PERP
                  </button>
                ))}
              </div>

              {/* Orderbook L2 */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
                  <span className="font-bold text-white uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Libro de Órdenes Central L1 ({selectedCoin}-PERP)
                  </span>
                  <span className="text-emerald-400 font-bold">Milisegundos</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {/* Asks (Ventas) */}
                  <div>
                    <span className="text-rose-400 block font-bold mb-1 uppercase">Asks (Venta)</span>
                    <div className="space-y-0.5 font-mono">
                      {orderbook?.asks?.slice(0, 5).map((lvl: any, i: number) => (
                        <div key={i} className="flex justify-between text-gray-300 bg-rose-950/20 px-1.5 py-0.5 rounded">
                          <span className="text-rose-400">${lvl.px}</span>
                          <span className="text-gray-400">{lvl.sz}</span>
                        </div>
                      )) || <div className="text-gray-600">Cargando libro...</div>}
                    </div>
                  </div>

                  {/* Bids (Compras) */}
                  <div>
                    <span className="text-emerald-400 block font-bold mb-1 uppercase">Bids (Compra)</span>
                    <div className="space-y-0.5 font-mono">
                      {orderbook?.bids?.slice(0, 5).map((lvl: any, i: number) => (
                        <div key={i} className="flex justify-between text-gray-300 bg-emerald-950/20 px-1.5 py-0.5 rounded">
                          <span className="text-emerald-400">${lvl.px}</span>
                          <span className="text-gray-400">{lvl.sz}</span>
                        </div>
                      )) || <div className="text-gray-600">Cargando libro...</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-gray-400 font-mono shrink-0">
          <div className="flex items-center gap-2 text-cyan-400">
            <Zap className="w-4 h-4" />
            <span>Conexión directa a Hyperliquid L1 RPC</span>
          </div>
          <a
            href="https://app.hyperliquid.xyz/trade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
          >
            <span>Abrir app.hyperliquid.xyz</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

function DollarSignIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
