// Complete LinkedIn Integration System for Lovable
// This file contains all the components, types, and API implementation needed

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  User, 
  Download,
  Upload,
  Settings,
  Link,
  Users,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Types and Interfaces
interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  headline?: string;
  vanityName?: string;
  industry?: string;
  location?: string;
}

interface LinkedInLead {
  id: string;
  linkedin_lead_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  form_name?: string;
  linkedin_campaign_id?: string;
  submitted_at?: string;
  lead_data?: any;
}

interface LinkedInToken {
  id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  scope?: string;
  created_at: string;
  updated_at: string;
}

interface ConnectionStatus {
  connected: boolean;
  profile?: LinkedInProfile;
  token?: LinkedInToken;
  error?: string;
  scopes?: string[];
}

// Main LinkedIn Integration Component
const LinkedInIntegration: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [leads, setLeads] = useState<LinkedInLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Settings state
  const [autoSync, setAutoSync] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState(24);
  const [webhookUrl, setWebhookUrl] = useState("");
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");

  // Initialize data on component mount
  useEffect(() => {
    checkConnectionStatus();
    fetchLeads();
    loadSettings();
  }, []);

  // Connection and authentication functions
  const checkConnectionStatus = async () => {
    setIsLoading(true);
    try {
      // Check if user has LinkedIn tokens
      const { data: tokenData, error: tokenError } = await supabase
        .from('linkedin_user_tokens')
        .select('*')
        .single();

      if (tokenError && tokenError.code !== 'PGRST116') {
        throw tokenError;
      }

      if (tokenData) {
        // Test connection with the token
        const { data: testData, error: testError } = await supabase.functions.invoke('linkedin-lead-sync', {
          body: { action: 'testConnection' }
        });

        if (testError) {
          throw testError;
        }

        if (testData?.connected) {
          // Get profile information
          const { data: profileData, error: profileError } = await supabase.functions.invoke('linkedin-lead-sync', {
            body: { action: 'getProfile' }
          });

          setConnectionStatus({
            connected: true,
            token: tokenData,
            profile: profileData?.profile,
            scopes: tokenData.scope?.split(' ') || []
          });
        } else {
          setConnectionStatus({
            connected: false,
            error: 'LinkedIn connection test failed'
          });
        }
      } else {
        setConnectionStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionStatus({
        connected: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectToLinkedIn = async () => {
    try {
      // Start OAuth flow
      const redirectUrl = `${window.location.origin}/linkedin-callback`;
      
      const { data, error } = await supabase.functions.invoke('linkedin-oauth', {
        body: { 
          action: 'getAuthUrl',
          redirectUrl: redirectUrl,
          scopes: ['openid', 'profile', 'email', 'w_ads_reporting', 'rw_ads']
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to LinkedIn OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error starting LinkedIn OAuth:', error);
      toast({
        title: "Error",
        description: "Failed to start LinkedIn connection",
        variant: "destructive"
      });
    }
  };

  const disconnectFromLinkedIn = async () => {
    try {
      // Delete tokens from database
      const { error } = await supabase
        .from('linkedin_user_tokens')
        .delete()
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setConnectionStatus({ connected: false });
      setLeads([]);

      toast({
        title: "Success",
        description: "Disconnected from LinkedIn successfully"
      });
    } catch (error) {
      console.error('Error disconnecting from LinkedIn:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from LinkedIn",
        variant: "destructive"
      });
    }
  };

  const refreshConnection = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('linkedin-lead-sync', {
        body: { action: 'refreshToken' }
      });

      if (error) throw error;

      await checkConnectionStatus();

      toast({
        title: "Success",
        description: "LinkedIn connection refreshed successfully"
      });
    } catch (error) {
      console.error('Error refreshing connection:', error);
      toast({
        title: "Error",
        description: "Failed to refresh LinkedIn connection",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Lead management functions
  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('linkedin_leads')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const syncLeads = async () => {
    if (!connectionStatus.connected) {
      toast({
        title: "Error",
        description: "Please connect to LinkedIn first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSyncing(true);
      setSyncProgress(10);

      const { data, error } = await supabase.functions.invoke('linkedin-lead-sync', {
        body: { action: 'syncLeads' }
      });

      setSyncProgress(50);

      if (error) throw error;

      setSyncProgress(80);

      // Refresh leads data
      await fetchLeads();

      setSyncProgress(100);

      toast({
        title: "Success",
        description: `Synced ${data?.leadsCount || 0} leads from LinkedIn`
      });
    } catch (error) {
      console.error('Error syncing leads:', error);
      toast({
        title: "Error",
        description: "Failed to sync leads from LinkedIn",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const exportLeads = async () => {
    try {
      const csvContent = [
        ['Name', 'Email', 'Phone', 'Company', 'Job Title', 'Form', 'Campaign', 'Submitted Date'].join(','),
        ...leads.map(lead => [
          `"${lead.first_name || ''} ${lead.last_name || ''}"`,
          `"${lead.email || ''}"`,
          `"${lead.phone || ''}"`,
          `"${lead.company || ''}"`,
          `"${lead.job_title || ''}"`,
          `"${lead.form_name || ''}"`,
          `"${lead.linkedin_campaign_id || ''}"`,
          `"${lead.submitted_at ? new Date(lead.submitted_at).toLocaleDateString() : ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin-leads-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Leads exported successfully"
      });
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast({
        title: "Error",
        description: "Failed to export leads",
        variant: "destructive"
      });
    }
  };

  // Settings functions
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('integration_type', 'linkedin')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAutoSync(data.is_enabled || false);
        setSyncFrequency(data.sync_frequency_hours || 24);
        setWebhookUrl(data.settings?.webhook_url || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const settingsData = {
        user_id: user.id,
        integration_type: 'linkedin',
        is_enabled: autoSync,
        sync_frequency_hours: syncFrequency,
        settings: {
          webhook_url: webhookUrl
        }
      };

      const { error } = await supabase
        .from('integration_settings')
        .upsert(settingsData, {
          onConflict: 'user_id,integration_type'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTokenExpiryStatus = () => {
    if (!connectionStatus.token?.token_expires_at) return 'unknown';
    
    const expiryDate = new Date(connectionStatus.token.token_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 7) return 'warning';
    return 'good';
  };

  // Filter functions
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCampaign = !selectedCampaign || lead.linkedin_campaign_id === selectedCampaign;
    
    return matchesSearch && matchesCampaign;
  });

  const uniqueCampaigns = [...new Set(leads.map(lead => lead.linkedin_campaign_id).filter(Boolean))];

  // Render loading state
  if (isLoading && !connectionStatus.connected) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading LinkedIn integration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">LinkedIn Integration</h1>
          <p className="text-muted-foreground">Connect and manage your LinkedIn advertising data</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={checkConnectionStatus} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            LinkedIn Connection Status
          </CardTitle>
          <CardDescription>
            Manage your LinkedIn integration and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionStatus.connected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Connected to LinkedIn</p>
                    {connectionStatus.profile && (
                      <p className="text-sm text-muted-foreground">
                        {connectionStatus.profile.firstName} {connectionStatus.profile.lastName}
                        {connectionStatus.profile.headline && ` • ${connectionStatus.profile.headline}`}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">Not connected to LinkedIn</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your LinkedIn account to access advertising features
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {connectionStatus.connected ? (
                <>
                  <Button onClick={refreshConnection} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={disconnectFromLinkedIn} variant="destructive" size="sm">
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={connectToLinkedIn}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect LinkedIn
                </Button>
              )}
            </div>
          </div>

          {/* Token Status */}
          {connectionStatus.connected && connectionStatus.token && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium">Token Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTokenExpiryStatus() === 'good' && <Badge variant="default">Valid</Badge>}
                    {getTokenExpiryStatus() === 'warning' && <Badge variant="destructive">Expires Soon</Badge>}
                    {getTokenExpiryStatus() === 'expired' && <Badge variant="destructive">Expired</Badge>}
                  </div>
                </div>
                <div>
                  <p className="font-medium">Expires</p>
                  <p className="text-muted-foreground mt-1">
                    {connectionStatus.token.token_expires_at 
                      ? formatDate(connectionStatus.token.token_expires_at)
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <p className="font-medium">Scopes</p>
                  <p className="text-muted-foreground mt-1">
                    {connectionStatus.scopes?.join(', ') || 'No scopes'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connection Error */}
          {connectionStatus.error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {connectionStatus.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Lead Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          {/* Sync Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lead Synchronization
              </CardTitle>
              <CardDescription>
                Sync leads from your LinkedIn advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={syncLeads} 
                    disabled={!connectionStatus.connected || isSyncing}
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isSyncing ? 'Syncing...' : 'Sync Leads'}
                  </Button>
                  
                  <Button 
                    onClick={exportLeads} 
                    variant="outline"
                    disabled={leads.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {leads.length} leads total
                </div>
              </div>

              {/* Sync Progress */}
              {isSyncing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Syncing leads...</span>
                    <span>{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Leads</CardTitle>
              <CardDescription>
                Leads captured from your LinkedIn advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-48">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                  >
                    <option value="">All campaigns</option>
                    {uniqueCampaigns.map(campaign => (
                      <option key={campaign} value={campaign}>
                        {campaign}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Leads Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </TableCell>
                      <TableCell>{lead.email || 'N/A'}</TableCell>
                      <TableCell>{lead.company || 'N/A'}</TableCell>
                      <TableCell>{lead.job_title || 'N/A'}</TableCell>
                      <TableCell>{lead.form_name || 'N/A'}</TableCell>
                      <TableCell>{lead.linkedin_campaign_id || 'N/A'}</TableCell>
                      <TableCell>
                        {lead.submitted_at ? formatDate(lead.submitted_at) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredLeads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {leads.length === 0 
                    ? "No leads found. Sync from LinkedIn to get started."
                    : "No leads match your search criteria."
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Integration Settings
              </CardTitle>
              <CardDescription>
                Configure your LinkedIn integration preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Sync Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-sync">Automatic Lead Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync leads from LinkedIn at regular intervals
                    </p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={autoSync}
                    onCheckedChange={setAutoSync}
                  />
                </div>

                {autoSync && (
                  <div>
                    <Label htmlFor="sync-frequency">Sync Frequency (hours)</Label>
                    <Input
                      id="sync-frequency"
                      type="number"
                      min="1"
                      max="168"
                      value={syncFrequency}
                      onChange={(e) => setSyncFrequency(parseInt(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      How often to automatically sync leads (1-168 hours)
                    </p>
                  </div>
                )}
              </div>

              {/* Webhook Settings */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-app.com/webhook/linkedin"
                />
                <p className="text-xs text-muted-foreground">
                  Receive real-time notifications when new leads are captured
                </p>
              </div>

              {/* Save Button */}
              <Button onClick={saveSettings}>
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leads.length}</div>
                <p className="text-xs text-muted-foreground">
                  All time
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {leads.filter(lead => {
                    if (!lead.submitted_at) return false;
                    const leadDate = new Date(lead.submitted_at);
                    const now = new Date();
                    return leadDate.getMonth() === now.getMonth() && 
                           leadDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  New leads this month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueCampaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  With captured leads
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lead Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>
                Breakdown of leads by form and campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Name</TableHead>
                    <TableHead>Campaign ID</TableHead>
                    <TableHead>Lead Count</TableHead>
                    <TableHead>Latest Lead</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    leads.reduce((acc, lead) => {
                      const key = `${lead.form_name || 'Unknown'}-${lead.linkedin_campaign_id || 'Unknown'}`;
                      if (!acc[key]) {
                        acc[key] = {
                          formName: lead.form_name || 'Unknown',
                          campaignId: lead.linkedin_campaign_id || 'Unknown',
                          count: 0,
                          latestDate: lead.submitted_at
                        };
                      }
                      acc[key].count++;
                      if (lead.submitted_at && (!acc[key].latestDate || lead.submitted_at > acc[key].latestDate)) {
                        acc[key].latestDate = lead.submitted_at;
                      }
                      return acc;
                    }, {} as any)
                  ).map(([key, stats]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell>{stats.formName}</TableCell>
                      <TableCell>{stats.campaignId}</TableCell>
                      <TableCell>{stats.count}</TableCell>
                      <TableCell>
                        {stats.latestDate ? formatDate(stats.latestDate) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LinkedInIntegration;

/*
=== EDGE FUNCTION CODE ===
Create these as separate edge functions:

1. supabase/functions/linkedin-oauth/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    
    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('LinkedIn credentials not configured');
    }

    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case 'getAuthUrl':
        result = await getAuthUrl(linkedinClientId, params);
        break;
      case 'exchangeCode':
        result = await exchangeCode(linkedinClientId, linkedinClientSecret, params, supabase, user.id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getAuthUrl(clientId: string, params: any) {
  const scopes = params.scopes || ['openid', 'profile', 'email'];
  const redirectUri = params.redirectUrl;
  const state = crypto.randomUUID();
  
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('response_type', 'code');
  
  return { authUrl: authUrl.toString(), state };
}

async function exchangeCode(clientId: string, clientSecret: string, params: any, supabase: any, userId: string) {
  const { code, redirectUrl } = params;
  
  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUrl,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const tokenData = await tokenResponse.json();
  
  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
  
  // Store token in database
  const { error } = await supabase
    .from('linkedin_user_tokens')
    .upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
    }, {
      onConflict: 'user_id'
    });

  if (error) throw error;

  return { success: true, tokenData };
}

2. supabase/functions/linkedin-lead-sync/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    
    console.log('LinkedIn credentials check:', {
      hasClientId: !!linkedinClientId,
      hasClientSecret: !!linkedinClientSecret,
      hasAccessToken: false,
      action: (await req.json()).action
    });

    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('LinkedIn credentials not configured');
    }

    // Get user's access token
    const { data: tokenData } = await supabase
      .from('linkedin_user_tokens')
      .select('access_token, token_expires_at')
      .eq('user_id', user.id)
      .single();

    if (!tokenData?.access_token) {
      throw new Error('No LinkedIn access token found. Please connect your LinkedIn account first.');
    }

    console.log('Action requested:', (await req.json()).action);

    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case 'testConnection':
        result = await testConnection(tokenData.access_token);
        break;
      case 'getProfile':
        result = await getProfile(tokenData.access_token);
        break;
      case 'syncLeads':
        result = await syncLeads(tokenData.access_token, supabase, user.id);
        break;
      case 'refreshToken':
        result = await refreshToken(tokenData.refresh_token, linkedinClientId, linkedinClientSecret, supabase, user.id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testConnection(accessToken: string) {
  try {
    const response = await fetch('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    return { connected: response.ok };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

async function getProfile(accessToken: string) {
  try {
    const response = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,profilePicture)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    const profile = await response.json();
    return { profile };
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

async function syncLeads(accessToken: string, supabase: any, userId: string) {
  try {
    // Get ad accounts first
    const accountsResponse = await fetch('https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))&pageSize=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    if (!accountsResponse.ok) {
      throw new Error('Failed to fetch ad accounts');
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.elements || [];

    let totalLeads = 0;

    // For each account, get leads
    for (const account of accounts) {
      try {
        const leadsResponse = await fetch(`https://api.linkedin.com/rest/adAccounts/${account.id}/leads?q=criteria&pageSize=100`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'LinkedIn-Version': '202407',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });

        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          const leads = leadsData.elements || [];

          // Store leads in database
          for (const lead of leads) {
            await supabase
              .from('linkedin_leads')
              .upsert({
                user_id: userId,
                linkedin_lead_id: lead.id,
                first_name: lead.firstName,
                last_name: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                job_title: lead.jobTitle,
                form_name: lead.formName,
                linkedin_campaign_id: lead.campaignId,
                submitted_at: lead.submittedAt,
                lead_data: lead
              }, {
                onConflict: 'user_id,linkedin_lead_id'
              });

            totalLeads++;
          }
        }
      } catch (error) {
        console.error(`Error syncing leads for account ${account.id}:`, error);
      }
    }

    return { leadsCount: totalLeads };
  } catch (error) {
    console.error('Error syncing leads:', error);
    throw error;
  }
}

async function refreshToken(refreshToken: string, clientId: string, clientSecret: string, supabase: any, userId: string) {
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokenData = await response.json();
    
    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
    
    // Update token in database
    const { error } = await supabase
      .from('linkedin_user_tokens')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

=== DATABASE TABLES ALREADY EXIST ===
The following tables should already exist from the advertising system:
- linkedin_user_tokens
- linkedin_leads

=== SUPABASE SECRETS NEEDED ===
Add these secrets in your Supabase dashboard:
- LINKEDIN_CLIENT_ID: Your LinkedIn app client ID
- LINKEDIN_CLIENT_SECRET: Your LinkedIn app client secret

=== LINKEDIN CALLBACK PAGE ===
Create src/pages/LinkedInCallback.tsx:

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const LinkedInCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      if (error) {
        toast({
          title: "LinkedIn Connection Failed",
          description: error,
          variant: "destructive"
        });
        navigate('/linkedin-integration');
        return;
      }

      if (!code) {
        toast({
          title: "Error",
          description: "No authorization code received",
          variant: "destructive"
        });
        navigate('/linkedin-integration');
        return;
      }

      try {
        const redirectUrl = `${window.location.origin}/linkedin-callback`;
        
        const { data, error: exchangeError } = await supabase.functions.invoke('linkedin-oauth', {
          body: { 
            action: 'exchangeCode',
            code,
            redirectUrl
          }
        });

        if (exchangeError) throw exchangeError;

        toast({
          title: "Success",
          description: "LinkedIn connected successfully!"
        });

        navigate('/linkedin-integration');
      } catch (error) {
        console.error('Error exchanging code:', error);
        toast({
          title: "Connection Failed",
          description: "Failed to complete LinkedIn connection",
          variant: "destructive"
        });
        navigate('/linkedin-integration');
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connecting to LinkedIn...</h2>
          <p className="text-muted-foreground">Please wait while we complete your connection.</p>
        </div>
      </div>
    </div>
  );
};

export default LinkedInCallback;
*/