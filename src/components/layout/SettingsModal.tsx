import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore.ts';
import { Button } from '@/components/common/index.ts';

export function SettingsModal() {
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const groupingMinSize = useUIStore((s) => s.groupingMinSize);
  const setGroupingMinSize = useUIStore((s) => s.setGroupingMinSize);
  const mapColorThreshold = useUIStore((s) => s.mapColorThreshold);
  const setMapColorThreshold = useUIStore((s) => s.setMapColorThreshold);
  const [localMinSize, setLocalMinSize] = useState(groupingMinSize);
  const [localColorThreshold, setLocalColorThreshold] = useState(mapColorThreshold);

  useEffect(() => {
    if (settingsOpen) {
      setLocalMinSize(groupingMinSize);
      setLocalColorThreshold(mapColorThreshold);
    }
  }, [settingsOpen, groupingMinSize, mapColorThreshold]);

  if (!settingsOpen) return null;

  const handleSave = () => {
    setGroupingMinSize(localMinSize);
    setMapColorThreshold(localColorThreshold);
    closeSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-black/60"
        onClick={closeSettings}
      />
      <div className="relative w-full max-w-md rounded-lg border-2 border-[#d4a574] bg-[#2d1f14] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#d4a574]/30">
          <h2 className="text-lg font-serif font-bold text-[#e8dcc4]">Settings</h2>
          <button
            type="button"
            onClick={closeSettings}
            className="p-1.5 rounded text-[#b8a88a] hover:text-[#d4a574] hover:bg-[#1a1612] transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm text-[#e8dcc4]">
          <div>
            <label htmlFor="grouping-min-size" className="block text-xs font-serif uppercase tracking-wide text-[#d4a574] mb-2">
              Minimum Grouping Size
            </label>
            <p className="text-xs text-[#b8a88a] mt-1 mb-3 font-serif">
              A tag becomes a grouping after it appears on this many notes.
            </p>
            <input
              id="grouping-min-size"
              type="number"
              min={1}
              value={localMinSize}
              onChange={(e) => setLocalMinSize(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-serif rounded bg-[#1a1612] border-2 border-[#d4a574]/30 focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574] text-[#e8dcc4] shadow-inner"
            />
          </div>
          <div>
            <label htmlFor="map-color-threshold" className="block text-xs font-serif uppercase tracking-wide text-[#d4a574] mb-2">
              Map Color Threshold
            </label>
            <p className="text-xs text-[#b8a88a] mt-1 mb-3 font-serif">
              When a tag connects this many notes on the map, the cluster is highlighted with a unique color.
            </p>
            <input
              id="map-color-threshold"
              type="number"
              min={2}
              value={localColorThreshold}
              onChange={(e) => setLocalColorThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-serif rounded bg-[#1a1612] border-2 border-[#d4a574]/30 focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574] text-[#e8dcc4] shadow-inner"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t-2 border-[#d4a574]/30">
          <Button variant="secondary" size="sm" onClick={closeSettings}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
