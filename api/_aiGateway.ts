import type { IncomingMessage, ServerResponse } from 'http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface VercelRequest extends IncomingMessage {
  body: any;
}

export interface VercelResponse extends ServerResponse {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
}

type AiGatewayOptions = {
  engine: string;
  defaultModel?: string;
  modelEnvKey?: string;
};

const DEFAULT_MODEL = 'gpt-4o-mini';

const safeModelName = (value: unknown, fallback: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return /^[a-zA-Z0-9._-]+$/.test(raw) ? raw : fallback;
};

const parseBody = (body: unknown): any => {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return (body && typeof body === 'object') ? body : {};
};

const MAX_PROMPT_CHARS = 60000;
const MAX_PROMPT_PART_CHARS = 12000;

const clipText = (value: string, limit: number): string => {
  const text = String(value || '');
  if (text.length <= limit) return text;
  const head = Math.floor(limit * 0.65);
  const tail = Math.max(0, limit - head);
  return `${text.slice(0, head)}\n...[truncated ${text.length - limit} chars]...\n${text.slice(text.length - tail)}`;
};

const summarizeInlineData = (inlineData: any): string => {
  const mimeType = String(inlineData?.mimeType || 'application/octet-stream');
  const dataLen = typeof inlineData?.data === 'string' ? inlineData.data.length : 0;
  return `[inlineData omitted: ${mimeType}, ${dataLen} chars]`;
};

const sanitizePromptValue = (value: unknown, depth: number = 0): unknown => {
  if (depth > 4) return '[omitted-depth]';
  if (typeof value === 'string') return clipText(value, 2500);
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitizePromptValue(v, depth + 1));
  if (!value || typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;
  if (obj.inlineData && typeof obj.inlineData === 'object') {
    return summarizeInlineData(obj.inlineData);
  }

  const out: Record<string, unknown> = {};
  let idx = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (idx >= 20) {
      out.__truncatedKeys = `[omitted ${Object.keys(obj).length - idx} keys]`;
      break;
    }
    if (k === 'data' && typeof v === 'string' && v.length > 512) {
      out[k] = `[data omitted: ${v.length} chars]`;
    } else {
      out[k] = sanitizePromptValue(v, depth + 1);
    }
    idx += 1;
  }
  return out;
};

const normalizePrompt = (prompt: unknown): string => {
  if (typeof prompt === 'string') return clipText(prompt, MAX_PROMPT_CHARS);
  if (Array.isArray(prompt)) {
    const merged = prompt.slice(0, 30).map((p) => {
      if (typeof p === 'string') return clipText(p, MAX_PROMPT_PART_CHARS);
      if (p && typeof p === 'object' && 'text' in (p as any)) return clipText(String((p as any).text || ''), MAX_PROMPT_PART_CHARS);
      if (p && typeof p === 'object' && 'inlineData' in (p as any)) return summarizeInlineData((p as any).inlineData);
      try {
        return JSON.stringify(sanitizePromptValue(p));
      } catch {
        return String(p || '');
      }
    }).join('\n');
    return clipText(merged, MAX_PROMPT_CHARS);
  }
  if (prompt && typeof prompt === 'object') {
    try {
      return clipText(JSON.stringify(sanitizePromptValue(prompt)), MAX_PROMPT_CHARS);
    } catch {
      return clipText(String(prompt), MAX_PROMPT_CHARS);
    }
  }
  return clipText(String(prompt || ''), MAX_PROMPT_CHARS);
};

const isPlaceholderKey = (value: string): boolean => {
  const v = String(value || '').toLowerCase().trim();
  if (!v) return false;
  return v.includes('your_openai') || v.includes('your_ope') || v.includes('your_api_key') || v.includes('replace_with');
};

let localEnvLoaded = false;
const loadLocalEnvIfNeeded = () => {
  if (localEnvLoaded) return;
  localEnvLoaded = true;
  const isProd = String((process.env || {}).NODE_ENV || '').toLowerCase() === 'production';
  if (isProd) return;

  const filePath = resolve(process.cwd(), '.env.local');
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    const already = String((process.env || {})[key] || '').trim();
    if (!already || isPlaceholderKey(already)) {
      (process.env as any)[key] = value;
    }
  }
};

const readLocalKeyDirect = (): string => {
  const isProd = String((process.env || {}).NODE_ENV || '').toLowerCase() === 'production';
  if (isProd) return '';
  const filePath = resolve(process.cwd(), '.env.local');
  if (!existsSync(filePath)) return '';
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === 'OPENAI_API_KEY') return value.trim();
  }
  return '';
};

const getApiKey = (): string => {
  loadLocalEnvIfNeeded();
  const local = readLocalKeyDirect();
  if (local && !isPlaceholderKey(local)) return local;
  const env = process.env || {};
  const openai = String(env.OPENAI_API_KEY || '').trim();
  if (openai && !isPlaceholderKey(openai)) return openai;
  const vite = String(env.VITE_OPENAI_API_KEY || '').trim();
  if (vite && !isPlaceholderKey(vite)) return vite;
  return openai || vite || '';
};

const isNetworkishError = (err: unknown): boolean => {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('timeout') ||
    msg.includes('socket') ||
    msg.includes('tls') ||
    msg.includes('certificate')
  );
};

export const createAiGatewayHandler = (options: AiGatewayOptions) => {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, reason: 'Method Not Allowed' });
      return;
    }

    const apiKey = getApiKey();
    const debugHeader = String((req.headers as any)?.['x-ai-debug'] || '').trim();
    const isProd = String((process.env || {}).NODE_ENV || '').toLowerCase() === 'production';
    if (debugHeader === '1' && !isProd) {
      const env = process.env || {};
      const openaiRaw = String(env.OPENAI_API_KEY || '').trim();
      const viteRaw = String(env.VITE_OPENAI_API_KEY || '').trim();
      const localRaw = String(readLocalKeyDirect() || '').trim();
      res.status(200).json({
        ok: true,
        debug: true,
        engine: options.engine,
        nodeEnv: String(env.NODE_ENV || ''),
        cwd: process.cwd(),
        localEnvFilePresent: existsSync(resolve(process.cwd(), '.env.local')),
        localKeyPresent: Boolean(localRaw),
        localKeyStartsWithSk: localRaw.startsWith('sk-'),
        localKeyLength: localRaw.length,
        localKeyIsPlaceholder: isPlaceholderKey(localRaw),
        hasOpenAiKey: Boolean(openaiRaw),
        openAiIsPlaceholder: isPlaceholderKey(openaiRaw),
        hasViteOpenAiKey: Boolean(viteRaw),
        viteOpenAiIsPlaceholder: isPlaceholderKey(viteRaw),
        selectedKeyStartsWithSk: String(apiKey || '').startsWith('sk-'),
        selectedKeyLength: String(apiKey || '').length
      });
      return;
    }

    const body = parseBody(req.body);
    const prompt = body?.prompt;
    const config = body?.config || {};
    const modelFromSpecificEnv = options.modelEnvKey ? String((process.env || {})[options.modelEnvKey] || '').trim() : '';
    const modelFromEnv = String((process.env || {}).OPENAI_MODEL || '').trim();
    const defaultModel = options.defaultModel || DEFAULT_MODEL;
    const primaryModel = safeModelName(body?.primaryModelName, modelFromSpecificEnv || modelFromEnv || defaultModel);
    const fallbackModel = safeModelName(body?.fallbackModelName, primaryModel);

    if (typeof prompt !== 'string' && !Array.isArray(prompt)) {
      res.status(400).json({ ok: false, reason: 'Invalid prompt payload' });
      return;
    }

    const temperature = Number(config?.generationConfig?.temperature ?? 0);
    const maxOutputTokensRaw = config?.generationConfig?.maxOutputTokens;
    const maxOutputTokens = Number.isFinite(Number(maxOutputTokensRaw)) ? Number(maxOutputTokensRaw) : null;
    const wantsJson = String(config?.generationConfig?.responseMimeType || '').toLowerCase().includes('application/json');
    const promptText = normalizePrompt(prompt);
    const isKeywordExtraction = wantsJson && (/"keywords"\s*:\s*\[/i.test(promptText) || /\bkeywords\b/i.test(promptText));
    const isAnalysis = wantsJson && (/\batsScore\b/i.test(promptText) && /\bcontactProfile\b/i.test(promptText) && /\bmissingKeywords\b/i.test(promptText));

    const keyMissing = !apiKey;
    const keyPlaceholder = isPlaceholderKey(apiKey);
    if ((keyMissing || keyPlaceholder) && !isProd) {
      if (wantsJson) {
        const text = isAnalysis
          ? JSON.stringify({
            jobTitle: '',
            company: '',
            atsScore: 0,
            relevanceScore: 0,
            roleFitAnalysis: '',
            contactProfile: { name: '', email: '', phone: '', linkedin: '', location: '' },
            languages: [],
            requiredLanguages: [],
            missingKeywords: [],
            criticalIssues: ['AI is running in mock mode. Set OPENAI_API_KEY to enable real generation.'],
            keyStrengths: [],
            summary: ''
          })
          : (isKeywordExtraction ? JSON.stringify({ keywords: [] }) : JSON.stringify({}));
        res.status(200).json({ ok: true, text, model: 'mock', engine: options.engine });
        return;
      }

      const text =
        `> AI is running in mock mode (no valid OPENAI_API_KEY detected in the dev server).\n\n` +
        `Set OPENAI_API_KEY in .env.local and restart the dev server to enable real generation.\n`;
      res.status(200).json({ ok: true, text, model: 'mock', engine: options.engine });
      return;
    }

    if (!apiKey) {
      res.status(500).json({ ok: false, reason: 'Server AI key missing' });
      return;
    }
    if (isPlaceholderKey(apiKey)) {
      res.status(500).json({ ok: false, reason: 'OPENAI_API_KEY is a placeholder. Set a real key in .env.local and restart the dev server.' });
      return;
    }

    try {
      const runModel = async (modelName: string) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelName,
              temperature: Number.isFinite(temperature) ? temperature : 0,
              ...(maxOutputTokens && maxOutputTokens > 0 ? { max_tokens: Math.floor(maxOutputTokens) } : {}),
              ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
              messages: [
                { role: 'user', content: promptText }
              ]
            }),
            signal: controller.signal
          });

          const payload: any = await response.json().catch(() => ({}));
          if (!response.ok) {
            const msg = String(payload?.error?.message || `OpenAI request failed (${response.status})`);
            throw new Error(msg);
          }

          return String(payload?.choices?.[0]?.message?.content || '');
        } finally {
          clearTimeout(timeout);
        }
      };

      try {
        const text = await runModel(primaryModel);
        res.status(200).json({ ok: true, text, model: primaryModel, engine: options.engine });
        return;
      } catch (primaryError: any) {
        if (fallbackModel !== primaryModel) {
          try {
            const text = await runModel(fallbackModel);
            res.status(200).json({ ok: true, text, model: fallbackModel, engine: options.engine });
            return;
          } catch (fallbackError: any) {
            if (isNetworkishError(fallbackError) || isNetworkishError(primaryError)) {
              if (wantsJson) {
                const text = isAnalysis
                  ? JSON.stringify({
                    jobTitle: '',
                    company: '',
                    atsScore: 0,
                    relevanceScore: 0,
                    roleFitAnalysis: '',
                    contactProfile: { name: '', email: '', phone: '', linkedin: '', location: '' },
                    languages: [],
                    requiredLanguages: [],
                    missingKeywords: [],
                    criticalIssues: ['AI is offline locally (network blocked). Add OPENAI_API_KEY and check internet/firewall.'],
                    keyStrengths: [],
                    summary: ''
                  })
                  : (isKeywordExtraction
                    ? JSON.stringify({ keywords: [] })
                    : JSON.stringify({
                      resumeMarkdown: '## SUMMARY\nAI is offline locally (network blocked). Add OPENAI_API_KEY and retry.\n\n## EXPERIENCE\n\n## SKILLS\n\n## EDUCATION',
                      verification: {
                        noFabrication: true,
                        noJdMirroring: true,
                        noKeywordStuffing: true,
                        noToolFirstBullets: true,
                        onePageIntent: true,
                        notes: ['offline_mock']
                      },
                      changeLog: []
                    }));
                res.status(200).json({ ok: true, text, model: 'offline-mock', engine: options.engine });
                return;
              }
              const text =
                `> AI is offline locally (network blocked).\n\n` +
                `Add OPENAI_API_KEY in .env.local and check internet/firewall, then retry.\n`;
              res.status(200).json({ ok: true, text, model: 'offline-mock', engine: options.engine });
              return;
            }
            const message = String(fallbackError?.message || primaryError?.message || 'AI generation failed');
            res.status(502).json({ ok: false, reason: message });
            return;
          }
        }

        if (isNetworkishError(primaryError)) {
          if (wantsJson) {
            const text = isAnalysis
              ? JSON.stringify({
                jobTitle: '',
                company: '',
                atsScore: 0,
                relevanceScore: 0,
                roleFitAnalysis: '',
                contactProfile: { name: '', email: '', phone: '', linkedin: '', location: '' },
                languages: [],
                requiredLanguages: [],
                missingKeywords: [],
                criticalIssues: ['AI is offline locally (network blocked). Add OPENAI_API_KEY and check internet/firewall.'],
                keyStrengths: [],
                summary: ''
              })
              : (isKeywordExtraction
                ? JSON.stringify({ keywords: [] })
                : JSON.stringify({
                  resumeMarkdown: '## SUMMARY\nAI is offline locally (network blocked). Add OPENAI_API_KEY and retry.\n\n## EXPERIENCE\n\n## SKILLS\n\n## EDUCATION',
                  verification: {
                    noFabrication: true,
                    noJdMirroring: true,
                    noKeywordStuffing: true,
                    noToolFirstBullets: true,
                    onePageIntent: true,
                    notes: ['offline_mock']
                  },
                  changeLog: []
                }));
            res.status(200).json({ ok: true, text, model: 'offline-mock', engine: options.engine });
            return;
          }
          const text =
            `> AI is offline locally (network blocked).\n\n` +
            `Add OPENAI_API_KEY in .env.local and check internet/firewall, then retry.\n`;
          res.status(200).json({ ok: true, text, model: 'offline-mock', engine: options.engine });
          return;
        }

        const message = String(primaryError?.message || 'AI generation failed');
        res.status(502).json({ ok: false, reason: message });
        return;
      }
    } catch (error: any) {
      const message = String(error?.message || 'AI gateway error');
      res.status(500).json({ ok: false, reason: message });
    }
  };
};
