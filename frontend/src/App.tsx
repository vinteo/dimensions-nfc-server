import { useState, useEffect, useRef, useCallback } from 'react';
import type { NfcStatus, ActiveTagInfo, HistoryEvent } from './types.ts';
import { CHARACTER_PRESETS, COLOR_PRESETS } from './constants.ts';

// Import modular subcomponents
import Header from './components/Header.tsx';
import Notifications from './components/Notifications.tsx';
import PadVisualiser from './components/PadVisualiser.tsx';
import LedDiagnostics from './components/LedDiagnostics.tsx';
import TagSimulator from './components/TagSimulator.tsx';
import LightSimulator from './components/LightSimulator.tsx';
import ActivityHistory from './components/ActivityHistory.tsx';
import TagCustomiser from './components/TagCustomiser.tsx';

function App() {
  // Application State
  const [status, setStatus] = useState<NfcStatus>({ connected: false, mode: 'mock' });
  const [activeTags, setActiveTags] = useState<Record<number, ActiveTagInfo[]>>({
    1: [],
    2: [],
    3: [],
  });
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isCustomiserOpen, setIsCustomiserOpen] = useState(false);

  // Automatically open customiser modal when a tag is selected
  useEffect(() => {
    if (selectedTagId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCustomiserOpen(true);
    }
  }, [selectedTagId]);

  // Pad UI Animation Effects State
  const [rippleActive, setRippleActive] = useState<Record<number, 'arrival' | 'departure' | null>>({
    1: null,
    2: null,
    3: null,
  });

  // LED Flash state mirroring transient physical LED activities (hex color string or null)
  const [ledFlash, setLedFlash] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
  });

  // Mock Form State
  const [customCardId, setCustomCardId] = useState('');
  const [selectedPad, setSelectedPad] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Simulated Lights State
  const [lightPads, setLightPads] = useState<number[]>([1]);
  const [lightColor, setLightColor] = useState('#a855f7'); // default Purple
  const [enableFlashing, setEnableFlashing] = useState(false);
  const [flashCount, setFlashCount] = useState(3);
  const [flashDuration, setFlashDuration] = useState(300);

  // References to clear active timers (typed safely without any)
  const activeFlashTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>[]>>({
    1: [],
    2: [],
    3: [],
  });

  // SSE Reference
  const eventSourceRef = useRef<EventSource | null>(null);

  // Set message helpers with auto-clear timers
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  const getColorName = (hex: string | null) => {
    if (!hex) return 'OFF';
    const match = COLOR_PRESETS.find((c) => c.value.toLowerCase() === hex.toLowerCase());
    return match ? match.name : hex.toUpperCase();
  };

  const clearActiveFlashTimers = (padNum: number) => {
    if (activeFlashTimersRef.current[padNum]) {
      activeFlashTimersRef.current[padNum].forEach((timer) => clearTimeout(timer));
      activeFlashTimersRef.current[padNum] = [];
    }
  };

  // Clear timers on component unmount
  useEffect(() => {
    const currentTimers = activeFlashTimersRef.current;
    return () => {
      [1, 2, 3].forEach((padNum) => {
        if (currentTimers[padNum]) {
          currentTimers[padNum].forEach((timer) => clearTimeout(timer));
        }
      });
    };
  }, []);

  const setPhysicalLight = async (pad: number | 'all', color: string | null) => {
    try {
      await fetch('/api/nfc/light', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pad, color: color || '#000000' }),
      });
    } catch (err) {
      console.error('Failed to set physical light:', err);
    }
  };

  const handleApplyLight = () => {
    lightPads.forEach((padNum) => {
      clearActiveFlashTimers(padNum);

      if (!enableFlashing) {
        setLedFlash((prev) => ({ ...prev, [padNum]: lightColor }));
        setPhysicalLight(padNum, lightColor);
      } else {
        const timers: ReturnType<typeof setTimeout>[] = [];

        for (let i = 0; i < flashCount; i++) {
          // Turn ON
          const onTimer = setTimeout(
            () => {
              setLedFlash((prev) => ({ ...prev, [padNum]: lightColor }));
              setPhysicalLight(padNum, lightColor);
            },
            i * 2 * flashDuration,
          );
          timers.push(onTimer);

          // Turn OFF
          const offTimer = setTimeout(
            () => {
              setLedFlash((prev) => ({ ...prev, [padNum]: null }));
              setPhysicalLight(padNum, null);
            },
            (i * 2 + 1) * flashDuration,
          );
          timers.push(offTimer);
        }

        activeFlashTimersRef.current[padNum] = timers;
      }
    });
  };

  const handleTurnOffLight = () => {
    lightPads.forEach((padNum) => {
      clearActiveFlashTimers(padNum);
      setLedFlash((prev) => ({ ...prev, [padNum]: null }));
      setPhysicalLight(padNum, null);
    });
  };

  const triggerWakeFlash = async () => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let i = 0; i < 3; i++) {
      setLedFlash({ 1: '#06b6d4', 2: '#06b6d4', 3: '#06b6d4' });
      await sleep(300);
      setLedFlash({ 1: null, 2: null, 3: null });
      if (i < 2) {
        await sleep(300);
      }
    }
  };

  const triggerRipple = (padNum: number, type: 'arrival' | 'departure', customColor?: string) => {
    setRippleActive((prev) => ({ ...prev, [padNum]: type }));
    const defaultColor = type === 'arrival' ? '#10b981' : '#f59e0b';
    setLedFlash((prev) => ({ ...prev, [padNum]: customColor || defaultColor }));
    setTimeout(() => {
      setRippleActive((prev) => ({ ...prev, [padNum]: null }));
      setLedFlash((prev) => ({ ...prev, [padNum]: null }));
    }, 850);
  };

  // Setup Server-Sent Events stream
  useEffect(() => {
    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log('Establishing Server-Sent Events connection...');
      const es = new EventSource('/api/nfc/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('SSE connection successfully opened');
        setSseConnected(true);
        triggerWakeFlash();
      };

      es.onerror = (e) => {
        console.error('SSE connection encountered an error', e);
        setSseConnected(false);
        // Retry connection after 5 seconds
        setTimeout(connectSSE, 5000);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE message received:', data);

          if (data.type === 'init') {
            setStatus(data.status);
            setActiveTags(data.activeTags);
            setHistory(data.history);
          } else if (data.type === 'scan') {
            const scanEv = data.event;
            setHistory((prev) => [scanEv, ...prev].slice(0, 50));
            setActiveTags(data.activeTags);
            if (data.status) setStatus(data.status);

            // Trigger ripple animation
            triggerRipple(scanEv.pad, 'arrival', scanEv.arrivalColor);
          } else if (data.type === 'remove') {
            const removeEv = data.event;
            setHistory((prev) => [removeEv, ...prev].slice(0, 50));
            setActiveTags(data.activeTags);
            if (data.status) setStatus(data.status);

            // Trigger ripple animation
            triggerRipple(removeEv.pad, 'departure', removeEv.departureColor);
          } else if (data.type === 'status') {
            setStatus(data.status);
            if (data.activeTags) {
              setActiveTags(data.activeTags);
            }
          } else if (data.type === 'webhook-update') {
            setHistory((prev) =>
              prev.map((item) =>
                item.id === data.eventId
                  ? { ...item, webhookStatus: data.status }
                  : item,
              ),
            );
          } else if (data.type === 'clear') {
            setActiveTags(data.activeTags);
            setHistory(data.history);
            showSuccess('History and active tags cleared on server');
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Direct REST API calls
  const handleMockScan = async (cardId: string, padNum: number, dir: 'arrival' | 'departure') => {
    if (!cardId.trim()) {
      showError('Please enter or select a valid Card ID');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/nfc/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: cardId.toUpperCase().trim(),
          pad: padNum,
          direction: dir === 'arrival' ? 1 : 0,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to trigger simulated scan');
      }
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'API Communication failure');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      const response = await fetch('/api/nfc/clear', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to reset server state');
      }
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to clear');
    }
  };

  const getCharacterName = useCallback((uid: string) => {
    const character = CHARACTER_PRESETS.find((c) => c.id.toUpperCase() === uid.toUpperCase());
    return character ? character.name : 'Unknown Toy';
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '00:00:00';
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(20,30,55,0.6),rgba(0,0,0,0))] text-gray-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <Header status={status} />

        {/* Global Notifications */}
        <Notifications errorMsg={errorMsg} successMsg={successMsg} />

        {/* Main Grid Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT PANEL: Live Toypad Visualiser */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <PadVisualiser
              status={status}
              selectedPad={selectedPad}
              setSelectedPad={setSelectedPad}
              activeTags={activeTags}
              ledFlash={ledFlash}
              rippleActive={rippleActive}
              getCharacterName={getCharacterName}
              onSelectTag={setSelectedTagId}
              onOpenCustomiser={() => setIsCustomiserOpen(true)}
            />

            <LedDiagnostics ledFlash={ledFlash} getColorName={getColorName} />
          </div>

          {/* RIGHT PANEL: Controls & Present Docked Tags */}
          <div className="flex flex-col gap-6">
            <TagSimulator
              status={status}
              selectedPad={selectedPad}
              setSelectedPad={setSelectedPad}
              customCardId={customCardId}
              setCustomCardId={setCustomCardId}
              loading={loading}
              handleMockScan={handleMockScan}
            />

            <LightSimulator
              lightPads={lightPads}
              setLightPads={setLightPads}
              lightColor={lightColor}
              setLightColor={setLightColor}
              enableFlashing={enableFlashing}
              setEnableFlashing={setEnableFlashing}
              flashCount={flashCount}
              setFlashCount={setFlashCount}
              flashDuration={flashDuration}
              setFlashDuration={setFlashDuration}
              handleApplyLight={handleApplyLight}
              handleTurnOffLight={handleTurnOffLight}
            />


          </div>
        </div>

        {/* BOTTOM PANEL: Live Activity History (Full Width) */}
        <ActivityHistory
          history={history}
          sseConnected={sseConnected}
          handleClear={handleClear}
          getCharacterName={getCharacterName}
          formatDate={formatDate}
          onSelectTag={setSelectedTagId}
        />
      </div>

      {/* Modal Tag Customiser */}
      <TagCustomiser
        isOpen={isCustomiserOpen}
        onClose={() => {
          setIsCustomiserOpen(false);
          setSelectedTagId(null);
        }}
        activeTags={activeTags}
        history={history}
        selectedTagId={selectedTagId}
        setSelectedTagId={setSelectedTagId}
        getCharacterName={getCharacterName}
        showSuccess={showSuccess}
        showError={showError}
      />
    </div>
  );
}

export default App;
