import { supabase } from '@/lib/supabase';

export type InsightTrend = 'improving' | 'worsening' | 'stable';
export type AppCategory =
  | 'social' | 'game' | 'video' | 'education'
  | 'messenger' | 'browser' | 'utility' | 'other';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ChildInsight {
  summary: string;
  recommendation: string;
  trend: InsightTrend;
  generated_at: string;
  cached: boolean;
}

export interface AppClassification {
  app_name: string;
  category: AppCategory;
  risk_level: RiskLevel;
  reasoning?: string;
}

function friendlyAiError(message?: string): string {
  const text = message ?? '';
  const lower = text.toLowerCase();
  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit')
  ) {
    return 'AI tahlil limiti tugadi. Iltimos, birozdan keyin qayta urinib ko‘ring.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'AI tahlilga ulanishda muammo bor. Internetni tekshirib, qayta urinib ko‘ring.';
  }
  return 'AI tahlilni hozircha olish imkoni bo‘lmadi. Keyinroq qayta urinib ko‘ring.';
}

async function getFunctionErrorMessage(error: any): Promise<string> {
  const body = await error?.context?.json?.().catch(() => null);
  if (typeof body?.error === 'string') return body.error;
  if (typeof body?.message === 'string') return body.message;
  if (typeof error?.message === 'string') return error.message;
  return '';
}

export const AiService = {
  async getChildInsight(childId: string, force = false): Promise<ChildInsight> {
    const { data, error } = await supabase.functions.invoke('generate-child-insight', {
      body: { child_id: childId, force },
    });
    if (error) {
      throw new Error(friendlyAiError(await getFunctionErrorMessage(error)));
    }
    if (!data || typeof data.summary !== 'string') {
      throw new Error('Invalid response from insight service');
    }
    return data as ChildInsight;
  },

  async classifyApps(appNames: string[]): Promise<AppClassification[]> {
    const filtered = appNames.filter(n => typeof n === 'string' && n.trim().length > 0);
    if (filtered.length === 0) return [];

    const { data, error } = await supabase.functions.invoke('classify-app', {
      body: { app_names: filtered },
    });
    if (error) {
      throw new Error(friendlyAiError(await getFunctionErrorMessage(error)));
    }
    return Array.isArray(data?.classifications) ? data.classifications : [];
  },
};
