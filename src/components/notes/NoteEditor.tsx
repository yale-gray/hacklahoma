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
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const isInitialMount = useRef(true);

  // Sync local state when note changes (switching notes)
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags);
    isInitialMount.current = true;
  }, [note.id, note.title, note.content, note.tags]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-lg font-semibold bg-transparent focus:outline-none text-text-primary dark:text-gray-100 flex-1 mr-4"
          />
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-text-secondary">Saving...</span>
            )}
            <span className="text-xs text-text-secondary dark:text-gray-500 font-mono">
              {note.id}
            </span>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <TagInput tags={tags} onChange={handleTagChange} />
            {note.autoTags && note.autoTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary dark:text-gray-400">
                <span className="text-[10px] uppercase tracking-wide">Suggested tags</span>
                {note.autoTags.map((tag) => {
                  const isSelected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSuggestedTagClick(tag)}
                      className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                        isSelected
                          ? 'border-accent bg-accent/20 text-accent'
                          : 'border-accent/50 text-accent hover:border-accent'
                      }`}
                      title={isSelected ? 'Already added' : 'Add tag'}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden">
        <Allotment>
          <Allotment.Pane>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing in Markdown..."
              className="w-full h-full p-4 bg-bg-primary dark:bg-gray-900 text-text-primary dark:text-gray-100 font-mono text-sm resize-none focus:outline-none"
            />
          </Allotment.Pane>
          <Allotment.Pane>
            <div className="h-full overflow-y-auto border-l border-border dark:border-gray-700 bg-bg-secondary dark:bg-gray-800">
              <MarkdownPreview content={content} />
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}
