import { Radio, Plus, Trash2, Wifi } from 'lucide-react';
import type { NfcStatus } from '../types.js';
import { CHARACTER_PRESETS } from '../constants.js';

interface TagSimulatorProps {
  status: NfcStatus;
  selectedPad: number;
  setSelectedPad: (pad: number) => void;
  customCardId: string;
  setCustomCardId: (id: string) => void;
  loading: boolean;
  handleMockScan: (cardId: string, padNum: number, dir: 'arrival' | 'departure') => void;
}

export default function TagSimulator({
  status,
  selectedPad,
  setSelectedPad,
  customCardId,
  setCustomCardId,
  loading,
  handleMockScan,
}: TagSimulatorProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6 shadow-[0_15px_30px_rgba(0,0,0,0.25)]">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-purple-400" />
          NFC Tag Simulator
        </h3>
        <p className="text-xs text-gray-400 font-light mt-0.5">
          {status.mode === 'mock'
            ? 'Use presets or custom codes to mock tag events on the visualiser.'
            : 'Simulator disabled: running in production physical USB mode.'}
        </p>
      </div>

      {status.mode === 'mock' ? (
        <div className="space-y-4">
          {/* Select Pad Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Target Pad Zone
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((padNum) => (
                <button
                  key={padNum}
                  type="button"
                  onClick={() => setSelectedPad(padNum)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedPad === padNum
                      ? 'bg-purple-950 border-purple-500 text-purple-200'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  Pad {padNum} ({padNum === 1 ? 'Center' : padNum === 2 ? 'Left' : 'Right'})
                </button>
              ))}
            </div>
          </div>

          {/* Preset Characters Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Character Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHARACTER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setCustomCardId(preset.id);
                  }}
                  className={`py-1 px-2 text-[10px] font-semibold rounded-md border text-left truncate transition-all cursor-pointer ${
                    customCardId.toUpperCase() === preset.id.toUpperCase()
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="font-bold truncate">{preset.name}</div>
                  <div className="text-[9px] text-gray-500 font-mono font-light truncate">
                    {preset.type}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Entry */}
          <div className="space-y-2">
            <label
              htmlFor="card-id-input"
              className="block text-xs font-bold uppercase tracking-wider text-gray-400"
            >
              Card ID (7-Byte Hex or string)
            </label>
            <div className="flex gap-2">
              <input
                id="card-id-input"
                type="text"
                placeholder="e.g. 041285A2E23E80"
                value={customCardId}
                onChange={(e) => setCustomCardId(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 flex-grow text-white uppercase placeholder-gray-600"
              />
            </div>
          </div>

          {/* Trigger buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              disabled={loading || !customCardId}
              onClick={() => handleMockScan(customCardId, selectedPad, 'arrival')}
              className="bg-emerald-900/40 hover:bg-emerald-800/60 disabled:bg-gray-950 disabled:text-gray-600 text-emerald-200 border border-emerald-700/80 hover:border-emerald-500 rounded-xl py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.05)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Place Tag (Arrival)
            </button>
            <button
              type="button"
              disabled={loading || !customCardId}
              onClick={() => handleMockScan(customCardId, selectedPad, 'departure')}
              className="bg-amber-950/40 hover:bg-amber-900/60 disabled:bg-gray-950 disabled:text-gray-600 text-amber-200 border border-amber-800/80 hover:border-amber-600 rounded-xl py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(245,158,11,0.05)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Remove Tag (Depart)
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-950/30 border border-gray-900 rounded-xl p-4 text-center">
          <Wifi className="w-8 h-8 text-cyan-500 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-cyan-300 font-medium">Physical Toypad Active</p>
          <p className="text-[10px] text-gray-500 mt-1 font-light">
            The Express server is claimed by the physical Toypad USB hardware endpoints. Place real
            LEGO figures or NFC cards on your Toypad to trigger actions.
          </p>
        </div>
      )}
    </div>
  );
}
