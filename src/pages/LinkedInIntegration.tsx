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

  const loadStoredCredentials = async () => {
    try {
      console.log('Loading LinkedIn credentials...');
      const { data, error } = await supabase.functions.invoke('linkedin-api', {
        body: { action: 'getCredentials' }
      });

      console.log('Credentials response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success && data.data) {
        console.log('Setting credentials:', data.data);
        setCredentials(data.data);
        if (data.data.has_access_token) {
          await testConnection();
        }
      } else {
        console.warn('No credential data received:', data);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast({
        title: "Error",
        description: "Failed to load LinkedIn credentials from Supabase",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-api', {
        body: { action: 'testConnection' }
      });

      if (error) throw error;

      if (data?.success) {
        setIsConnected(true);
        await fetchProfile();
        toast({
          title: "Connection successful",
          description: "Successfully connected to LinkedIn API"
        });
      } else {
        setIsConnected(false);
        toast({
          title: "Connection failed",
          description: data?.message || "Failed to connect to LinkedIn API",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setIsConnected(false);
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-api', {
        body: { action: 'getProfile' }
      });

      if (error) throw error;

      if (data?.success && data.data) {
        setProfile(data.data);
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch LinkedIn profile: ${error.message}`);
    }
  };

  const generateAuthUrl = () => {
    if (!credentials.client_id) {
      toast({
        title: "Error",
        description: "Client ID not found. Please check your Supabase secrets configuration.",
        variant: "destructive"
      });
      return;
    }

    // Use one of the approved redirect URIs from your LinkedIn app
    const redirectUri = 'https://webapp.growthaccelerator.nl/auth/linkedin/callback';
    
    // Updated scopes based on LinkedIn Marketing API documentation
    const scope = 'r_liteprofile r_emailaddress w_member_social rw_ads r_organization_social rw_organization_admin';
    const state = Math.random().toString(36).substring(7);
    
    // Store state for validation (in production, use secure storage)
    localStorage.setItem('linkedin_oauth_state', state);
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${credentials.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    console.log('Generated LinkedIn OAuth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);
    
    toast({
      title: "OAuth URL Generated",
      description: "Opening LinkedIn authorization in new tab. After authorization, manually copy the access token to your Supabase secrets.",
    });
    
    window.open(authUrl, '_blank');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Linkedin className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">LinkedIn Integration</h1>
        {isConnected && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
        {!isConnected && credentials.has_access_token && (
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

            <div className="flex gap-2">
              <Button onClick={testConnection} disabled={loading || !credentials.has_access_token}>
                Test Connection
              </Button>
            </div>

            <Separator />

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
                  Configure your credentials and test the connection
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documentation Card */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            How to set up your LinkedIn Developer API integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Create LinkedIn App</h4>
              <p className="text-sm text-muted-foreground">
                Visit the LinkedIn Developer Portal and create a new application to get your Client ID and Secret.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://developer.linkedin.com/apps" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  LinkedIn Developer Portal
                </a>
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">2. Configure Permissions</h4>
              <p className="text-sm text-muted-foreground">
                Request the necessary permissions: r_liteprofile, r_emailaddress, w_member_social, and rw_ads.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-2025-07" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  API Documentation
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkedInIntegration;