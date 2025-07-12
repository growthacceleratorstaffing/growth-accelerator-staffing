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
    console.log('=== Starting JobAdder OAuth flow ===');
    console.log('Current window.location.origin:', window.location.origin);
    console.log('Current full URL:', window.location.href);
    
    // Determine redirect URI based on environment - must be consistent throughout OAuth flow
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local development
      this.REDIRECT_URI = 'http://localhost:5173/auth/callback';
    } else {
      // Production and preview - use current origin
      this.REDIRECT_URI = `${window.location.origin}/auth/callback`;
    }
    
    console.log('Final REDIRECT_URI set to:', this.REDIRECT_URI);
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
        scope: 'read write offline_access', // offline_access is required for refresh tokens
        redirect_uri: this.REDIRECT_URI,
        state: state
      };
      
      // Manual construction for precise control
      const authUrl = `${this.AUTH_URL}?` + Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      // Store state AND redirect_uri for consistency in step 3
      localStorage.setItem('jobadder_oauth_state', state);
      localStorage.setItem('jobadder_oauth_redirect_uri', this.REDIRECT_URI);
      
      console.log('Step 1 - Authorization URL generated:', authUrl);
      console.log('Step 1 - Parameters:', params);
      console.log('Step 1 - Stored redirect_uri for step 3:', this.REDIRECT_URI);
      
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
      
      // Clean up stored state but keep redirect_uri for step 3
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

      if (!code || code.trim() === '') {
        throw new Error('No authorization code provided. Please complete the OAuth flow.');
      }

      // Use the EXACT same redirect_uri that was used in step 1
      const storedRedirectUri = localStorage.getItem('jobadder_oauth_redirect_uri') || this.REDIRECT_URI;
      
      console.log('Step 3: Exchanging authorization code for tokens...');
      console.log('Using redirect URI for token exchange:', storedRedirectUri);
      console.log('Current REDIRECT_URI:', this.REDIRECT_URI);
      console.log('Stored REDIRECT_URI from step 1:', localStorage.getItem('jobadder_oauth_redirect_uri'));
      
      // Call server-side function to handle token exchange securely
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          action: 'exchange-token',
          code: code,
          redirect_uri: storedRedirectUri,
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
      
      // Clean up stored redirect_uri after successful exchange
      localStorage.removeItem('jobadder_oauth_redirect_uri');
      
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
        throw new Error(error.message || 'Failed to refresh access token');
      }

      if (!data || !data.success) {
        console.error('Token refresh failed:', data);
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
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking JobAdder authentication:', error);
        return false;
      }
      
      if (!data) return false;
      
      // Check if tokens are still valid (not expired)
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
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return null;

      // Check if token is still valid
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