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

export const AiService = {
  async getChildInsight(childId: string, force = false): Promise<ChildInsight> {
    const { data, error } = await supabase.functions.invoke('generate-child-insight', {
      body: { child_id: childId, force },
    });
    if (error) {
      const body = await (error as any).context?.json?.().catch(() => null);
      throw new Error(body?.error || error.message);
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
      const body = await (error as any).context?.json?.().catch(() => null);
      throw new Error(body?.error || error.message);
    }
    return Array.isArray(data?.classifications) ? data.classifications : [];
  },
};
