import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { useTranslation } from '@/i18n';

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  role?: 'creator' | 'admin' | 'member';
}

interface CreateChatModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateChat: (parentId: string) => void;
  familyMembers: FamilyMember[];
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({
  visible,
  onClose,
  onCreateChat,
  familyMembers = []
}) => {
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter family members based on search query
  const filteredMembers = familyMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateChat = async () => {
    if (!selectedMember) return;

    setIsLoading(true);
    try {
      await onCreateChat(selectedMember.id);
      handleClose();
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedMember(null);
    setIsLoading(false);
    onClose();
  };

  const renderMemberItem = ({ item }: { item: FamilyMember }) => {
    const isSelected = selectedMember?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          isSelected && styles.selectedMemberItem
        ]}
        onPress={() => setSelectedMember(item)}
        activeOpacity={0.7}
      >
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>

          {item.role && (
            <View style={[
              styles.roleBadge,
              item.role === 'creator' && styles.creatorBadge,
              item.role === 'admin' && styles.adminBadge
            ]}>
              <Text style={[
                styles.roleText,
                (item.role === 'creator' || item.role === 'admin') && styles.adminRoleText
              ]}>
                {item.role.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.xl }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t.messages.createChat}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t.messages.searchMembers}
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Members List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>{t.common.loading}</Text>
            </View>
          ) : filteredMembers.length > 0 ? (
            <FlatList
              data={filteredMembers}
              renderItem={renderMemberItem}
              keyExtractor={(item) => item.id}
              style={styles.membersList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.membersListContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? t.messages.noMembersFound : t.messages.noFamilyMembers}
              </Text>
            </View>
          )}

          {/* Action Button */}
          {selectedMember && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  isLoading && styles.disabledButton
                ]}
                onPress={handleCreateChat}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.textOnDark} />
                ) : (
                  <>
                    <Ionicons name="chatbubbles" size={18} color={Colors.textOnDark} />
                    <Text style={styles.createButtonText}>
                      {t.messages.startChatWith} {selectedMember.name}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  membersList: {
    flex: 1,
    marginTop: Spacing.md,
  },
  membersListContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xs,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  selectedMemberItem: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  memberAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textOnDark,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
  },
  creatorBadge: {
    backgroundColor: '#FFF7ED',
  },
  adminBadge: {
    backgroundColor: '#DBEAFE',
  },
  roleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
  },
  adminRoleText: {
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  actionContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textOnDark,
  },
});

export default CreateChatModal;