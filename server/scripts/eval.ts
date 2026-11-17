/* Tiny retrieval eval: ingests sample notes, asks questions, reports hit-rate@K.
   Run with `npm run eval` (mock provider by default; set OPENAI_API_KEY to evaluate real embeddings). */
import { loadConfig } from '../src/config';
import { buildContainer } from '../src/container';

const NOTES = [
  { title: 'Passport renewal', content: 'My passport expires in March. Renewal takes six weeks and needs two photos and form DS-82.' },
  { title: 'Sourdough recipe', content: 'Sourdough bread needs 500g flour, 350g water, 100g starter and 10g salt. Bake at 230C for 40 minutes.' },
  { title: 'Kubernetes notes', content: 'A Kubernetes pod is the smallest deployable unit. Deployments manage replica sets and rolling updates.' },
  { title: 'Marathon training', content: 'Marathon plan: long run every Sunday, tempo run on Wednesday, rest on Friday. Peak mileage is 60 km per week.' },
  { title: 'Book: Deep Work', content: 'Deep Work argues that focused, distraction-free work produces rare value. Schedule four hour blocks without email.' },
  { title: 'Tokyo trip', content: 'Tokyo trip in October. Stay in Shinjuku, buy a Suica card, and visit Asakusa temple and teamLab Planets.' },
  { title: 'Home wifi', content: 'The router admin page is on the local network. The wifi network name is Maple-5G and the password is on the fridge.' },
];

const QUESTIONS: Array<{ q: string; expected: string }> = [
  { q: 'How long does passport renewal take?', expected: 'Passport renewal' },
  { q: 'How much flour do I need for sourdough?', expected: 'Sourdough recipe' },
  { q: 'What is a Kubernetes pod?', expected: 'Kubernetes notes' },
  { q: 'Which day is my long run in the marathon plan?', expected: 'Marathon training' },
  { q: 'What does Deep Work say about focus?', expected: 'Book: Deep Work' },
  { q: 'Which neighborhood should I stay in for Tokyo?', expected: 'Tokyo trip' },
  { q: 'What is the wifi network name?', expected: 'Home wifi' },
  { q: 'What is the airspeed velocity of a swallow?', expected: '(none)' },
];

async function main() {
  const config = loadConfig(process.env, { dbPath: ':memory:', logLevel: 'silent' });
  const c = buildContainer(config);
  for (const n of NOTES) await c.ingest.submit({ type: 'note', content: n.content, title: n.title });
  await c.jobs.drain();

  const K = 3;
  let hits = 0;
  let answerable = 0;
  console.log(`provider=${config.provider} embedding=${c.embedder.model} K=${K}\n`);
  for (const { q, expected } of QUESTIONS) {
    const { hits: found } = await c.retrieval.retrieve(q, K);
    const titles = found.map((h) => h.title);
    const ok = expected === '(none)' ? found.length === 0 : titles.includes(expected);
    if (expected !== '(none)') answerable++;
    if (ok && expected !== '(none)') hits++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${q}\n      expected=${expected} got=[${titles.join(', ')}]`);
  }
  console.log(`\nhit-rate@${K}: ${hits}/${answerable} (${Math.round((hits / answerable) * 100)}%)`);
  c.db.close();
}

void main();
