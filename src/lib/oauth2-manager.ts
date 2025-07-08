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
    
    // Load tokens from storage on initialization
    this.loadTokensFromStorage();
    
    // Start automatic token refresh if we have valid tokens
    if (this.tokens) {
      this.startTokenRefreshScheduler();
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID,
      scope: 'read write offline_access',
      redirect_uri: this.REDIRECT_URI
    });
    
    return `${this.AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens using server-side endpoint
   */
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    try {
      // Get current user ID (this should be set by the app after authentication)
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User must be authenticated before connecting JobAdder account');
      }

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Call server-side OAuth exchange endpoint
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          endpoint: 'oauth-exchange',
          code: code,
          userId: userId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error('OAuth exchange failed');
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
        .single();

      return !error && !!data;
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
   * Store tokens securely
   */
  private async storeTokens(tokenResponse: TokenResponse): Promise<void> {
    const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
    
    this.tokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: expiresAt,
      apiUrl: tokenResponse.api,
      instance: tokenResponse.instance,
      account: tokenResponse.account,
      lastRefreshed: Date.now()
    };

    // Store in localStorage (in production, use secure storage)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tokens));
    
    console.log(`Tokens stored. Access token expires at: ${new Date(expiresAt).toISOString()}`);
  }

  /**
   * Load tokens from storage
   */
  private loadTokensFromStorage(): void {
    try {
      const storedTokens = localStorage.getItem(this.STORAGE_KEY);
      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens);
        console.log('Tokens loaded from storage');
      }
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem(this.STORAGE_KEY);
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    console.log('Tokens cleared');
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

// Create singleton instance with JobAdder credentials
const oauth2Manager = new JobAdderOAuth2Manager(
  'ldyp7mapnxdevgowsnmr34o2j4',
  'veuyhueqmifufjfo4hoqx6obcy5tucoxp45xpe7aixl5bu4ztdh4',
  `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'}/auth/callback`
);

export default oauth2Manager;
export type { TokenResponse, StoredTokens };