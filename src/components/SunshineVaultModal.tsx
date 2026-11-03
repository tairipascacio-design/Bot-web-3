import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Sun,
  Copy,
  Check,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Zap,
  RefreshCw,
  Trash2,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  Lock,
  Download,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { SunshineVault } from '../types';
import { sound } from '../services/sound';

export type SunshineTab = 'deposit' | 'withdraw' | 'exportKey' | 'importKey';

interface SunshineVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: SunshineVault;
  onDeposit: (amount: number) => Promise<void>;
  onWithdraw: (destination: string, amount: number, token?: 'USDT' | 'ETH') => Promise<{ ok: boolean; txHash?: string; etherscanUrl?: string; error?: string }>;
  onResetVault?: () => Promise<boolean>;
  onSyncVault?: () => Promise<boolean>;
  initialTab?: SunshineTab;
}

export const SunshineVaultModal: React.FC<SunshineVaultModalProps> = ({
  isOpen,
  onClose,
  vault,
  onDeposit,
  onWithdraw,
  onResetVault,
  onSyncVault,
  initialTab = 'exportKey', // Default to exportKey so user immediately sees their private key!
}) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<SunshineTab>(initialTab);
  const [customDepositAmt, setCustomDepositAmt] = useState<string>('2');
  
  // Withdrawal Form
  const [withdrawToken, setWithdrawToken] = useState<'USDT' | 'ETH'>('USDT');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastEtherscanUrl, setLastEtherscanUrl] = useState<string | null>(null);

  // Private Key State
  const [serverKeyData, setServerKeyData] = useState<{
    address: string;
    privateKey: string;
    depositedAddress?: string;
  } | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(true);
  const [loadingKey, setLoadingKey] = useState<boolean>(false);

  // Import Key Form
  const [importKeyInput, setImportKeyInput] = useState<string>('');
  const [importLoading, setImportLoading] = useState<boolean>(false);

  // Status & Loading
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Synchronize initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      fetchPrivateKey();
    }
  }, [isOpen, initialTab]);

  // Fetch Private Key from Server
  const fetchPrivateKey = async () => {
    setLoadingKey(true);
    try {
      const res = await fetch('/api/vault/key');
      const data = await res.json();
      if (data.ok) {
        setServerKeyData({
          address: data.address,
          privateKey: data.privateKey,
          depositedAddress: data.depositedAddress,
        });
      }
    } catch {
      console.log('Error al consultar clave privada del servidor');
    } finally {
      setLoadingKey(false);
    }
  };

  // Generate QR Code for the active address
  useEffect(() => {
    const targetAddr = vault.address || serverKeyData?.address;
    if (targetAddr) {
      QRCode.toDataURL(targetAddr, {
        width: 240,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [vault.address, serverKeyData?.address]);

  if (!isOpen) return null;

  const handleCopyAddress = (addrToCopy: string) => {
    sound.playClick();
    navigator.clipboard.writeText(addrToCopy);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyPrivateKey = () => {
    sound.playClick();
    const key = serverKeyData?.privateKey;
    if (key) {
      navigator.clipboard.writeText(key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
      setActionMsg({
        text: '¡CLAVE PRIVADA COPIADA AL PORTAPAPELES! Pégala en MetaMask o Trust Wallet para tomar control total.',
        ok: true,
      });
    }
  };

  const handleRegisterDeposit = async (amount: number) => {
    sound.playBuy();
    setActionLoading(true);
    setActionMsg(null);
    try {
      await onDeposit(amount);
      setActionMsg({
        text: `¡Fondos de $${amount.toFixed(2)} USDT acreditados a la Bóveda Sunshine! Listo para operar en futuros.`,
        ok: true,
      });
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error al procesar depósito', ok: false });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncBlockchain = async () => {
    if (!onSyncVault) return;
    sound.playClick();
    setSyncLoading(true);
    setActionMsg(null);
    try {
      const ok = await onSyncVault();
      await fetchPrivateKey();
      if (ok) {
        setActionMsg({
          text: `Sincronización on-chain completada con éxito vía RPC de Ethereum.`,
          ok: true,
        });
      }
    } catch {
      setActionMsg({ text: 'Error al contactar nodo RPC de Ethereum', ok: false });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleResetToZero = async () => {
    if (!onResetVault) return;
    sound.playClick();
    if (!confirm('¿Deseas purgar cualquier saldo anterior y sincronizar la Bóveda estrictamente con los fondos On-Chain?')) return;
    setResetLoading(true);
    setActionMsg(null);
    try {
      const ok = await onResetVault();
      if (ok) {
        setActionMsg({
          text: `Créditos anteriores reseteados. Saldo sincronizado directamente con la blockchain.`,
          ok: true,
        });
      }
    } catch {
      setActionMsg({ text: 'Error al resetear saldo', ok: false });
    } finally {
      setResetLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (!destinationAddress || !withdrawAmount) return;
    setActionLoading(true);
    setActionMsg(null);
    setLastTxHash(null);
    setLastEtherscanUrl(null);
    try {
      const res = await onWithdraw(destinationAddress, parseFloat(withdrawAmount), withdrawToken);
      if (res.ok) {
        if (res.txHash) {
          setLastTxHash(res.txHash);
          setLastEtherscanUrl(res.etherscanUrl || `https://etherscan.io/tx/${res.txHash}`);
        }
        setActionMsg({
          text: `¡Transacción on-chain transmitida con éxito! ${withdrawAmount} ${withdrawToken} enviados a ${destinationAddress.slice(0, 8)}...`,
          ok: true,
        });
        setWithdrawAmount('');
      } else {
        setActionMsg({ text: res.error || 'No se pudo completar el retiro on-chain.', ok: false });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error al procesar retiro', ok: false });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportKey = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (!importKeyInput.trim()) return;
    setImportLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch('/api/vault/import-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: importKeyInput.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg({
          text: `¡Billetera importada con éxito! Nueva dirección activa: ${data.address}`,
          ok: true,
        });
        setImportKeyInput('');
        await fetchPrivateKey();
        if (onSyncVault) await onSyncVault();
      } else {
        setActionMsg({ text: data.error || 'Error al importar clave privada', ok: false });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Error de conexión', ok: false });
    } finally {
      setImportLoading(false);
    }
  };

  const activeAddress = vault.address || serverKeyData?.address || '';
  const currentKey = serverKeyData?.privateKey || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-mono text-xs">
      <div className="bg-[#090d18] border border-amber-500/70 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl box-glow-amber flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/60 bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-400 animate-pulse">
              <Key className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-['Orbitron',sans-serif] font-bold text-sm text-white flex items-center gap-2">
                <span>GESTIÓN DE BILLETERA &amp; CLAVE PRIVADA</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  ON-CHAIN REAL
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                Acceso directo a claves criptográficas · Retiros on-chain a MetaMask y exchanges
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real Balance Status Banner */}
        <div className="px-5 py-3 bg-amber-950/20 border-b border-amber-900/40">
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <div className="bg-slate-950/80 p-2 rounded border border-amber-900/40">
              <span className="text-[10px] text-gray-400 block uppercase">Saldo USDT On-Chain</span>
              <span className="text-base font-bold text-emerald-400 glow-green">
                ${vault.usdtBalance.toFixed(2)} USDT
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded border border-amber-900/40">
              <span className="text-[10px] text-gray-400 block uppercase">Gas ETH On-Chain</span>
              <span className="text-base font-bold text-cyan-300">
                {vault.ethBalance.toFixed(4)} ETH
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded border border-amber-900/40">
              <span className="text-[10px] text-gray-400 block uppercase">Clave Privada</span>
              <span className="text-xs font-bold text-amber-400 block mt-1">
                {currentKey ? 'DISPONIBLE Y COPIABLE' : 'CARGANDO...'}
              </span>
            </div>
          </div>

          {/* Balance Management Actions: Sync & Purge */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
            <button
              type="button"
              onClick={handleSyncBlockchain}
              disabled={syncLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/50 transition font-bold"
              title="Consultar saldo directamente en la blockchain mediante el nodo RPC"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
              <span>{syncLoading ? 'Consultando RPC...' : 'Sincronizar Blockchain'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetToZero}
              disabled={resetLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-rose-950/60 text-rose-300 border border-rose-800/50 transition font-bold"
              title="Sincronizar estrictamente con la blockchain on-chain"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{resetLoading ? 'Purgando...' : 'Sincronizar On-Chain'}</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950 flex-wrap">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('exportKey');
            }}
            className={`flex-1 py-2.5 px-3 text-center font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'exportKey'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-950/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>COPIAR CLAVE PRIVADA</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('withdraw');
            }}
            className={`flex-1 py-2.5 px-3 text-center font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'withdraw'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            <span>RETIRO ON-CHAIN REAL</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('deposit');
            }}
            className={`flex-1 py-2.5 px-3 text-center font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'deposit'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>VER DIRECCIÓN / DEPOSITAR</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('importKey');
            }}
            className={`flex-1 py-2.5 px-3 text-center font-bold tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === 'importKey'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-950/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span>IMPORTAR OTRA CLAVE</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {actionMsg && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                actionMsg.ok
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500'
                  : 'bg-rose-950/90 text-rose-300 border-rose-500'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{actionMsg.text}</span>
            </div>
          )}

          {/* TAB 1: EXPORT PRIVATE KEY (PRIMARY RECOVERY FOCUS) */}
          {activeTab === 'exportKey' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Key className="w-4 h-4" />
                  <span>Tu Clave Privada de la Billetera (Ethereum EVM)</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Esta es la clave privada secreta que controla los fondos en la blockchain. Con esta clave tienes control absoluto y puedes importar tu cuenta en cualquier billetera externa (MetaMask, Trust Wallet, Rabby, etc.) sin depender de esta aplicación.
                </p>
              </div>

              {/* Private Key Box with Copy Button */}
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-400/60 space-y-3 box-glow-amber">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    CLAVE PRIVADA CRIPTOGRÁFICA (RAW HEX)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                  >
                    {showPrivateKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPrivateKey ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="p-3 rounded-lg bg-black/90 border border-amber-500/50 font-mono text-xs text-amber-300 break-all select-all leading-relaxed">
                    {currentKey ? (
                      showPrivateKey ? currentKey : '•'.repeat(66)
                    ) : (
                      <span className="text-gray-500 italic">Cargando clave privada del servidor...</span>
                    )}
                  </div>
                </div>

                {/* Big Copy Button */}
                <button
                  type="button"
                  onClick={handleCopyPrivateKey}
                  disabled={!currentKey}
                  className="w-full py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
                >
                  {copiedKey ? <Check className="w-5 h-5 text-black" /> : <Copy className="w-5 h-5 text-black" />}
                  <span>{copiedKey ? '¡CLAVE PRIVADA COPIADA AL PORTAPAPELES!' : 'COPIAR CLAVE PRIVADA'}</span>
                </button>
              </div>

              {/* Active Wallet Address */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span className="font-bold text-gray-300 uppercase">Dirección EVM Activa:</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://etherscan.io/address/${activeAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-bold text-[10px]"
                    >
                      <span>Ver en Etherscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-between gap-2 font-mono text-[11px] text-gray-200 break-all select-all">
                  <span>{activeAddress}</span>
                  <button
                    onClick={() => handleCopyAddress(activeAddress)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 shrink-0 transition"
                    title="Copiar dirección"
                  >
                    {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Instructions Guide */}
              <div className="bg-slate-950 p-4 rounded-xl border border-cyan-900/40 space-y-2 text-[11px]">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Cómo importar tu dinero directamente en MetaMask:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300 leading-relaxed pl-1">
                  <li>Abre tu extensión o app de <strong>MetaMask</strong>.</li>
                  <li>Haz clic en el selector de cuentas en la parte superior.</li>
                  <li>Selecciona <strong>"Agregar cuenta o billetera de hardware"</strong> → <strong>"Importar cuenta"</strong>.</li>
                  <li>Pega la <strong>Clave Privada</strong> copiada arriba y pulsa <strong>"Importar"</strong>.</li>
                  <li>¡Listo! Tu saldo de USDT y ETH aparecerá en MetaMask y podrás transferirlo a donde tú quieras.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: REAL ON-CHAIN WITHDRAWAL */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-cyan-300">Retiro Real en Blockchain (Ethereum Mainnet)</span>
                  <p className="text-[11px] text-gray-300">
                    Transfiere tus USDT o ETH directamente hacia tu billetera personal (MetaMask, Trust Wallet, Binance, etc.) con una transacción on-chain firmada criptográficamente.
                  </p>
                </div>
              </div>

              {/* Token Selector */}
              <div>
                <label className="block text-gray-300 mb-1.5 text-[11px] font-bold uppercase">Token a Retirar</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawToken('USDT')}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition flex items-center justify-center gap-2 ${
                      withdrawToken === 'USDT'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_10px_#10b981]'
                        : 'bg-slate-900 border-slate-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>USDT (ERC-20)</span>
                    <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-400">
                      ${vault.usdtBalance.toFixed(2)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawToken('ETH')}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition flex items-center justify-center gap-2 ${
                      withdrawToken === 'ETH'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_#06b6d4]'
                        : 'bg-slate-900 border-slate-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>ETH (Nativo)</span>
                    <span className="text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded text-cyan-300">
                      {vault.ethBalance.toFixed(4)} ETH
                    </span>
                  </button>
                </div>
              </div>

              {/* Destination Address */}
              <div>
                <label className="block text-gray-300 mb-1 text-[11px] font-bold uppercase">
                  Dirección de Destino (Tu billetera de MetaMask / Exchange)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-400 text-xs"
                />
              </div>

              {/* Amount */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-gray-300 text-[11px] font-bold uppercase">
                    Monto a Retirar ({withdrawToken})
                  </label>
                  <span className="text-[10px] text-gray-400">
                    Disponible On-Chain:{' '}
                    <strong className="text-emerald-400">
                      {withdrawToken === 'USDT' ? `$${vault.usdtBalance.toFixed(2)} USDT` : `${vault.ethBalance.toFixed(4)} ETH`}
                    </strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    max={withdrawToken === 'USDT' ? vault.usdtBalance : vault.ethBalance}
                    required
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-16 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-400 text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (withdrawToken === 'USDT') setWithdrawAmount(String(vault.usdtBalance));
                      else setWithdrawAmount(String(vault.ethBalance));
                    }}
                    className="absolute right-2 top-2 px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold hover:bg-cyan-900 border border-cyan-700 cursor-pointer"
                  >
                    MÁXIMO
                  </button>
                </div>
              </div>

              {/* Submit Real Withdrawal Button */}
              <button
                type="submit"
                disabled={actionLoading || (withdrawToken === 'USDT' ? vault.usdtBalance <= 0 : vault.ethBalance <= 0)}
                className="w-full py-3 rounded-lg font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition box-glow-cyan flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <ArrowUpRight className="w-5 h-5" />
                <span>
                  {actionLoading
                    ? 'FIRMANDO & TRANSMITIENDO ON-CHAIN...'
                    : `TRANSMITIR RETIRO ON-CHAIN (${withdrawToken})`}
                </span>
              </button>

              {lastTxHash && (
                <div className="p-3 bg-emerald-950/70 border border-emerald-500 rounded-lg text-[11px] space-y-1">
                  <div className="font-bold text-emerald-300">¡Transacción enviada a la blockchain!</div>
                  <div className="text-gray-300 font-mono break-all">Tx Hash: {lastTxHash}</div>
                  {lastEtherscanUrl && (
                    <a
                      href={lastEtherscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-bold pt-1"
                    >
                      <span>Ver transacción en Etherscan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </form>
          )}

          {/* TAB 3: DEPOSIT / ADDRESS VIEW */}
          {activeTab === 'deposit' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 flex flex-col sm:flex-row items-center gap-4">
                {qrDataUrl ? (
                  <div className="bg-white p-2 rounded-lg shrink-0 shadow-lg">
                    <img src={qrDataUrl} alt="Deposit QR Code" className="w-32 h-32" />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-slate-900 rounded-lg flex items-center justify-center text-gray-500">
                    Generando QR...
                  </div>
                )}

                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center justify-between text-gray-400 text-[11px]">
                    <span className="font-bold text-amber-300 uppercase">Dirección EVM Bóveda Sunshine:</span>
                    <span className="text-[10px] text-emerald-400 font-bold">100% On-Chain</span>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-700 flex items-center justify-between gap-2 font-mono text-[11px] text-gray-200 break-all select-all">
                    <span>{activeAddress}</span>
                    <button
                      onClick={() => handleCopyAddress(activeAddress)}
                      className="p-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold shrink-0 transition"
                      title="Copiar dirección"
                    >
                      {copiedAddress ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-1 text-[10px]">
                    <a
                      href={`https://etherscan.io/address/${activeAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>Ver en Etherscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-gray-600">•</span>
                    <a
                      href={`https://arbiscan.io/address/${activeAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>Ver en Arbiscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
                    Transfiere USDT o ETH directamente a esta dirección desde tu billetera (MetaMask, Phantom, Binance, etc.) para fondear el bot.
                  </p>
                </div>
              </div>

              {/* Direct Balance Top-Up Registrar */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Registrar Depósito en la Bóveda del Bot
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">Sin comisiones intermedias</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {['2', '5', '10', '50'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomDepositAmt(amt)}
                      className={`py-1.5 rounded font-bold transition border text-center ${
                        customDepositAmt === amt
                          ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_#f59e0b]'
                          : 'bg-slate-900 border-slate-800 text-gray-300 hover:bg-slate-800'
                      }`}
                    >
                      ${amt} USDT
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={customDepositAmt}
                      onChange={(e) => setCustomDepositAmt(e.target.value)}
                      placeholder="Monto en USDT"
                      className="w-full bg-slate-900 border border-slate-700 rounded pl-7 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleRegisterDeposit(parseFloat(customDepositAmt) || 2)}
                    disabled={actionLoading || !(parseFloat(customDepositAmt) > 0)}
                    className="py-2.5 px-4 rounded font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black transition box-glow-amber flex items-center gap-2 whitespace-nowrap"
                  >
                    <Sun className="w-4 h-4 text-black" />
                    <span>{actionLoading ? 'ACREDITANDO...' : `ACREDITAR $${customDepositAmt || '0'} USDT`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: IMPORT EXTERNAL PRIVATE KEY */}
          {activeTab === 'importKey' && (
            <form onSubmit={handleImportKey} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 text-purple-200 text-xs flex items-start gap-2.5">
                <Upload className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-purple-300">Importar Clave Privada Existente</span>
                  <p className="text-[11px] text-gray-300">
                    Si tienes una billetera con fondos en MetaMask o un exchange y deseas que Neon Ghost la opere y ejecute retiros directamente desde ella, pega su clave privada aquí.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 text-[11px] font-bold uppercase">
                  Clave Privada (64 Caracteres Hexadecimales)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x... (clave privada hexadecimal de 64 caracteres)"
                  value={importKeyInput}
                  onChange={(e) => setImportKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-purple-400 text-xs"
                />

                {/* Helpful Warning if user pasted public address */}
                {importKeyInput.trim().startsWith('0x') && importKeyInput.trim().length === 42 && (
                  <div className="mt-2.5 p-3 rounded-lg bg-amber-950/80 border border-amber-500/80 text-amber-200 text-xs space-y-2">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Has pegado una DIRECCIÓN PÚBLICA (42 caracteres), no una clave privada</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      Una dirección pública (<code className="text-amber-300">{importKeyInput.trim().slice(0, 8)}...{importKeyInput.trim().slice(-6)}</code>) solo sirve para recibir depósitos, no puede firmar órdenes. 
                      Si buscas la clave privada que la app generó para retirar o importarla en MetaMask, pulsa el botón de abajo:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setActiveTab('exportKey');
                      }}
                      className="w-full py-2 px-3 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider text-[11px] transition shadow"
                    >
                      👉 IR A PESTAÑA "EXPORTAR CLAVE" (COPIAR CON 1 CLIC)
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={importLoading || !importKeyInput.trim() || (importKeyInput.trim().startsWith('0x') && importKeyInput.trim().length === 42)}
                className="w-full py-3 rounded-lg font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Key className="w-4 h-4" />
                <span>{importLoading ? 'IMPORTANDO & CONECTANDO...' : 'VINCULAR & CONECTAR BILLETERA'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-gray-400 font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Claves criptográficas seguras y exportables</span>
          </div>
          <span className="text-gray-500">Neon Ghost v0.3.0 · Ethereum Mainnet</span>
        </div>
      </div>
    </div>
  );
};
