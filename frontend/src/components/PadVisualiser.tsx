import * as LucideIcons from 'lucide-react';
import type { NfcStatus, ActiveTagInfo } from '../types.js';

interface PadVisualiserProps {
  status: NfcStatus;
  selectedPad: number;
  setSelectedPad: (pad: number) => void;
  activeTags: Record<number, ActiveTagInfo[]>;
  ledFlash: Record<number, string | null>;
  rippleActive: Record<number, 'arrival' | 'departure' | null>;
  getCharacterName: (uid: string) => string;
  onSelectTag?: (cardId: string) => void;
}

export default function PadVisualiser({
  status,
  selectedPad,
  setSelectedPad,
  activeTags,
  ledFlash,
  rippleActive,
  getCharacterName,
  onSelectTag,
}: PadVisualiserProps) {
  // Dynamically resolve custom Lucide icons or fall back to a Shield icon
  const renderTagIcon = (tag: ActiveTagInfo, className: string = "w-4 h-4") => {
    const isValidCustomIcon = tag.iconType === 'custom' && tag.icon && (tag.icon.startsWith('/') || tag.icon.startsWith('data:'));
    if (isValidCustomIcon) {
      return (
        <img
          src={tag.icon}
          alt={tag.name || 'tag'}
          className={`${className} object-contain rounded-sm`}
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
          }}
        />
      );
    }

    const iconName = tag.icon && !tag.icon.startsWith('/') && !tag.icon.startsWith('data:') ? tag.icon : 'Shield';
    // Resolve Lucide component from star import
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || LucideIcons.Shield;
    return <IconComponent className={className} />;
  };

  // Get active color for a pad zone
  const getPadColor = (padNum: number) => {
    if (ledFlash[padNum]) {
      return ledFlash[padNum]!;
    }
    const activeList = activeTags[padNum];
    if (activeList && activeList.length > 0) {
      return activeList[0].arrivalColor || (padNum === 1 ? '#22d3ee' : '#ec4899');
    }
    return null;
  };

  const getPadStyle = (padNum: number) => {
    const color = getPadColor(padNum);
    if (!color) return {};
    
    // Determine opacity/intensity based on flash vs active Tag
    const glowIntensity = ledFlash[padNum] ? '60' : '35';
    return {
      borderColor: color,
      boxShadow: `0 0 18px ${color}${glowIntensity}`,
    };
  };

  return (
    <div className="glass-panel-heavy rounded-2xl p-6 relative overflow-hidden flex-grow flex flex-col justify-between min-h-[460px] shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      {/* Futuristic grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="flex justify-between items-center z-10">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LucideIcons.Sparkles className="w-4 h-4 text-cyan-400" />
            Pad Visualiser
          </h2>
          <p className="text-xs text-gray-400 font-light">
            Real-time status of toypad's active zones. Tap tag badges to edit their profiles, hex colours, and webhooks.
          </p>
        </div>
        {status.mode === 'mock' && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
            Interactive Grid
          </span>
        )}
      </div>

      {/* Toypad Grid Layout */}
      <div className="relative py-12 flex justify-center items-center z-10 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl w-full">
          {/* PAD 2: LEFT ZONE */}
          <div
            onClick={() => {
              if (status.mode === 'mock') {
                setSelectedPad(2);
              }
            }}
            style={getPadStyle(2)}
            className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 rounded-xl border p-6 flex flex-col items-center justify-between min-h-[260px] ${
              selectedPad === 2 && status.mode === 'mock'
                ? 'border-purple-500 bg-purple-950/20'
                : 'border-gray-800 bg-gray-950/30'
            } ${
              !ledFlash[2] && activeTags[2] && activeTags[2].length > 0
                ? 'animate-pulse'
                : 'hover:border-gray-700'
            }`}
          >
            {/* Ripple effects */}
            {rippleActive[2] === 'arrival' && (
              <div className="absolute inset-0 rounded-xl ripple-green-effect border-2 border-green-500 pointer-events-none" />
            )}
            {rippleActive[2] === 'departure' && (
              <div className="absolute inset-0 rounded-xl ripple-amber-effect border-2 border-amber-500 pointer-events-none" />
            )}

            <div className="w-full flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-2"
                 style={{ color: getPadColor(2) || '#ec4899' }}>
              <span>Left Zone</span>
              <span>Pad 2</span>
            </div>

            {/* Pad indicator light */}
            <div
              style={
                getPadColor(2)
                  ? {
                      backgroundColor: `${getPadColor(2)}15`,
                      borderColor: getPadColor(2)!,
                      boxShadow: `0 0 15px ${getPadColor(2)}`,
                      color: getPadColor(2)!,
                    }
                  : {}
              }
              className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-[0_0_10px_rgba(236,72,153,0.05)] ${
                !getPadColor(2) ? 'bg-gray-900 border-gray-800 text-gray-600' : ''
              }`}
            >
              <LucideIcons.Layers className="w-5 h-5" />
            </div>

            <div className="w-full text-center space-y-2 mt-4 flex-grow flex flex-col justify-center">
              {activeTags[2] && activeTags[2].length > 0 ? (
                <div className="space-y-1.5 w-full max-h-[180px] overflow-y-auto pr-0.5 z-20">
                  {activeTags[2].map((tag) => (
                    <div
                      key={tag.cardId}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTag) onSelectTag(tag.cardId);
                      }}
                      style={{
                        borderColor: `${tag.arrivalColor || '#ec4899'}40`,
                        backgroundColor: `${tag.arrivalColor || '#ec4899'}08`
                      }}
                      className="flex flex-col items-center border hover:bg-white/5 rounded-lg p-2 transition-all cursor-pointer shadow-sm relative group"
                    >
                      <div className="flex items-center gap-1.5 max-w-full">
                        <span style={{ color: tag.arrivalColor || '#ffffff' }}>
                          {renderTagIcon(tag, "w-3.5 h-3.5")}
                        </span>
                        <span className="font-bold text-xs text-white truncate max-w-[120px]">
                          {tag.name || getCharacterName(tag.cardId)}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono tracking-wider text-gray-500 group-hover:text-gray-400 mt-0.5 truncate w-full">
                        {tag.cardId}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-light py-2">Empty Zone</div>
              )}
            </div>
          </div>

          {/* PAD 1: CENTER ZONE */}
          <div
            onClick={() => {
              if (status.mode === 'mock') {
                setSelectedPad(1);
              }
            }}
            style={getPadStyle(1)}
            className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 rounded-full border p-6 flex flex-col items-center justify-between w-[220px] h-[220px] self-center mx-auto ${
              selectedPad === 1 && status.mode === 'mock'
                ? 'border-purple-500 bg-purple-950/20 shadow-[inset_0_0_15px_rgba(168,85,247,0.15)]'
                : 'border-gray-800 bg-gray-950/30'
            } ${
              !ledFlash[1] && activeTags[1] && activeTags[1].length > 0
                ? 'animate-pulse'
                : 'hover:border-gray-700'
            }`}
          >
            {/* Ripple effects */}
            {rippleActive[1] === 'arrival' && (
              <div className="absolute inset-0 rounded-full ripple-green-effect border-2 border-green-500 pointer-events-none" />
            )}
            {rippleActive[1] === 'departure' && (
              <div className="absolute inset-0 rounded-full ripple-amber-effect border-2 border-amber-500 pointer-events-none" />
            )}

            <div className="w-full flex justify-center text-[10px] uppercase font-bold tracking-wider"
                 style={{ color: getPadColor(1) || '#22d3ee' }}>
              <span>Center Pad (Pad 1)</span>
            </div>

            {/* Circular Pad light */}
            <div
              style={
                getPadColor(1)
                  ? {
                      backgroundColor: `${getPadColor(1)}15`,
                      borderColor: getPadColor(1)!,
                      boxShadow: `0 0 20px ${getPadColor(1)}`,
                      color: getPadColor(1)!,
                    }
                  : {}
              }
              className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.08)] ${
                !getPadColor(1) ? 'bg-gray-900 border-gray-800 text-gray-600' : ''
              }`}
            >
              <LucideIcons.Radio className="w-7 h-7" />
            </div>

            <div className="w-full text-center space-y-1.5 mt-2 flex-grow flex flex-col justify-center z-20">
              {activeTags[1] && activeTags[1].length > 0 ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectTag) onSelectTag(activeTags[1][0].cardId);
                  }}
                  style={{
                    borderColor: `${activeTags[1][0].arrivalColor || '#22d3ee'}30`,
                    backgroundColor: `${activeTags[1][0].arrivalColor || '#22d3ee'}08`
                  }}
                  className="flex flex-col items-center border hover:bg-white/5 rounded-lg p-2 transition-all cursor-pointer shadow-sm relative group max-w-[150px] mx-auto w-full"
                >
                  <div className="flex items-center gap-1.5 max-w-full">
                    <span style={{ color: activeTags[1][0].arrivalColor || '#ffffff' }}>
                      {renderTagIcon(activeTags[1][0], "w-3.5 h-3.5")}
                    </span>
                    <span className="font-bold text-xs text-white truncate">
                      {activeTags[1][0].name || getCharacterName(activeTags[1][0].cardId)}
                    </span>
                  </div>
                  <div className="text-[9px] font-mono tracking-wider text-gray-500 group-hover:text-gray-400 mt-0.5 truncate bg-black/35 py-0.5 px-1.5 rounded w-full">
                    {activeTags[1][0].cardId}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-light py-2">Empty Pad</div>
              )}
            </div>
          </div>

          {/* PAD 3: RIGHT ZONE */}
          <div
            onClick={() => {
              if (status.mode === 'mock') {
                setSelectedPad(3);
              }
            }}
            style={getPadStyle(3)}
            className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 rounded-xl border p-6 flex flex-col items-center justify-between min-h-[260px] ${
              selectedPad === 3 && status.mode === 'mock'
                ? 'border-purple-500 bg-purple-950/20'
                : 'border-gray-800 bg-gray-950/30'
            } ${
              !ledFlash[3] && activeTags[3] && activeTags[3].length > 0
                ? 'animate-pulse'
                : 'hover:border-gray-700'
            }`}
          >
            {/* Ripple effects */}
            {rippleActive[3] === 'arrival' && (
              <div className="absolute inset-0 rounded-xl ripple-green-effect border-2 border-green-500 pointer-events-none" />
            )}
            {rippleActive[3] === 'departure' && (
              <div className="absolute inset-0 rounded-xl ripple-amber-effect border-2 border-amber-500 pointer-events-none" />
            )}

            <div className="w-full flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-2"
                 style={{ color: getPadColor(3) || '#ec4899' }}>
              <span>Right Zone</span>
              <span>Pad 3</span>
            </div>

            {/* Pad indicator light */}
            <div
              style={
                getPadColor(3)
                  ? {
                      backgroundColor: `${getPadColor(3)}15`,
                      borderColor: getPadColor(3)!,
                      boxShadow: `0 0 15px ${getPadColor(3)}`,
                      color: getPadColor(3)!,
                    }
                  : {}
              }
              className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-[0_0_10px_rgba(236,72,153,0.05)] ${
                !getPadColor(3) ? 'bg-gray-900 border-gray-800 text-gray-600' : ''
              }`}
            >
              <LucideIcons.Layers className="w-5 h-5" />
            </div>

            <div className="w-full text-center space-y-2 mt-4 flex-grow flex flex-col justify-center">
              {activeTags[3] && activeTags[3].length > 0 ? (
                <div className="space-y-1.5 w-full max-h-[180px] overflow-y-auto pr-0.5 z-20">
                  {activeTags[3].map((tag) => (
                    <div
                      key={tag.cardId}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTag) onSelectTag(tag.cardId);
                      }}
                      style={{
                        borderColor: `${tag.arrivalColor || '#ec4899'}40`,
                        backgroundColor: `${tag.arrivalColor || '#ec4899'}08`
                      }}
                      className="flex flex-col items-center border hover:bg-white/5 rounded-lg p-2 transition-all cursor-pointer shadow-sm relative group"
                    >
                      <div className="flex items-center gap-1.5 max-w-full">
                        <span style={{ color: tag.arrivalColor || '#ffffff' }}>
                          {renderTagIcon(tag, "w-3.5 h-3.5")}
                        </span>
                        <span className="font-bold text-xs text-white truncate max-w-[120px]">
                          {tag.name || getCharacterName(tag.cardId)}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono tracking-wider text-gray-500 group-hover:text-gray-400 mt-0.5 truncate w-full">
                        {tag.cardId}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-light py-2">Empty Zone</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="border-t border-gray-900/60 pt-4 mt-4 flex flex-col sm:flex-row justify-between text-xs text-gray-500 gap-2 z-10">
        <div>
          Device Hardware:{' '}
          <span className="font-semibold text-gray-400">
            {status.connected ? 'Online' : 'Offline'}
          </span>
        </div>
        {status.vendorId && status.productId && (
          <div>
            VID/PID:{' '}
            <span className="font-mono text-gray-400 bg-gray-950 px-1.5 py-0.5 rounded">
              {status.vendorId}:{status.productId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
