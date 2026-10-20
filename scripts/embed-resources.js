require('dotenv').config();
const OpenAI = require('openai');
const { createDatabase } = require('../src/db');
async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .env before generating embeddings.');
  const db = await createDatabase();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const rows = db.prepare('SELECT id,title,category,body,source_url FROM resources WHERE published=1 ORDER BY id').all();
  for (let i = 0; i < rows.length; i += 32) {
    const batch = rows.slice(i, i + 32);
    const inputs = batch.map(r => `Title: ${r.title}\nCategory: ${r.category}\nContent: ${r.body}\nOfficial source: ${r.source_url}`);
    const response = await client.embeddings.create({ model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small', input: inputs });
    const tx = db.transaction(() => response.data.forEach((item, j) => db.prepare('UPDATE resources SET embedding_json=? WHERE id=?').run(JSON.stringify(item.embedding), batch[j].id)));
    tx(); console.log(`Embedded ${Math.min(i + batch.length, rows.length)}/${rows.length} resources`);
  }
  db.close(); console.log('Done. RAG now uses vector similarity plus keyword matching.');
}
main().catch(e => { console.error(e.message); process.exit(1); });
