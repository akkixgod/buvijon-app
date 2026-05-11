import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { AiService, ChildInsight, InsightTrend } from '@/services/aiService';

interface InsightCardProps {
  childId: string;
  childName: string;
}

const trendIcon: Record<InsightTrend, keyof typeof Ionicons.glyphMap> = {
  improving: 'trending-down',
  worsening: 'trending-up',
  stable: 'remove',
};

const trendColor: Record<InsightTrend, string> = {
  improving: Colors.blooming,
  worsening: Colors.wilting,
  stable: Colors.textMuted,
};

export default function InsightCard({ childId, childName }: InsightCardProps) {
  const t = useTranslation();
  const [insight, setInsight] = useState<ChildInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    if (force) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await AiService.getChildInsight(childId, force);
      setInsight(data);
    } catch (e: any) {
      setError(e?.message || 'AI tahlilni hozircha olish imkoni bo‘lmadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useEffect(() => {
    load(false);
  }, [load]);

  if (loading && !insight) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.childName}>{childName}</Text>
        </View>
        <View style={styles.skeletonBlock} />
        <View style={[styles.skeletonBlock, { width: '70%' }]} />
        <View style={[styles.skeletonBlock, { width: '85%' }]} />
        <View style={styles.loadingFoot}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>{t.analysis.generating}</Text>
        </View>
      </View>
    );
  }

  if (error || !insight) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.childName}>{childName}</Text>
        </View>
        <Text style={styles.errorText} numberOfLines={3}>
          {error ?? 'AI tahlilni hozircha olish imkoni bo‘lmadi.'}
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => load(true)} activeOpacity={0.7}>
          <Ionicons name="refresh" size={14} color={Colors.primary} />
          <Text style={styles.refreshText}>{t.analysis.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.childName}>{childName}</Text>
        <View style={styles.trendBadge}>
          <Ionicons
            name={trendIcon[insight.trend]}
            size={13}
            color={trendColor[insight.trend]}
          />
          <Text style={[styles.trendText, { color: trendColor[insight.trend] }]}>
            {t.analysis.trends[insight.trend]}
          </Text>
        </View>
      </View>

      <Text style={styles.summary}>{insight.summary}</Text>

      <View style={styles.recommendationBox}>
        <Ionicons name="bulb-outline" size={15} color={Colors.primary} style={{ marginTop: 2 }} />
        <Text style={styles.recommendationText}>{insight.recommendation}</Text>
      </View>

      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={() => load(true)}
        activeOpacity={0.7}
        disabled={refreshing}
      >
        {refreshing
          ? <ActivityIndicator size="small" color={Colors.primary} />
          : <Ionicons name="refresh" size={14} color={Colors.primary} />
        }
        <Text style={styles.refreshText}>{t.analysis.refresh}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
  },
  trendText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  summary: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  recommendationBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.md,
    padding: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  skeletonBlock: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceSecondary,
  },
  loadingFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  loadingText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: 12,
    color: Colors.wilting,
    lineHeight: 18,
  },
});
