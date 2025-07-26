import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, RefreshCcw, TrendingUp, Eye, DollarSign, Target, Play, Pause, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Campaign {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DRAFT";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  created_at: string;
  updated_at: string;
  campaign_data?: any;
  account_id?: string;
  account_name?: string;
  account_currency?: string;
}

interface AdAccount {
  id: string;
  name: string;
  status: string;
  type: string;
  currency: string;
  total_budget: number;
  account_data?: any;
}

const Advertising = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<any>(null);

  // Campaign creation form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [budget, setBudget] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [costType, setCostType] = useState("CPC");
  const [objective, setObjective] = useState("BRAND_AWARENESS");
  const [currency, setCurrency] = useState("USD");
  const [endDate, setEndDate] = useState("");
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  useEffect(() => {
    if (user) {
      checkLinkedInConnection();
      // Always fetch advertising data, regardless of connection status
      fetchAdvertisingData();
    }
  }, [user]);

  // Force a refresh of the advertising data when component mounts
  useEffect(() => {
    console.log('Advertising page mounted, forcing data refresh...');
    if (user) {
      setTimeout(() => fetchAdvertisingData(), 1000);
    }
  }, []);

  const checkLinkedInConnection = async () => {
    try {
      // Directly test the connection using the existing API
      const { data: connectionData } = await supabase.functions.invoke('linkedin-lead-sync', {
        body: { action: 'testConnection' }
      });
      
      if (connectionData?.success) {
        setLinkedInConnected(true);
        // Get LinkedIn profile info
        const { data: profileData } = await supabase.functions.invoke('linkedin-lead-sync', {
          body: { action: 'getProfile' }
        });
        if (profileData?.success) {
          setLinkedInProfile(profileData.data);
        }
      } else {
        setLinkedInConnected(false);
        setLinkedInProfile(null);
      }
    } catch (error) {
      console.error('Error checking LinkedIn connection:', error);
      setLinkedInConnected(false);
      setLinkedInProfile(null);
    } finally {
      setLoading(false);
    }
  };


  const fetchAdvertisingData = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching advertising data...');
      
      // Fetch ad accounts first
      const { data: accountsData, error: accountsError } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { action: 'getAdAccounts' }
      });
      
      console.log('Ad accounts response:', { accountsData, accountsError });
      
      if (accountsError) {
        console.error('Supabase function error for ad accounts:', accountsError);
        throw accountsError;
      }
      
      if (accountsData?.success) {
        const accounts = accountsData.data || [];
        setAdAccounts(accounts);
        console.log(`Loaded ${accounts.length} ad accounts`);

        // Fetch campaigns from all accounts
        let allCampaigns: Campaign[] = [];
        
        // Try to fetch campaigns for each account since the new API requires account-specific queries
        for (const account of accounts) {
          try {
            console.log(`Fetching campaigns for account: ${account.id}`);
            const { data: campaignsData, error: campaignsError } = await supabase.functions.invoke('linkedin-advertising-api', {
              body: { action: 'getCampaigns', accountId: account.id }
            });
            
            console.log(`Campaigns response for account ${account.id}:`, { campaignsData, campaignsError });
            
            if (campaignsError) {
              console.error(`Supabase function error for campaigns in account ${account.id}:`, campaignsError);
            } else if (campaignsData?.success && campaignsData.data) {
              console.log(`Found ${campaignsData.data.length} campaigns for account ${account.id}`);
              
              // Add account info to campaigns
              const campaignsWithAccount = campaignsData.data.map((campaign: Campaign) => ({
                ...campaign,
                account_id: account.id,
                account_name: account.name,
                account_currency: account.currency || 'USD'
              }));
              allCampaigns.push(...campaignsWithAccount);
            }
          } catch (error) {
            console.error(`Error fetching campaigns for account ${account.id}:`, error);
          }
        }
        
        setCampaigns(allCampaigns);
        console.log(`Total campaigns loaded: ${allCampaigns.length}`);
      } else if (accountsData?.error) {
        console.error('LinkedIn API error:', accountsData.error);
        toast({
          title: "LinkedIn API Error",
          description: accountsData.error,
          variant: "destructive"
        });
        // Still set empty arrays so the UI shows properly
        setAdAccounts([]);
        setCampaigns([]);
      } else {
        console.log('No ad accounts data or API call failed');
        // Still set empty arrays so the UI shows properly
        setAdAccounts([]);
        setCampaigns([]);
      }

    } catch (error: any) {
      console.error('Error fetching advertising data:', error);
      toast({
        title: "Error Loading Data",
        description: error.message || "Failed to load advertising data",
        variant: "destructive"
      });
      // Set empty arrays on error so the UI still renders
      setAdAccounts([]);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([checkLinkedInConnection(), fetchAdvertisingData()]);
    setIsRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "Advertising data has been refreshed successfully.",
    });
  };

  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'activate') => {
    try {
      const { data } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'updateCampaign',
          campaignId,
          status: action === 'pause' ? 'PAUSED' : 'ACTIVE'
        }
      });
      
      if (data?.success) {
        toast({
          title: "Campaign Updated",
          description: `Campaign has been ${action === 'pause' ? 'paused' : 'activated'} successfully.`,
        });
        await fetchAdvertisingData();
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive"
      });
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !campaignType || !budget || !selectedAccount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Campaign Name, Type, Account, and Budget)",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingCampaign(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'createCampaign',
          name: campaignName,
          type: campaignType,
          account: selectedAccount,
          budget: parseFloat(budget),
          bidAmount: parseFloat(bidAmount) || 5.00,
          costType,
          objective,
          currency,
          endDate: endDate || null
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Campaign Created",
          description: data.message || "New campaign has been created successfully.",
        });
        // Reset form
        setCampaignName("");
        setCampaignType("");
        setSelectedAccount("");
        setBudget("");
        setBidAmount("");
        setCostType("CPC");
        setObjective("BRAND_AWARENESS");
        setCurrency("USD");
        setEndDate("");
        // Refresh data to show new campaign
        await fetchAdvertisingData();
      } else {
        throw new Error(data?.message || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive"
      });
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-500";
      case "PAUSED": return "bg-yellow-500";
      case "ARCHIVED": return "bg-gray-500";
      case "DRAFT": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading advertising data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">LinkedIn Advertising</h1>
            <p className="text-muted-foreground">
              Manage your LinkedIn advertising campaigns and performance.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>


        {/* LinkedIn Advertising Workflow Notice */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">LinkedIn Advertising Setup Required</CardTitle>
            <CardDescription className="text-orange-700">
              To create LinkedIn campaigns, you need to follow the proper workflow: Ad Account → Advertisement Creative → Campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Ad Account</p>
                  <p className="text-sm text-gray-600">
                    {adAccounts.length > 0 ? `✅ ${adAccounts.length} account(s) connected` : '❌ No ad accounts found'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Advertisement Creative</p>
                  <p className="text-sm text-gray-600">❌ No creatives management available - LinkedIn requires advertisement creatives before creating campaigns</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-500">Campaign</p>
                  <p className="text-sm text-gray-500">Can only be created after advertisement creatives are ready</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Use LinkedIn Campaign Manager directly to create advertisement creatives</li>
                <li>2. Once creatives are ready, you can create campaigns that reference those creatives</li>
                <li>3. This page currently allows you to view and manage existing campaigns only</li>
              </ol>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline"
                onClick={() => window.open('https://www.linkedin.com/campaignmanager/', '_blank')}
              >
                Open LinkedIn Campaign Manager
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards - Always Show */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns.filter(c => c.status === "ACTIVE").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${campaigns.reduce((sum, c) => sum + (c.spent || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all campaigns
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total reach
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. CTR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns.length > 0 
                  ? ((campaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / campaigns.length) * 100).toFixed(2)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Click-through rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Data Tables - Always Show */}
        <>
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Data Tables */}
          <Tabs defaultValue="accounts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="accounts">Ad Accounts</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            </TabsList>
            
            <TabsContent value="campaigns">
              <Card>
                <CardHeader>
                  <CardTitle>Campaigns</CardTitle>
                  <CardDescription>
                    Manage your LinkedIn advertising campaigns.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Spent</TableHead>
                        <TableHead>Impressions</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>CTR</TableHead>
                        <TableHead>CPC</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{campaign.account_name}</div>
                              <div className="text-muted-foreground">{campaign.account_currency}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(campaign.status)} text-white`}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>${campaign.budget?.toLocaleString() || 0}</TableCell>
                          <TableCell>${campaign.spent?.toLocaleString() || 0}</TableCell>
                          <TableCell>{campaign.impressions?.toLocaleString() || 0}</TableCell>
                          <TableCell>{campaign.clicks?.toLocaleString() || 0}</TableCell>
                          <TableCell>{((campaign.ctr || 0) * 100).toFixed(2)}%</TableCell>
                          <TableCell>${(campaign.cpc || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {campaign.status === "ACTIVE" ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCampaignAction(campaign.id, 'pause')}
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCampaignAction(campaign.id, 'activate')}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="accounts">
              <Card>
                <CardHeader>
                  <CardTitle>Ad Accounts</CardTitle>
                  <CardDescription>
                    View your LinkedIn ad accounts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Total Budget</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.status}</Badge>
                          </TableCell>
                          <TableCell>{account.type}</TableCell>
                          <TableCell>{account.currency}</TableCell>
                          <TableCell>${account.total_budget?.toLocaleString() || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      </div>
    </div>
  );
};

export default Advertising;