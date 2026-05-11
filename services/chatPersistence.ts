import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage, ChatRoom } from '@/store/messagesStore';

const ROOMS_KEY_PREFIX = '@buvijon_chat_rooms:';
const MESSAGES_KEY_PREFIX = '@buvijon_chat_messages:';
const OUTBOX_KEY = '@buvijon_chat_outbox';

export interface PendingOutboxItem {
  tempId: string;
  roomId: string;
  content: string;
  messageType: string;
  imageUrl?: string;
  createdAt: string;
  retries: number;
}

function roomsKey(familyTreeId: string) {
  return `${ROOMS_KEY_PREFIX}${familyTreeId}`;
}

function messagesKey(roomId: string) {
  return `${MESSAGES_KEY_PREFIX}${roomId}`;
}

export async function loadCachedRooms(familyTreeId: string): Promise<ChatRoom[]> {
  try {
    const raw = await AsyncStorage.getItem(roomsKey(familyTreeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCachedRooms(familyTreeId: string, rooms: ChatRoom[]): Promise<void> {
  try {
    await AsyncStorage.setItem(roomsKey(familyTreeId), JSON.stringify(rooms));
  } catch {}
}

export async function loadCachedMessages(roomId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(messagesKey(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCachedMessages(roomId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(messagesKey(roomId), JSON.stringify(messages));
  } catch {}
}

export async function loadOutbox(): Promise<PendingOutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveOutbox(outbox: PendingOutboxItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch {}
}

