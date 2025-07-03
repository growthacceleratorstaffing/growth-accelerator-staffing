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
    let timeoutId: NodeJS.Timeout;

    // Fallback timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        
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
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
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
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [loading]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile(data);
        setLoading(false);
      } else {
        // Profile doesn't exist, create one
        await createProfile(userId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const createProfile = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email || '';
      
      // Set default scopes for regular users
      const defaultScopes: Array<'read' | 'read_candidate' | 'read_job' | 'read_jobad'> = ['read', 'read_candidate', 'read_job', 'read_jobad'];
      const isAdmin = email === 'bart@startupaccelerator.nl' || email === 'bart@growthaccelerator.nl';
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          role: isAdmin ? 'admin' : 'viewer',
          jobadder_scopes: defaultScopes
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        setLoading(false);
        return;
      }
      
      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error('Error creating profile:', error);
      setLoading(false);
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
    if (!profile?.role) return false
    
    const roleHierarchy = { admin: 3, recruiter: 2, viewer: 1 }
    return (roleHierarchy as any)[profile.role] >= roleHierarchy[requiredRole]
  }

  const hasJobAdderScope = (scope: 'read' | 'write' | 'read_candidate' | 'write_candidate' | 'read_company' | 'write_company' | 'read_contact' | 'write_contact' | 'read_jobad' | 'write_jobad' | 'read_jobapplication' | 'write_jobapplication' | 'read_job' | 'write_job' | 'read_placement' | 'write_placement' | 'read_user' | 'partner_jobboard' | 'offline_access') => {
    if (!profile?.jobadder_scopes) return false
    return profile.jobadder_scopes.includes(scope)
  }

  const canAccessJobs = () => {
    return hasJobAdderScope('read_job') || hasJobAdderScope('read_jobad') || hasJobAdderScope('read')
  }

  const canPostJobs = () => {
    return hasJobAdderScope('write_job') || hasJobAdderScope('write_jobad') || hasJobAdderScope('write')
  }

  const canViewCandidates = () => {
    return hasJobAdderScope('read_candidate') || hasJobAdderScope('read')
  }

  const canManageCandidates = () => {
    return hasJobAdderScope('write_candidate') || hasJobAdderScope('write')
  }

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    hasJobAdderScope,
    canAccessJobs,
    canPostJobs,
    canViewCandidates,
    canManageCandidates,
    isAuthenticated: !!user,
  }
}