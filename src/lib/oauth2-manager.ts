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
    // Use current domain for redirect URI to support both production and preview
    this.REDIRECT_URI = `${window.location.origin}/auth/callback`;
    console.log('JobAdder OAuth2Manager initialized');
    console.log('Using redirect URI:', this.REDIRECT_URI);
    console.log('Current environment:', window.location.origin);
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
   * https://id.jobadder.com/connect/authorize
   */
  async getAuthorizationUrl(): Promise<string> {
    try {
      console.log('=== JobAdder OAuth URL Generation ===');
      console.log('Current window.location.origin:', window.location.origin);
      console.log('Current window.location.href:', window.location.href);
      console.log('Using redirect URI:', this.REDIRECT_URI);
      console.log('Expected dev redirect URI should be:', `${window.location.origin}/auth/callback`);
      
      // Get client ID from server
      const clientId = await this.getClientId();
      console.log('Client ID being used:', clientId);
      
      const state = this.generateState();
      
      // Manual URL construction to ensure proper encoding and avoid URLSearchParams issues
      const authUrl = `${this.AUTH_URL}?response_type=code&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent('read write offline_access')}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&state=${encodeURIComponent(state)}`;
      
      console.log('=== MANUAL URL CONSTRUCTION ===');
      console.log('Auth URL Base:', this.AUTH_URL);
      console.log('Client ID (encoded):', encodeURIComponent(clientId));
      console.log('Scope (encoded):', encodeURIComponent('read write offline_access'));
      console.log('Redirect URI (encoded):', encodeURIComponent(this.REDIRECT_URI));
      console.log('State (encoded):', encodeURIComponent(state));
      console.log('=== FINAL OAUTH URL ===');
      console.log('Generated URL:', authUrl);
      console.log('Redirect URI in URL:', this.REDIRECT_URI);
      console.log('Client ID in URL:', clientId);
      console.log('=== Check: Do these values match JobAdder config? ===');
      console.log('Expected in JobAdder:');
      console.log('- Client ID should be:', clientId);  
      console.log('- Redirect URI should be whitelisted:', this.REDIRECT_URI);
      console.log('=== END DEBUG INFO ===');
      
      // Store state for verification in step 2
      localStorage.setItem('jobadder_oauth_state', state);
      
      return authUrl;
    } catch (error) {
      console.error('Error generating authorization URL:', error);
      throw new Error(`Failed to generate JobAdder authorization URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      // Call server-side function to handle token exchange securely
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          action: 'exchange-token',
          code: code,
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
        .select('id, expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking JobAdder authentication:', error);
        return false;
      }
      
      if (!data) return false;
      
      // Check if token is still valid (not expired)
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const isValid = expiresAt > now;
      
      console.log('JobAdder authentication status:', isValid ? 'Valid' : 'Expired');
      return isValid;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
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

  /**
   * Legacy compatibility method
   */
  async getValidAccessToken(): Promise<string | null> {
    console.warn('getValidAccessToken is deprecated. Tokens are managed server-side.');
    return null;
  }
}

// Create singleton instance
const oauth2Manager = new JobAdderOAuth2Manager();

export default oauth2Manager;
export type { TokenResponse, StoredTokens };