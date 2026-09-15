import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, auth } from './supabase';
import type { Profile } from './types';

interface AuthState {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  userId: null, profile: null, loading: true,
  signIn: () => {}, signOut: async () => {}, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function ensureProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (!data) {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email ?? '';
      await supabase.from('profiles').upsert({ id: uid, full_name: email });
    }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(p);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) await ensureProfile(uid);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) await ensureProfile(uid); else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      userId, profile, loading,
      signIn: () => auth.openSignInModal(),
      signOut: async () => { await supabase.auth.signOut(); },
      refreshProfile: async () => { if (userId) await ensureProfile(userId); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
