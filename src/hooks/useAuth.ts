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
    let profileCache = new Map<string, UserProfile>();
    let loadingTimeout: NodeJS.Timeout;

    // Set a maximum loading time of 5 seconds
    const setLoadingTimeout = () => {
      loadingTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth loading timeout reached');
          setLoading(false);
        }
      }, 5000);
    };

    const clearLoadingTimeout = () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };

    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoadingTimeout();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            clearLoadingTimeout();
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            // Don't wait for profile, set user immediately and fetch profile in background
            clearLoadingTimeout();
            setLoading(false);
            setTimeout(() => fetchProfile(session.user.id), 0);
          } else {
            clearLoadingTimeout();
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          clearLoadingTimeout();
          setLoading(false);
        }
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      if (!mounted) return;
      
      // Clear loading immediately for any auth state change
      clearLoadingTimeout();
      setLoading(false);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check cache first
        const cachedProfile = profileCache.get(session.user.id);
        if (cachedProfile) {
          setProfile(cachedProfile);
        } else {
          // Fetch profile in background, don't block auth
          setTimeout(() => fetchProfile(session.user.id), 0);
        }
      } else {
        setProfile(null);
      }
    });

    // Optimized profile fetch with caching
    const fetchProfile = async (userId: string) => {
      try {
        // Check cache first
        const cachedProfile = profileCache.get(userId);
        if (cachedProfile) {
          setProfile(cachedProfile);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Profile fetch error:', error);
          return;
        }

        if (data) {
          profileCache.set(userId, data);
          setProfile(data);
        } else {
          // Profile doesn't exist, create one in background
          setTimeout(() => createProfile(userId), 0);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    const createProfile = async (userId: string) => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const email = userData.user?.email || '';
        
        // Set default scopes for regular users (including write permissions)
        const defaultScopes: Array<'read' | 'write' | 'read_candidate' | 'write_candidate' | 'read_job' | 'write_job' | 'read_jobad' | 'write_jobad'> = [
          'read', 'write', 'read_candidate', 'write_candidate', 'read_job', 'write_job', 'read_jobad', 'write_jobad'
        ];
        const isAdmin = email === 'bart@startupaccelerator.nl' || email === 'bart@growthaccelerator.nl';
        
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            role: isAdmin ? 'admin' : 'viewer',
            
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating profile:', error);
          return;
        }
        
        profileCache.set(userId, data);
        setProfile(data);
      } catch (error) {
        console.error('Error creating profile:', error);
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      clearLoadingTimeout();
      subscription.unsubscribe();
    };
  }, []); // Remove loading from dependencies to prevent loops


  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Immediately clear loading state on successful sign in
      setLoading(false)

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      })
    } catch (error) {
      setLoading(false)
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

  // JazzHR role-based permissions
  const canAccessJobs = () => {
    return true; // All authenticated users can read jobs
  }

  const canPostJobs = () => {
    return profile?.role === 'admin' || profile?.role === 'moderator';
  }

  const canViewCandidates = () => {
    return true; // All authenticated users can read candidates
  }

  const canManageCandidates = () => {
    return profile?.role === 'admin' || profile?.role === 'moderator';
  }

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    
    canAccessJobs,
    canPostJobs,
    canViewCandidates,
    canManageCandidates,
    isAuthenticated: !!user,
  }
}