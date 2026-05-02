import React, { memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FamilyRanking, StandingCategory } from '@/store/messagesStore';
import { Colors, FlowerColors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

interface FamilyRankingCardProps {
  ranking: FamilyRanking;
  index: number;
  isPerspectiveChild: boolean;
  onPress: () => void;
}

// Helper function to get standing category styling
const getStandingCategoryStyle = (category: StandingCategory) => {
  switch (category) {
    case 'excellent':
      return {
        bgColor: Colors.bloomingLight,
        borderColor: Colors.blooming,
        icon: 'trophy',
        iconColor: Colors.blooming,
      };
    case 'good':
      return {
        bgColor: Colors.primaryPale,
        borderColor: Colors.primary,
        icon: 'star',
        iconColor: Colors.primary,
      };
    case 'neutral':
      return {
        bgColor: Colors.surfaceSecondary,
        borderColor: Colors.textMuted,
        icon: 'remove',
        iconColor: Colors.textMuted,
      };
    case 'warning':
      return {
        bgColor: '#FFF7ED',
        borderColor: '#F59E0B',
        icon: 'warning',
        iconColor: '#F59E0B',
      };
    case 'critical':
      return {
        bgColor: '#FEF2F2',
        borderColor: Colors.wilting,
        icon: 'alert-circle',
        iconColor: Colors.wilting,
      };
    default:
      return {
        bgColor: Colors.surfaceSecondary,
        borderColor: Colors.textMuted,
        icon: 'remove',
        iconColor: Colors.textMuted,
      };
  }
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: FamilyRankingCardProps, nextProps: FamilyRankingCardProps) => {
  return (
    prevProps.ranking.childId === nextProps.ranking.childId &&
    prevProps.ranking.rankPosition === nextProps.ranking.rankPosition &&
    prevProps.ranking.overallScore === nextProps.ranking.overallScore &&
    prevProps.ranking.isMyChild === nextProps.ranking.isMyChild &&
    prevProps.isPerspectiveChild === nextProps.isPerspectiveChild &&
    prevProps.ranking.standingCategory === nextProps.ranking.standingCategory
  );
};

const FamilyRankingCard: React.FC<FamilyRankingCardProps> = memo(({
  ranking,
  index,
  isPerspectiveChild,
  onPress
}) => {
  const categoryStyle = getStandingCategoryStyle(ranking.standingCategory);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        ranking.isMyChild && styles.myKidCard,
        isPerspectiveChild && styles.perspectiveCard
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* My Kid Badge */}
      {ranking.isMyChild && (
        <View style={styles.myKidBadge}>
          <Text style={styles.myKidBadgeText}>MY KID</Text>
        </View>
      )}

      {/* Perspective Indicator */}
      {isPerspectiveChild && (
        <View style={styles.perspectiveIndicator}>
          <Ionicons name="eye" size={14} color={Colors.primary} />
        </View>
      )}

      {/* Rank Badge */}
      <View style={[styles.rankBadge, { backgroundColor: categoryStyle.bgColor }]}>
        <Text style={[styles.rankNumber, { color: categoryStyle.iconColor }]}>
          #{ranking.rankPosition}
        </Text>
        <Ionicons
          name={categoryStyle.icon as any}
          size={14}
          color={categoryStyle.iconColor}
        />
      </View>

      {/* Child Avatar Placeholder */}
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={[categoryStyle.bgColor, Colors.surface]}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.avatarText, { color: categoryStyle.iconColor }]}>
            {ranking.childName.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
      </View>

      {/* Child Name */}
      <Text style={styles.childName} numberOfLines={1}>
        {ranking.childName}
      </Text>

      {/* Overall Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Score</Text>
        <Text style={[styles.scoreValue, { color: categoryStyle.iconColor }]}>
          {Math.round(ranking.overallScore)}
        </Text>
      </View>

      {/* Screen Time */}
      <View style={styles.screenTimeContainer}>
        <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
        <Text style={styles.screenTimeText}>
          {Math.round(ranking.screenTimeMinutes)}m
        </Text>
      </View>

      {/* Rank Change Indicator */}
      {ranking.rankChange !== 0 && (
        <View style={[
          styles.rankChangeContainer,
          ranking.rankChange > 0 ? styles.rankChangeUp : styles.rankChangeDown
        ]}>
          <Ionicons
            name={ranking.rankChange > 0 ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={ranking.rankChange > 0 ? Colors.blooming : Colors.wilting}
          />
          <Text style={[
            styles.rankChangeText,
            { color: ranking.rankChange > 0 ? Colors.blooming : Colors.wilting }
          ]}>
            {Math.abs(ranking.rankChange)}
          </Text>
        </View>
      )}

      {/* Standing Category Badge */}
      <View style={[
        styles.standingBadge,
        { backgroundColor: categoryStyle.bgColor, borderColor: categoryStyle.borderColor }
      ]}>
        <Ionicons
          name={categoryStyle.icon as any}
          size={10}
          color={categoryStyle.iconColor}
        />
        <Text style={[styles.standingText, { color: categoryStyle.iconColor }]}>
          {ranking.standingCategory.toUpperCase()}
        </Text>
      </View>

      {/* Streak Days */}
      {ranking.streakDays > 0 && (
        <View style={styles.streakContainer}>
          <Ionicons name="flame" size={12} color="#F59E0B" />
          <Text style={styles.streakText}>{ranking.streakDays}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}, arePropsEqual);

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginHorizontal: 2, // Spacing for horizontal list
  },
  myKidCard: {
    borderColor: '#FF69B4', // Pink border for "My Kid"
    borderWidth: 2,
    backgroundColor: '#FFF0F5', // Light pink background
  },
  perspectiveCard: {
    backgroundColor: Colors.primaryPale,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  myKidBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF69B4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    zIndex: 1,
  },
  myKidBadgeText: {
    color: '#fff',
    fontSize: FontSize.xxs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  perspectiveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.surface,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    zIndex: 1,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
    gap: 4,
    marginTop: Spacing.xs,
  },
  rankNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  avatarContainer: {
    marginVertical: Spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  childName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  scoreValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  screenTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  screenTimeText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  rankChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  rankChangeUp: {
    backgroundColor: '#DCFCE7',
  },
  rankChangeDown: {
    backgroundColor: '#FEF2F2',
  },
  rankChangeText: {
    fontSize: FontSize.xxs,
    fontWeight: FontWeight.bold,
  },
  standingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
    borderWidth: 0.5,
  },
  standingText: {
    fontSize: FontSize.xxs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.xs,
  },
  streakText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#F59E0B',
  },
});

export default FamilyRankingCard;