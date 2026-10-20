# RAG and AI behavior

## Knowledge sources

The local knowledge base is the published `resources` table, seeded from country/study-abroad guidance, original IELTS lessons and official IELTS resource link metadata. IELTS mode additionally ranks published IELTS exercises. Resource source URL, source name and review text are returned as citations. The database contains the optional `embedding_json` column.

## Retrieval and ranking

1. The API accepts a 3–2,500 character question and a mode (`study-abroad` or `ielts`) and language (`en` or `bn`).
2. The query is lowercased, split into English/Bangla alphanumeric terms, filtered by a built-in stop-word set, deduplicated and limited to 24 terms.
3. All published resources are scored lexically by title, category and body matches, with an exact phrase title boost. Only results above the score threshold are retained; the top five are used.
4. If `OPENAI_API_KEY`, `RAG_USE_QUERY_EMBEDDINGS=true`, and stored resource embeddings exist, the server embeds the query and combines cosine similarity (72%) with lexical score (28%). Embedding errors are logged and retrieval falls back to lexical ranking.
5. `npm run embed:resources` batches published resources into the configured OpenAI embedding model and persists vectors. It incurs API usage.

## Answer generation and citations

Without an OpenAI API key, the endpoint returns local retrieved text and the source list; this is retrieval-only mode, not generated AI. With a key, retrieved passages are supplied as evidence to the configured chat model. The system prompt says to treat retrieved content as untrusted evidence, cite source numbers, state when evidence is insufficient, and avoid guarantees or immigration/legal claims. The API separately returns `sources`; the UI renders safe external links.

The model output is not independently fact-checked, and cited source links do not establish that the response is current or authoritative. A link to IELTS preparation resources does not mean Pothik republishes official tests.

## Cache and cost controls

Exact normalized question, mode and language tuples are hashed into `tutor_cache`; non-time-sensitive answers have a 14-day TTL. The cache bypass pattern includes terms such as latest/current/today/deadline/open-now/policy-change/next-intake/application-window. Query embeddings are disabled by default to avoid per-question API charges. Tutor calls are rate-limited.

Signed-in conversations are rendered in the browser session only; new API calls are not persisted to `chat_logs`. The legacy table remains in the schema for compatibility and may contain older records.

## Failure modes and limits

- No matching sources: the response recommends narrowing the question or checking official sources.
- API or embedding outage: generation returns a generic service-unavailable answer with any retrieved links; embedding failure falls back to lexical.
- Prompt injection, source drift, retrieval misses and model hallucination remain possible.
- No proactive/continuous monitoring occurs. Users must ask questions; configured scholarship refresh is separate.
- Do not submit sensitive personal data. Explain provider data handling and obtain appropriate consent before enabling external AI for real users.
