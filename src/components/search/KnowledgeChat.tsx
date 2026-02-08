import { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { aiService } from '@/services/aiService';
import { Button } from '@/components/common';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function KnowledgeChat() {
  const notes = useNoteStore((s) => s.notes);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSearching) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSearching(true);

    try {
      const answer = await aiService.searchKnowledge(
        userMessage.content,
        notes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: [...n.tags, ...(n.autoTags ?? [])],
        }))
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Search failed'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0a07]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b-2 border-[#d4a574]/50 bg-gradient-to-b from-[#2d1f14]/30 to-transparent">
        <h2 className="text-xl font-serif font-bold text-[#e8dcc4]">
          <span className="text-[#d4a574]">Conversational</span> Knowledge Search
        </h2>
        <p className="text-sm text-[#b8a890] mt-1">
          Ask questions about your notes - AI will search and answer
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#8b7355] space-y-2">
              <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm">Ask me anything about your knowledge base</p>
              <div className="text-xs text-[#6b5945] space-y-1 pt-2">
                <p>Examples:</p>
                <p>• "What notes do I have about potions?"</p>
                <p>• "Summarize my thoughts on magic"</p>
                <p>• "Find connections between spells and defense"</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-[#d4a574] text-[#1a0f0a]'
                      : 'bg-[#2d1f14] text-[#e8dcc4] border border-[#d4a574]/30'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-[#1a0f0a]/60' : 'text-[#8b7355]'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t-2 border-[#d4a574]/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your notes..."
            disabled={isSearching}
            className="flex-1 px-4 py-2 bg-[#2d1f14] border border-[#d4a574]/30 rounded text-[#e8dcc4] placeholder-[#8b7355] focus:outline-none focus:border-[#d4a574] transition-colors"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSearching}
            disabled={!input.trim() || isSearching}
          >
            {isSearching ? 'Searching...' : 'Ask'}
          </Button>
        </div>
        <div className="text-xs text-[#8b7355] mt-2">
          {notes.length} notes available for search
        </div>
      </form>
    </div>
  );
}
