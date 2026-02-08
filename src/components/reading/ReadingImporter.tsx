import { useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { aiService, type ExtractedContent } from '@/services/aiService';
import { Button } from '@/components/common';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function ReadingImporter() {
  const notes = useNoteStore((s) => s.notes);
  const createNote = useNoteStore((s) => s.createNote);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const setView = useUIStore((s) => s.setView);

  const [inputType, setInputType] = useState<'text' | 'url' | 'pdf'>('text');
  const [input, setInput] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    // Limit to first 20 pages for faster processing
    const maxPages = Math.min(pdf.numPages, 20);

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Preserve formatting by analyzing position and font size
      let lastY = 0;
      let lastFontSize = 0;
      let pageText = '';

      textContent.items.forEach((item: any, index: number) => {
        const str = item.str;
        const transform = item.transform;
        const fontSize = Math.abs(transform[3]); // Vertical scale indicates font size
        const y = transform[5]; // Y position

        // Detect vertical gap (new paragraph)
        const verticalGap = Math.abs(lastY - y);

        if (index > 0) {
          // Large vertical gap = new paragraph
          if (verticalGap > fontSize * 1.5) {
            pageText += '\n\n';
          }
          // Regular line break
          else if (verticalGap > fontSize * 0.5) {
            pageText += '\n';
          }
          // Same line - add space if needed
          else if (!str.startsWith(' ') && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
        }

        // Detect heading (larger font size)
        if (fontSize > lastFontSize * 1.2 && lastFontSize > 0) {
          pageText += '\n\n## '; // Markdown heading
        }

        pageText += str;
        lastY = y;
        lastFontSize = fontSize;
      });

      fullText += pageText.trim() + '\n\n---\n\n'; // Page separator

      // Show progress
      if (i % 5 === 0 || i === maxPages) {
        setError(`Extracting PDF... Page ${i}/${maxPages}`);
      }
    }

    setError(null); // Clear progress message
    return fullText.trim();
  };

  const handleExtract = async () => {
    if (inputType === 'pdf') {
      if (!pdfFile) {
        setError('Please select a PDF file');
        return;
      }
    } else if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setExtracted(null);

    try {
      let contentToExtract = input.trim();

      // Extract text from PDF if needed
      if (inputType === 'pdf' && pdfFile) {
        contentToExtract = await extractTextFromPDF(pdfFile);
      }

      const result = await aiService.extractContent(
        contentToExtract,
        inputType,
        notes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: [...n.tags, ...(n.autoTags ?? [])],
        }))
      );
      setExtracted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNote = async () => {
    if (!extracted) return;

    try {
      // Build content with auto-links
      const linkedNotesSection = extracted.linkedNoteIds.length > 0
        ? [
            '',
            '---',
            '**Related Notes:**',
            ...extracted.linkedNoteIds.map(id => {
              const note = notes.find(n => n.id === id);
              return note ? `- [[${note.title}]]` : '';
            }).filter(Boolean),
          ].join('\n')
        : '';

      const keyPointsSection = extracted.keyPoints.length > 0
        ? [
            '',
            '## Key Points',
            ...extracted.keyPoints.map(point => `- ${point}`),
          ].join('\n')
        : '';

      const fullContent = [
        extracted.summary,
        keyPointsSection,
        linkedNotesSection,
      ].filter(Boolean).join('\n\n');

      const newNote = await createNote({
        title: extracted.title,
        content: fullContent,
        tags: [...extracted.suggestedTags, 'imported'],
      });

      setActiveNote(newNote.id);
      setView('editor');

      // Reset form
      setInput('');
      setPdfFile(null);
      setExtracted(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0a07]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b-2 border-[#d4a574]/50 bg-gradient-to-b from-[#2d1f14]/30 to-transparent">
        <h2 className="text-xl font-serif font-bold text-[#e8dcc4]">
          <span className="text-[#d4a574]">Reading</span> Integration
        </h2>
        <p className="text-sm text-[#b8a890] mt-1">
          Import content with automatic linking to your notes
        </p>
      </div>

      {/* Input Form */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[#d4a574]/30 space-y-4">
        {/* Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setInputType('text')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              inputType === 'text'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'bg-[#2d1f14] text-[#d4a574] border border-[#d4a574]/30 hover:bg-[#3d2f24]'
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Paste Text
          </button>
          <button
            onClick={() => setInputType('url')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              inputType === 'url'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'bg-[#2d1f14] text-[#d4a574] border border-[#d4a574]/30 hover:bg-[#3d2f24]'
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            URL
          </button>
          <button
            onClick={() => setInputType('pdf')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              inputType === 'pdf'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'bg-[#2d1f14] text-[#d4a574] border border-[#d4a574]/30 hover:bg-[#3d2f24]'
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </div>

        {/* Input Area */}
        <div>
          <label className="block text-xs font-semibold text-[#d4a574] mb-2">
            {inputType === 'text'
              ? 'Paste article, highlights, or notes:'
              : inputType === 'url'
              ? 'Enter article URL:'
              : 'Upload PDF file:'}
          </label>
          {inputType === 'text' ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your content here..."
              rows={8}
              className="w-full px-4 py-3 bg-[#2d1f14] border border-[#d4a574]/30 rounded text-[#e8dcc4] placeholder-[#8b7355] focus:outline-none focus:border-[#d4a574] transition-colors font-serif text-sm"
            />
          ) : inputType === 'url' ? (
            <div className="space-y-2">
              <input
                type="url"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-4 py-3 bg-[#2d1f14] border border-[#d4a574]/30 rounded text-[#e8dcc4] placeholder-[#8b7355] focus:outline-none focus:border-[#d4a574] transition-colors font-serif text-sm"
              />
              <p className="text-xs text-[#8b7355] italic">
                Note: Some URLs may be blocked by CORS. If it fails, try copying the text or uploading a PDF instead.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPdfFile(file);
                  }
                }}
                className="w-full px-4 py-3 bg-[#2d1f14] border border-[#d4a574]/30 rounded text-[#e8dcc4] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#d4a574] file:text-[#1a0f0a] hover:file:bg-[#e8b68a] cursor-pointer"
              />
              {pdfFile && (
                <p className="text-xs text-[#b8a890]">
                  Selected: {pdfFile.name}
                </p>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={handleExtract}
          variant="primary"
          size="sm"
          loading={isProcessing}
          disabled={(inputType === 'pdf' ? !pdfFile : !input.trim()) || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Analyzing...' : 'Extract & Link'}
        </Button>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-200 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {extracted ? (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                Extracted Title:
              </label>
              <div className="text-lg font-serif font-bold text-[#e8dcc4]">
                {extracted.title}
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                Summary:
              </label>
              <div className="text-sm text-[#b8a890] leading-relaxed">
                {extracted.summary}
              </div>
            </div>

            {/* Key Points */}
            {extracted.keyPoints.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                  Key Points ({extracted.keyPoints.length}):
                </label>
                <ul className="space-y-2">
                  {extracted.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-[#d4a574] flex-shrink-0">•</span>
                      <span className="text-sm text-[#e8dcc4]">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Tags */}
            {extracted.suggestedTags.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                  Suggested Tags:
                </label>
                <div className="flex flex-wrap gap-2">
                  {extracted.suggestedTags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-[#d4a574]/20 text-[#d4a574] rounded text-xs border border-[#d4a574]/30"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Notes */}
            {extracted.linkedNoteIds.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                  Auto-Linked to Existing Notes ({extracted.linkedNoteIds.length}):
                </label>
                <div className="space-y-2">
                  {extracted.linkedNoteIds.map(noteId => {
                    const note = notes.find(n => n.id === noteId);
                    return note ? (
                      <button
                        key={noteId}
                        onClick={() => {
                          setActiveNote(noteId);
                          setView('editor');
                        }}
                        className="w-full text-left px-3 py-2 bg-[#2d1f14] hover:bg-[#3d2f24] border border-[#d4a574]/30 rounded transition-colors"
                      >
                        <div className="text-sm font-medium text-[#e8dcc4]">
                          {note.title}
                        </div>
                        <div className="text-xs text-[#8b7355] mt-1 flex gap-1 flex-wrap">
                          {note.tags.slice(0, 3).map(tag => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Create Note Button */}
            <div className="pt-4 border-t border-[#d4a574]/30">
              <Button
                onClick={handleCreateNote}
                variant="primary"
                size="md"
                className="w-full"
              >
                Create Note with Auto-Links
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#8b7355]">
              <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-sm mt-2">Paste content or enter URL to get started</p>
              <p className="text-xs text-[#6b5945] mt-2">
                AI will extract key points and link to your existing notes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
