import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Tables } from '@/integrations/supabase/types'

export type UserProfile = Tables<'profiles'>

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Profile doesn't exist, create one
        await createProfile(userId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Still set loading to false even on error
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email || '';
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          role: email === 'bart@startupaccelerator.nl' || email === 'bart@growthaccelerator.nl' ? 'admin' : 'viewer'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      })
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })
    } catch (error) {
      toast({
        title: "Error signing out",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const hasRole = (requiredRole: 'admin' | 'recruiter' | 'viewer') => {
    if (!profile) return false
    
    const roleHierarchy = { admin: 3, recruiter: 2, viewer: 1 }
    return roleHierarchy[profile.role] >= roleHierarchy[requiredRole]
  }

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    isAuthenticated: !!user,
  }
}