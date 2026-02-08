import { useState, useRef, useEffect, useCallback } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { aiService } from '@/services/aiService';
import { Button } from '@/components/common';
import { db } from '@/db/database';
import type { ChatMessage, SavedChat, CitedNote } from '@/types/index.ts';

const BOOK_COLORS = [
  'shelf-book-color-0',
  'shelf-book-color-1',
  'shelf-book-color-2',
  'shelf-book-color-3',
  'shelf-book-color-4',
  'shelf-book-color-5',
];

function getBookColor(id: string): string {
  const idx = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;
  return BOOK_COLORS[idx];
}

function BookPile({ citedNotes, onNoteClick }: { citedNotes: CitedNote[]; onNoteClick: (id: string) => void }) {
  if (citedNotes.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[#d4a574]/20">
      <p className="text-[10px] uppercase tracking-wider text-[#8b7355] mb-2">Referenced Notes</p>
      <div className="flex flex-col gap-0">
        {citedNotes.map((cited, i) => {
          const colorClass = getBookColor(cited.id);
          // Alternate slight offsets for a pile effect
          const offsetX = (i % 2 === 0 ? 0 : 6) + (i % 3) * 2;
          const rotation = i % 2 === 0 ? -0.5 : 0.8;

          return (
            <button
              key={cited.id}
              onClick={() => onNoteClick(cited.id)}
              className={`relative h-[28px] w-[220px] rounded-sm cursor-pointer transition-all hover:translate-x-1 hover:brightness-125 ${colorClass}`}
              style={{
                marginLeft: `${offsetX}px`,
                transform: `rotate(${rotation}deg)`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                zIndex: citedNotes.length - i,
              }}
              title={cited.title}
            >
              {/* Gold foil title on spine — horizontal for flat books */}
              <span className="absolute inset-0 flex items-center px-3 text-[10px] font-serif text-[#c9a96e] truncate tracking-wide">
                [{cited.index}] {cited.title}
              </span>
              {/* Edge detail */}
              <span className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#e8dcc4]/10 rounded-r-sm" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function KnowledgeChat() {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const setView = useUIStore((s) => s.setView);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showSavedChats, setShowSavedChats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load saved chats on mount
  useEffect(() => {
    const loadChats = async () => {
      const chats = await db.chats.orderBy('modifiedAt').reverse().toArray();
      setSavedChats(chats);
    };
    loadChats();
  }, []);

  const handleNoteClick = useCallback((noteId: string) => {
    setActiveNote(noteId);
    setView('editor');
  }, [setActiveNote, setView]);

  const saveCurrentChat = useCallback(async () => {
    if (messages.length === 0) return;

    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
      : 'Untitled Chat';
    const now = new Date();

    if (activeChatId) {
      // Update existing chat
      await db.chats.update(activeChatId, {
        messages,
        modifiedAt: now,
        title,
      });
      setSavedChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId ? { ...c, messages, modifiedAt: now, title } : c
        )
      );
    } else {
      // Create new saved chat
      const id = crypto.randomUUID();
      const chat: SavedChat = {
        id,
        title,
        messages,
        createdAt: now,
        modifiedAt: now,
      };
      await db.chats.add(chat);
      setSavedChats((prev) => [chat, ...prev]);
      setActiveChatId(id);
    }
  }, [messages, activeChatId]);

  const loadChat = useCallback((chat: SavedChat) => {
    setMessages(chat.messages);
    setActiveChatId(chat.id);
    setShowSavedChats(false);
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setActiveChatId(null);
    setShowSavedChats(false);
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    await db.chats.delete(chatId);
    setSavedChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setMessages([]);
      setActiveChatId(null);
    }
  }, [activeChatId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSearching) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSearching(true);

    try {
      const result = await aiService.searchKnowledge(
        userMessage.content,
        notes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: [...n.tags, ...(n.autoTags ?? [])],
        }))
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        citedNotes: result.citedNotes,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
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

  // Auto-save after each assistant response
  useEffect(() => {
    if (messages.length >= 2 && messages[messages.length - 1].role === 'assistant') {
      saveCurrentChat();
    }
  }, [messages, saveCurrentChat]);

  return (
    <div className="flex flex-col h-full bg-[#0f0a07]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b-2 border-[#d4a574]/50 bg-gradient-to-b from-[#2d1f14]/30 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#e8dcc4]">
              <span className="text-[#d4a574]">Conversational</span> Knowledge Search
            </h2>
            <p className="text-sm text-[#b8a890] mt-1">
              Ask questions about your notes - AI will search and answer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="px-3 py-1.5 text-xs font-serif rounded border border-[#d4a574]/40 text-[#d4a574] hover:bg-[#d4a574]/10 transition-colors"
              title="New chat"
            >
              + New
            </button>
            <button
              onClick={() => setShowSavedChats(!showSavedChats)}
              className={`px-3 py-1.5 text-xs font-serif rounded border transition-colors ${
                showSavedChats
                  ? 'bg-[#d4a574] text-[#1a0f0a] border-[#d4a574]'
                  : 'border-[#d4a574]/40 text-[#d4a574] hover:bg-[#d4a574]/10'
              }`}
              title="Saved chats"
            >
              Saved ({savedChats.length})
            </button>
          </div>
        </div>
      </div>

      {/* Saved chats drawer */}
      {showSavedChats && (
        <div className="flex-shrink-0 border-b-2 border-[#d4a574]/30 bg-[#1a1210] max-h-[240px] overflow-y-auto">
          {savedChats.length === 0 ? (
            <div className="px-6 py-6 text-center">
              <p className="text-sm text-[#8b7355] font-serif italic">No saved chats yet</p>
              <p className="text-xs text-[#6b5945] mt-1">Chats are saved automatically after each reply</p>
            </div>
          ) : (
            <div className="py-2">
              {savedChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors group ${
                    activeChatId === chat.id
                      ? 'bg-[#d4a574]/15 border-l-2 border-[#d4a574]'
                      : 'hover:bg-[#2d1f14]/60 border-l-2 border-transparent'
                  }`}
                  onClick={() => loadChat(chat)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e8dcc4] font-serif truncate">
                      {chat.title}
                    </p>
                    <p className="text-[10px] text-[#8b7355] mt-0.5">
                      {chat.messages.length} messages &middot;{' '}
                      {new Date(chat.modifiedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#8b7355] hover:text-[#b85c5c] transition-all"
                    title="Delete chat"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                <p>&bull; &quot;What notes do I have about potions?&quot;</p>
                <p>&bull; &quot;Summarize my thoughts on magic&quot;</p>
                <p>&bull; &quot;Find connections between spells and defense&quot;</p>
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
                  {msg.role === 'assistant' && msg.citedNotes && msg.citedNotes.length > 0 && (
                    <BookPile citedNotes={msg.citedNotes} onNoteClick={handleNoteClick} />
                  )}
                  <div
                    className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-[#1a0f0a]/60' : 'text-[#8b7355]'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
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
