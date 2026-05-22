import * as LucideIcons from 'lucide-react';
import type { HistoryEvent } from '../types.js';

interface ActivityHistoryProps {
  history: HistoryEvent[];
  sseConnected: boolean;
  handleClear: () => void;
  getCharacterName: (uid: string) => string;
  formatDate: (isoString: string) => string;
  onSelectTag?: (cardId: string) => void;
}

export default function ActivityHistory({
  history,
  sseConnected,
  handleClear,
  getCharacterName,
  formatDate,
  onSelectTag,
}: ActivityHistoryProps) {
  // Dynamically resolve custom Lucide icons or fall back to an Arrow icon
  const renderHistoryIcon = (event: HistoryEvent, className: string = "w-4 h-4") => {
    const isValidCustomIcon = event.iconType === 'custom' && event.icon && (event.icon.startsWith('/') || event.icon.startsWith('data:'));
    if (isValidCustomIcon) {
      return (
        <img
          src={event.icon}
          alt={event.name || 'tag'}
          className={`${className} object-contain rounded-sm`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
          }}
        />
      );
    }

    if (event.icon && !event.icon.startsWith('/') && !event.icon.startsWith('data:')) {
      const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[event.icon] || LucideIcons.Radio;
      return <IconComponent className={className} />;
    }

    return event.type === 'arrival' ? (
      <LucideIcons.ArrowDownCircle className={className} />
    ) : (
      <LucideIcons.ArrowUpCircle className={className} />
    );
  };

  const getEventColor = (event: HistoryEvent) => {
    if (event.type === 'arrival') {
      return event.arrivalColor || '#10b981';
    }
    return event.departureColor || '#f59e0b';
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col shadow-[0_15px_30px_rgba(0,0,0,0.25)]">
      <div className="flex justify-between items-center pb-4 border-b border-gray-900">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LucideIcons.Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            Live Activity History
          </h3>
          <p className="text-xs text-gray-400 font-light mt-0.5">
            Continuous feed of arrivals and departures. Tag updates dynamically apply colors and names to past events.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Stream Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            sseConnected 
              ? 'bg-green-950/40 text-green-400 border-green-900/60 shadow-[0_0_8px_rgba(34,197,94,0.15)] animate-pulse' 
              : 'bg-rose-950/40 text-rose-400 border-rose-900/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
          }`}>
            {sseConnected ? (
              <>
                <LucideIcons.Wifi className="w-3.5 h-3.5" />
                Live Stream Active
              </>
            ) : (
              <>
                <LucideIcons.WifiOff className="w-3.5 h-3.5" />
                Disconnected (Retrying)
              </>
            )}
          </div>

          {/* SSE Latency */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/40 text-cyan-400 border border-cyan-900/60 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
            <LucideIcons.Wifi className="w-3.5 h-3.5" />
            Latency: ~1ms (SSE)
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all border border-transparent hover:border-gray-700 cursor-pointer"
            title="Clear scan history"
          >
            <LucideIcons.Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Event Stream list (Optimized horizontal spacing with grid) */}
      <div className="flex-grow overflow-y-auto max-h-[380px] py-4 mt-2 pr-1">
        {history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {history.map((event) => {
              const eventColor = getEventColor(event);
              return (
                <div
                  key={event.id}
                  onClick={() => onSelectTag?.(event.cardId)}
                  style={{
                    borderColor: `${eventColor}30`,
                    boxShadow: `0 0 10px ${eventColor}08`
                  }}
                  className={`glass-panel border rounded-xl p-3.5 flex items-start gap-3 text-xs transition-all duration-300 hover:bg-white/5 cursor-pointer hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]`}
                >
                  {/* Direction badge icon */}
                  <span
                    style={{
                      color: eventColor,
                      backgroundColor: `${eventColor}15`,
                      borderColor: `${eventColor}30`
                    }}
                    className="p-2 rounded-lg flex-shrink-0 mt-0.5 border"
                  >
                    {renderHistoryIcon(event, "w-4.5 h-4.5")}
                  </span>

                  {/* Details */}
                  <div className="min-w-0 flex-grow space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        style={{ color: eventColor }}
                        className="font-bold text-xs uppercase tracking-wide"
                      >
                        {event.type === 'arrival' ? 'Scan Arrival' : 'Scan Departure'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono flex-shrink-0 bg-gray-950 px-1.5 py-0.25 rounded">
                        {formatDate(event.scannedAt)}
                      </span>
                    </div>

                    <div className="font-bold text-white truncate text-xs flex items-center gap-1.5">
                      {event.name || getCharacterName(event.cardId)}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-mono text-gray-400 bg-gray-900 py-0.5 px-1.5 rounded truncate font-space">
                        {event.cardId}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400">
                        Pad {event.pad} ({event.pad === 1 ? 'Center' : event.pad === 2 ? 'Left' : 'Right'})
                      </span>
                    </div>

                    {event.webhookUrl && (
                      <div className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 w-full min-w-0">
                        {event.webhookStatus === 'pending' ? (
                          <>
                            <LucideIcons.Globe className="w-3 h-3 text-amber-500 animate-pulse flex-shrink-0" />
                            <span className="text-[9px] text-amber-400 truncate" title={event.webhookUrl}>
                              Calling: {event.webhookUrl}
                            </span>
                          </>
                        ) : event.webhookStatus === 'success' ? (
                          <>
                            <LucideIcons.Globe className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <span className="text-[9px] text-emerald-400 truncate" title={event.webhookUrl}>
                              Dispatched: {event.webhookUrl}
                            </span>
                          </>
                        ) : (
                          <>
                            <LucideIcons.Globe className="w-3 h-3 text-rose-500 flex-shrink-0" />
                            <span className="text-[9px] text-rose-400 truncate" title={event.webhookUrl}>
                              Failed: {event.webhookUrl}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 min-h-[160px]">
            <LucideIcons.Radio className="w-8 h-8 text-gray-700 animate-pulse mb-2" />
            <p className="text-xs text-gray-500 italic">No tag events recorded yet</p>
            <p className="text-[10px] text-gray-600 mt-1 max-w-[240px] mx-auto font-light">
              Wait for a live NFC device update, or use the Simulator above to place a tag.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
