export interface AIEnrichment {
  summary: string;
  autoTags: string[];
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

function ensureTagCount(tags: string[], min = 3, max = 5): string[] {
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

function finalizeTags(tags: string[], title: string, content: string, min = 3, max = 5): string[] {
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
  async summarizeAndTag(title: string, content: string): Promise<AIEnrichment> {
    let errorMessage = 'error generating tags from gemini';
    if (hasValidApiKey(GEMINI_API_KEY)) {
      try {
        const prompt = [
          'You are an assistant that summarizes notes and produces tags.',
          'Return ONLY valid JSON with this shape:',
          '{"summary":"...", "autoTags":["tag1","tag2"]}',
          'Constraints:',
          '- summary: 1-2 sentences, max 240 characters.',
          '- autoTags: 3-5 lowercase, concise theme-level tags.',
          '- Only include tags that reflect the core topic. Avoid incidental details.',
          '- Avoid proper names, dates, or one-off specifics unless they are the core topic.',
          '- Do not use the title words as tags; tags must come from the body content.',
          '',
          `Title: ${title || 'Untitled'}`,
          `Content: ${content || ''}`,
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
            const autoTags = finalizeTags(parsed.autoTags ?? [], title, content, 3, 5);
            return {
              summary: parsed.summary.trim().slice(0, 240),
              autoTags,
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

    const summary = generateSummary(title, content);
    const autoTags = finalizeTags(generateAutoTags(content), title, content, 3, 5);
    return { summary, autoTags };
  },
};
