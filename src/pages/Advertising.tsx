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

interface Creative {
  id: string;
  status: string;
  type: string;
  account: string;
  campaign?: string;
  content: {
    title?: string;
    description?: string;
    clickUri?: string;
    imageReference?: string;
  };
  created_at: string;
  updated_at: string;
  creative_data?: any;
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
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<any>(null);

  // Creative creation form state
  const [creativeTitle, setCreativeTitle] = useState("");
  const [creativeDescription, setCreativeDescription] = useState("");
  const [creativeClickUri, setCreativeClickUri] = useState("");
  const [selectedAccountForCreative, setSelectedAccountForCreative] = useState("");
  const [isCreatingCreative, setIsCreatingCreative] = useState(false);
  
  // Campaign creation form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCreative, setSelectedCreative] = useState("");
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

        // Fetch campaigns and creatives from all accounts
        let allCampaigns: Campaign[] = [];
        let allCreatives: Creative[] = [];
        
        // Try to fetch campaigns and creatives for each account
        for (const account of accounts) {
          try {
            // Fetch campaigns
            console.log(`Fetching campaigns for account: ${account.id}`);
            const { data: campaignsData, error: campaignsError } = await supabase.functions.invoke('linkedin-advertising-api', {
              body: { action: 'getCampaigns', accountId: account.id }
            });
            
            if (campaignsData?.success && campaignsData.data) {
              const campaignsWithAccount = campaignsData.data.map((campaign: Campaign) => ({
                ...campaign,
                account_id: account.id,
                account_name: account.name,
                account_currency: account.currency || 'USD'
              }));
              allCampaigns.push(...campaignsWithAccount);
            }

            // Fetch creatives
            console.log(`Fetching creatives for account: ${account.id}`);
            const { data: creativesData, error: creativesError } = await supabase.functions.invoke('linkedin-advertising-api', {
              body: { action: 'getAccountCreatives', accountId: account.id }
            });
            
            if (creativesData?.success && creativesData.data) {
              allCreatives.push(...creativesData.data);
            }
            
          } catch (error) {
            console.error(`Error fetching data for account ${account.id}:`, error);
          }
        }
        
        setCampaigns(allCampaigns);
        setCreatives(allCreatives);
        console.log(`Total campaigns loaded: ${allCampaigns.length}, creatives: ${allCreatives.length}`);
      } else if (accountsData?.error) {
        console.error('LinkedIn API error:', accountsData.error);
        toast({
          title: "LinkedIn API Error",
          description: accountsData.error,
          variant: "destructive"
        });
        setAdAccounts([]);
        setCampaigns([]);
        setCreatives([]);
      } else {
        console.log('No ad accounts data or API call failed');
        setAdAccounts([]);
        setCampaigns([]);
        setCreatives([]);
      }

    } catch (error: any) {
      console.error('Error fetching advertising data:', error);
      toast({
        title: "Error Loading Data",
        description: error.message || "Failed to load advertising data",
        variant: "destructive"
      });
      setAdAccounts([]);
      setCampaigns([]);
      setCreatives([]);
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

  const handleCreateCreative = async () => {
    if (!creativeTitle || !creativeDescription || !creativeClickUri || !selectedAccountForCreative) {
      toast({
        title: "Error",
        description: "Please fill in all required fields for the creative",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingCreative(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'createCreative',
          account: selectedAccountForCreative,
          content: {
            title: creativeTitle,
            description: creativeDescription,
            clickUri: creativeClickUri
          }
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Creative Created",
          description: "Advertisement creative has been created successfully.",
        });
        // Reset form
        setCreativeTitle("");
        setCreativeDescription("");
        setCreativeClickUri("");
        setSelectedAccountForCreative("");
        // Refresh data to show new creative
        await fetchAdvertisingData();
      } else {
        throw new Error(data?.message || 'Failed to create creative');
      }
    } catch (error) {
      console.error('Error creating creative:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create creative",
        variant: "destructive"
      });
    } finally {
      setIsCreatingCreative(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !campaignType || !budget || !selectedAccount || !selectedCreative) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Campaign Name, Type, Account, Creative, and Budget)",
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
          creative: selectedCreative,
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
        setSelectedCreative("");
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


        {/* Creative Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Create Advertisement Creative</CardTitle>
            <CardDescription>
              Create your advertisement creative first. This defines the content that will be shown to your audience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creativeTitle">Creative Title *</Label>
                <Input
                  id="creativeTitle"
                  placeholder="e.g. Hiring Software Engineers - Join Our Team"
                  value={creativeTitle}
                  onChange={(e) => setCreativeTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="selectedAccountForCreative">Ad Account *</Label>
                <Select value={selectedAccountForCreative} onValueChange={setSelectedAccountForCreative}>
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

            <div>
              <Label htmlFor="creativeDescription">Creative Description *</Label>
              <Textarea
                id="creativeDescription"
                placeholder="Describe your job opportunity, company benefits, and what makes this role attractive..."
                value={creativeDescription}
                onChange={(e) => setCreativeDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="creativeClickUri">Landing Page URL *</Label>
              <Input
                id="creativeClickUri"
                type="url"
                placeholder="https://yourcompany.com/careers/software-engineer"
                value={creativeClickUri}
                onChange={(e) => setCreativeClickUri(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Where users will be directed when they click your ad</p>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleCreateCreative}
                disabled={isCreatingCreative || adAccounts.length === 0}
                className="min-w-[150px]"
              >
                {isCreatingCreative ? "Creating..." : "Create Creative"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Create LinkedIn Campaign</CardTitle>
            <CardDescription>
              Create a campaign using your advertisement creatives. You need at least one creative before creating a campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g. Q1 Software Engineer Recruitment"
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
                <Label htmlFor="selectedCreative">Advertisement Creative *</Label>
                <Select value={selectedCreative} onValueChange={setSelectedCreative}>
                  <SelectTrigger>
                    <SelectValue placeholder={creatives.length === 0 ? "No creatives available" : "Select creative"} />
                  </SelectTrigger>
                  <SelectContent>
                    {creatives.map((creative) => (
                      <SelectItem key={creative.id} value={creative.id.toString()}>
                        {creative.content.title || `Creative ${creative.id.slice(-8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {creatives.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">Create a creative first before creating campaigns</p>
                )}
              </div>
            </div>

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
                    <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                    <SelectItem value="JOB_APPLICANTS">Job Applicants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleCreateCampaign}
                disabled={isCreatingCampaign || creatives.length === 0}
                className="min-w-[150px]"
              >
                {isCreatingCampaign ? "Creating..." : "Create Campaign"}
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
              <TabsTrigger value="creatives">Creatives ({creatives.length})</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
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

            <TabsContent value="creatives">
              <Card>
                <CardHeader>
                  <CardTitle>Advertisement Creatives</CardTitle>
                  <CardDescription>
                    View and manage your LinkedIn advertisement creatives.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creative</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Landing Page</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creatives.map((creative) => (
                        <TableRow key={creative.id}>
                          <TableCell className="font-medium">
                            {creative.content.title || `Creative ${creative.id.slice(-8)}`}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(creative.status)}>
                              {creative.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{creative.type}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {creative.content.description || 'No description'}
                          </TableCell>
                          <TableCell>
                            {creative.content.clickUri && (
                              <a 
                                href={creative.content.clickUri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                {new URL(creative.content.clickUri).hostname}
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(creative.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {creatives.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No advertisement creatives found. Create your first creative above.
                          </TableCell>
                        </TableRow>
                      )}
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