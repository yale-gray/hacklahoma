import { useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

export function ColorPicker({ color, onChange, onClose, anchorEl }: ColorPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        anchorEl &&
        !anchorEl.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorEl]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Position the picker near the anchor element
  const position = anchorEl?.getBoundingClientRect();

  return (
    <div
      ref={pickerRef}
      className="fixed z-50 bg-[#1a0f0a] rounded-lg p-3 shadow-2xl border border-[#d4a574]/40"
      style={{
        top: position ? position.bottom + 8 : '50%',
        left: position ? position.left : '50%',
      }}
    >
      <div className="mb-2 text-xs font-serif text-[#d4a574] tracking-wide">
        Select Color
      </div>
      <HexColorPicker color={color} onChange={onChange} />
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 text-xs font-mono bg-[#0f0908] border border-[#d4a574]/30 rounded text-[#e8dcc4] focus:outline-none focus:border-[#d4a574]"
          placeholder="#000000"
        />
        <button
          onClick={onClose}
          className="px-3 py-1 text-xs font-serif bg-[#d4a574]/20 hover:bg-[#d4a574]/30 text-[#d4a574] rounded transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
