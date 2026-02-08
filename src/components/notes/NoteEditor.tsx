import { useState, useEffect, useCallback, useRef } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import type { Note } from '@/types/index.ts';
import { useNoteStore } from '@/stores/noteStore.ts';
import { useDebounce } from '@/hooks/useDebounce.ts';
import { Button } from '@/components/common/index.ts';
import { TagInput } from './TagInput.tsx';
import { MarkdownPreview } from './MarkdownPreview.tsx';

interface NoteEditorProps {
  note: Note;
}

export function NoteEditor({ note }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags);
  const [isSaving, setIsSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const isInitialMount = useRef(true);

  // Sync local state when note changes (switching notes)
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags);
    setShowColorPicker(false);
    isInitialMount.current = true;
  }, [note.id, note.title, note.content, note.tags]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showColorPicker && !target.closest('.color-picker-container')) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  const debouncedTitle = useDebounce(title, 500);
  const debouncedContent = useDebounce(content, 500);

  // Auto-save on debounced changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasChanges =
      debouncedTitle !== note.title ||
      debouncedContent !== note.content;

    if (hasChanges) {
      setIsSaving(true);
      updateNote(note.id, { title: debouncedTitle, content: debouncedContent }).then(() => {
        setIsSaving(false);
      });
    }
  }, [debouncedTitle, debouncedContent, note.id, note.title, note.content, updateNote]);

  const handleTagChange = useCallback(
    (newTags: string[]) => {
      setTags(newTags);
      updateNote(note.id, { tags: newTags });
    },
    [note.id, updateNote]
  );

  const handleSuggestedTagClick = useCallback(
    (tag: string) => {
      if (tags.includes(tag)) return;
      const nextTags = [...tags, tag];
      setTags(nextTags);
      updateNote(note.id, { tags: nextTags });
    },
    [note.id, tags, updateNote]
  );

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote(note.id);
    }
  }, [note.id, deleteNote]);

  const handleColorChange = useCallback(
    (colorIndex: number) => {
      updateNote(note.id, { bookColor: colorIndex });
      setShowColorPicker(false);
    },
    [note.id, updateNote]
  );

  const bookColors = [
    'linear-gradient(90deg, #4a3426 0%, #5a4436 50%, #4a3426 100%)',
    'linear-gradient(90deg, #2d4a3a 0%, #3d5a4a 50%, #2d4a3a 100%)',
    'linear-gradient(90deg, #3a2a4a 0%, #4a3a5a 50%, #3a2a4a 100%)',
    'linear-gradient(90deg, #4a3a2a 0%, #5a4a3a 50%, #4a3a2a 100%)',
    'linear-gradient(90deg, #1a2a3a 0%, #2a3a4a 50%, #1a2a3a 100%)',
    'linear-gradient(90deg, #5b3413 0%, #6b4423 50%, #5b3413 100%)',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Editor / Preview — metadata lives on the pages */}
      <div className="flex-1 overflow-hidden relative">
        <div className="book-binding-shadow"></div>
        <Allotment>
          <Allotment.Pane>
            <div className="w-full h-full book-page book-page-left flex flex-col overflow-hidden">
              {/* Title + color + delete on top of the left page */}
              <div className="flex-shrink-0 px-8 pt-6 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled Manuscript..."
                    className="text-xl font-serif font-bold bg-transparent focus:outline-none text-[#3d2817] flex-1 placeholder-[#8b7355]/40"
                  />
                  <div className="relative color-picker-container">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-6 h-6 rounded-full border-2 border-[#8b7355]/40 hover:border-[#8b7355] transition-colors shadow-sm"
                      style={{
                        background: bookColors[note.bookColor ?? (note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6)]
                      }}
                    />
                    {showColorPicker && (
                      <div className="absolute top-full mt-2 right-0 bg-[#f5e6c8] border-2 border-[#8b7355]/40 rounded-lg p-2 shadow-xl z-50 flex gap-1.5">
                        {bookColors.map((bg, colorIdx) => (
                          <button
                            key={colorIdx}
                            onClick={() => handleColorChange(colorIdx)}
                            className="w-6 h-6 rounded-full border-2 border-[#8b7355]/30 hover:border-[#8b7355] hover:scale-110 transition-all"
                            style={{ background: bg }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {isSaving && (
                    <span className="text-[10px] text-[#8b7355] font-serif italic">Saving...</span>
                  )}
                  <Button variant="danger" size="sm" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
                <TagInput tags={tags} onChange={handleTagChange} />
                {note.autoTags && note.autoTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#8b7355] mt-1.5">
                    <span className="text-[10px] uppercase tracking-wide font-serif">Suggested</span>
                    {note.autoTags.map((tag) => {
                      const isSelected = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleSuggestedTagClick(tag)}
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-serif rounded border transition-colors ${
                            isSelected
                              ? 'border-[#8b7355] bg-[#8b7355]/20 text-[#5a3a1a]'
                              : 'border-[#8b7355]/50 text-[#5a3a1a] hover:border-[#8b7355]'
                          }`}
                          title={isSelected ? 'Already added' : 'Add tag'}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="border-b border-[#8b7355]/20 mt-3"></div>
              </div>
              {/* Textarea fills rest of the page */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Begin your manuscript..."
                className="flex-1 w-full px-8 py-4 bg-transparent text-[#3d2817] font-serif text-sm leading-loose resize-none focus:outline-none placeholder-[#8b7355]/40"
                style={{ color: '#3d2817' }}
              />
            </div>
          </Allotment.Pane>
          <Allotment.Pane>
            <div className="h-full overflow-y-auto book-page book-page-right px-12 py-8">
              <MarkdownPreview content={content} />
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}
