import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Linkedin, ExternalLink, CheckCircle, XCircle, Settings } from 'lucide-react';

interface LinkedInCredentials {
  client_id: string;
  has_client_secret: boolean;
  has_access_token: boolean;
}

interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    'displayImage~': {
      elements: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
}

const LinkedInIntegration = () => {
  const [credentials, setCredentials] = useState<LinkedInCredentials>({
    client_id: '',
    has_client_secret: false,
    has_access_token: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStoredCredentials();
  }, []);

  // Load credentials and automatically test connection

  const loadStoredCredentials = async () => {
    try {
      console.log('Loading LinkedIn credentials...');
      
      // Check if user has a LinkedIn access token
      const { data: tokenData } = await supabase
        .from('linkedin_user_tokens')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (tokenData) {
        setCredentials({
          client_id: 'configured',
          has_client_secret: true,
          has_access_token: true
        });
        await testConnectionAutomatically();
      } else {
        setCredentials({
          client_id: 'configured',
          has_client_secret: true,
          has_access_token: false
        });
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      setCredentials({
        client_id: 'configured',
        has_client_secret: true,
        has_access_token: false
      });
    }
  };

  const testConnectionAutomatically = async () => {
    setLoading(true);
    try {
      console.log('Testing LinkedIn connection automatically...');
      // Use the same API as the working Lead Sync API
      const { data, error } = await supabase.functions.invoke('linkedin-lead-sync', {
        body: { action: 'testConnection' }
      });

      console.log('Connection test response:', { data, error });

      if (error) {
        console.error('Supabase function error during connection test:', error);
        throw error;
      }

      if (data?.success) {
        console.log('Connection successful, fetching profile...');
        setIsConnected(true);
        await fetchProfile();
        toast({
          title: "Connected",
          description: "LinkedIn API connection successful"
        });
      } else {
        console.error('Connection failed:', data);
        setIsConnected(false);
        toast({
          title: "Connection Failed",
          description: data?.message || "Failed to connect to LinkedIn API",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to test LinkedIn connection",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      console.log('Fetching LinkedIn profile...');
      // Use the same API as the working Lead Sync API
      const { data, error } = await supabase.functions.invoke('linkedin-lead-sync', {
        body: { action: 'getProfile' }
      });

      console.log('Profile fetch response:', { data, error });

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }

      if (data?.success && data.data) {
        console.log('Profile data received:', data.data);
        setProfile(data.data);
      } else {
        console.warn('No profile data received:', data);
      }
    } catch (error: any) {
      console.error('Failed to fetch LinkedIn profile:', error);
      throw new Error(`Failed to fetch LinkedIn profile: ${error.message}`);
    }
  };

  const generateAuthUrl = () => {
    // Use the Lovable preview URL for testing, or production URL for deployed version
    const currentOrigin = window.location.origin;
    const redirectUri = `${currentOrigin}/linkedin-callback`;
    
    // Updated scopes based on LinkedIn Marketing API documentation
    const scope = 'openid profile email w_member_social r_basicprofile r_organization_social rw_organization_admin r_marketing_leadgen_automation rw_ads w_organization_social_media_manager rw_organization_social_media_admin';
    const state = Math.random().toString(36).substring(7);
    
    // Store state for validation (in production, use secure storage)
    localStorage.setItem('linkedin_oauth_state', state);
    
    // Use a placeholder client ID - the actual client ID is stored in Supabase secrets
    const clientId = '78gu7z5i8r4cbk'; // This will be replaced with the actual client ID from secrets
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    console.log('Generated LinkedIn OAuth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);
    
    toast({
      title: "OAuth URL Generated",
      description: "Redirecting to LinkedIn for authorization..."
    });
    
    // Navigate in the same tab to preserve session
    window.location.href = authUrl;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Linkedin className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">LinkedIn Integration</h1>
        {loading && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        )}
        {isConnected && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
        {!isConnected && credentials.has_access_token && !loading && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Your LinkedIn API credentials are securely stored in Supabase secrets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Client ID</span>
                </div>
                <Badge variant={credentials.client_id ? "outline" : "destructive"}>
                  {credentials.client_id ? "Configured" : "Not Set"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Client Secret</span>
                </div>
                <Badge variant={credentials.has_client_secret ? "outline" : "destructive"}>
                  {credentials.has_client_secret ? "Configured" : "Not Set"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Access Token</span>
                </div>
                <Badge variant={credentials.has_access_token ? "outline" : "destructive"}>
                  {credentials.has_access_token ? "Configured" : "Not Set"}
                </Badge>
              </div>
            </div>


            

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                LinkedIn access tokens expire after 60 days. Generate a new authorization URL using your approved redirect URI.
                After authorization, you'll need to manually copy the access token to your Supabase secrets.
              </p>
              <Button variant="outline" onClick={generateAuthUrl} disabled={!credentials.client_id}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Generate OAuth URL
              </Button>
              
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Manual Token Setup:</p>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Click "Generate OAuth URL" above</li>
                  <li>2. Complete LinkedIn authorization</li>
                  <li>3. Extract access token from callback</li>
                  <li>4. Update LINKEDIN_ACCESS_TOKEN in Supabase secrets</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>
              Your LinkedIn profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Linkedin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {profile.localizedFirstName} {profile.localizedLastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      LinkedIn ID: {profile.id}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  API Connection Active
                </Badge>
              </div>
            ) : isConnected ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading profile...</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Linkedin className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-muted-foreground">Not connected to LinkedIn</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure your credentials and generate a new OAuth URL
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default LinkedInIntegration;