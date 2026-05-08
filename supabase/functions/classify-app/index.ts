import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MAX_BATCH = 30;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an app classification service. For each app name, classify by category and child-safety risk.

CATEGORIES: social, game, video, education, messenger, browser, utility, other

RISK LEVELS for children aged 6-14:
- low: educational, utilities, age-appropriate
- medium: messengers, browsers, mainstream games (Minecraft, YouTube Kids)
- high: open social networks (TikTok, Instagram, Snapchat), platforms with adult/violent content

OUTPUT: JSON array only, same order as input:
[{"app_name":"<input>","category":"<cat>","risk_level":"<risk>","reasoning":"<one sentence>"}]

Unknown apps: category="other", risk_level="medium", reasoning="Unknown app — manual review recommended".`;

const VALID_CATS = ['social','game','video','education','messenger','browser','utility','other'];
const VALID_RISKS = ['low','medium','high'];

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders },
  });
}

function parseJson<T>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(text) as T;
}

async function callGemini(userMessage: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonRes({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonRes({ error: 'Missing auth' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return jsonRes({ error: 'Unauthorized' }, 401);

  let body: { app_names?: string[] };
  try { body = await req.json(); } catch { return jsonRes({ error: 'Invalid JSON' }, 400); }

  const rawNames = Array.isArray(body.app_names) ? body.app_names.filter(n => typeof n === 'string' && n.trim()) : [];
  if (rawNames.length === 0) return jsonRes({ classifications: [] });
  if (rawNames.length > MAX_BATCH) return jsonRes({ error: `Max ${MAX_BATCH} apps per request` }, 400);

  const dedupMap = new Map<string, string>();
  for (const raw of rawNames) {
    const norm = raw.trim().toLowerCase();
    if (!dedupMap.has(norm)) dedupMap.set(norm, raw.trim());
  }
  const normalizedKeys = Array.from(dedupMap.keys());

  const { data: cachedRows } = await adminClient
    .from('app_classifications')
    .select('app_name, category, risk_level, reasoning')
    .in('app_name', normalizedKeys);

  const cachedMap = new Map((cachedRows ?? []).map(r => [r.app_name, r]));
  const uncached = normalizedKeys.filter(k => !cachedMap.has(k));

  if (uncached.length > 0) {
    const userMessage = `Classify these apps:\n${uncached.map((n, i) => `${i+1}. ${dedupMap.get(n)}`).join('\n')}`;

    let parsed: Array<{ app_name: string; category: string; risk_level: string; reasoning: string }> = [];
    try {
      parsed = parseJson(await callGemini(userMessage));
    } catch (e) {
      return jsonRes({ error: `LLM error: ${(e as Error).message}` }, 502);
    }

    const toUpsert = uncached.map((norm, i) => {
      const entry = parsed[i];
      const display = dedupMap.get(norm) ?? norm;
      return {
        app_name: norm,
        display_name: display,
        category: VALID_CATS.includes(entry?.category) ? entry.category : 'other',
        risk_level: VALID_RISKS.includes(entry?.risk_level) ? entry.risk_level : 'medium',
        reasoning: typeof entry?.reasoning === 'string' ? entry.reasoning.slice(0, 200) : 'Classification result',
      };
    });

    await adminClient.from('app_classifications').upsert(toUpsert, { onConflict: 'app_name' });
    for (const row of toUpsert) cachedMap.set(row.app_name, row);
  }

  const classifications = rawNames
    .map(raw => cachedMap.get(raw.trim().toLowerCase()))
    .filter(Boolean);

  return jsonRes({ classifications });
});
