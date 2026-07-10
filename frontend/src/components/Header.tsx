import { Radio, Cpu, Settings } from 'lucide-react';
import type { NfcStatus } from '../types.js';

interface HeaderProps {
  status: NfcStatus;
  onOpenDefaultWebhooks: () => void;
}

export default function Header({ status, onOpenDefaultWebhooks }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-800 gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Radio className="w-6 h-6 animate-pulse" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400">
            LEGO Dimensions Toypad Interface
          </h1>
        </div>
        <p className="text-gray-400 max-w-2xl font-light text-sm">
          Real-time NFC tag monitoring, physical toypad status visualiser, and action simulator.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Hardware Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold glass-panel ${
            status.connected
              ? 'text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)] border-cyan-900'
              : 'text-amber-400 border-amber-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Mode: {status.mode.toUpperCase()} ({status.connected ? 'Connected' : 'Offline'})
        </div>

        {/* Default Webhooks Config Button */}
        <button
          type="button"
          onClick={onOpenDefaultWebhooks}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold glass-panel text-cyan-400 border-cyan-900 hover:bg-cyan-950/20 transition-all cursor-pointer focus:outline-none"
          title="Configure default webhook settings"
        >
          <Settings className="w-3.5 h-3.5" />
          Default Webhooks
        </button>
      </div>
    </header>
  );
}
