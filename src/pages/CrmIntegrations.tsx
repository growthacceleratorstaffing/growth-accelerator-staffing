import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, ExternalLink, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

interface CrmTool {
  id: string;
  name: string;
  description: string;
  logo: string;
  connected: boolean;
  setupUrl?: string;
  apiKeyField?: string;
  lastSync?: string;
}

interface CrmIntegration {
  id: string;
  crm_type: string;
  crm_name: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

const CrmIntegrations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [userIntegrations, setUserIntegrations] = useState<CrmIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [crmTools] = useState<CrmTool[]>([
    {
      id: "hubspot",
      name: "HubSpot",
      description: "Comprehensive CRM and marketing platform for managing leads and customer relationships",
      logo: "🟠",
      connected: false,
      setupUrl: "https://developers.hubspot.com/docs/api/private-apps"
    },
    {
      id: "salesforce",
      name: "Salesforce",
      description: "World's leading CRM platform for sales, service, and marketing automation",
      logo: "☁️",
      connected: false,
      setupUrl: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/"
    },
    {
      id: "apollo",
      name: "Apollo",
      description: "Sales intelligence and engagement platform for prospecting and outreach",
      logo: "🚀",
      connected: false,
      setupUrl: "https://apolloio.github.io/apollo-api-docs/"
    },
    {
      id: "pipedrive",
      name: "Pipedrive",
      description: "Sales CRM designed to help small and medium businesses grow their sales",
      logo: "📊",
      connected: false,
      setupUrl: "https://developers.pipedrive.com/docs/api/v1"
    },
    {
      id: "zoho",
      name: "Zoho CRM",
      description: "Cloud-based CRM software for managing sales, marketing, and customer support",
      logo: "🎯",
      connected: false,
      setupUrl: "https://www.zoho.com/crm/developer/docs/api/v2/"
    },
    {
      id: "monday",
      name: "Monday.com",
      description: "Work operating system for managing projects, processes, and everyday work",
      logo: "📅",
      connected: false,
      setupUrl: "https://developer.monday.com/api-reference/docs"
    }
  ]);

  // Fetch user's CRM integrations
  useEffect(() => {
    fetchUserIntegrations();
  }, [user]);

  const fetchUserIntegrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: "Error",
        description: "Failed to load your CRM integrations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get combined tool data with connection status
  const getToolsWithStatus = () => {
    return crmTools.map(tool => {
      const integration = userIntegrations.find(int => int.crm_type === tool.id);
      return {
        ...tool,
        connected: integration?.is_active || false,
        lastSync: integration?.last_sync_at || undefined,
        integrationId: integration?.id
      };
    });
  };

  const handleConnect = async (toolId: string, apiKey: string) => {
    if (!user) return;
    
    setIsConnecting(toolId);
    
    try {
      const tool = crmTools.find(t => t.id === toolId);
      if (!tool) throw new Error('Tool not found');

      // For HubSpot, do a direct API validation
      if (toolId === 'hubspot') {
        console.log('Validating HubSpot API key directly...');
        
        try {
          const testResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!testResponse.ok) {
            if (testResponse.status === 401) {
              throw new Error('Invalid API key. Please check your HubSpot private app token.');
            } else if (testResponse.status === 403) {
              throw new Error('API key does not have required permissions. Please ensure your private app has contacts read access.');
            } else {
              throw new Error(`HubSpot API error: ${testResponse.statusText}`);
            }
          }

          const testData = await testResponse.json();
          console.log('API validation successful');
        } catch (fetchError) {
          console.error('Direct API validation failed:', fetchError);
          throw new Error(fetchError instanceof Error ? fetchError.message : 'Failed to validate API key with HubSpot');
        }
      }

      // If validation passes, save the integration
      const { error } = await supabase
        .from('crm_integrations')
        .upsert({
          user_id: user.id,
          crm_type: toolId,
          crm_name: tool.name,
          api_key_encrypted: apiKey,
          is_active: true,
          last_sync_at: new Date().toISOString()
        });

      if (error) throw error;

      await fetchUserIntegrations();
      
      toast({
        title: "Integration Connected",
        description: `Successfully connected to ${tool.name}`,
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to the CRM. Please check your API key.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (toolId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('crm_integrations')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('crm_type', toolId);

      if (error) throw error;

      await fetchUserIntegrations();
      
      toast({
        title: "Integration Disconnected",
        description: `Disconnected from ${crmTools.find(t => t.id === toolId)?.name}`,
        variant: "destructive"
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect integration",
        variant: "destructive"
      });
    }
  };

  const ConnectDialog = ({ tool }: { tool: CrmTool & { connected: boolean, lastSync?: string } }) => {
    const [apiKey, setApiKey] = useState("");

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to {tool.name}</DialogTitle>
            <DialogDescription>
              Configure your {tool.name} integration to start importing CRM data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handleConnect(tool.id, apiKey)}
                disabled={!apiKey || isConnecting === tool.id}
                className="flex-1"
              >
                {isConnecting === tool.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
              {tool.setupUrl && (
                <Button variant="outline" asChild>
                  <a href={tool.setupUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading your CRM integrations...</div>
      </div>
    );
  }

  const toolsWithStatus = getToolsWithStatus();

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Integrations</h1>
          <p className="text-muted-foreground">
            Connect your favorite CRM tools to import and sync customer data automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toolsWithStatus.map((tool) => (
            <Card key={tool.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{tool.logo}</div>
                    <div>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <Badge 
                        variant={tool.connected ? "default" : "outline"}
                        className="mt-1"
                      >
                        {tool.connected ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Connected
                          </>
                        ) : (
                          "Not Connected"
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
                {tool.lastSync && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last synced: {new Date(tool.lastSync).toLocaleDateString()}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {tool.description}
                </CardDescription>
                <div className="flex gap-2">
                  {tool.connected ? (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDisconnect(tool.id)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <ConnectDialog tool={tool} />
                  )}
                  {tool.setupUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={tool.setupUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Once you've connected your CRM tools, data will be automatically imported and available on the Data page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Configure API keys for each CRM tool you want to connect</li>
              <li>• Data sync will run automatically every hour</li>
              <li>• View imported data, contacts, and leads on the Data page</li>
              <li>• Use the imported data for job matching and candidate sourcing</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CrmIntegrations;