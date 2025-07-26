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
    }
  }, [user]);

  const checkLinkedInConnection = async () => {
    try {
      // Check if user has a valid LinkedIn token in the database first
      const { data: tokenData } = await supabase
        .from('linkedin_user_tokens')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      let hasValidToken = false;
      
      if (tokenData && new Date(tokenData.token_expires_at) > new Date()) {
        hasValidToken = true;
      } else {
        // Fallback to check global token
        try {
          const { data: globalTokenData } = await supabase.functions.invoke('linkedin-api', {
            body: { action: 'getCredentials' }
          });
          
          if (globalTokenData?.success && globalTokenData.data?.has_access_token) {
            hasValidToken = true;
          }
        } catch (error) {
          console.error('Error checking global token:', error);
        }
      }

      if (hasValidToken) {
        // Test the connection
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
          fetchAdvertisingData();
        } else {
          setLinkedInConnected(false);
          setLinkedInProfile(null);
          setLoading(false);
        }
      } else {
        // No valid token found
        setLinkedInConnected(false);
        setLinkedInProfile(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking LinkedIn connection:', error);
      setLinkedInConnected(false);
      setLinkedInProfile(null);
      setLoading(false);
    }
  };


  const fetchAdvertisingData = async () => {
    if (!user) return;
    
    try {
      // Fetch ad accounts first
      const { data: accountsData } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { action: 'getAdAccounts' }
      });
      
      if (accountsData?.success) {
        const accounts = accountsData.data || [];
        setAdAccounts(accounts);

        // Since account-specific campaign queries are having issues with LinkedIn API,
        // let's try fetching all campaigns first and then see if we can get any data
        let allCampaigns: Campaign[] = [];
        
        console.log('Trying to fetch all campaigns without account filtering first...');
        try {
          const { data: allCampaignsData } = await supabase.functions.invoke('linkedin-advertising-api', {
            body: { action: 'getCampaigns' } // No accountId parameter
          });
          
          if (allCampaignsData?.success && allCampaignsData.data) {
            console.log(`Found ${allCampaignsData.data.length} campaigns from general query`);
            
            // Add account info to campaigns if we can match them
            const campaignsWithAccount = allCampaignsData.data.map((campaign: Campaign) => {
              // Try to match campaign to account if possible
              // For now, just add general account info since account-specific queries don't work
              return {
                ...campaign,
                account_id: 'general',
                account_name: 'LinkedIn Campaigns',
                account_currency: 'USD'
              };
            });
            allCampaigns.push(...campaignsWithAccount);
          }
        } catch (error) {
          console.error('Error fetching all campaigns:', error);
        }
        
        // If we still have no campaigns, show this in the UI
        if (allCampaigns.length === 0) {
          console.log('No campaigns found. This could mean:');
          console.log('1. No campaigns exist in your LinkedIn accounts');
          console.log('2. The access token doesn\'t have campaign access permissions');
          console.log('3. LinkedIn API is having issues');
        }
        
        setCampaigns(allCampaigns);
        console.log(`Loaded ${allCampaigns.length} campaigns from ${accounts.length} ad accounts`);
      }

    } catch (error) {
      console.error('Error fetching advertising data:', error);
      toast({
        title: "Error",
        description: "Failed to load advertising data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAdvertisingData();
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

        {/* LinkedIn Connection Status */}
        {!linkedInConnected ? (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                LinkedIn Integration Required
              </CardTitle>
              <CardDescription>
                Please connect your LinkedIn account on the <a href="/linkedin-integration" className="text-blue-600 hover:underline">LinkedIn Integration page</a> to access advertising features.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-green-500 text-white">Connected</Badge>
                LinkedIn Integration
              </CardTitle>
              <CardDescription>
                {linkedInProfile ? (
                  `Connected as ${linkedInProfile.localizedFirstName} ${linkedInProfile.localizedLastName}`
                ) : (
                  'LinkedIn account connected successfully'
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Campaign Creation Form - Only show if LinkedIn is connected */}
        {linkedInConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Create New LinkedIn Campaign</CardTitle>
            <CardDescription>
              Set up a new advertising campaign on LinkedIn with proper targeting and budget settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Required Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g. Software Engineer Recruitment Q1"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="selectedAccount">Ad Account *</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ad account" />
                  </SelectTrigger>
                  <SelectContent>
                    {adAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaignType">Campaign Type *</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPONSORED_CONTENT">Sponsored Content</SelectItem>
                    <SelectItem value="SPONSORED_MESSAGING">Sponsored Messaging</SelectItem>
                    <SelectItem value="TEXT_ADS">Text Ads</SelectItem>
                    <SelectItem value="DYNAMIC_ADS">Dynamic Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="objective">Campaign Objective</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select objective" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRAND_AWARENESS">Brand Awareness</SelectItem>
                    <SelectItem value="WEBSITE_VISITS">Website Visits</SelectItem>
                    <SelectItem value="ENGAGEMENT">Engagement</SelectItem>
                    <SelectItem value="VIDEO_VIEWS">Video Views</SelectItem>
                    <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                    <SelectItem value="WEBSITE_CONVERSIONS">Website Conversions</SelectItem>
                    <SelectItem value="JOB_APPLICANTS">Job Applicants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="budget">Daily Budget *</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  min="10"
                  placeholder="e.g. 100.00"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum $10 USD</p>
              </div>
              <div>
                <Label htmlFor="bidAmount">Bid Amount</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 5.00"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Per click/impression</p>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costType">Cost Type</Label>
                <Select value={costType} onValueChange={setCostType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPC">Cost Per Click (CPC)</SelectItem>
                    <SelectItem value="CPM">Cost Per Thousand Impressions (CPM)</SelectItem>
                    <SelectItem value="CPS">Cost Per Send (CPS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for no end date</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleCreateCampaign}
                disabled={isCreatingCampaign}
                className="min-w-[150px]"
              >
                {isCreatingCampaign ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Summary Cards - Only show if LinkedIn is connected */}
        {linkedInConnected && (
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

        )}

        {/* Search and Data Tables - Only show if LinkedIn is connected */}
        {linkedInConnected && (
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
        )}
      </div>
    </div>
  );
};

export default Advertising;