require('dotenv').config();
const ai = require('../src/ai');
const { createDatabase } = require('../src/db');
async function main() {
  if (!ai.provider()) throw new Error('Set GEMINI_API_KEY (or OPENAI_API_KEY) in .env before generating embeddings.');
  const db = await createDatabase();
  const rows = db.prepare('SELECT id,title,category,body,source_url FROM resources WHERE published=1 ORDER BY id').all();
  console.log(`Embedding ${rows.length} resources with ${ai.provider()} (${ai.embeddingModel()})`);
  for (let i = 0; i < rows.length; i += 32) {
    const batch = rows.slice(i, i + 32);
    const inputs = batch.map(r => `Title: ${r.title}\nCategory: ${r.category}\nContent: ${r.body}\nOfficial source: ${r.source_url}`);
    const vectors = await ai.embed(inputs, 'document');
    const tx = db.transaction(() => vectors.forEach((vector, j) => db.prepare('UPDATE resources SET embedding_json=? WHERE id=?').run(JSON.stringify(vector), batch[j].id)));
    tx(); console.log(`Embedded ${Math.min(i + batch.length, rows.length)}/${rows.length} resources`);
  }
  db.close(); console.log('Done. Set RAG_USE_QUERY_EMBEDDINGS=true to use vector similarity plus keyword matching.');
}
main().catch(e => { console.error(e.message); process.exit(1); });
