import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Linkedin, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

interface LinkedInCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
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
    client_secret: '',
    access_token: ''
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
      const { data, error } = await supabase
        .from('integration_settings')
        .select('settings')
        .eq('integration_type', 'linkedin')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (data?.settings) {
        const settings = data.settings as any;
        setCredentials({
          client_id: settings.client_id || '',
          client_secret: settings.client_secret || '',
          access_token: settings.access_token || ''
        });
        if (settings.access_token) {
          setIsConnected(true);
          await fetchProfile(settings.access_token);
        }
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const saveCredentials = async () => {
    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          user_id: user.data.user.id,
          integration_type: 'linkedin',
          settings: credentials as any,
          is_enabled: true
        });

      if (error) throw error;

      toast({
        title: "Credentials saved",
        description: "LinkedIn credentials have been saved successfully."
      });

      if (credentials.access_token) {
        await testConnection();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!credentials.access_token) {
      toast({
        title: "Error",
        description: "Access token is required to test connection",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await fetchProfile(credentials.access_token);
      setIsConnected(true);
      toast({
        title: "Connection successful",
        description: "Successfully connected to LinkedIn API"
      });
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

  const fetchProfile = async (accessToken: string) => {
    const response = await fetch('https://api.linkedin.com/v2/people/~?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    }

    const profileData = await response.json();
    setProfile(profileData);
  };

  const generateAuthUrl = () => {
    if (!credentials.client_id) {
      toast({
        title: "Error",
        description: "Client ID is required to generate authorization URL",
        variant: "destructive"
      });
      return;
    }

    const scope = 'r_liteprofile r_emailaddress w_member_social rw_ads';
    const redirectUri = encodeURIComponent(window.location.origin + '/linkedin-callback');
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${credentials.client_id}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
    
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
        {!isConnected && credentials.access_token && (
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
              Configure your LinkedIn Developer API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                type="text"
                value={credentials.client_id}
                onChange={(e) => setCredentials(prev => ({ ...prev, client_id: e.target.value }))}
                placeholder="Your LinkedIn App Client ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                value={credentials.client_secret}
                onChange={(e) => setCredentials(prev => ({ ...prev, client_secret: e.target.value }))}
                placeholder="Your LinkedIn App Client Secret"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token</Label>
              <Input
                id="access_token"
                type="password"
                value={credentials.access_token}
                onChange={(e) => setCredentials(prev => ({ ...prev, access_token: e.target.value }))}
                placeholder="Your LinkedIn Access Token"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveCredentials} disabled={loading}>
                Save Credentials
              </Button>
              <Button variant="outline" onClick={testConnection} disabled={loading || !credentials.access_token}>
                Test Connection
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>OAuth Authorization</Label>
              <p className="text-sm text-muted-foreground">
                Generate an authorization URL to get an access token
              </p>
              <Button variant="outline" onClick={generateAuthUrl} disabled={!credentials.client_id}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Generate Auth URL
              </Button>
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