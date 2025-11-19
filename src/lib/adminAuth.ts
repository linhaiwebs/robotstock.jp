import { supabase } from './supabase';

export interface AdminSession {
  user: {
    id: string;
    email: string;
  };
  isAdmin: boolean;
}

export const adminAuth = {
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message || '登録失敗' };
      }

      if (!data.user) {
        return { success: false, error: '登録失敗' };
      }

      const isAdmin = data.user.app_metadata?.is_admin === true;
      if (!isAdmin) {
        await supabase.auth.signOut();
        return { success: false, error: '権限がありません' };
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error instanceof Error ? error.message : '登録失敗、もう一度お試しください' };
    }
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const isAdmin = session.user.app_metadata?.is_admin === true;
      return isAdmin;
    } catch {
      return false;
    }
  },

  async getSession(): Promise<AdminSession | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const isAdmin = session.user.app_metadata?.is_admin === true;
      if (!isAdmin) return null;

      return {
        user: {
          id: session.user.id,
          email: session.user.email || '',
        },
        isAdmin: true,
      };
    } catch {
      return null;
    }
  },

  async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const isAdmin = session.user.app_metadata?.is_admin === true;
      if (!isAdmin) return null;

      return {
        id: session.user.id,
        email: session.user.email,
      };
    } catch {
      return null;
    }
  },

  onAuthStateChange(callback: (isAdmin: boolean) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        const isAdmin = session?.user?.app_metadata?.is_admin === true;
        callback(isAdmin && session !== null);
      })();
    });
  }
};
