import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore.ts';
import { Button } from '@/components/common/index.ts';

export function SettingsModal() {
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const groupingMinSize = useUIStore((s) => s.groupingMinSize);
  const setGroupingMinSize = useUIStore((s) => s.setGroupingMinSize);
  const [localMinSize, setLocalMinSize] = useState(groupingMinSize);

  useEffect(() => {
    if (settingsOpen) {
      setLocalMinSize(groupingMinSize);
    }
  }, [settingsOpen, groupingMinSize]);

  if (!settingsOpen) return null;

  const handleSave = () => {
    setGroupingMinSize(localMinSize);
    closeSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-black/40"
        onClick={closeSettings}
      />
      <div className="relative w-full max-w-md rounded-lg border border-border dark:border-gray-700 bg-bg-primary dark:bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-gray-700">
          <h2 className="text-sm font-semibold text-text-primary dark:text-gray-100">Settings</h2>
          <button
            type="button"
            onClick={closeSettings}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3 text-sm text-text-secondary dark:text-gray-300">
          <div>
            <label htmlFor="grouping-min-size" className="block text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Minimum Grouping Size
            </label>
            <p className="text-xs text-text-secondary/70 mt-1">
              A tag becomes a grouping after it appears on this many notes.
            </p>
          </div>
          <input
            id="grouping-min-size"
            type="number"
            min={1}
            value={localMinSize}
            onChange={(e) => setLocalMinSize(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-md bg-bg-secondary dark:bg-gray-800 border border-border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary dark:text-gray-100"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border dark:border-gray-700">
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
