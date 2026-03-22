import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/user';

// ─── Query Keys ────────────────────────────────────────────────────────────
export const PROFILE_KEYS = {
  all: ['profile'] as const,
  detail: (userId: string) => ['profile', userId] as const,
};

// ─── Input Types ───────────────────────────────────────────────────────────
export interface UpdateProfileInput {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

// ─── Read Hook ─────────────────────────────────────────────────────────────
/**
 * Fetches the profile row for the given user.
 * Returns UserProfile | null. Disabled when userId is undefined.
 */
export function useProfile(userId: string | undefined) {
  return useQuery<UserProfile | null>({
    queryKey: PROFILE_KEYS.detail(userId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .single();

      if (error) {
        // PGRST116 = "no rows found" — valid for new users with no profile row yet
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as UserProfile;
    },
    enabled: !!userId,
  });
}

// ─── Mutation Hook ─────────────────────────────────────────────────────────
/**
 * Updates display_name and/or avatar_url on the profiles table.
 * Invalidates ['profile', userId] on success so Profile screen re-renders.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>> = {};
      if (input.displayName !== undefined) updates.display_name = input.displayName;
      if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', input.userId)
        .select('*')
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.detail(variables.userId) });
    },
  });
}

// ─── Avatar Upload Utility ─────────────────────────────────────────────────
/**
 * Opens the image library, reads the selected image as base64,
 * uploads it to the 'avatars' Storage bucket at {userId}/avatar.jpg,
 * and returns the public URL. Returns null if the user cancels.
 *
 * NOT a hook — call this from an event handler.
 */
export async function uploadAvatar(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled) return null;

  const uri = result.assets[0].uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 string to Uint8Array for Supabase Storage upload
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from('avatars')
    .upload(`${userId}/avatar.jpg`, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(`${userId}/avatar.jpg`);

  return data.publicUrl;
}
