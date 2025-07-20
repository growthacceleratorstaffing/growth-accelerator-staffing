import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, ExternalLink, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CrmTool {
  id: string;
  name: string;
  description: string;
  logo: string;
  connected: boolean;
  setupUrl?: string;
  apiKeyField?: string;
}

const CrmIntegrations = () => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [crmTools, setCrmTools] = useState<CrmTool[]>([
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

  const handleConnect = async (toolId: string) => {
    setIsConnecting(toolId);
    
    // Simulate API connection
    setTimeout(() => {
      setCrmTools(prev => prev.map(tool => 
        tool.id === toolId ? { ...tool, connected: true } : tool
      ));
      
      toast({
        title: "Integration Connected",
        description: `Successfully connected to ${crmTools.find(t => t.id === toolId)?.name}`,
      });
      
      setIsConnecting(null);
    }, 2000);
  };

  const handleDisconnect = (toolId: string) => {
    setCrmTools(prev => prev.map(tool => 
      tool.id === toolId ? { ...tool, connected: false } : tool
    ));
    
    toast({
      title: "Integration Disconnected",
      description: `Disconnected from ${crmTools.find(t => t.id === toolId)?.name}`,
      variant: "destructive"
    });
  };

  const ConnectDialog = ({ tool }: { tool: CrmTool }) => {
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
                onClick={() => handleConnect(tool.id)}
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
          {crmTools.map((tool) => (
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