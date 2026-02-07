import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { Button } from '@/components/common/index.ts';

export function Header() {
  const createNote = useNoteStore((s) => s.createNote);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const currentView = useUIStore((s) => s.currentView);
  const setView = useUIStore((s) => s.setView);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const openSettings = useUIStore((s) => s.openSettings);

  const handleNewNote = () => {
    createNote({ title: 'Untitled', content: '', tags: [] });
  };

  const handleSeedNotes = async () => {
    const seedNotes = [
      {
        title: 'Potion Brewing Basics',
        content: `A comprehensive guide to potion brewing.

Key ingredients include moonstone dust and dragon scales.
See also [[Advanced Potion Techniques]] for more complex recipes.

Safety is paramount when working with volatile ingredients.`,
        tags: ['magic', 'potions', 'tutorial'],
      },
      {
        title: 'Advanced Potion Techniques',
        content: `Advanced methods for experienced brewers.

Building on [[Potion Brewing Basics]], this covers:
- Time-turner elixirs
- Polyjuice variations
- Veritaserum synthesis

Referenced in [[Dark Arts Defense]].`,
        tags: ['magic', 'potions', 'advanced'],
      },
      {
        title: 'Spell Casting Fundamentals',
        content: `Every wizard must master these core principles.

The wand chooses the wizard. Proper pronunciation is critical.
See [[Defensive Spells]] for practical applications.`,
        tags: ['magic', 'spells', 'tutorial'],
      },
      {
        title: 'Defensive Spells',
        content: `Essential protection spells every student should know.

Protego, Expelliarmus, and Stupefy are covered in [[Spell Casting Fundamentals]].
These techniques are crucial for [[Dark Arts Defense]].`,
        tags: ['magic', 'spells', 'defense'],
      },
      {
        title: 'Dark Arts Defense',
        content: `Protecting against the unforgivable curses.

Requires mastery of [[Defensive Spells]] and understanding from [[Advanced Potion Techniques]].
Always be vigilant. Constant vigilance!`,
        tags: ['magic', 'defense', 'advanced'],
      },
      {
        title: 'Herbology Garden Notes',
        content: `Magical plants and their properties.

Mandrakes, Venomous Tentacula, and Devil's Snare.
Many ingredients used in [[Potion Brewing Basics]].`,
        tags: ['magic', 'herbology', 'nature'],
      },
      {
        title: 'Transfiguration Theory',
        content: `The science of changing form and appearance.

From simple objects to complex living things.
Relates to concepts in [[Spell Casting Fundamentals]].`,
        tags: ['magic', 'transfiguration', 'theory'],
      },
      {
        title: 'Quidditch Strategy Guide',
        content: `Winning tactics for seekers, chasers, and keepers.

The Wronski Feint and Parkin's Pincer.
Physical training is as important as magical ability.`,
        tags: ['sports', 'quidditch', 'strategy'],
      },
      {
        title: 'Magical Creatures Encyclopedia',
        content: `A field guide to fantastic beasts.

Dragons, hippogriffs, and thestrals. Each requires special handling.
See [[Herbology Garden Notes]] for creature care supplies.`,
        tags: ['magic', 'creatures', 'nature'],
      },
      {
        title: 'Astronomy Observations',
        content: `Celestial patterns and their magical significance.

Jupiter's moons, Mars retrograde, and lunar phases.
Important for timing in [[Potion Brewing Basics]].`,
        tags: ['magic', 'astronomy', 'theory'],
      },
      {
        title: 'Divination Methods',
        content: `Reading tea leaves, crystal balls, and the stars.

A controversial art. See [[Astronomy Observations]] for celestial divination.
The future is not set in stone.`,
        tags: ['magic', 'divination', 'theory'],
      },
      {
        title: 'History of Magic',
        content: `Ancient wizards and the founding of Hogwarts.

The four founders: Gryffindor, Slytherin, Ravenclaw, and Hufflepuff.
Understanding our past shapes our future magic.`,
        tags: ['history', 'theory', 'hogwarts'],
      },
      {
        title: 'Charms Classroom Notes',
        content: `Levitation, summoning, and banishing charms.

Wingardium Leviosa! Practice makes perfect.
Foundation for [[Spell Casting Fundamentals]].`,
        tags: ['magic', 'charms', 'tutorial'],
      },
      {
        title: 'Ancient Runes Translation',
        content: `Deciphering magical inscriptions and texts.

Elder Futhark and their magical applications.
Connected to [[History of Magic]].`,
        tags: ['magic', 'runes', 'theory'],
      },
      {
        title: 'Magical Theory Principles',
        content: `The fundamental laws governing magic.

Gamp's Law of Elemental Transfiguration.
Underlies all magical practice from [[Transfiguration Theory]] to [[Charms Classroom Notes]].`,
        tags: ['magic', 'theory', 'advanced'],
      },
    ];

    for (const note of seedNotes) {
      await createNote(note);
    }
  };

  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b-2 border-[#d4a574]/50 bg-[#1a0f0a] shadow-lg relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#2d1f14]/30 to-transparent pointer-events-none"></div>
      <div className="flex items-center gap-4 relative z-10">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-[#2d1f14] text-[#d4a574] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-serif font-bold text-[#e8dcc4] tracking-wide">
          <span className="text-[#d4a574]">Neural</span> Zettelkasten
        </h1>
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => setView('editor')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentView === 'editor'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setView('graph')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentView === 'graph'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
            }`}
          >
            Map
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10">
        <Button variant="secondary" size="sm" onClick={handleSeedNotes}>
          Seed Notes
        </Button>
        <Button variant="primary" size="sm" onClick={handleNewNote}>
          + New Note
        </Button>
        <button
          type="button"
          onClick={openSettings}
          aria-label="Settings"
          className={`p-2 rounded transition-colors ${
            settingsOpen
              ? 'bg-[#d4a574] text-[#1a0f0a]'
              : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
