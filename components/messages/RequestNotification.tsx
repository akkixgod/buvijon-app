import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessagesStore, FamilyRequest } from '@/store/messagesStore';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

interface RequestNotificationProps {
  familyTreeId: string;
  onRequestCountChange?: (count: number) => void;
}

export default function RequestNotification({ familyTreeId, onRequestCountChange }: RequestNotificationProps) {
  const {
    pendingRequests,
    isLoadingRequests,
    unreadRequestCount,
    loadPendingRequests,
    acceptFamilyRequest,
    declineFamilyRequest
  } = useMessagesStore();

  const [showModal, setShowModal] = useState(false);

  // Load pending requests when component mounts or familyTreeId changes
  useEffect(() => {
    if (familyTreeId) {
      loadPendingRequests(familyTreeId);
    }
  }, [familyTreeId, loadPendingRequests]);

  // Notify parent of request count changes
  useEffect(() => {
    if (onRequestCountChange) {
      onRequestCountChange(unreadRequestCount);
    }
  }, [unreadRequestCount, onRequestCountChange]);

  const handleAccept = useCallback(async (request: FamilyRequest) => {
    try {
      await acceptFamilyRequest(request.id);
      Alert.alert(
        'Request Accepted',
        `${request.requesterName} has been added to your family tree.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request.');
    }
  }, [acceptFamilyRequest]);

  const handleDecline = useCallback(async (request: FamilyRequest) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline ${request.requesterName}'s request to join your family tree?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineFamilyRequest(request.id);
              Alert.alert(
                'Request Declined',
                `${request.requesterName}'s request has been declined.`,
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline request.');
            }
          }
        }
      ]
    );
  }, [declineFamilyRequest]);

  const renderRequestItem = useCallback(({ item }: { item: FamilyRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.requesterInfo}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.requesterName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.requesterDetails}>
          <Text style={styles.requesterName}>{item.requesterName}</Text>
          <Text style={styles.requesterUsername}>@{item.requesterUsername}</Text>
          {item.message && (
            <Text style={styles.requestMessage} numberOfLines={2}>
              "{item.message}"
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleDecline(item)}
        >
          <Ionicons name="close-outline" size={18} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAccept(item)}
        >
          <Ionicons name="checkmark-outline" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  ), [handleAccept, handleDecline]);

  const ListKeyExtractor = useCallback((item: FamilyRequest) => item.id, []);

  return (
    <>
      {/* Notification Button */}
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="heart-outline" size={24} color={Colors.textPrimary} />
        {unreadRequestCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadRequestCount > 9 ? '9+' : unreadRequestCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Request Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Requests</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close-outline" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              {isLoadingRequests ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading requests...</Text>
                </View>
              ) : pendingRequests.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="heart-outline" size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>No pending requests</Text>
                  <Text style={styles.emptySubtext}>
                    When someone requests to join your family tree, you'll see their requests here.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={pendingRequests}
                  renderItem={renderRequestItem}
                  keyExtractor={ListKeyExtractor}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 10,
    lineHeight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalBody: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requesterDetails: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  requesterName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  requesterUsername: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  requestMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.primary,
  },
  declineButton: {
    backgroundColor: Colors.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
});