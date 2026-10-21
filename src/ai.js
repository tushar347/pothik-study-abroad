// AI provider layer for the Pothik Counsellor. Gemini is preferred when GEMINI_API_KEY is set;
// OpenAI remains supported as a fallback so existing deployments keep working.
const OpenAI = require('openai');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000);

function provider() {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}
function chatModel() {
  const p = provider();
  if (p === 'gemini') return process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  if (p === 'openai') return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return null;
}
function embeddingModel() {
  const p = provider();
  if (p === 'gemini') return process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  if (p === 'openai') return process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  return null;
}

async function geminiRequest(model, action, body) {
  let res;
  try {
    res = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (e) {
    throw Object.assign(new Error(`Gemini ${model} request failed: ${e.message}`), { retryable: true });
  }
  const data = await res.json().catch(() => ({}));
  // 429 (rate limit), 500 and 503 (overloaded) are usually temporary, so another model may succeed.
  if (!res.ok) throw Object.assign(new Error(`Gemini ${res.status}: ${data.error?.message || res.statusText}`), { retryable: [429, 500, 503].includes(res.status) });
  return data;
}
const isGemini3Plus = model => /^gemini-([3-9]|\d{2})/.test(model);

// history: [{ role: 'user' | 'assistant', content }] — earlier turns, oldest first.
async function generate({ system, history = [], question, temperature = 0.3, maxTokens = 1200 }) {
  const p = provider();
  if (!p) throw new Error('No AI provider configured.');
  if (p === 'gemini') {
    const contents = [...history, { role: 'user', content: question }].map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const fallbacks = (process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.5-flash,gemini-3.5-flash-lite').split(',').map(m => m.trim());
    const models = [...new Set([chatModel(), ...fallbacks].filter(Boolean))];
    let lastError;
    for (const model of models) {
      // Gemini 2.5+ models spend part of the output budget on internal reasoning, so leave headroom.
      const generationConfig = { maxOutputTokens: Math.max(maxTokens * 3, 2048) };
      // Gemini 3+ models are tuned for their default temperature (lowering it can cause looping);
      // "low" thinking keeps chat replies to a few seconds instead of 15+.
      if (isGemini3Plus(model)) generationConfig.thinkingConfig = { thinkingLevel: process.env.GEMINI_THINKING_LEVEL || 'low' };
      else generationConfig.temperature = temperature;
      try {
        const data = await geminiRequest(model, 'generateContent', { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig });
        if (data.promptFeedback?.blockReason) throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
        const candidate = data.candidates?.[0];
        const text = (candidate?.content?.parts || []).filter(part => !part.thought).map(part => part.text || '').join('').trim();
        if (!text) throw new Error(`Gemini returned no text (finishReason: ${candidate?.finishReason || 'unknown'})`);
        return text;
      } catch (e) {
        lastError = e;
        if (!e.retryable) throw e;
        console.warn(`${e.message}${model !== models[models.length - 1] ? ' — trying the fallback model.' : ''}`);
      }
    }
    throw lastError;
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: TIMEOUT_MS });
  const out = await client.chat.completions.create({ model: chatModel(), temperature, max_tokens: maxTokens, messages: [
    { role: 'system', content: system },
    ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: question }
  ] });
  const text = out.choices[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned no text.');
  return text;
}

// Returns one vector per input text. kind: 'document' when indexing resources, 'query' for a user question.
async function embed(texts, kind = 'document') {
  const p = provider();
  if (!p) throw new Error('No AI provider configured.');
  if (p === 'gemini') {
    const model = embeddingModel();
    const taskType = kind === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';
    const data = await geminiRequest(model, 'batchEmbedContents', { requests: texts.map(text => ({ model: `models/${model}`, content: { parts: [{ text }] }, taskType })) });
    return (data.embeddings || []).map(e => e.values);
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: TIMEOUT_MS });
  const out = await client.embeddings.create({ model: embeddingModel(), input: texts });
  return out.data.map(d => d.embedding);
}

module.exports = { provider, chatModel, embeddingModel, generate, embed };
