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
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.REDIRECT_URI,
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenResponse: TokenResponse = await response.json();
      
      // Store tokens
      await this.storeTokens(tokenResponse);
      
      // Start automatic refresh
      this.startTokenRefreshScheduler();
      
      return tokenResponse;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('Refreshing JobAdder access token...');
      
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          refresh_token: this.tokens.refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle invalid_grant or invalid_request errors (user deleted/revoked access)
        if (response.status === 400 && (errorText.includes('invalid_grant') || errorText.includes('invalid_request'))) {
          console.warn('Refresh token is invalid or user access has been revoked. Clearing tokens.');
          this.clearTokens();
          throw new Error('User access has been revoked. Please re-authenticate.');
        }
        
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenResponse: TokenResponse = await response.json();
      
      // Store new tokens
      await this.storeTokens(tokenResponse);
      
      console.log('JobAdder access token refreshed successfully');
      return tokenResponse;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Get current valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    if (!this.tokens) {
      return null;
    }

    // Check if token is expired or will expire in the next 5 minutes
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now >= (this.tokens.expiresAt - fiveMinutes)) {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
      }
    }

    return this.tokens.accessToken;
  }

  /**
   * Check if we have valid authentication
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && this.tokens.refreshToken !== null;
  }

  /**
   * Get current account information
   */
  getAccountInfo(): { instance: string; account: number; apiUrl: string } | null {
    if (!this.tokens) {
      return null;
    }
    
    return {
      instance: this.tokens.instance,
      account: this.tokens.account,
      apiUrl: this.tokens.apiUrl
    };
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
   * Start automatic token refresh scheduler
   */
  private startTokenRefreshScheduler(): void {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh token every 50 minutes (10 minutes before expiry)
    const refreshIntervalMs = 50 * 60 * 1000; // 50 minutes
    
    this.refreshInterval = setInterval(async () => {
      try {
        if (this.tokens) {
          await this.refreshAccessToken();
        }
      } catch (error) {
        console.error('Scheduled token refresh failed:', error);
        
        // If refresh fails, try one more time in 5 minutes
        setTimeout(async () => {
          try {
            if (this.tokens) {
              await this.refreshAccessToken();
            }
          } catch (retryError) {
            console.error('Retry token refresh also failed:', retryError);
            // Clear tokens if refresh consistently fails
            this.clearTokens();
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    }, refreshIntervalMs);

    // Also schedule a refresh token usage to prevent it from expiring (every 10 days)
    const refreshTokenKeepAliveMs = 10 * 24 * 60 * 60 * 1000; // 10 days
    
    setInterval(async () => {
      try {
        if (this.tokens) {
          console.log('Performing refresh token keep-alive...');
          await this.refreshAccessToken();
        }
      } catch (error) {
        console.error('Refresh token keep-alive failed:', error);
      }
    }, refreshTokenKeepAliveMs);

    console.log('Token refresh scheduler started');
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

// Create singleton instance
// Note: In production, move these to environment variables
const oauth2Manager = new JobAdderOAuth2Manager(
  process.env.JOBADDER_CLIENT_ID || 'your_client_id',
  process.env.JOBADDER_CLIENT_SECRET || 'your_client_secret',
  process.env.JOBADDER_REDIRECT_URI || `${window.location.origin}/auth/callback`
);

export default oauth2Manager;
export type { TokenResponse, StoredTokens };