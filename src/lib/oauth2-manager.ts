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
    // IMPORTANT: JobAdder OAuth app is configured with ONLY the production redirect URI
    // Using the production redirect URI for all environments since it's the only one registered
    this.REDIRECT_URI = `https://staffing.growthaccelerator.nl/auth/callback`;
    
    console.log('=== OAUTH MANAGER CONSTRUCTOR ===');
    console.log('Using PRODUCTION redirect URI for all environments:', this.REDIRECT_URI);
    console.log('Current origin:', window.location.origin);
    console.log('JobAdder app is configured ONLY for production redirect URI');
    console.log('=== END CONSTRUCTOR DEBUG ===');
  }

  /**
   * Detect current environment for proper OAuth app selection
   */
  private getEnvironmentType(): 'production' | 'development' {
    const hostname = window.location.hostname;
    
    // Production environment
    if (hostname === 'staffing.growthaccelerator.nl') {
      return 'production';
    }
    
    // Everything else is development (localhost, previews, etc.)
    return 'development';
  }

  /**
   * Get Client ID from server-side secrets
   */
  private async getClientId(): Promise<string> {
    try {
      console.log('🔑 Step: Getting Client ID from edge function...');
      
      console.log('🔐 Step: Getting current user ID...');
      const userId = await this.getCurrentUserId();
      console.log('User ID result:', { userId, hasUserId: !!userId });
      
      if (!userId) {
        throw new Error('User not authenticated - please sign in first');
      }

      console.log('📡 Step: Calling edge function with environment:', this.getEnvironmentType());
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          action: 'get-client-id',
          environment: this.getEnvironmentType()
        },
        headers: { 'x-user-id': userId }
      });

      console.log('📡 Edge function response:', { 
        hasData: !!data, 
        hasError: !!error,
        data: data,
        error: error 
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Edge function error: ${error.message || JSON.stringify(error)}`);
      }

      if (!data?.success) {
        console.error('❌ Edge function returned failure:', data);
        throw new Error(data?.error || 'Failed to get client configuration');
      }

      console.log('✅ Client ID successfully received:', data.client_id);
      return data.client_id;
    } catch (error) {
      console.error('❌ Error getting client ID:', error);
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
      
      console.log('=== AUTHORIZATION URL DEBUG ===');
      console.log('Client ID:', clientId);
      console.log('Redirect URI:', this.REDIRECT_URI);
      console.log('Current origin:', window.location.origin);
      console.log('Current hostname:', window.location.hostname);
      console.log('Environment:', this.getEnvironmentType());
      console.log('=== END DEBUG ===');
      
      // Build URL according to JobAdder OAuth 2.0 spec EXACTLY as documented
      // STEP 1: Authorization Request
      // GET https://id.jobadder.com/connect/authorize
      // Required parameters: response_type=code, client_id, scope, redirect_uri
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'read write offline_access', // Must include offline_access for refresh tokens
        redirect_uri: this.REDIRECT_URI
      });
      
      const authUrl = `${this.AUTH_URL}?${params.toString()}`;
      
      // Store redirect URI for step 3 validation and current origin for dev mode handling
      localStorage.setItem('jobadder_oauth_redirect_uri', this.REDIRECT_URI);
      localStorage.setItem('jobadder_oauth_original_origin', window.location.origin);
      
      // For dev mode, redirect to production first, then to JobAdder
      if (this.getEnvironmentType() === 'development') {
        console.log('🔄 Dev mode detected - redirecting through production domain');
        console.log('Original URL:', authUrl);
        
        // Create a URL that goes to production domain with the auth URL as a parameter
        const productionAuthUrl = `https://staffing.growthaccelerator.nl/auth/jobadder-proxy?auth_url=${encodeURIComponent(authUrl)}&return_origin=${encodeURIComponent(window.location.origin)}`;
        
        console.log('Production proxy URL:', productionAuthUrl);
        return productionAuthUrl;
      }
      
      console.log('Step 1 - Authorization URL generated:', authUrl);
      console.log('Step 1 - Parameters:', Object.fromEntries(params));
      
      return authUrl;
    } catch (error) {
      console.error('Step 1 failed:', error);
      throw new Error(`Authorization URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Step 2: Validate authorization code from callback
   * Receives code and state parameters from JobAdder redirect
   */
  validateCallback(code: string, state?: string): boolean {
    try {
      // Since we removed state parameter to match JobAdder docs exactly,
      // we only need to validate that we have a code
      console.log('Step 2: Authorization code received, validating...');
      console.log('Code present:', !!code);
      
      if (!code || code.trim() === '') {
        console.error('No authorization code received');
        return false;
      }
      
      console.log('Step 2: Authorization code validated successfully');
      return true;
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

      // CRITICAL: Use the EXACT same redirect URI from step 1
      const storedRedirectUri = localStorage.getItem('jobadder_oauth_redirect_uri');
      const redirectUriToUse = storedRedirectUri || this.REDIRECT_URI;
      
      console.log('Step 3: Exchanging authorization code for tokens...');
      console.log('Using redirect URI for token exchange:', redirectUriToUse);
      console.log('Stored redirect URI from step 1:', storedRedirectUri);
      console.log('Current redirect URI:', this.REDIRECT_URI);
      
      // Clean up stored redirect URI
      localStorage.removeItem('jobadder_oauth_redirect_uri');
      
      // Call server-side function to handle token exchange securely
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          action: 'exchange-token',
          code: code,
          redirect_uri: redirectUriToUse,
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
        console.log('🧹 Clearing all JobAdder tokens for user:', userId);
        await supabase
          .from('jobadder_tokens')
          .delete()
          .eq('user_id', userId);
      }
      
      // Clear any local storage
      localStorage.removeItem('jobadder_oauth_state');
      localStorage.removeItem('jobadder_oauth_redirect_uri');
      
      console.log('✅ JobAdder tokens cleared - ready for fresh OAuth');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Force clear tokens before starting new OAuth flow
   */
  async clearTokensBeforeAuth(): Promise<void> {
    console.log('🧹 Force clearing tokens before new OAuth attempt...');
    await this.clearTokens();
    
    // Also clear any existing tokens on server side
    try {
      const userId = await this.getCurrentUserId();
      if (userId) {
        await supabase.functions.invoke('jobadder-api', {
          body: { action: 'clear-tokens' },
          headers: { 'x-user-id': userId }
        });
      }
    } catch (error) {
      console.log('Server token clear failed (this is okay):', error);
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