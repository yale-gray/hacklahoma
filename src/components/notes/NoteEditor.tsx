import { useState, useEffect, useCallback, useRef } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import type { Note } from '@/types/index.ts';
import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
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
  const [activeTab, setActiveTab] = useState<'content' | 'summary'>('content');
  const [isSaving, setIsSaving] = useState(false);
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const editorMode = useUIStore((s) => s.editorPreviewMode);
  const setEditorMode = useUIStore((s) => s.setEditorPreviewMode);
  const isInitialMount = useRef(true);

  // Sync local state when note changes (switching notes)
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags);
    setActiveTab('content');
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

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote(note.id);
    }
  }, [note.id, deleteNote]);

  const showEditor = activeTab === 'content' && (editorMode === 'edit' || editorMode === 'split');
  const showPreview = activeTab === 'content' && (editorMode === 'preview' || editorMode === 'split');

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
                <span className="text-[10px] uppercase tracking-wide">Auto tags</span>
                {note.autoTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-1.5 py-0.5 text-[10px] bg-accent/10 text-accent rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1 border border-border dark:border-gray-600 rounded-md p-0.5">
              {(['content', 'summary'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    activeTab === tab
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary dark:hover:text-gray-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {activeTab === 'content' && (
              <div className="flex gap-1 border border-border dark:border-gray-600 rounded-md p-0.5">
                {(['edit', 'split', 'preview'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setEditorMode(mode)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      editorMode === mode
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-text-primary dark:hover:text-gray-200'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'summary' ? (
          <div className="h-full overflow-y-auto p-4 bg-bg-secondary dark:bg-gray-800">
            <div className="max-w-2xl">
              <h2 className="text-sm font-semibold text-text-primary dark:text-gray-100">
                AI Summary
              </h2>
              <p className="mt-2 text-sm text-text-secondary dark:text-gray-300 leading-relaxed">
                {note.summary && note.summary.trim().length > 0
                  ? note.summary
                  : 'Summary will appear after you add some content.'}
              </p>
              <div className="mt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Auto Tags
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(note.autoTags ?? []).length > 0 ? (
                    note.autoTags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-0.5 text-[11px] bg-accent/10 text-accent rounded-full"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-secondary dark:text-gray-400">
                      Auto tags will appear after you add content.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : editorMode === 'split' ? (
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
        ) : showEditor ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing in Markdown..."
            className="w-full h-full p-4 bg-bg-primary dark:bg-gray-900 text-text-primary dark:text-gray-100 font-mono text-sm resize-none focus:outline-none"
          />
        ) : showPreview ? (
          <div className="h-full overflow-y-auto bg-bg-secondary dark:bg-gray-800">
            <MarkdownPreview content={content} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
