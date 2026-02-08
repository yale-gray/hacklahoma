export interface AIEnrichment {
  summary: string;
  autoTags: string[];
}

export interface AINoteDraft {
  title: string;
  content: string;
}

export interface AISynthesis {
  title: string;
  content: string;
  sourceNoteIds: string[];
}

export interface RelatedNote {
  noteId: string;
  relevanceScore: number;
  reason: string;
  relationship: 'supporting' | 'contradicting' | 'expanding' | 'related';
}

export interface ArgumentAnalysis {
  topic: string;
  supportingNotes: Array<{ noteId: string; excerpt: string }>;
  contradictingNotes: Array<{ noteId: string; excerpt: string }>;
  synthesisNotes: Array<{ noteId: string; excerpt: string }>;
  evolution: Array<{ date: Date; noteId: string; stance: string }>;
}

export interface ExtractedContent {
  title: string;
  keyPoints: string[];
  summary: string;
  suggestedTags: string[];
  linkedNoteIds: string[];
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

function hasValidApiKey(key: string | undefined): key is string {
  if (!key) return false;
  const normalized = key.trim();
  if (!normalized) return false;
  if (normalized.toLowerCase().includes('replace')) return false;
  if (normalized.toLowerCase().includes('change')) return false;
  return true;
}

function getGeminiEndpoint(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function extractTextFromResponse(data: unknown): string {
  const typed = data as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const parts = typed?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? '').join('').trim();
}

function extractJsonPayload(text: string): { summary?: string; autoTags?: string[] } | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { summary?: string; autoTags?: string[] };
  } catch {
    return null;
  }
}

function extractJsonObject<T>(text: string): T | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

// Heuristic fallback: used when no API key is configured or parsing fails.
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has',
  'have', 'he', 'her', 'his', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me',
  'my', 'no', 'not', 'of', 'on', 'or', 'our', 's', 'she', 'so', 'that', 'the',
  'their', 'them', 'there', 'they', 'this', 'to', 'us', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  if (!text) return [];
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function buildFrequency(words: string[], weight = 1, seed?: Map<string, number>) {
  const freq = seed ?? new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + weight);
  }
  return freq;
}

function pickTopKeywords(freq: Map<string, number>, count: number): string[] {
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

function generateSummary(title: string, content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return title ? `Note about ${title}` : '';
  }

  const normalized = trimmed.replace(/\s+/g, ' ').trim();
  const sentences = normalized.match(/[^.!?]+[.!?]+/g);
  let summary = '';

  if (sentences && sentences.length > 0) {
    summary = sentences.slice(0, 2).join(' ').trim();
  } else {
    const words = normalized.split(' ');
    summary = words.slice(0, 40).join(' ').trim();
  }

  if (summary.length > 240) {
    summary = `${summary.slice(0, 237).trim()}...`;
  }

  return summary;
}

function generateAutoTags(content: string): string[] {
  const bodyTokens = tokenize(content);
  const freq = buildFrequency(bodyTokens, 1);

  const tags = pickTopKeywords(freq, 5);
  return tags;
}

function ensureTagCount(tags: string[], min = 2, max = 4): string[] {
  const unique = normalizeTags(tags);
  if (unique.length <= max && unique.length >= min) return unique;
  if (unique.length > max) return unique.slice(0, max);
  return unique;
}

function removeTitleTags(tags: string[], title: string): string[] {
  const titleTokens = new Set(tokenize(title));
  if (titleTokens.size === 0) return tags.filter((tag) => tag !== 'untitled');
  return tags.filter((tag) => !titleTokens.has(tag) && tag !== 'untitled');
}

function finalizeTags(tags: string[], title: string, content: string, min = 2, max = 4): string[] {
  const filtered = removeTitleTags(tags, title);
  if (filtered.length >= min) {
    return filtered.slice(0, max);
  }

  const fallback = generateAutoTags(content);
  const combined = [...filtered];
  for (const tag of fallback) {
    if (combined.length >= max) break;
    if (!combined.includes(tag) && !removeTitleTags([tag], title).length) {
      continue;
    }
    if (!combined.includes(tag)) {
      combined.push(tag);
    }
  }
  return combined;
}

export const aiService = {
  async generateRandomNote(): Promise<AINoteDraft> {
    if (hasValidApiKey(GEMINI_API_KEY)) {
      try {
        const domains = [
          'history', 'biology', 'physics', 'philosophy', 'music', 'architecture',
          'linguistics', 'astronomy', 'psychology', 'culinary arts', 'mathematics',
          'anthropology', 'geology', 'oceanography', 'mythology', 'botany',
          'urban planning', 'game theory', 'cryptography', 'neuroscience',
          'paleontology', 'materials science', 'cartography', 'folklore',
          'behavioral economics', 'optics', 'acoustics', 'epidemiology',
          'typography', 'ethology', 'meteorology', 'fermentation science',
        ];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        const seed = Math.floor(Math.random() * 1_000_000);

        const prompt = [
          'You are an assistant that generates a single random note.',
          'Return ONLY valid JSON with this shape:',
          '{"title":"...", "content":"..."}',
          'Constraints:',
          '- content: 100-150 words.',
          `- topic: pick a specific, surprising, lesser-known fact or idea from the domain of "${domain}". Do NOT write a general overview — pick one narrow, concrete subtopic.`,
          `- random seed: ${seed} (use this to vary your output).`,
          '- tone: thoughtful, informative, first-person optional.',
          '- no markdown, no bullet lists.',
        ].join('\n');

        const response = await fetch(getGeminiEndpoint(GEMINI_MODEL), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 2048,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = extractTextFromResponse(data);
          const parsed = extractJsonObject<AINoteDraft>(text);
          if (parsed?.title && parsed?.content) {
            return {
              title: parsed.title.trim().slice(0, 80),
              content: parsed.content.trim(),
            };
          }
          console.error('generateRandomNote: failed to parse response:', text);
        } else {
          const errorText = await response.text();
          console.error('generateRandomNote: API returned', response.status, errorText);
        }
      } catch (err) {
        console.error('generateRandomNote API error:', err);
        // fall through to local fallback
      }
    }

    const fallbacks: AINoteDraft[] = [
      { title: 'The Secret Life of City Trees', content: 'Urban trees live dramatically different lives than their forest counterparts. A street tree in Manhattan might process five times more pollutants than a rural oak, and its roots navigate a labyrinth of pipes and cables. Cities like Melbourne have assigned email addresses to individual trees so citizens can report problems — and people started writing them love letters instead. The canopy of a single mature city tree can intercept over 500 gallons of rainfall per year, reducing flood risk block by block.' },
      { title: 'Why Mirrors Flip Left and Right but Not Up and Down', content: 'Mirrors do not actually flip left and right. What they reverse is front and back — your reflection is a depth-inverted copy of you. We perceive it as a left-right swap because we mentally rotate the image to compare it with ourselves. If you imagine walking around behind the mirror, everything lines up. The confusion is a cognitive shortcut, not a property of light or glass.' },
      { title: 'The Invention of Blue', content: 'Ancient languages often lacked a word for blue. Homer described the sea as "wine-dark." The Egyptians were among the first to manufacture a blue pigment around 2200 BC by heating limestone, sand, and copper. For centuries, the only source of blue paint in Europe was lapis lazuli from Afghanistan, making it more expensive than gold. Ultramarine was reserved for the robes of the Virgin Mary in Renaissance paintings.' },
      { title: 'How Mushrooms Talk', content: 'Fungi generate electrical impulses that travel along their hyphae in patterns strikingly similar to nerve signals. Researchers have recorded up to 50 distinct signal clusters, which some interpret as a rudimentary vocabulary. Mycelial networks connect trees in forests, allowing them to share nutrients and chemical warnings. A single fungal network in Oregon spans 2,385 acres, making it one of the largest living organisms on Earth.' },
      { title: 'The Coastline Paradox', content: 'The length of a coastline depends on the ruler you use to measure it. With a 100-kilometer ruler, Britain has one length; with a 10-meter ruler, it has a vastly longer one. As your measurement unit shrinks, the coastline length approaches infinity. Benoit Mandelbrot used this observation to develop fractal geometry, showing that many natural shapes cannot be described by traditional Euclidean dimensions at all.' },
      { title: 'Why We Forget Dreams', content: 'The brain actively suppresses dream memories during the transition to waking. Norepinephrine, a chemical essential for forming new memories, drops to its lowest levels during REM sleep. The hippocampus, which transfers short-term memories to long-term storage, is largely offline during dreaming. If you wake suddenly during REM, you catch a brief window before the memory fades — which is why alarm clocks sometimes preserve fragments.' },
      { title: 'The Weight of a Cloud', content: 'A typical cumulus cloud weighs about 500,000 kilograms — roughly the mass of 80 elephants. It stays aloft because that weight is distributed across billions of tiny water droplets spread over a huge volume, and the rising air beneath it pushes upward faster than the droplets fall. When droplets coalesce and grow heavy enough to overcome the updraft, it rains.' },
      { title: 'How Concrete Changed Rome', content: 'Roman concrete, or opus caementicium, used volcanic ash that reacted with seawater to become stronger over time. Modern Portland cement begins degrading within decades, but Roman harbor structures have lasted 2,000 years. Scientists discovered that seawater filtering through the concrete grows interlocking mineral crystals that reinforce the material. We are still trying to replicate this self-healing property today.' },
      { title: 'Perfect Numbers and Ancient Greeks', content: 'A perfect number equals the sum of its proper divisors: 6 is 1+2+3, and 28 is 1+2+4+7+14. The Greeks considered them mystical — Euclid proved a formula for generating even perfect numbers around 300 BC. We still do not know whether any odd perfect numbers exist. As of today, only 51 perfect numbers have been found, and every one of them is even. The largest has over 49 million digits.' },
      { title: 'The Language of Whistles', content: 'In the Canary Islands, Silbo Gomero is a whistled language that carries across deep ravines for up to five kilometers. It encodes Spanish into two vowel and four consonant whistled sounds. Brain scans show that speakers process Silbo in the same language centers used for spoken speech, not in auditory or music areas. UNESCO recognized it as an intangible cultural heritage, and it is now taught in local schools.' },
      { title: 'Why Old Books Smell', content: 'The distinctive scent of old books comes from the chemical breakdown of cellulose and lignin in the paper. As these compounds decompose, they release vanillin, benzaldehyde, and other volatile organic compounds. Vanillin gives a faint vanilla sweetness, while benzaldehyde adds an almond-like note. Researchers have even proposed using chemical analysis of these gases to assess the degradation state of books without touching them.' },
      { title: 'The Mpemba Effect', content: 'Under certain conditions, hot water can freeze faster than cold water. First documented by Aristotle and rediscovered by Tanzanian student Erasto Mpemba in 1963, the phenomenon still lacks a universally accepted explanation. Proposed mechanisms include evaporation reducing the volume of hot water, dissolved gases escaping more readily, and differences in convection currents. Despite decades of experiments, the effect remains one of the most debated puzzles in thermodynamics.' },
    ];
    const idx = Math.floor(Math.random() * fallbacks.length);
    return fallbacks[idx];
  },
  async summarizeAndTag(title: string, content: string): Promise<AIEnrichment> {
    let errorMessage = 'error generating tags from gemini';
    if (hasValidApiKey(GEMINI_API_KEY)) {
      try {
        const prompt = [
          'System Role: You are a semantic analysis engine specialized in knowledge graph construction. Your goal is to identify the \"atomic concepts\" within a text—ideas that are specific enough to be unique, but universal enough to connect to other disciplines.',
          '',
          'Task: Analyze the provided note and generate exactly 2–4 tags.',
          '',
          'Tagging Constraints:',
          '',
          'Granularity over Generalization: Avoid broad category tags (e.g., do NOT use \"Philosophy,\" \"Science,\" or \"Math\"). Instead, identify the specific sub-branch or core mechanism (e.g., \"Epistemology,\" \"Stochasticity,\" or \"Optimization\").',
          '',
          'Format: Tags must be 1 word (hyphenated only if absolutely necessary).',
          '',
          'Connectivity: Choose tags that represent the functional or thematic core of the text. Ask yourself: \"If this idea appeared in a completely different field, what would that bridge be called?\"',
          '',
          'No Redundancy: Each tag should represent a distinct conceptual dimension of the note.',
          '',
          'Example 1 (Text about Marcus Aurelius and daily routine):',
          '',
          'Tags: [Stoicism, Discipline, Temporality]',
          '',
          'Example 2 (Text about neural network backpropagation):',
          '',
          'Tags: [Calculus, Optimization, Feedback]',
          '',
          'Example 3 (Text about the heat death of the universe):',
          '',
          'Tags: [Entropy, Equilibrium, Cosmology]',
          '',
          'Return ONLY valid JSON with this shape:',
          '{"summary":"...", "autoTags":["tag1","tag2"]}',
          'Constraints:',
          '- summary: 1-2 sentences, max 240 characters.',
          '- autoTags: 2-4 tags as defined above.',
          '- Do not use the title words as tags; tags must come from the body content.',
          '',
          `Input Text: ${content || ''}`,
          `Title: ${title || 'Untitled'}`,
        ].join('\n');

        const response = await fetch(getGeminiEndpoint(GEMINI_MODEL), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = extractTextFromResponse(data);
          const parsed = extractJsonPayload(text);
          if (parsed?.summary) {
            const autoTags = finalizeTags(parsed.autoTags ?? [], title, content, 2, 4);
            return {
              summary: parsed.summary.trim().slice(0, 240),
              autoTags: ensureTagCount(autoTags, 2, 4),
            };
          }
          errorMessage = 'error generating tags from gemini: invalid response format';
        } else {
          const errorText = await response.text();
          errorMessage = `error generating tags from gemini: ${response.status} ${errorText}`.slice(0, 200);
        }
      } catch {
        errorMessage = 'error generating tags from gemini: request failed';
      }
    } else {
      errorMessage = 'error generating tags from gemini: missing api key';
    }

    throw new Error(errorMessage);
  },

  async synthesizeChapter(chapterTag: string, notes: Array<{ id: string; title: string; content: string }>): Promise<AISynthesis> {
    if (!hasValidApiKey(GEMINI_API_KEY)) {
      throw new Error('API key required for AI Knowledge Synthesis');
    }

    try {
      // Prepare note summaries for the prompt
      const noteSummaries = notes.map((note, idx) =>
        `[${idx + 1}] "${note.title}"\n${note.content.slice(0, 300)}${note.content.length > 300 ? '...' : ''}`
      ).join('\n\n');

      const prompt = [
        'You are a knowledge synthesis engine that creates meta-insights by combining related notes.',
        '',
        `Task: Analyze the ${notes.length} notes below, all tagged with "#${chapterTag}". Create a synthesized meta-note that:`,
        '1. Identifies overarching patterns, themes, and connections between the notes',
        '2. Extracts key insights that emerge when viewing these notes together',
        '3. Highlights contradictions, complementary ideas, or knowledge gaps',
        '4. Creates a coherent narrative that elevates understanding beyond individual notes',
        '',
        'Return ONLY valid JSON with this shape:',
        '{"title":"...", "content":"..."}',
        '',
        'Constraints:',
        '- title: Should reflect the synthesis theme (e.g., "Synthesis: [Theme Name]")',
        '- content: 200-400 words. Include citations like [1], [2] to reference source notes.',
        '- Write in an engaging, insightful tone that reveals emergent knowledge',
        '- Do NOT just summarize each note — find the meta-patterns',
        '',
        `Chapter Tag: #${chapterTag}`,
        `Number of Notes: ${notes.length}`,
        '',
        'Source Notes:',
        noteSummaries,
      ].join('\n');

      const response = await fetch(getGeminiEndpoint(GEMINI_MODEL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = extractTextFromResponse(data);
      const parsed = extractJsonObject<{ title: string; content: string }>(text);

      if (!parsed?.title || !parsed?.content) {
        throw new Error('Invalid response format from AI');
      }

      return {
        title: parsed.title.trim(),
        content: parsed.content.trim(),
        sourceNoteIds: notes.map(n => n.id),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Synthesis failed';
      throw new Error(`AI Knowledge Synthesis error: ${message}`);
    }
  },

  async searchKnowledge(query: string, notes: Array<{ id: string; title: string; content: string; tags: string[] }>): Promise<string> {
    if (!hasValidApiKey(GEMINI_API_KEY)) {
      throw new Error('API key required for Conversational Knowledge Search');
    }

    try {
      // Prepare note context for the prompt
      const noteContext = notes.slice(0, 20).map((note, idx) =>
        `[${idx + 1}] "${note.title}" (Tags: ${note.tags.join(', ')})\n${note.content.slice(0, 200)}${note.content.length > 200 ? '...' : ''}`
      ).join('\n\n');

      const prompt = [
        'You are a conversational knowledge search assistant. The user has a personal knowledge base of notes.',
        '',
        `User Question: "${query}"`,
        '',
        'Task: Answer the user\'s question using ONLY the information from their notes below.',
        'If the answer cannot be found in the notes, say so clearly.',
        'Cite specific notes using [1], [2] notation.',
        'Be conversational and helpful, not robotic.',
        '',
        `Available Notes (${notes.length} total, showing first 20):`,
        noteContext,
        '',
        'Your response:',
      ].join('\n');

      const response = await fetch(getGeminiEndpoint(GEMINI_MODEL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const answer = extractTextFromResponse(data);

      if (!answer) {
        throw new Error('No response from AI');
      }

      return answer.trim();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      throw new Error(`Knowledge Search error: ${message}`);
    }
  },

  async findRelatedNotes(
    currentNote: { title: string; content: string; tags: string[] },
    allNotes: Array<{ id: string; title: string; content: string; tags: string[]; createdAt: Date }>
  ): Promise<RelatedNote[]> {
    if (!hasValidApiKey(GEMINI_API_KEY)) {
      throw new Error('API key required for Smart Resurfacing');
    }

    try {
      // Filter out very recent notes (< 7 days old) - we want to resurface OLD notes
      const oldNotes = allNotes.filter(note => {
        const daysSinceCreation = (Date.now() - new Date(note.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation >= 7;
      });

      if (oldNotes.length === 0) {
        return [];
      }

      // Take sample of old notes for analysis
      const sampleNotes = oldNotes.slice(0, 30).map((note, idx) =>
        `[${idx + 1}] ID: ${note.id}\nTitle: "${note.title}"\nTags: ${note.tags.join(', ')}\nContent: ${note.content.slice(0, 200)}...`
      ).join('\n\n');

      const prompt = [
        'You are a smart note resurfacing engine. Analyze the current note and find related old notes.',
        '',
        'Current Note:',
        `Title: "${currentNote.title}"`,
        `Tags: ${currentNote.tags.join(', ')}`,
        `Content: ${currentNote.content.slice(0, 500)}...`,
        '',
        'Task: Find up to 5 most relevant old notes that:',
        '- Support or expand on ideas in the current note',
        '- Contradict or challenge the current note',
        '- Provide missing context',
        '- Show how thinking evolved',
        '',
        'Return ONLY valid JSON array with this shape:',
        '[{"noteId":"...", "relevanceScore":0-100, "reason":"...", "relationship":"supporting|contradicting|expanding|related"}]',
        '',
        'Old Notes to consider:',
        sampleNotes,
      ].join('\n');

      const response = await fetch(getGeminiEndpoint(GEMINI_MODEL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const text = extractTextFromResponse(data);
      const parsed = extractJsonObject<RelatedNote[]>(text);

      return parsed || [];
    } catch (err) {
      console.error('findRelatedNotes error:', err);
      return [];
    }
  },

  async analyzeArguments(
    topic: string,
    notes: Array<{ id: string; title: string; content: string; createdAt: Date }>
  ): Promise<ArgumentAnalysis> {
    if (!hasValidApiKey(GEMINI_API_KEY)) {
      throw new Error('API key required for Argument Mapper');
    }

    try {
      const noteContext = notes.map((note, idx) =>
        `[${idx + 1}] ID: ${note.id}\nDate: ${new Date(note.createdAt).toLocaleDateString()}\nTitle: "${note.title}"\nContent: ${note.content.slice(0, 300)}...`
      ).join('\n\n');

      const prompt = [
        'You are an argument analysis engine. Analyze these notes to find supporting, contradicting, and synthesizing viewpoints.',
        '',
        `Topic: "${topic}"`,
        '',
        'Task: Categorize notes based on their stance and extract key excerpts.',
        'Return ONLY valid JSON with this shape:',
        '{',
        '  "supportingNotes": [{"noteId":"...", "excerpt":"..."}],',
        '  "contradictingNotes": [{"noteId":"...", "excerpt":"..."}],',
        '  "synthesisNotes": [{"noteId":"...", "excerpt":"..."}],',
        '  "evolution": [{"date":"YYYY-MM-DD", "noteId":"...", "stance":"..."}]',
        '}',
        '',
        'Notes:',
        noteContext,
      ].join('\n');

      const response = await fetch(getGeminiEndpoint(GEMINI_MODEL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const text = extractTextFromResponse(data);
      const parsed = extractJsonObject<any>(text);

      if (!parsed) {
        throw new Error('Invalid response format');
      }

      return {
        topic,
        supportingNotes: parsed.supportingNotes || [],
        contradictingNotes: parsed.contradictingNotes || [],
        synthesisNotes: parsed.synthesisNotes || [],
        evolution: (parsed.evolution || []).map((e: any) => ({
          date: new Date(e.date),
          noteId: e.noteId,
          stance: e.stance,
        })),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      throw new Error(`Argument analysis error: ${message}`);
    }
  },

  async extractContent(
    source: string,
    type: 'url' | 'text',
    existingNotes: Array<{ id: string; title: string; content: string; tags: string[] }>
  ): Promise<ExtractedContent> {
    if (!hasValidApiKey(GEMINI_API_KEY)) {
      throw new Error('API key required for Reading Integration');
    }

    try {
      // For URLs, we'd need to fetch content first (simplified here)
      const contentToAnalyze = type === 'text' ? source : source;

      const noteContext = existingNotes.slice(0, 20).map(note =>
        `"${note.title}" (Tags: ${note.tags.join(', ')})`
      ).join('\n');

      const prompt = [
        'You are a content extraction and linking engine. Extract key information and link to existing notes.',
        '',
        'Source Content:',
        contentToAnalyze.slice(0, 2000),
        '',
        'Existing Notes:',
        noteContext,
        '',
        'Task: Extract and analyze the content.',
        'Return ONLY valid JSON with this shape:',
        '{',
        '  "title": "...",',
        '  "keyPoints": ["...", "..."],',
        '  "summary": "...",',
        '  "suggestedTags": ["...", "..."],',
        '  "linkedNoteIds": ["..."]',
        '}',
        '',
        'linkedNoteIds should contain IDs of existing notes that relate to this content.',
      ].join('\n');

      const response = await fetch(getGeminiEndpoint(GEMINI_MODEL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const text = extractTextFromResponse(data);
      const parsed = extractJsonObject<ExtractedContent>(text);

      if (!parsed) {
        throw new Error('Invalid response format');
      }

      return {
        title: parsed.title || 'Imported Content',
        keyPoints: parsed.keyPoints || [],
        summary: parsed.summary || '',
        suggestedTags: parsed.suggestedTags || [],
        linkedNoteIds: parsed.linkedNoteIds || [],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      throw new Error(`Content extraction error: ${message}`);
    }
  },
};
