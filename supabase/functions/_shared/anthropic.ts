// Shared Anthropic client + helpers for Supabase Edge Functions (Deno runtime).
//
// Uses fetch directly instead of the SDK — keeps the bundle tiny and avoids
// Node-isms that don't work in Deno Deploy.
//
// Reads ANTHROPIC_API_KEY from edge-function secrets. Never log it.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export interface CachedSystemBlock {
  type: 'text';
  text: string;
  cache_control: { type: 'ephemeral' };
}

export interface AnthropicCallOptions {
  model?: string;
  max_tokens: number;
  system: string | CachedSystemBlock[];
  user: string;
  temperature?: number;
}

export interface AnthropicResponse {
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export async function callAnthropic(opts: AnthropicCallOptions): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured in edge-function secrets');
  }

  const body = {
    model: opts.model ?? HAIKU_MODEL,
    max_tokens: opts.max_tokens,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const block = Array.isArray(data.content) ? data.content[0] : null;
  const text = block && block.type === 'text' ? block.text : '';

  return {
    text,
    usage: {
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
      cache_creation_input_tokens: data.usage?.cache_creation_input_tokens,
      cache_read_input_tokens: data.usage?.cache_read_input_tokens,
    },
  };
}

// Strip optional ```json ... ``` fences and parse safely.
export function parseJsonResponse<T = unknown>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  return JSON.parse(text) as T;
}

// CORS for browser clients (the React Native fetch calls don't need this,
// but it makes local testing from a web app easier).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
