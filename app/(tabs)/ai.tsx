import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { useTranslation } from '@/i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function AIScreen() {
  const t = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', text: t.ai.welcome },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Placeholder response — replace with real API call
    await new Promise(r => setTimeout(r, 1200));
    const reply: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: t.ai.demoResponse,
    };
    setMessages(prev => [...prev, reply]);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.backgroundDeep, Colors.background]}
        style={styles.header}
      >
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={22} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t.ai.headerTitle}</Text>
          <Text style={styles.headerSub}>{t.ai.headerSub}</Text>
        </View>
        <View style={styles.onlineDot} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.bubbleIcon}>
                  <Ionicons name="sparkles" size={12} color={Colors.primary} />
                </View>
              )}
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' && styles.bubbleTextUser,
              ]}>
                {msg.text}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <View style={styles.bubbleIcon}>
                <Ionicons name="sparkles" size={12} color={Colors.primary} />
              </View>
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 4 }} />
            </View>
          )}

          {/* Suggestions (only when just started) */}
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>{t.ai.suggestionsLabel}</Text>
              {t.ai.suggestions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => send(s)}
                >
                  <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
                  <Text style={styles.suggestionText}>{s}</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={t.ai.placeholder}
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  aiAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  onlineDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.blooming,
  },

  messageList: { flex: 1 },
  messageContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },

  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleIcon: {
    marginTop: 2,
  },
  bubbleText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#fff',
  },

  suggestions: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  suggestionsLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLabel,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.primaryLight,
  },
  suggestionText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
