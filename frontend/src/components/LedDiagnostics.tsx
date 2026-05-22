import { Lightbulb } from 'lucide-react';

interface LedDiagnosticsProps {
  ledFlash: Record<number, string | null>;
  getColorName: (hex: string | null) => string;
}

export default function LedDiagnostics({ ledFlash, getColorName }: LedDiagnosticsProps) {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <h3 className="text-base font-bold text-white tracking-wider flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-cyan-400" />
        Pad Light Visualiser
      </h3>
      <p className="text-xs text-gray-400 font-light">
        Flashing LEDs indicate hardware events in real-time. Arrivals trigger green, departures
        trigger yellow flashes. Wake/wake-up triggers Cyan flashing sequence.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1.5">
        <div className="glass-panel bg-gray-950/40 rounded-xl p-3 flex flex-col justify-between gap-1.5">
          <span className="text-[10px] font-semibold text-gray-500 uppercase">Center color</span>
          <div className="flex items-center gap-2">
            <span
              style={
                ledFlash[1]
                  ? {
                      backgroundColor: ledFlash[1],
                      boxShadow: `0 0 10px ${ledFlash[1]}`,
                    }
                  : {}
              }
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                ledFlash[1] ? 'animate-pulse' : 'bg-gray-800'
              }`}
            />
            <span className="text-xs font-semibold text-gray-300">
              {ledFlash[1] ? (
                <span
                  className="font-mono uppercase text-[10px] bg-gray-950 px-1.5 py-0.5 rounded border border-gray-900"
                  style={{ color: ledFlash[1] }}
                >
                  {getColorName(ledFlash[1])}
                </span>
              ) : (
                'OFF'
              )}
            </span>
          </div>
        </div>

        <div className="glass-panel bg-gray-950/40 rounded-xl p-3 flex flex-col justify-between gap-1.5">
          <span className="text-[10px] font-semibold text-gray-500 uppercase">Left color</span>
          <div className="flex items-center gap-2">
            <span
              style={
                ledFlash[2]
                  ? {
                      backgroundColor: ledFlash[2],
                      boxShadow: `0 0 10px ${ledFlash[2]}`,
                    }
                  : {}
              }
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                ledFlash[2] ? 'animate-pulse' : 'bg-gray-800'
              }`}
            />
            <span className="text-xs font-semibold text-gray-300">
              {ledFlash[2] ? (
                <span
                  className="font-mono uppercase text-[10px] bg-gray-950 px-1.5 py-0.5 rounded border border-gray-900"
                  style={{ color: ledFlash[2] }}
                >
                  {getColorName(ledFlash[2])}
                </span>
              ) : (
                'OFF'
              )}
            </span>
          </div>
        </div>

        <div className="glass-panel bg-gray-950/40 rounded-xl p-3 flex flex-col justify-between gap-1.5">
          <span className="text-[10px] font-semibold text-gray-500 uppercase">Right color</span>
          <div className="flex items-center gap-2">
            <span
              style={
                ledFlash[3]
                  ? {
                      backgroundColor: ledFlash[3],
                      boxShadow: `0 0 10px ${ledFlash[3]}`,
                    }
                  : {}
              }
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                ledFlash[3] ? 'animate-pulse' : 'bg-gray-800'
              }`}
            />
            <span className="text-xs font-semibold text-gray-300">
              {ledFlash[3] ? (
                <span
                  className="font-mono uppercase text-[10px] bg-gray-950 px-1.5 py-0.5 rounded border border-gray-900"
                  style={{ color: ledFlash[3] }}
                >
                  {getColorName(ledFlash[3])}
                </span>
              ) : (
                'OFF'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
