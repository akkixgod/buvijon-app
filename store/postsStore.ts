import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Post, PostType, Comment } from '@/types';

const POSTS_CACHE_KEY = 'buvijon_posts_cache';

function rowToPost(row: any, userId?: string): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    childId: row.child_id,
    childName: row.child_name,
    type: row.type as PostType,
    content: row.content,
    imageUrl: row.image_url ?? undefined,
    likesCount: row.likes_count ?? 0,
    commentsCount: row.comments_count ?? 0,
    isLiked: userId ? (row.post_likes?.length > 0) : false,
    createdAt: row.created_at,
  };
}

function rowToComment(row: any): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    content: row.content,
    createdAt: row.created_at,
  };
}

interface PostsState {
  posts: Post[];
  isLoading: boolean;
  comments: Record<string, Comment[]>;
  commentsLoading: boolean;

  loadCachedPosts: () => Promise<void>;
  loadPosts: () => Promise<void>;
  addPost: (data: {
    type: PostType;
    content: string;
    childId?: string;
    childName?: string;
    authorId: string;
    authorName: string;
    imageUrl?: string;
  }) => Promise<boolean>;
  deletePost: (id: string) => Promise<void>;
  editPost: (id: string, content: string) => Promise<void>;
  archivePost: (id: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  isLoading: false,
  comments: {},
  commentsLoading: false,

  loadCachedPosts: async () => {
    try {
      const cached = await AsyncStorage.getItem(POSTS_CACHE_KEY);
      if (cached) {
        const posts = JSON.parse(cached) as Post[];
        if (posts.length > 0) set({ posts });
      }
    } catch (_) {}
  },

  loadPosts: async () => {
    const hasCached = get().posts.length > 0;
    if (!hasCached) set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      let query = supabase
        .from('posts')
        .select(userId
          ? '*, post_likes!left(id, user_id)'
          : '*'
        )
        .neq('is_archived', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (userId) {
        query = supabase
          .from('posts')
          .select('*, post_likes!left(id)')
          .eq('post_likes.user_id', userId)
          .neq('is_archived', true)
          .order('created_at', { ascending: false })
          .limit(50);
      }

      const { data, error } = await query;

      if (!error && data) {
        const posts = data.map(row => rowToPost(row, userId));
        set({ posts });
        AsyncStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(posts)).catch(() => {});
      }
    } catch (_) {
    } finally {
      set({ isLoading: false });
    }
  },

  addPost: async (data) => {
    const { data: inserted, error } = await supabase
      .from('posts')
      .insert({
        author_id: data.authorId,
        author_name: data.authorName,
        child_id: data.childId || null,
        child_name: data.childName || null,
        type: data.type,
        content: data.content,
        image_url: data.imageUrl || null,
      })
      .select()
      .single();

    if (!error && inserted) {
      const newPost = rowToPost(inserted);
      set(s => ({ posts: [newPost, ...s.posts] }));
      return true;
    }
    return false;
  },

  deletePost: async (id) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
      set(s => ({ posts: s.posts.filter(p => p.id !== id) }));
    }
  },

  editPost: async (id, content) => {
    const { error } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', id);
    if (!error) {
      set(s => ({
        posts: s.posts.map(p => p.id === id ? { ...p, content } : p),
      }));
    }
  },

  archivePost: async (id) => {
    // Optimistic: remove from feed
    set(s => ({ posts: s.posts.filter(p => p.id !== id) }));
    await supabase
      .from('posts')
      .update({ is_archived: true })
      .eq('id', id);
  },

  toggleLike: async (postId) => {
    const post = get().posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;
    const newCount = wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;

    // Optimistic UI update — instant
    set(s => ({
      posts: s.posts.map(p =>
        p.id === postId
          ? { ...p, isLiked: !wasLiked, likesCount: newCount }
          : p
      ),
    }));

    // Background sync with Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (wasLiked) {
        await Promise.all([
          supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id),
          supabase.from('posts').update({ likes_count: newCount }).eq('id', postId),
        ]);
      } else {
        await Promise.all([
          supabase.from('post_likes').insert({ post_id: postId, user_id: user.id }),
          supabase.from('posts').update({ likes_count: newCount }).eq('id', postId),
        ]);
      }
    } catch (_) {
      // Revert on error
      set(s => ({
        posts: s.posts.map(p =>
          p.id === postId
            ? { ...p, isLiked: wasLiked, likesCount: post.likesCount }
            : p
        ),
      }));
    }
  },

  loadComments: async (postId) => {
    set({ commentsLoading: true });
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        set(s => ({
          comments: { ...s.comments, [postId]: data.map(rowToComment) },
        }));
      }
    } catch (_) {
    } finally {
      set({ commentsLoading: false });
    }
  },

  addComment: async (postId, content) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('parents')
      .select('name')
      .eq('id', user.id)
      .single();

    const authorName = profile?.name || 'User';

    const { data: inserted, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        author_name: authorName,
        content,
      })
      .select()
      .single();

    if (!error && inserted) {
      const newComment = rowToComment(inserted);
      set(s => ({
        comments: {
          ...s.comments,
          [postId]: [...(s.comments[postId] || []), newComment],
        },
      }));

      // Update comments count on the post
      const post = get().posts.find(p => p.id === postId);
      if (post) {
        const newCount = post.commentsCount + 1;
        await supabase
          .from('posts')
          .update({ comments_count: newCount })
          .eq('id', postId);

        set(s => ({
          posts: s.posts.map(p =>
            p.id === postId ? { ...p, commentsCount: newCount } : p
          ),
        }));
      }
    }
  },

  deleteComment: async (commentId, postId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      set(s => ({
        comments: {
          ...s.comments,
          [postId]: (s.comments[postId] || []).filter(c => c.id !== commentId),
        },
      }));

      const post = get().posts.find(p => p.id === postId);
      if (post) {
        const newCount = Math.max(0, post.commentsCount - 1);
        await supabase
          .from('posts')
          .update({ comments_count: newCount })
          .eq('id', postId);

        set(s => ({
          posts: s.posts.map(p =>
            p.id === postId ? { ...p, commentsCount: newCount } : p
          ),
        }));
      }
    }
  },
}));
