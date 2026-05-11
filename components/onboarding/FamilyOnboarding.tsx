// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

const FamilyOnboarding: React.FC<{
  onComplete: (familyTreeId: string) => void;
}> = ({ onComplete }) => {
  const { parent } = useAuthStore();
  const [familyName, setFamilyName] = useState('');
  const [familyHandle, setFamilyHandle] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    handle?: string;
  }>({});

  const scrollViewRef = useRef<ScrollView>(null);

  // Handle profile picture selection
  const handleSelectProfilePic = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePic(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select profile picture');
      console.error('Image picker error:', error);
    }
  };

  // Validate family handle
  const validateFamilyHandle = (handle: string): boolean => {
    const handleRegex = /^@[a-zA-Z0-9_]{3,20}$/;
    return handleRegex.test(handle);
  };

  // Handle handle input
  const handleHandleChange = (text: string) => {
    // Auto-add @ if not present
    const handle = text.startsWith('@') ? text : `@${text}`;
    setFamilyHandle(handle);

    // Clear handle error if valid
    if (validateFamilyHandle(handle)) {
      setErrors(prev => ({ ...prev, handle: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { name?: string; handle?: string } = {};

    if (familyName.trim().length < 2) {
      newErrors.name = 'Family name must be at least 2 characters';
    }

    if (!validateFamilyHandle(familyHandle)) {
      newErrors.handle = 'Handle must be 3-20 characters (letters, numbers, underscores)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload profile picture to Supabase Storage
  const uploadProfilePic = async (uri: string): Promise<string | null> => {
    try {
      if (!parent?.id) return null;

      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `family-trees/${parent.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Profile picture upload error:', error);
      return null;
    }
  };

  // Create family tree
  const handleCreateFamilyTree = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (!parent?.id) {
        throw new Error('User not authenticated');
      }

      // Upload profile picture if selected
      let profilePicUrl: string | null = null;
      if (profilePic) {
        profilePicUrl = await uploadProfilePic(profilePic);
      }

      // Generate invite code and link
      const inviteCode = generateInviteCode();
      const inviteLink = `https://buvijon.app/join/${inviteCode}`;

      // Create family tree
      const { data: familyTree, error: treeError } = await supabase
        .from('family_trees')
        .insert({
          name: familyName.trim(),
          handle: familyHandle.replace('@', ''),
          invite_code: inviteCode,
          invite_link: inviteLink,
          created_by: parent.id,
          profile_picture: profilePicUrl,
          is_active: true,
        })
        .select()
        .single();

      if (treeError) throw treeError;

      // Add creator as family member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_tree_id: familyTree.id,
          parent_id: parent.id,
          role: 'creator',
          is_active: true,
        });

      if (memberError) throw memberError;

      // Create system chat for the family tree
      const { data: systemChat } = await supabase
        .from('chat_rooms')
        .insert({
          family_tree_id: familyTree.id,
          name: 'Buvijon System Chat',
          description: `System notifications for ${familyName}`,
          room_type: 'system',
          is_pinned: true,
          created_by: parent.id,
        })
        .select()
        .single();

      // Add Buvijon bot to system chat
      const buvijonBotId = '00000000-0000-0000-0000-000000000001';
      await supabase.from('chat_participants').insert([
        {
          chat_room_id: systemChat.id,
          parent_id: parent.id,
          role: 'admin',
        },
        {
          chat_room_id: systemChat.id,
          parent_id: buvijonBotId,
          role: 'bot',
        },
      ]);

      // Send welcome message from Buvijon bot
      await supabase.from('chat_messages').insert({
        chat_room_id: systemChat.id,
        sender_id: buvijonBotId,
        message_type: 'welcome',
        content: `Welcome to your family tree! Your family handle is ${familyHandle}. Share it with other parents to grow your family.`,
        is_system_message: true,
      });

      // Call completion callback
      onComplete(familyTree.id);

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create family tree');
      console.error('Family tree creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate invite code
  const generateInviteCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Family Tree</Text>
          <Text style={styles.subtitle}>
            Build your family network and connect with other parents
          </Text>
        </View>

        {/* Profile Picture */}
        <TouchableOpacity
          style={styles.profilePicContainer}
          onPress={handleSelectProfilePic}
          activeOpacity={0.8}
        >
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.profilePic} />
          ) : (
            <View style={[styles.profilePic, styles.profilePicPlaceholder]}>
              <Ionicons name="add" size={40} color={Colors.primary} />
            </View>
          )}
          <View style={styles.editIcon}>
            <Ionicons name="camera" size={16} color={Colors.white} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Family Information</Text>

        {/* Family Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Family Name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="e.g., Johnson Family"
            value={familyName}
            onChangeText={setFamilyName}
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="next"
            onSubmitEditing={() => {
              // Focus on next input
            }}
          />
          {errors.name && (
            <Text style={styles.errorText}>{errors.name}</Text>
          )}
        </View>

        {/* Family Handle */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Family Handle{' '}
            <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.handleInputContainer}>
            <Text style={styles.handlePrefix}>@</Text>
            <TextInput
              style={[
                styles.handleInput,
                errors.handle && styles.inputError
              ]}
              placeholder="johnsonfamily"
              value={familyHandle.replace('@', '')}
              onChangeText={handleHandleChange}
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>
          {errors.handle && (
            <Text style={styles.errorText}>{errors.handle}</Text>
          )}
          <Text style={styles.hintText}>
            Your unique identifier. Others can find your family tree using this handle.
          </Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Ionicons name="share-outline" size={24} color={Colors.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Share Your Handle</Text>
              <Text style={styles.infoCardText}>
                Share {familyHandle || '@yourhandle'} with other parents to connect
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="people-outline" size={24} color={Colors.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Grow Your Family</Text>
              <Text style={styles.infoCardText}>
                Invite other parents to join your family tree and grow your network
              </Text>
            </View>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            isLoading && styles.createButtonDisabled
          ]}
          onPress={handleCreateFamilyTree}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.createButtonText}>Create Family Tree</Text>
          )}
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => onComplete('')}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  profilePicContainer: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
  },
  profilePicPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  handleInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  handlePrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginRight: 4,
  },
  handleInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  hintText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
  },
  infoCards: {
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonDisabled: {
    backgroundColor: Colors.disabled,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default FamilyOnboarding;