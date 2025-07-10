// JobAdder OAuth2 Authentication Manager
interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  api: string;
  instance: string;
  account: number;
  id_token?: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  apiUrl: string;
  instance: string;
  account: number;
  lastRefreshed: number;
}

class JobAdderOAuth2Manager {
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly REDIRECT_URI: string;
  private readonly AUTH_URL = 'https://id.jobadder.com/connect/authorize';
  private readonly TOKEN_URL = 'https://id.jobadder.com/connect/token';
  private readonly STORAGE_KEY = 'jobadder_tokens';
  
  private refreshInterval: NodeJS.Timeout | null = null;
  private tokens: StoredTokens | null = null;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.CLIENT_ID = clientId;
    this.CLIENT_SECRET = clientSecret;
    this.REDIRECT_URI = redirectUri;
    
    // Note: Server-side token management - no local storage needed
    console.log('JobAdder OAuth2Manager initialized with server-side token management');
  }

  /**
   * Generate OAuth2 authorization URL using server-side client ID
   */
  async getAuthorizationUrl(): Promise<string> {
    try {
      // First test if edge functions are working at all
      console.log('Testing edge function connectivity...');
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Test with simple function first
      try {
        const { data: testData, error: testError } = await supabase.functions.invoke('test-simple', {
          body: { test: true }
        });
        
        if (testError) {
          console.error('Test function failed:', testError);
          throw new Error('Edge functions are not responding');
        }
        
        console.log('Test function working:', testData);
      } catch (testErr) {
        console.error('Edge functions completely unavailable:', testErr);
        // Fallback to direct JobAdder OAuth URL with hardcoded client ID
        return this.generateDirectOAuthUrl();
      }
      
      // If test function works, try the jobadder-api function
      console.log('Testing JobAdder API function...');
      
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { endpoint: 'get-client-id' }
      });
      
      console.log('JobAdder client ID response:', { data, error });
      
      if (error) {
        console.error('JobAdder API function error:', error);
        // Fallback to direct OAuth URL
        return this.generateDirectOAuthUrl();
      }
      
      if (!data || !data.clientId) {
        console.error('Invalid client ID response:', data);
        // Fallback to direct OAuth URL
        return this.generateDirectOAuthUrl();
      }
      
      // Success - generate OAuth URL with server-provided client ID
      return this.generateOAuthUrl(data.clientId);
      
    } catch (error) {
      console.error('Error in getAuthorizationUrl:', error);
      // Final fallback
      return this.generateDirectOAuthUrl();
    }
  }

  private generateDirectOAuthUrl(): string {
    // Use correct JobAdder client ID for fallback
    const fallbackClientId = 'ldyp7mapnxdevgowsnmr34o2j4';
    console.warn('Using fallback OAuth URL generation with client ID:', fallbackClientId);
    return this.generateOAuthUrl(fallbackClientId);
  }

  private generateOAuthUrl(clientId: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read write offline_access',
      redirect_uri: this.REDIRECT_URI
    });
    
    const authUrl = `${this.AUTH_URL}?${params.toString()}`;
    console.log('Generated OAuth URL:', authUrl);
    
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens using server-side endpoint
   */
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('Please sign in to the app first before connecting your JobAdder account');
      }

      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log('Exchanging OAuth code with:', {
        userId,
        redirectUri: this.REDIRECT_URI,
        codeLength: code.length
      });
      
      // Call server-side OAuth exchange endpoint with correct headers
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          endpoint: 'oauth-exchange',
          code: code,
          userId: userId,
          redirectUri: this.REDIRECT_URI
        },
        headers: {
          'x-user-id': userId
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to exchange OAuth code');
      }

      if (!data || !data.success) {
        console.error('OAuth exchange failed:', data);
        throw new Error(data?.error || 'OAuth exchange failed');
      }

      console.log('JobAdder OAuth exchange successful');
      
      // Return a simplified response for compatibility
      return {
        access_token: 'stored-server-side',
        expires_in: 3600,
        token_type: 'Bearer',
        refresh_token: 'stored-server-side',
        api: 'https://api.jobadder.com/v2',
        instance: data.instance || 'startup-accelerator',
        account: data.account || 4809
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Get current user ID from Supabase session
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Check if we have valid authentication (now checks server-side storage)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('jobadder_tokens')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      // If error is returned or no data found, user is not authenticated
      if (error) {
        console.error('Error checking JobAdder authentication:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  /**
   * Get current account information (legacy compatibility)
   */
  getAccountInfo(): { instance: string; account: number; apiUrl: string } | null {
    // Return default values for backward compatibility
    return {
      instance: 'startup-accelerator',
      account: 4809,
      apiUrl: 'https://api.jobadder.com/v2'
    };
  }

  /**
   * Legacy compatibility method - always returns null since tokens are server-side
   */
  async getValidAccessToken(): Promise<string | null> {
    console.warn('getValidAccessToken is deprecated. Use server-side API calls instead.');
    return null;
  }

  /**
   * Clear authentication (removes server-side tokens)
   */
  async clearTokens(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (userId) {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Delete tokens from server-side storage
        await supabase
          .from('jobadder_tokens')
          .delete()
          .eq('user_id', userId);
      }
      
      // Clear any legacy local storage
      localStorage.removeItem(this.STORAGE_KEY);
      this.tokens = null;
      
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
      
      console.log('JobAdder tokens cleared');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Legacy method - no longer needed with server-side token management
   */
  private startTokenRefreshScheduler(): void {
    console.log('Token refresh scheduler disabled - using server-side token management');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Create singleton instance with JobAdder credentials from environment
// Check if we're on the deployed domain or local development
const isProduction = window.location.hostname === 'staffing.growthaccelerator.nl';
const redirectUri = isProduction 
  ? 'https://staffing.growthaccelerator.nl/auth/callback'
  : window.location.origin + '/jobadder-auth';

const oauth2Manager = new JobAdderOAuth2Manager(
  // These will be passed from the backend during the OAuth flow
  'CLIENT_ID_PLACEHOLDER',
  'CLIENT_SECRET_PLACEHOLDER', 
  redirectUri
);

export default oauth2Manager;
export type { TokenResponse, StoredTokens };