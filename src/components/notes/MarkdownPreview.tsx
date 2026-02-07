import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNoteStore } from '@/stores/noteStore.ts';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);

  return (
    <div className="prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        children={content}
        components={{
          a: ({ href, children, ...props }) => {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
          p: ({ children, ...props }) => {
            if (typeof children === 'string') {
              const parts = children.split(/(\[\[[^\]]+\]\])/g);
              if (parts.length > 1) {
                return (
                  <p {...props}>
                    {parts.map((part, i) => {
                      const match = part.match(/^\[\[([^\]]+)\]\]$/);
                      if (match) {
                        const title = match[1];
                        const targetNote = notes.find(
                          (n) => n.title.toLowerCase() === title.toLowerCase()
                        );
                        return (
                          <a
                            key={i}
                            className={targetNote ? 'wiki-link' : 'new-wiki-link'}
                            onClick={(e) => {
                              e.preventDefault();
                              if (targetNote) {
                                setActiveNote(targetNote.id);
                              }
                            }}
                            href="#"
                          >
                            {title}
                          </a>
                        );
                      }
                      return part;
                    })}
                  </p>
                );
              }
            }
            return <p {...props}>{children}</p>;
          },
        }}
      />
    </div>
  );
}
