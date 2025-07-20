import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: any;
  jazzhrProfile: any;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncJazzHRUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [jazzhrProfile, setJazzhrProfile] = useState<any>(null);
  const { toast } = useToast();

  const isAuthenticated = !!user && !!session;

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Fetch profile data when user signs in
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(async () => {
            try {
              // Fetch basic profile
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              
              setProfile(profileData);

              // Fetch JazzHR profile data
              const { data: jazzhrData } = await supabase
                .from('jazzhr_users')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              setJazzhrProfile(jazzhrData);
            } catch (error) {
              console.error('Error fetching profile:', error);
            }
          }, 0);
        } else {
          setProfile(null);
          setJazzhrProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setProfile(null);
      setJazzhrProfile(null);
      
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign out failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      // First sync JazzHR users to ensure we have the latest data
      console.log('Syncing JazzHR users before signup validation...');
      try {
        await supabase.functions.invoke('jazzhr-api', {
          body: { action: 'syncUsers', params: {} }
        });
      } catch (syncError) {
        console.warn('Failed to sync JazzHR users, proceeding with existing data:', syncError);
      }

      // Check if the email is allowed (exists in JazzHR users)
      const { data: emailValidation, error: validationError } = await supabase
        .rpc('validate_jazzhr_email', { email_to_check: email });

      if (validationError) {
        console.error('Email validation error:', validationError);
        throw new Error('Unable to validate email. Please try again.');
      }

      if (!emailValidation) {
        throw new Error('This email is not authorized for registration. Only JazzHR team members can create accounts.');
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || '',
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign up failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      throw error;
    }
  };

  const syncJazzHRUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('jazzhr-api', {
        body: { action: 'syncUsers', params: {} }
      });

      if (error) throw error;

      toast({
        title: "JazzHR Users Synced",
        description: `Successfully synced ${data.synced_count} users from JazzHR.`,
      });

      return data;
    } catch (error) {
      console.error('JazzHR sync error:', error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : 'Failed to sync JazzHR users',
        variant: "destructive",
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated,
    isLoading,
    profile,
    jazzhrProfile,
    signIn,
    signUp,
    signOut,
    syncJazzHRUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}