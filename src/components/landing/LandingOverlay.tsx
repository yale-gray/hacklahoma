import { useState, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore.ts';
import { useNoteStore } from '@/stores/noteStore.ts';

export function LandingOverlay() {
  const exitLanding = useUIStore((s) => s.exitLanding);
  const createNote = useNoteStore((s) => s.createNote);
  const [scrolled, setScrolled] = useState(false);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.deltaY > 0 && !scrolled) {
        setScrolled(true);
      }
    },
    [scrolled]
  );

  const handleBeginWriting = useCallback(async () => {
    await createNote({ title: 'Untitled', content: '', tags: [] });
    exitLanding();
  }, [createNote, exitLanding]);

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center"
      onWheel={handleWheel}
    >
      {/* Open book image centered with text on pages */}
      <div className="relative">
        <img
          src="/images/open-book.png"
          alt="Open book"
          className="w-[600px] max-w-[80vw] drop-shadow-[0_0_40px_rgba(212,165,116,0.2)]"
          draggable={false}
        />
        {/* Left page text */}
        <div className="absolute inset-0 flex">
          <div className="w-[48%] ml-[3%] mt-[8%] mb-[10%] flex flex-col items-center justify-center px-6">
            <p className="font-serif text-[#5a3a1a] text-lg font-bold tracking-wide leading-relaxed text-center">
              Neural
            </p>
            <p className="font-serif text-[#5a3a1a] text-2xl font-bold tracking-widest text-center">
              Zettelkasten
            </p>
          </div>
          {/* Right page text */}
          <div className="w-[48%] mr-[3%] mt-[8%] mb-[10%] flex flex-col items-center justify-center px-6">
            <p className="font-serif text-[#7a5a3a] text-xs italic leading-relaxed text-center">
              Your knowledge, connected.
            </p>
            <p className="font-serif text-[#7a5a3a] text-xs italic leading-relaxed text-center mt-2">
              Map your thoughts, discover hidden links, and let your ideas grow.
            </p>
          </div>
        </div>
      </div>

      {/* Down arrow - bounces, fades on scroll */}
      <div
        className={`mt-8 transition-all duration-700 ease-out ${
          scrolled ? 'opacity-0 translate-y-4' : 'opacity-80 animate-bounce-arrow'
        }`}
      >
        <svg
          className="w-10 h-10 text-[#d4a574]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
        <p className="text-[#b8a88a] text-xs font-serif italic mt-2 text-center">
          Scroll to begin
        </p>
      </div>

      {/* "Begin Writing" button - starts off-screen, rises on scroll */}
      <button
        onClick={handleBeginWriting}
        className={`mt-6 px-8 py-4 rounded-lg font-serif text-lg tracking-wide
          bg-gradient-to-b from-[#4a3426] to-[#2d1f14]
          border border-[#d4a574]/40 text-[#e8dcc4]
          shadow-[0_0_30px_rgba(212,165,116,0.15)]
          hover:shadow-[0_0_40px_rgba(212,165,116,0.3)]
          hover:border-[#d4a574]/60
          active:scale-[0.98]
          transition-all duration-700 ease-out
          ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[200px]'}
        `}
      >
        Begin Writing
      </button>
    </div>
  );
}
