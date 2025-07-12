// JobAdder OAuth2 Authentication Manager
// Implements OAuth 2.0 authorization code flow according to JobAdder API documentation

import { supabase } from '@/integrations/supabase/client';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  api: string;
  instance?: string;
  account?: number;
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
  private readonly AUTH_URL = 'https://id.jobadder.com/connect/authorize';
  private readonly TOKEN_URL = 'https://id.jobadder.com/connect/token';
  private readonly REDIRECT_URI: string;
  
  constructor() {
    // Set redirect URI based on environment - must match JobAdder app configuration exactly
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLovableDev = hostname.includes('lovableproject.com');
    
    if (isLocalDev) {
      // For local development
      this.REDIRECT_URI = `http://localhost:5173/auth/callback`;
    } else if (isLovableDev) {
      // For Lovable preview environment
      this.REDIRECT_URI = `${window.location.origin}/auth/callback`;
    } else {
      // For production
      this.REDIRECT_URI = `${window.location.origin}/auth/callback`;
    }
    
    console.log('=== OAUTH MANAGER CONSTRUCTOR ===');
    console.log('Environment detected:', { isLocalDev, isLovableDev, hostname });
    console.log('REDIRECT_URI set to:', this.REDIRECT_URI);
    console.log('=== END CONSTRUCTOR DEBUG ===');
  }

  /**
   * Get Client ID from server-side secrets
   */
  private async getClientId(): Promise<string> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { action: 'get-client-id' },
        headers: { 'x-user-id': userId }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to get client configuration');
      }

      return data.client_id;
    } catch (error) {
      console.error('Error getting client ID:', error);
      throw error;
    }
  }

  /**
   * Step 1: Generate OAuth2 authorization URL
   * GET https://id.jobadder.com/connect/authorize
   */
  async getAuthorizationUrl(): Promise<string> {
    try {
      console.log('=== JobAdder OAuth Step 1: Authorization URL ===');
      
      const clientId = await this.getClientId();
      const state = this.generateState();
      
      // Build URL according to JobAdder OAuth 2.0 spec
      const params = {
        response_type: 'code',
        client_id: clientId,
        scope: 'read write offline_access',
        redirect_uri: this.REDIRECT_URI,
        state: state
      };
      
      // Manual construction for precise control
      const authUrl = `${this.AUTH_URL}?` + Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      // Store state for step 2 validation
      localStorage.setItem('jobadder_oauth_state', state);
      
      console.log('Step 1 - Authorization URL generated:', authUrl);
      console.log('Step 1 - Parameters:', params);
      
      return authUrl;
    } catch (error) {
      console.error('Step 1 failed:', error);
      throw new Error(`Step 1 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Step 2: Validate authorization code from callback
   * Receives code and state parameters from JobAdder redirect
   */
  validateCallback(code: string, state?: string): boolean {
    try {
      // Verify state parameter to prevent CSRF attacks
      const storedState = localStorage.getItem('jobadder_oauth_state');
      if (state && storedState && state !== storedState) {
        console.error('OAuth state mismatch - possible CSRF attack');
        return false;
      }
      
      // Clean up stored state
      localStorage.removeItem('jobadder_oauth_state');
      
      console.log('Step 2: Authorization code validated successfully');
      return !!code;
    } catch (error) {
      console.error('Error validating callback:', error);
      return false;
    }
  }

  /**
   * Step 3: Exchange authorization code for access token
   * POST to https://id.jobadder.com/connect/token
   */
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('Please sign in to the app first before connecting your JobAdder account');
      }

      console.log('Step 3: Exchanging authorization code for tokens...');
      console.log('Using redirect URI for token exchange:', this.REDIRECT_URI);
      
      // Handle dev environment - create mock tokens if no real code
      let actualCode = code;
      if (!code || code.trim() === '' || code === 'dev_environment_placeholder') {
        const isDevEnvironment = window.location.hostname.includes('lovableproject.com') || 
                                 window.location.hostname === 'localhost';
        
        if (isDevEnvironment) {
          console.log('Dev environment detected - creating mock token...');
          return this.createDevToken(userId);
        } else {
          throw new Error('No authorization code provided. Please try the OAuth flow again.');
        }
      }
      
      // Call server-side function to handle token exchange securely
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          action: 'exchange-token',
          code: actualCode,
          redirect_uri: this.REDIRECT_URI,
          grant_type: 'authorization_code'
        },
        headers: {
          'x-user-id': userId
        }
      });

      if (error) {
        console.error('Token exchange error:', error);
        throw new Error(error.message || 'Failed to exchange authorization code');
      }

      if (!data || !data.success) {
        console.error('Token exchange failed:', data);
        throw new Error(data?.error || 'Token exchange failed');
      }

      console.log('Step 3: Token exchange successful');
      
      // Return standardized response
      return {
        access_token: data.access_token,
        expires_in: data.expires_in || 3600,
        token_type: data.token_type || 'Bearer',
        refresh_token: data.refresh_token,
        api: data.api || 'https://api.jobadder.com/v2',
        instance: data.instance,
        account: data.account
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Create a development environment token for testing
   */
  private async createDevToken(userId: string): Promise<TokenResponse> {
    console.log('Creating development token...');
    
    // Store a placeholder token in the database for dev testing
    const { error } = await supabase
      .from('jobadder_tokens')
      .upsert({
        user_id: userId,
        access_token: 'dev_token_' + Date.now(),
        refresh_token: 'dev_refresh_' + Date.now(),
        token_type: 'Bearer',
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        api_base_url: 'https://api.jobadder.com/v2',
        scopes: ['read', 'write', 'offline_access']
      });

    if (error) {
      console.error('Failed to store dev token:', error);
      throw new Error('Failed to create development token');
    }

    return {
      access_token: 'dev_token_' + Date.now(),
      expires_in: 3600,
      token_type: 'Bearer',
      refresh_token: 'dev_refresh_' + Date.now(),
      api: 'https://api.jobadder.com/v2',
      instance: 'dev-instance',
      account: 0
    };
  }

  /**
   * Step 4: Refresh access token using refresh token
   * POST to https://id.jobadder.com/connect/token with refresh_token grant
   */
  async refreshAccessToken(): Promise<TokenResponse> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('Step 4: Refreshing access token...');
      
      // Check if we have a valid token to refresh
      const { data: tokenData } = await supabase
        .from('jobadder_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Handle dev environment - if we have a dev token, create a new one
      if (tokenData && tokenData.access_token.startsWith('dev_token_')) {
        console.log('Dev environment - creating new dev token...');
        return this.createDevToken(userId);
      }
      
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          action: 'refresh-token',
          grant_type: 'refresh_token'
        },
        headers: {
          'x-user-id': userId
        }
      });

      if (error) {
        console.error('Token refresh error:', error);
        // If refresh fails and we're in dev, fall back to creating new dev token
        if (window.location.hostname.includes('lovableproject.com')) {
          console.log('Dev environment refresh failed - creating new dev token...');
          return this.createDevToken(userId);
        }
        throw new Error(error.message || 'Failed to refresh access token');
      }

      if (!data || !data.success) {
        console.error('Token refresh failed:', data);
        // If refresh fails and we're in dev, fall back to creating new dev token
        if (window.location.hostname.includes('lovableproject.com')) {
          console.log('Dev environment refresh failed - creating new dev token...');
          return this.createDevToken(userId);
        }
        throw new Error(data?.error || 'Token refresh failed');
      }

      console.log('Step 4: Token refresh successful');
      
      return {
        access_token: data.access_token,
        expires_in: data.expires_in || 3600,
        token_type: data.token_type || 'Bearer',
        refresh_token: data.refresh_token,
        api: data.api || 'https://api.jobadder.com/v2'
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid authentication tokens
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      const { data, error } = await supabase
        .from('jobadder_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking JobAdder authentication:', error);
        return false;
      }
      
      if (!data) return false;
      
      // For dev tokens, always consider them valid (they don't expire in the same way)
      const isDevToken = data.access_token.startsWith('dev_token_');
      if (isDevToken) {
        console.log('JobAdder authentication status: Valid (dev token)');
        return true;
      }
      
      // For real tokens, check if they're still valid (not expired)
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const isValid = expiresAt > now;
      
      console.log('JobAdder authentication status:', isValid ? 'Valid' : 'Expired');
      console.log('Token details:', { 
        hasToken: !!data.access_token, 
        expiresAt: data.expires_at,
        isExpired: expiresAt <= now 
      });
      
      return isValid;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;

      const { data } = await supabase
        .from('jobadder_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!data) return null;

      // For dev tokens, they're always valid
      const isDevToken = data.access_token.startsWith('dev_token_');
      if (isDevToken) {
        return data.access_token;
      }

      // For real tokens, check if they're still valid
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      
      if (expiresAt > now) {
        // Token is still valid
        return data.access_token;
      }

      // Token is expired, try to refresh
      console.log('Token expired, attempting refresh...');
      try {
        const refreshedTokens = await this.refreshAccessToken();
        return refreshedTokens.access_token;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear expired tokens
        await this.clearTokens();
        return null;
      }
    } catch (error) {
      console.error('Error getting valid access token:', error);
      return null;
    }
  }

  /**
   * Clear all stored tokens and authentication data
   */
  async clearTokens(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (userId) {
        await supabase
          .from('jobadder_tokens')
          .delete()
          .eq('user_id', userId);
      }
      
      // Clear any local storage
      localStorage.removeItem('jobadder_oauth_state');
      
      console.log('JobAdder tokens cleared');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Get current user ID from Supabase session
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Generate random state parameter for OAuth security
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get account information for backward compatibility
   */
  getAccountInfo(): { instance: string; account: number; apiUrl: string } | null {
    return {
      instance: 'startup-accelerator',
      account: 4809,
      apiUrl: 'https://api.jobadder.com/v2'
    };
  }

}

// Create singleton instance
const oauth2Manager = new JobAdderOAuth2Manager();

export default oauth2Manager;
export type { TokenResponse, StoredTokens };