import React, { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import type { TagSettings, ActiveTagInfo, HistoryEvent } from '../types.js';
import { COLOR_PRESETS } from '../constants.js';

interface TagCustomiserProps {
  isOpen: boolean;
  onClose: () => void;
  activeTags: Record<number, ActiveTagInfo[]>;
  history: HistoryEvent[];
  selectedTagId: string | null;
  setSelectedTagId: React.Dispatch<React.SetStateAction<string | null>>;
  getCharacterName: (uid: string) => string;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

const LUCIDE_ICON_OPTIONS = [
  'Shield',
  'Gamepad2',
  'Sword',
  'Cpu',
  'Sparkles',
  'Ghost',
  'Crown',
  'Target',
  'Flame',
  'Trophy',
  'Key',
  'Heart',
  'Wrench',
  'BookOpen',
  'Compass',
  'Skull',
  'Gem',
  'Star',
];

export default function TagCustomiser({
  isOpen,
  onClose,
  activeTags,
  history,
  selectedTagId,
  setSelectedTagId,
  getCharacterName,
  showSuccess,
  showError,
}: TagCustomiserProps) {
  // Dropdown list options
  const [tagOptions, setTagOptions] = useState<{ id: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'webhooks'>('profile');
  const [webhookPadTab, setWebhookPadTab] = useState<number>(1);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [name, setName] = useState('');
  const [arrivalColor, setArrivalColor] = useState('#10b981');
  const [departureColor, setDepartureColor] = useState('#f59e0b');
  const [icon, setIcon] = useState('Shield');
  const [iconType, setIconType] = useState<'lucide' | 'custom'>('lucide');
  const [webhooks, setWebhooks] = useState<Record<number, { arrival: string; arrivalPayload?: string; departure: string; departurePayload?: string }>>({
    1: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
    2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
    3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
  });

  // Load all unique tag IDs from database, active tags, and history
  const refreshTagList = React.useCallback(async () => {
    try {
      const response = await fetch('/api/nfc/tags');
      const dbTags: Record<string, TagSettings> = response.ok ? await response.json() : {};

      // Collect all unique IDs
      const uniqueIds = new Set<string>();
      
      // 1. Add database keys
      Object.keys(dbTags).forEach((id) => uniqueIds.add(id.toUpperCase()));

      // 2. Add active tags
      Object.values(activeTags).flatMap((tags) => tags).forEach((tag) => uniqueIds.add(tag.cardId.toUpperCase()));

      // 3. Add history tags
      history.forEach((event) => uniqueIds.add(event.cardId.toUpperCase()));

      // Resolve a name for each ID
      const resolvedOptions = Array.from(uniqueIds).map((id) => {
        const dbName = dbTags[id]?.name;
        const fallbackName = getCharacterName(id);
        const displayName = dbName || (fallbackName !== id ? fallbackName : `Tag ${id.substring(0, 6)}...`);
        return {
          id,
          name: `${displayName} (${id})`,
        };
      });

      setTimeout(() => {
        setTagOptions(resolvedOptions);
      }, 0);
      return resolvedOptions;
    } catch (err) {
      console.error('Failed to load tag settings list:', err);
      return [];
    }
  }, [activeTags, history, getCharacterName]);

  // Trigger loading list on mount/activeTags/history updates
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    refreshTagList().then((resolvedOptions) => {
      if (!active) return;
      if (resolvedOptions && resolvedOptions.length > 0) {
        setTimeout(() => {
          if (!active) return;
          setSelectedTagId((currentId) => {
            if (!currentId) {
              return resolvedOptions[0].id;
            }
            return currentId;
          });
        }, 0);
      }
    });
    return () => {
      active = false;
    };
  }, [isOpen, refreshTagList, setSelectedTagId]);


  // Load settings whenever selectedCardId changes
  useEffect(() => {
    if (!selectedTagId) return;

    let active = true;

    const fetchTagSettings = async () => {
      try {
        const response = await fetch(`/api/nfc/tags/${selectedTagId}`);
        if (!response.ok) throw new Error('Failed to fetch settings');
        const settings: TagSettings = await response.json();

        if (!active) return;

        setName(settings.name);
        setArrivalColor(settings.arrivalColor);
        setDepartureColor(settings.departureColor);
        setIcon(settings.icon);
        setIconType(settings.iconType);
        setWebhooks(settings.webhooks || {
          1: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
          2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
          3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
        });
      } catch (err: unknown) {
        if (!active) return;
        console.error('Error fetching settings for tag:', err);
        // Reset to defaults
        setName(getCharacterName(selectedTagId) || selectedTagId);
        setArrivalColor('#10b981');
        setDepartureColor('#f59e0b');
        setIcon('Shield');
        setIconType('lucide');
        setWebhooks({
          1: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
          2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
          3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
        });
      }
    };

    fetchTagSettings();

    return () => {
      active = false;
    };
  }, [selectedTagId, getCharacterName]);

  // Save Settings to Backend
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTagId) return;

    setSaveLoading(true);
    try {
      const response = await fetch(`/api/nfc/tags/${selectedTagId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || selectedTagId,
          arrivalColor,
          departureColor,
          icon,
          iconType,
          webhooks,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to update settings');
      }

      showSuccess(`Settings saved for ${name || selectedTagId}!`);
      refreshTagList();
      onClose(); // Close the modal upon saving
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  // Custom Icon File Upload Handler
  const uploadIconFile = async (file: File) => {
    if (!selectedTagId) return;
    if (file.type !== 'image/png') {
      showError('Unsupported format. Please upload a transparent PNG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Image = reader.result as string;
      setUploadLoading(true);
      try {
        const response = await fetch(`/api/nfc/tags/${selectedTagId}/icon-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image }),
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || 'Image upload failed');
        }

        setIcon(resData.iconUrl);
        setIconType('custom');
        showSuccess('Custom PNG icon applied and saved!');
        refreshTagList();
      } catch (err: unknown) {
        showError(err instanceof Error ? err.message : 'Failed to upload icon');
      } finally {
        setUploadLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadIconFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadIconFile(e.target.files[0]);
    }
  };

  // Render Preview Icon
  const renderPreview = () => {
    if (iconType === 'custom') {
      const isValidCustomIcon = icon && (icon.startsWith('/') || icon.startsWith('data:'));
      if (isValidCustomIcon) {
        return (
          <div className="relative w-12 h-12 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center p-1">
            <img
              src={icon}
              alt="preview"
              className="w-10 h-10 object-contain rounded"
              onError={(e) => {
                // If it fails to load, replace it with a beautiful SVG representation of an image placeholder
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
              }}
            />
            <button
              type="button"
              onClick={() => {
                setIcon('Shield');
                setIconType('lucide');
              }}
              className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] hover:bg-rose-500 shadow"
              title="Reset to Lucide Icon"
            >
              ×
            </button>
          </div>
        );
      } else {
        return (
          <div className="w-12 h-12 bg-gray-900 border border-gray-800 text-gray-500 rounded-lg flex items-center justify-center" title="No custom PNG icon uploaded yet">
            <LucideIcons.Image className="w-6 h-6 animate-pulse" />
          </div>
        );
      }
    }

    const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon] || LucideIcons.HelpCircle;
    return (
      <div className="w-12 h-12 bg-gray-900 border border-gray-800 text-cyan-400 rounded-lg flex items-center justify-center">
        <IconComp className="w-6 h-6" />
      </div>
    );
  };

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
    const key = eventType === 'arrival' ? 'arrivalPayload' : 'departurePayload';
    setWebhooks((prev) => ({
      ...prev,
      [padNum]: {
        ...prev[padNum],
        [key]: val,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="glass-panel-heavy rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Glow highlight */}
        <div
          className="absolute top-0 right-0 w-48 h-48 blur-3xl rounded-full opacity-10 pointer-events-none transition-all duration-500"
          style={{ backgroundColor: arrivalColor }}
        />

        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-800/80 shrink-0">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <LucideIcons.Wrench className="w-5 h-5 text-cyan-400" />
              Tag Customiser
            </h3>
            <p className="text-xs text-gray-450 font-light">
              Configure profiles, LED flashes, custom icons, and webhooks.
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
        <div className="p-6 overflow-y-auto flex-grow space-y-4">
          {/* Select active or scanned tag dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Scanned Tag to Edit
            </label>
            <select
              value={selectedTagId || ''}
              onChange={(e) => setSelectedTagId(e.target.value || null)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-medium cursor-pointer shadow-inner"
            >
              {tagOptions.length === 0 ? (
                <option value="">(No tags scanned yet)</option>
              ) : (
                tagOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedTagId ? (
            <form onSubmit={handleSaveSettings} className="space-y-4 flex flex-col">
              <div className="space-y-4">
                {/* Tabs for Profile vs Webhooks */}
                <div className="flex border-b border-gray-900 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={`py-2 px-4 border-b-2 font-bold cursor-pointer transition-all ${
                      activeTab === 'profile'
                        ? 'border-cyan-500 text-cyan-400 bg-cyan-950/5'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Display Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('webhooks')}
                    className={`py-2 px-4 border-b-2 font-bold cursor-pointer transition-all ${
                      activeTab === 'webhooks'
                        ? 'border-cyan-500 text-cyan-400 bg-cyan-950/5'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Pad Webhooks
                  </button>
                </div>

                {activeTab === 'profile' ? (
                  <div className="space-y-4">
                    {/* 1. Name Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex justify-between">
                        <span>Custom Display Name</span>
                        <span className="font-mono text-gray-600 normal-case font-light">
                          ID: {selectedTagId}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter custom nickname..."
                        maxLength={32}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                      />
                    </div>

                    {/* 2. Dynamic Colors Swatches and Color Pickers */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Arrival Color */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          Arrival Flash
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={arrivalColor}
                            onChange={(e) => setArrivalColor(e.target.value)}
                            className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer p-0 shrink-0"
                            title="Arrival flash color picker"
                          />
                          <input
                            type="text"
                            value={arrivalColor.toUpperCase()}
                            onChange={(e) => setArrivalColor(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1 px-2 text-[11px] text-white font-mono uppercase"
                            maxLength={7}
                          />
                        </div>
                        {/* Arrival Preset Swatches */}
                        <div className="space-y-1 mt-1">
                          <span className="text-[8px] text-gray-500 uppercase tracking-wide block">
                            Arrival Presets
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {COLOR_PRESETS.map((preset) => (
                              <button
                                key={`arr-${preset.name}`}
                                type="button"
                                onClick={() => setArrivalColor(preset.value)}
                                style={{ backgroundColor: preset.value }}
                                className="w-4 h-4 rounded-full hover:scale-110 transition-all border border-gray-950 focus:outline-none cursor-pointer"
                                title={`Apply ${preset.name} to Arrival`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Departure Color */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          Departure Flash
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={departureColor}
                            onChange={(e) => setDepartureColor(e.target.value)}
                            className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer p-0 shrink-0"
                            title="Departure flash color picker"
                          />
                          <input
                            type="text"
                            value={departureColor.toUpperCase()}
                            onChange={(e) => setDepartureColor(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1 px-2 text-[11px] text-white font-mono uppercase"
                            maxLength={7}
                          />
                        </div>
                        {/* Departure Preset Swatches */}
                        <div className="space-y-1 mt-1">
                          <span className="text-[8px] text-gray-550 uppercase tracking-wide block">
                            Departure Presets
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {COLOR_PRESETS.map((preset) => (
                              <button
                                key={`dep-${preset.name}`}
                                type="button"
                                onClick={() => setDepartureColor(preset.value)}
                                style={{ backgroundColor: preset.value }}
                                className="w-4 h-4 rounded-full hover:scale-110 transition-all border border-gray-950 focus:outline-none cursor-pointer"
                                title={`Apply ${preset.name} to Departure`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Visual Icon Selection & Custom Upload */}
                    <div className="space-y-2 border-t border-gray-900 pt-3">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex justify-between">
                        <span>Visual Badge Icon</span>
                        <span className="text-[9px] text-cyan-500 font-bold uppercase">
                          {iconType === 'custom' ? 'Custom PNG' : 'Lucide Library'}
                        </span>
                      </label>

                      <div className="flex items-start gap-4">
                        {renderPreview()}

                        <div className="flex-grow space-y-2">
                          {/* Selection for Icon Mode */}
                          <div className="flex gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setIconType('lucide')}
                              className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                                iconType === 'lucide'
                                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                  : 'bg-gray-950 text-gray-400 border border-gray-900 hover:text-white'
                              }`}
                            >
                              Lucide preset
                            </button>
                            <button
                              type="button"
                              onClick={() => setIconType('custom')}
                              className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                                iconType === 'custom'
                                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                  : 'bg-gray-950 text-gray-400 border border-gray-900 hover:text-white'
                              }`}
                            >
                              PNG upload
                            </button>
                          </div>
                          {iconType === 'lucide' ? (
                            <div className="space-y-2.5 w-full">
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] text-gray-550 font-bold uppercase tracking-wider block">
                                    Icon Name (PascalCase)
                                  </span>
                                  <a
                                    href="https://lucide.dev/icons"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-cyan-500 hover:text-cyan-400 font-bold uppercase flex items-center gap-1 transition-colors"
                                    title="Open Lucide icon library in a new tab"
                                  >
                                    Lucide Library
                                    <LucideIcons.ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                                <input
                                  type="text"
                                  value={icon}
                                  onChange={(e) => setIcon(e.target.value)}
                                  placeholder="e.g. Sword, Heart, Star..."
                                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                                  title="Enter any valid Lucide icon name (PascalCase)"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] text-gray-550 shrink-0 font-medium block">
                                  Or pick a preset helper:
                                </span>
                                <select
                                  value={LUCIDE_ICON_OPTIONS.includes(icon) ? icon : ''}
                                  onChange={(e) => {
                                    if (e.target.value) setIcon(e.target.value);
                                  }}
                                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none cursor-pointer"
                                >
                                  <option value="">(Custom / Select preset)</option>
                                  {LUCIDE_ICON_OPTIONS.map((ico) => (
                                    <option key={ico} value={ico}>
                                      {ico}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onClick={triggerFileSelect}
                              className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all select-none ${
                                dragOver
                                  ? 'border-cyan-500 bg-cyan-950/20'
                                  : 'border-gray-800 bg-gray-950/10 hover:border-gray-700'
                              }`}
                            >
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept=".png"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                              {uploadLoading ? (
                                <div className="flex flex-col items-center gap-1.5 text-xs text-cyan-400">
                                  <LucideIcons.Loader2 className="w-5 h-5 animate-spin" />
                                  <span>Uploading PNG...</span>
                                </div>
                              ) : (
                                <div
                                  onClick={triggerFileSelect}
                                  className="flex flex-col items-center gap-1 text-[11px] text-gray-400 hover:text-white"
                                >
                                  <LucideIcons.UploadCloud className="w-5 h-5 text-gray-500 group-hover:text-white mb-0.5" />
                                  <span>
                                    Drop transparent <b>PNG</b> here or <span className="text-cyan-400 underline">browse</span>
                                  </span>
                                  <span className="text-[9px] text-gray-650">Supports transparency</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Pad Sub-tabs */}
                    <div className="flex justify-between bg-gray-950/40 p-1.5 rounded-lg border border-gray-900/60 text-[10px]">
                      {[1, 2, 3].map((padNum) => (
                        <button
                          key={padNum}
                          type="button"
                          onClick={() => setWebhookPadTab(padNum)}
                          className={`flex-grow py-1 rounded font-bold transition-all cursor-pointer ${
                            webhookPadTab === padNum
                              ? 'bg-gray-800 text-white font-black shadow-sm'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          Pad {padNum} ({padNum === 1 ? 'Center' : padNum === 2 ? 'Left' : 'Right'})
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3 bg-gray-950/15 border border-gray-900/60 p-4 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-cyan-400" />
                      
                      <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-2">
                        Pad {webhookPadTab} Webhook Destinations
                      </div>

                      {/* Arrival Webhook */}
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Arrival POST URL
                        </label>
                        <input
                          type="url"
                          value={webhooks[webhookPadTab]?.arrival || ''}
                          onChange={(e) => updateWebhookUrl(webhookPadTab, 'arrival', e.target.value)}
                          placeholder="e.g. https://api.myweb.com/pad-arrival"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1 pl-3 border-l border-gray-950">
                        <label className="text-[8px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          Arrival POST Payload
                        </label>
                        <input
                          type="text"
                          value={webhooks[webhookPadTab]?.arrivalPayload || ''}
                          onChange={(e) => updateWebhookPayload(webhookPadTab, 'arrival', e.target.value)}
                          placeholder="Custom value sent in 'payload' field..."
                          className="w-full bg-gray-950/60 border border-gray-900 rounded-lg py-1.5 px-3 text-[11px] text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>

                      {/* Departure Webhook */}
                      <div className="space-y-1 pt-2">
                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Departure POST URL
                        </label>
                        <input
                          type="url"
                          value={webhooks[webhookPadTab]?.departure || ''}
                          onChange={(e) => updateWebhookUrl(webhookPadTab, 'departure', e.target.value)}
                          placeholder="e.g. https://api.myweb.com/pad-departure"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1 pl-3 border-l border-gray-950">
                        <label className="text-[8px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          Departure POST Payload
                        </label>
                        <input
                          type="text"
                          value={webhooks[webhookPadTab]?.departurePayload || ''}
                          onChange={(e) => updateWebhookPayload(webhookPadTab, 'departure', e.target.value)}
                          placeholder="Custom value sent in 'payload' field..."
                          className="w-full bg-gray-950/60 border border-gray-900 rounded-lg py-1.5 px-3 text-[11px] text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>

                      <p className="text-[9px] text-gray-600 leading-normal mt-2">
                        Webhooks are executed as non-blocking background POST requests containing a JSON payload with properties: <code>tagId</code>, <code>name</code>, <code>padNumber</code>, and <code>type</code> ('arrival' | 'departure').
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="pt-5 mt-5 border-t border-gray-800/80 flex justify-between gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    // Reset fields
                    setName(getCharacterName(selectedTagId) || selectedTagId);
                    setArrivalColor('#10b981');
                    setDepartureColor('#f59e0b');
                    setIcon('Shield');
                    setIconType('lucide');
                    setWebhooks({
                      1: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
                      2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
                      3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
                    });
                  }}
                  className="px-4 py-2 hover:bg-gray-850 border border-gray-850 hover:border-gray-700 text-gray-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none"
                >
                  Reset Inputs
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 hover:bg-gray-850 border border-gray-850 hover:border-gray-700 text-gray-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl text-xs font-black cursor-pointer shadow-lg hover:shadow-cyan-900/30 active:scale-[0.98] transition-all flex items-center gap-1.5 focus:outline-none"
                  >
                    {saveLoading ? (
                      <>
                        <LucideIcons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <LucideIcons.Save className="w-3.5 h-3.5" />
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8 py-16 min-h-[300px]">
              <LucideIcons.Layers className="w-10 h-10 text-gray-800 animate-pulse mb-3" />
              <p className="text-xs text-gray-500 italic font-light">No tag selected</p>
              <p className="text-[10px] text-gray-650 mt-1 max-w-[240px] leading-normal font-light">
                Scan a tag in mock mode or plug in the Toypad hardware to dynamically populate active NFC tags.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
