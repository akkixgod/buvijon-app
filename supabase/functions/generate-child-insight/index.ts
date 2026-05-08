import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Sen — Buvijon ilovasidagi AI yordamchisan. Ota-onalarga bolalarining ekran vaqti haqida qisqa va aniq tahlil yozib berasan.

QOIDALAR:
- Faqat o'zbek tilida (Latin yozuvi) javob ber.
- Hech qanday tibbiy diagnoz qo'yma. Faqat odatlar va kuzatuvlar.
- Bola ismini ishlatma — "Farzandingiz" deb ayt.
- Tahlilni ijobiy va konstruktiv qilib yoz.
- Aniq raqamlardan foydalan.

JAVOB FORMATI (qat'iy JSON, boshqa hech narsa yo'q):
{"summary":"80 so'zgacha tahlil","recommendation":"1-2 jumla maslahat","trend":"improving|worsening|stable"}`;

function getMondayUTC(): string {
  const d = new Date();
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return dt.toISOString().slice(0, 10);
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders },
  });
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
      generationConfig: { temperature: 0.5, maxOutputTokens: 500 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function parseJson<T>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(text) as T;
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
  const userId = userData.user.id;

  let body: { child_id?: string; force?: boolean };
  try { body = await req.json(); } catch { return jsonRes({ error: 'Invalid JSON' }, 400); }

  const { child_id, force = false } = body;
  if (!child_id) return jsonRes({ error: 'child_id required' }, 400);

  const { data: child, error: childErr } = await adminClient
    .from('children')
    .select('id, parent_id, age, daily_limit_minutes, screen_time_today, screen_time_week')
    .eq('id', child_id).single();

  if (childErr || !child) return jsonRes({ error: 'Child not found' }, 404);
  if (child.parent_id !== userId) return jsonRes({ error: 'Forbidden' }, 403);

  const weekStart = getMondayUTC();

  if (!force) {
    const { data: cached } = await adminClient
      .from('child_insights')
      .select('summary, recommendation, trend, generated_at')
      .eq('child_id', child_id).eq('week_start', weekStart).maybeSingle();
    if (cached && Date.now() - new Date(cached.generated_at).getTime() < 6 * 24 * 60 * 60 * 1000) {
      return jsonRes({ ...cached, cached: true });
    }
  }

  const week = Array.isArray(child.screen_time_week) ? child.screen_time_week : [0,0,0,0,0,0,0];
  const userMessage = `Ma'lumotlar:\n- Bola yoshi: ${child.age} yosh\n- Kunlik limit: ${child.daily_limit_minutes} daqiqa\n- Oxirgi 7 kun: [${week.join(', ')}] daqiqa\n- Bugun: ${child.screen_time_today} daqiqa\n\nJSON formatida tahlil qil.`;

  let parsed: { summary: string; recommendation: string; trend: string };
  try {
    parsed = parseJson(await callGemini(userMessage));
  } catch (e) {
    return jsonRes({ error: `LLM error: ${(e as Error).message}` }, 502);
  }

  if (!['improving', 'worsening', 'stable'].includes(parsed.trend)) parsed.trend = 'stable';

  const generated_at = new Date().toISOString();
  await adminClient.from('child_insights').upsert({ child_id, week_start: weekStart, ...parsed, generated_at });

  return jsonRes({ ...parsed, generated_at, cached: false });
});
