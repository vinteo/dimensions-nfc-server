import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

interface DefaultWebhooksModalProps {
  isOpen: boolean;
  onClose: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

type WebhookEntry = {
  arrival: string;
  arrivalPayload?: string;
  departure: string;
  departurePayload?: string;
};

type DefaultWebhooksState = Record<number, WebhookEntry>;

export default function DefaultWebhooksModal({
  isOpen,
  onClose,
  showSuccess,
  showError,
}: DefaultWebhooksModalProps) {
  const [activePadTab, setActivePadTab] = useState<number>(1);
  const [webhooks, setWebhooks] = useState<DefaultWebhooksState>({
    1: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
    2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
    3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Load defaults from server when modal is opened
  useEffect(() => {
    if (!isOpen) return;

    const fetchDefaults = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/nfc/default-webhooks');
        if (!response.ok) {
          throw new Error('Failed to fetch default webhook settings');
        }
        const data = await response.json();
        setWebhooks(data);
      } catch (err: unknown) {
        showError(err instanceof Error ? err.message : 'Failed to load default settings');
      } finally {
        setLoading(false);
      }
    };

    fetchDefaults();
  }, [isOpen, showError]);

  const updateWebhookUrl = (padNum: number, eventType: 'arrival' | 'departure', val: string) => {
    setWebhooks((prev) => ({
      ...prev,
      [padNum]: {
        ...prev[padNum],
        [eventType]: val,
      },
    }));
  };

  const updateWebhookPayload = (padNum: number, eventType: 'arrival' | 'departure', val: string) => {
    setWebhooks((prev) => ({
      ...prev,
      [padNum]: {
        ...prev[padNum],
        [`${eventType}Payload`]: val,
      },
    }));
  };

  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const response = await fetch('/api/nfc/default-webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhooks),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to update default webhooks');
      }

      showSuccess('Default webhook settings updated successfully!');
      onClose();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to save default webhooks');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="glass-panel-heavy rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Glow highlight */}
        <div className="absolute top-0 right-0 w-48 h-48 blur-3xl rounded-full opacity-10 pointer-events-none transition-all duration-500 bg-cyan-500" />

        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-800/80 shrink-0">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <LucideIcons.Settings2 className="w-5 h-5 text-cyan-400" />
              Default Webhook Settings
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Configure fallback webhooks executed when tags do not have specific settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800/60 transition-all cursor-pointer focus:outline-none"
            title="Close"
          >
            <LucideIcons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <LucideIcons.Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-gray-400">Loading default webhooks...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveDefaults} className="space-y-6 flex flex-col h-full">
              <div className="space-y-4">
                {/* Pad Tabs */}
                <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-900">
                  {([1, 2, 3] as const).map((padNum) => (
                    <button
                      key={padNum}
                      type="button"
                      onClick={() => setActivePadTab(padNum)}
                      className={`flex-grow py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${
                        activePadTab === padNum
                          ? 'bg-gray-800 text-white font-black shadow-sm'
                          : 'text-gray-550 hover:text-gray-300'
                      }`}
                    >
                      Pad {padNum} ({padNum === 1 ? 'Center' : padNum === 2 ? 'Left' : 'Right'})
                    </button>
                  ))}
                </div>

                {/* Pad Settings Card */}
                <div className="space-y-4 bg-gray-950/15 border border-gray-900/60 p-5 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-cyan-400" />
                  
                  <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-2">
                    Pad {activePadTab} Fallback Settings
                  </div>

                  {/* Arrival Webhook */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Arrival POST URL
                    </label>
                    <input
                      type="url"
                      value={webhooks[activePadTab]?.arrival || ''}
                      onChange={(e) => updateWebhookUrl(activePadTab, 'arrival', e.target.value)}
                      placeholder="e.g. https://api.myweb.com/pad-arrival"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-2 pl-3 border-l border-gray-900">
                    <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                      Arrival POST Payload
                    </label>
                    <input
                      type="text"
                      value={webhooks[activePadTab]?.arrivalPayload || ''}
                      onChange={(e) => updateWebhookPayload(activePadTab, 'arrival', e.target.value)}
                      placeholder="Custom value sent in 'payload' field..."
                      className="w-full bg-gray-950/60 border border-gray-900 rounded-lg py-1.5 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>

                  {/* Departure Webhook */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Departure POST URL
                    </label>
                    <input
                      type="url"
                      value={webhooks[activePadTab]?.departure || ''}
                      onChange={(e) => updateWebhookUrl(activePadTab, 'departure', e.target.value)}
                      placeholder="e.g. https://api.myweb.com/pad-departure"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-2 pl-3 border-l border-gray-900">
                    <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                      Departure POST Payload
                    </label>
                    <input
                      type="text"
                      value={webhooks[activePadTab]?.departurePayload || ''}
                      onChange={(e) => updateWebhookPayload(activePadTab, 'departure', e.target.value)}
                      placeholder="Custom value sent in 'payload' field..."
                      className="w-full bg-gray-950/60 border border-gray-900 rounded-lg py-1.5 px-3 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>

                  <p className="text-[10px] text-gray-550 leading-relaxed mt-4">
                    Webhooks are executed as non-blocking background POST requests containing a JSON payload with properties: <code>tagId</code>, <code>name</code>, <code>padNumber</code>, and <code>type</code> ('arrival' | 'departure').
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800/80 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-950/40 hover:shadow-cyan-950/60 transition-all flex items-center gap-2 cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveLoading ? (
                    <>
                      <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Defaults...
                    </>
                  ) : (
                    <>
                      <LucideIcons.Save className="w-3.5 h-3.5" />
                      Save Defaults
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
