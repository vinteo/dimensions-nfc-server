import { Sparkles, Trash2 } from 'lucide-react';
import { COLOR_PRESETS } from '../constants.js';

interface LightSimulatorProps {
  lightPad: number | 'all';
  setLightPad: (pad: number | 'all') => void;
  lightColor: string;
  setLightColor: (color: string) => void;
  enableFlashing: boolean;
  setEnableFlashing: (val: boolean) => void;
  flashCount: number;
  setFlashCount: (count: number) => void;
  flashDuration: number;
  setFlashDuration: (dur: number) => void;
  handleApplyLight: () => void;
  handleTurnOffLight: () => void;
}

export default function LightSimulator({
  lightPad,
  setLightPad,
  lightColor,
  setLightColor,
  enableFlashing,
  setEnableFlashing,
  flashCount,
  setFlashCount,
  flashDuration,
  setFlashDuration,
  handleApplyLight,
  handleTurnOffLight,
}: LightSimulatorProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col shadow-[0_15px_30px_rgba(0,0,0,0.25)] space-y-4">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Pad Light Simulator
        </h3>
        <p className="text-xs text-gray-400 font-light mt-0.5">
          Select colors and configure flashing intervals to simulate portal lighting.
        </p>
      </div>

      {/* Pad selector */}
      <div className="space-y-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Target Zone
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Pad 1', value: 1 },
            { label: 'Pad 2', value: 2 },
            { label: 'Pad 3', value: 3 },
            { label: 'All Pads', value: 'all' },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setLightPad(p.value as number | 'all')}
              className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all text-center cursor-pointer ${
                lightPad === p.value
                  ? 'bg-purple-950 border-purple-500 text-purple-200'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color Wheel Selector */}
      <div className="space-y-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Select Color
        </label>
        <div className="flex items-center gap-3 bg-gray-950/45 p-2.5 rounded-xl border border-gray-900">
          {/* Custom color input with native wheel picker */}
          <div className="relative w-10 h-10 rounded-full border border-gray-800 overflow-hidden flex-shrink-0 cursor-pointer shadow-md group">
            <input
              type="color"
              value={lightColor}
              onChange={(e) => setLightColor(e.target.value)}
              className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer bg-transparent scale-150 transform origin-center"
              title="Choose custom color from wheel"
            />
            <div 
              className="absolute inset-0 pointer-events-none transition-all duration-300"
              style={{ backgroundColor: lightColor }}
            />
          </div>
          <div className="flex-grow">
            <div className="text-xs font-semibold text-white">Custom Color Wheel</div>
            <div className="text-[10px] font-mono text-gray-500 uppercase">{lightColor}</div>
          </div>
        </div>
      </div>

      {/* Preset Swatches */}
      <div className="space-y-2">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Preset Swatches
        </label>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setLightColor(preset.value)}
              className={`w-full aspect-square rounded-full border transition-all relative group flex items-center justify-center cursor-pointer ${
                lightColor.toLowerCase() === preset.value.toLowerCase()
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ 
                backgroundColor: preset.value,
                boxShadow: lightColor.toLowerCase() === preset.value.toLowerCase() ? `0 0 10px ${preset.value}` : 'none'
              }}
              title={preset.name}
            >
              {lightColor.toLowerCase() === preset.value.toLowerCase() && (
                <span className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Flashing Toggle */}
      <div className="flex items-center justify-between bg-gray-950/20 px-3 py-2 rounded-xl border border-gray-900/60">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-white">Enable Flashing</span>
          <span className="text-[10px] text-gray-500">Cycle LEDs dynamically</span>
        </div>
        <button
          type="button"
          onClick={() => setEnableFlashing(!enableFlashing)}
          className={`w-10 h-6 rounded-full transition-all duration-300 relative border cursor-pointer ${
            enableFlashing
              ? 'bg-purple-950 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
              : 'bg-gray-900 border-gray-800'
          }`}
        >
          <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full transition-all duration-300 ${
            enableFlashing ? 'right-0.5 bg-purple-400' : 'left-0.5 bg-gray-600'
          }`} />
        </button>
      </div>

      {/* Flashing inputs */}
      {enableFlashing && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-950/30 rounded-xl border border-gray-900 animate-fade-in">
          <div className="space-y-1">
            <label htmlFor="flash-count" className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">
              Flash Count
            </label>
            <input
              id="flash-count"
              type="number"
              min="1"
              max="10"
              value={flashCount}
              onChange={(e) => setFlashCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-center"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="flash-dur" className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">
              Duration (ms)
            </label>
            <input
              id="flash-dur"
              type="number"
              min="100"
              max="2000"
              step="50"
              value={flashDuration}
              onChange={(e) => setFlashDuration(Math.max(100, Math.min(2000, parseInt(e.target.value) || 100)))}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-center"
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleApplyLight}
          className="bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-700/80 hover:border-purple-500 rounded-xl py-2 px-4 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(168,85,247,0.05)] cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Apply Light
        </button>
        <button
          type="button"
          onClick={handleTurnOffLight}
          className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 rounded-xl py-2 px-4 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Turn Off
        </button>
      </div>
    </div>
  );
}
