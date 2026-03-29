import { create } from 'zustand';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types';

interface StoriesState {
  stories: Story[];
  isLoading: boolean;
  isUploading: boolean;
  fetchStories: () => Promise<void>;
  pickAndUpload: () => Promise<{ error?: string }>;
  markViewed: (storyId: string) => Promise<void>;
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  stories: [],
  isLoading: false,
  isUploading: false,

  fetchStories: async () => {
    set({ isLoading: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return; }

    const [{ data: storiesData }, { data: viewsData }] = await Promise.all([
      supabase
        .from('stories')
        .select('id, author_id, image_url, created_at, expires_at, profiles(name)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('story_views')
        .select('story_id'),
    ]);

    const viewedIds = new Set((viewsData ?? []).map((v: any) => v.story_id));

    const stories: Story[] = (storiesData ?? []).map((s: any) => ({
      id: s.id,
      authorId: s.author_id,
      authorName: s.profiles?.name ?? '?',
      imageUrl: s.image_url,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      isViewed: viewedIds.has(s.id),
      isOwn: s.author_id === user.id,
    }));

    set({ stories, isLoading: false });
  },

  pickAndUpload: async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return { error: 'permission' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return {};

    set({ isUploading: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isUploading: false }); return { error: 'auth' }; }

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const filename = `${user.id}/${Date.now()}.${ext}`;

    // FormData-подход — единственный надёжный способ для Android content:// URI
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: filename.split('/').pop()!,
      type: mime,
    } as any);

    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(filename, formData);

    if (uploadError) {
      set({ isUploading: false });
      return { error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('stories')
      .getPublicUrl(filename);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from('stories')
      .insert({ author_id: user.id, image_url: publicUrl, expires_at: expiresAt });

    set({ isUploading: false });
    if (insertError) return { error: insertError.message };

    await get().fetchStories();
    return {};
  },

  markViewed: async (storyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    set(state => ({
      stories: state.stories.map(s =>
        s.id === storyId ? { ...s, isViewed: true } : s
      ),
    }));

    await supabase.from('story_views').upsert(
      { story_id: storyId, viewer_id: user.id },
      { onConflict: 'story_id,viewer_id' }
    );
  },
}));
