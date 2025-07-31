// Complete LinkedIn Advertising System for Lovable
// This file contains all the components, types, and API implementation needed

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Plus, Eye, Play, Pause, Download, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Types and Interfaces
interface Campaign {
  id: string;
  name: string;
  status: string;
  campaign_type?: string;
  objective_type?: string;
  budget_amount?: number;
  budget_currency?: string;
  start_date?: string;
  end_date?: string;
  impressions?: number;
  clicks?: number;
  spend?: number;
  conversions?: number;
  linkedin_campaign_id: string;
}

interface Creative {
  id: string;
  title: string;
  description?: string;
  status?: string;
  click_uri?: string;
  account_id: string;
  creative_data?: any;
}

interface JobPosting {
  id: string;
  title: string;
  company_name?: string;
  location_name?: string;
  job_description?: string;
}

interface AdAccount {
  id: string;
  name: string;
  type?: string;
  status?: string;
  currency?: string;
  linkedin_account_id: string;
}

// Main Advertising Component
const Advertising: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  
  // Creative form state
  const [creativeName, setCreativeName] = useState("");
  const [creativeDescription, setCreativeDescription] = useState("");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [selectedJobForCreative, setSelectedJobForCreative] = useState("");
  const [selectedAccountForCreative, setSelectedAccountForCreative] = useState("");
  
  // Campaign form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [selectedCreative, setSelectedCreative] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCampaignGroup, setSelectedCampaignGroup] = useState("");
  const [budget, setBudget] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [costType, setCostType] = useState("CPC");
  const [objective, setObjective] = useState("BRAND_AWARENESS");
  const [endDate, setEndDate] = useState("");
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize data on component mount
  useEffect(() => {
    fetchAdvertisingData();
    checkLinkedInConnection();
  }, []);

  // Data fetching functions
  const fetchAdvertisingData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAdAccounts(),
        fetchCampaigns(),
        fetchCreatives(),
        fetchJobPostings()
      ]);
    } catch (error) {
      console.error('Error fetching advertising data:', error);
      toast({
        title: "Error",
        description: "Failed to load advertising data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      const { data: accountsData, error: accountsError } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { action: 'getAdAccounts' }
      });

      if (accountsError) throw accountsError;

      const { data: dbAccounts, error: dbError } = await supabase
        .from('linkedin_ad_accounts')
        .select('*');

      if (dbError) throw dbError;

      setAdAccounts(dbAccounts || []);
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('linkedin_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchCreatives = async () => {
    try {
      const { data, error } = await supabase
        .from('linkedin_creatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreatives(data || []);
    } catch (error) {
      console.error('Error fetching creatives:', error);
    }
  };

  const fetchJobPostings = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobPostings(data || []);
    } catch (error) {
      console.error('Error fetching job postings:', error);
    }
  };

  const checkLinkedInConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { action: 'testConnection' }
      });

      if (error) throw error;
      setIsLinkedInConnected(data?.connected || false);
    } catch (error) {
      console.error('Error checking LinkedIn connection:', error);
      setIsLinkedInConnected(false);
    }
  };

  // Creative management functions
  const handleCreateCreative = async () => {
    if (!creativeName || !selectedAccountForCreative) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      const creativeData = selectedJobForCreative 
        ? { 
            name: creativeName,
            description: creativeDescription,
            clickUri: creativeUrl,
            accountId: selectedAccountForCreative,
            jobId: selectedJobForCreative
          }
        : {
            name: creativeName,
            description: creativeDescription,
            clickUri: creativeUrl,
            accountId: selectedAccountForCreative
          };

      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'createCreative',
          ...creativeData
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Creative created successfully!"
      });

      // Reset form
      setCreativeName("");
      setCreativeDescription("");
      setCreativeUrl("");
      setSelectedJobForCreative("");
      setSelectedAccountForCreative("");

      // Refresh data
      await fetchCreatives();
    } catch (error) {
      console.error('Error creating creative:', error);
      toast({
        title: "Error",
        description: "Failed to create creative",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Campaign management functions
  const handleCreateCampaign = async () => {
    const creativeRequiredTypes = ['SPONSORED_UPDATES', 'TEXT_ADS', 'DYNAMIC_ADS'];
    const isCreativeRequired = creativeRequiredTypes.includes(campaignType);
    
    if (!campaignName || !campaignType || !budget || !selectedAccount || !selectedCampaignGroup) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Campaign Name, Type, Account, Campaign Group, and Budget)",
        variant: "destructive"
      });
      return;
    }
    
    if (isCreativeRequired && !selectedCreative) {
      toast({
        title: "Error",
        description: `Creative is required for ${campaignType} campaigns. Please select a creative or create one first.`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const selectedAccountData = adAccounts.find(acc => acc.id.toString() === selectedAccount);
      const accountCurrency = selectedAccountData?.currency || 'USD';
      
      const campaignPayload: any = { 
        action: 'createCampaign',
        name: campaignName,
        type: campaignType,
        account: selectedAccount,
        campaignGroup: selectedCampaignGroup,
        budget: parseFloat(budget),
        bidAmount: parseFloat(bidAmount) || 5.00,
        costType,
        objective,
        currency: accountCurrency,
        endDate: endDate || null
      };
      
      if (selectedCreative) {
        campaignPayload.creative = selectedCreative;
      }
      
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: campaignPayload
      });
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign created successfully!"
      });

      // Reset form
      setCampaignName("");
      setCampaignType("");
      setSelectedCreative("");
      setSelectedAccount("");
      setSelectedCampaignGroup("");
      setBudget("");
      setBidAmount("");
      setCostType("CPC");
      setObjective("BRAND_AWARENESS");
      setEndDate("");

      // Refresh campaigns
      await fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'activate') => {
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'updateCampaign',
          campaignId,
          updateData: { status: action === 'pause' ? 'PAUSED' : 'ACTIVE' }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Campaign ${action}d successfully!`
      });

      await fetchCampaigns();
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} campaign`,
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    await fetchAdvertisingData();
    toast({
      title: "Refreshed",
      description: "Data refreshed successfully"
    });
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00%';
    return ((clicks / impressions) * 100).toFixed(2) + '%';
  };

  const calculateCPC = (spend: number, clicks: number) => {
    if (clicks === 0) return '$0.00';
    return formatCurrency(spend / clicks);
  };

  // Filter functions
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCreatives = creatives.filter(creative =>
    creative.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render loading state
  if (isLoading && campaigns.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading advertising data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">LinkedIn Advertising</h1>
          <p className="text-muted-foreground">Manage your LinkedIn advertising campaigns and creatives</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* LinkedIn Connection Status */}
      {!isLinkedInConnected && (
        <Alert>
          <AlertDescription>
            LinkedIn is not connected. Please connect your LinkedIn account to manage advertising campaigns.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              {campaigns.filter(c => c.status === 'ACTIVE').length} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(campaigns.reduce((sum, c) => sum + (c.spend || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Ad Accounts</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        {/* Ad Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Ad Accounts</CardTitle>
              <CardDescription>
                Manage your LinkedIn advertising accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>LinkedIn ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.type || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(account.status || 'unknown')}>
                          {account.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.currency}</TableCell>
                      <TableCell>{account.linkedin_account_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Creatives Tab */}
        <TabsContent value="creatives" className="space-y-4">
          {/* Create Creative Form */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Create Advertisement Creative</CardTitle>
              <CardDescription>
                Create compelling ad creatives for your LinkedIn campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="creativeName">Creative Name *</Label>
                  <Input
                    id="creativeName"
                    value={creativeName}
                    onChange={(e) => setCreativeName(e.target.value)}
                    placeholder="Enter creative name"
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
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="creativeDescription">Description</Label>
                <Textarea
                  id="creativeDescription"
                  value={creativeDescription}
                  onChange={(e) => setCreativeDescription(e.target.value)}
                  placeholder="Enter creative description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="creativeUrl">Landing Page URL</Label>
                  <Input
                    id="creativeUrl"
                    value={creativeUrl}
                    onChange={(e) => setCreativeUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="selectedJobForCreative">Job Posting (Optional)</Label>
                  <Select value={selectedJobForCreative} onValueChange={setSelectedJobForCreative}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job posting" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobPostings.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title} - {job.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCreateCreative} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Creative
              </Button>
            </CardContent>
          </Card>

          {/* Creatives List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Creatives</CardTitle>
              <CardDescription>
                Manage your existing advertisement creatives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search creatives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreatives.map((creative) => (
                    <TableRow key={creative.id}>
                      <TableCell className="font-medium">{creative.title}</TableCell>
                      <TableCell>{creative.description || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(creative.status || 'active')}>
                          {creative.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>{creative.account_id}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Create Campaign Form */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Create LinkedIn Campaign</CardTitle>
              <CardDescription>
                Create and launch your LinkedIn advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaignName">Campaign Name *</Label>
                  <Input
                    id="campaignName"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Enter campaign name"
                  />
                </div>

                <div>
                  <Label htmlFor="campaignType">Campaign Type *</Label>
                  <Select value={campaignType} onValueChange={setCampaignType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPONSORED_UPDATES">Sponsored Content</SelectItem>
                      <SelectItem value="TEXT_ADS">Text Ads</SelectItem>
                      <SelectItem value="DYNAMIC_ADS">Dynamic Ads</SelectItem>
                      <SelectItem value="JOB_POSTINGS">Job Postings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="selectedAccount">Ad Account *</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ad account" />
                    </SelectTrigger>
                    <SelectContent>
                      {adAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="selectedCampaignGroup">Campaign Group *</Label>
                  <Select value={selectedCampaignGroup} onValueChange={setSelectedCampaignGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Campaign Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="selectedCreative">
                    Advertisement Creative {(['SPONSORED_UPDATES', 'TEXT_ADS', 'DYNAMIC_ADS'].includes(campaignType)) ? '*' : '(Optional)'}
                  </Label>
                  <Select value={selectedCreative} onValueChange={setSelectedCreative}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        (['SPONSORED_UPDATES', 'TEXT_ADS', 'DYNAMIC_ADS'].includes(campaignType)) 
                          ? "Select creative (required for this campaign type)" 
                          : "Select creative (optional for some campaign types)"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {creatives.map((creative) => (
                        <SelectItem key={creative.id} value={creative.id}>
                          {creative.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(['SPONSORED_UPDATES', 'TEXT_ADS', 'DYNAMIC_ADS'].includes(campaignType)) 
                      ? "Creative is required for this campaign type. Create one in Step 1 if needed."
                      : "For some campaign types like job postings, creatives are automatically generated"
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="budget">Budget *</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="1000"
                  />
                </div>

                <div>
                  <Label htmlFor="bidAmount">Bid Amount</Label>
                  <Input
                    id="bidAmount"
                    type="number"
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="5.00"
                  />
                </div>

                <div>
                  <Label htmlFor="costType">Cost Type</Label>
                  <Select value={costType} onValueChange={setCostType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPC">Cost Per Click</SelectItem>
                      <SelectItem value="CPM">Cost Per Mille</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="objective">Campaign Objective</Label>
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRAND_AWARENESS">Brand Awareness</SelectItem>
                      <SelectItem value="WEBSITE_CONVERSIONS">Website Conversions</SelectItem>
                      <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                      <SelectItem value="WEBSITE_VISITS">Website Visits</SelectItem>
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
                  />
                </div>
              </div>

              <Button onClick={handleCreateCampaign} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>

          {/* Campaigns List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Campaigns</CardTitle>
              <CardDescription>
                Monitor and manage your LinkedIn advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Spend</TableHead>
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
                      <TableCell>{campaign.campaign_type || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(campaign.budget_amount || 0, campaign.budget_currency)}
                      </TableCell>
                      <TableCell>{formatCurrency(campaign.spend || 0)}</TableCell>
                      <TableCell>{(campaign.impressions || 0).toLocaleString()}</TableCell>
                      <TableCell>{(campaign.clicks || 0).toLocaleString()}</TableCell>
                      <TableCell>{calculateCTR(campaign.clicks || 0, campaign.impressions || 0)}</TableCell>
                      <TableCell>{calculateCPC(campaign.spend || 0, campaign.clicks || 0)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCampaignAction(campaign.linkedin_campaign_id, 
                              campaign.status === 'ACTIVE' ? 'pause' : 'activate')}
                          >
                            {campaign.status === 'ACTIVE' ? 
                              <Pause className="h-4 w-4" /> : 
                              <Play className="h-4 w-4" />
                            }
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
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
      </Tabs>
    </div>
  );
};

export default Advertising;

/*
=== EDGE FUNCTION CODE ===
Create this as: supabase/functions/linkedin-advertising-api/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkedInAdAccount {
  id: string;
  name: string;
  type: string;
  status: string;
  currency?: string;
}

interface LinkedInCampaign {
  id: string;
  name: string;
  status: string;
  account: string;
  campaignGroup?: string;
  runSchedule?: any;
  budget?: any;
  costType?: string;
  unitCost?: any;
  objective?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get LinkedIn credentials from environment
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    
    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('LinkedIn credentials not configured');
    }

    // Get user-specific access token or global token
    let accessToken = '';
    
    // Try to get user-specific token first
    const { data: tokenData } = await supabase
      .from('linkedin_user_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (tokenData?.access_token) {
      accessToken = tokenData.access_token;
    } else {
      // Fallback to global token
      accessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN') || '';
    }

    if (!accessToken) {
      throw new Error('No LinkedIn access token available');
    }

    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case 'testConnection':
        result = await testConnection(accessToken);
        break;
      case 'getAdAccounts':
        result = await getAdAccounts(accessToken, supabase, user.id);
        break;
      case 'getCampaigns':
        result = await getCampaigns(accessToken, params.accountId);
        break;
      case 'createCampaign':
        result = await createCampaign(accessToken, params);
        break;
      case 'updateCampaign':
        result = await updateCampaign(accessToken, params.campaignId, params.updateData);
        break;
      case 'createCreative':
        result = await createCreative(accessToken, params, supabase, user.id);
        break;
      case 'getAccountCreatives':
        result = await getAccountCreatives(accessToken, params.accountId, supabase, user.id);
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
    const response = await fetch('https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))&pageSize=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    return { connected: response.ok };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

async function getAdAccounts(accessToken: string, supabase: any, userId: string): Promise<{ accounts: LinkedInAdAccount[] }> {
  try {
    const response = await fetch('https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))&pageSize=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    const data = await response.json();
    const accounts = data.elements || [];

    // Store accounts in database
    for (const account of accounts) {
      const accountId = account.id.toString();
      
      await supabase
        .from('linkedin_ad_accounts')
        .upsert({
          user_id: userId,
          linkedin_account_id: accountId,
          name: account.name,
          type: account.type,
          status: account.status,
          currency: account.currency
        }, {
          onConflict: 'user_id,linkedin_account_id'
        });
    }

    return { accounts };
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    throw error;
  }
}

async function getCampaigns(accessToken: string, accountId?: string): Promise<{ campaigns: LinkedInCampaign[] }> {
  try {
    let url = 'https://api.linkedin.com/rest/adCampaigns?q=search&pageSize=100';
    
    if (accountId) {
      url = `https://api.linkedin.com/rest/adAccounts/${accountId}/adCampaigns?q=search&pageSize=100`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { campaigns: data.elements || [] };
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

async function createCampaign(accessToken: string, campaignData: any): Promise<{ campaign: any }> {
  try {
    const payload = {
      name: campaignData.name,
      type: campaignData.type,
      account: `urn:li:sponsoredAccount:${campaignData.account}`,
      campaignGroup: campaignData.campaignGroup ? `urn:li:sponsoredCampaignGroup:${campaignData.campaignGroup}` : undefined,
      status: 'DRAFT',
      costType: campaignData.costType || 'CPC',
      dailyBudget: {
        currencyCode: campaignData.currency || 'USD',
        amount: campaignData.budget.toString()
      },
      unitCost: {
        currencyCode: campaignData.currency || 'USD',
        amount: (campaignData.bidAmount || 5.0).toString()
      },
      objective: campaignData.objective || 'BRAND_AWARENESS'
    };

    const response = await fetch('https://api.linkedin.com/rest/adCampaigns', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LinkedIn API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return { campaign: result };
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
}

async function updateCampaign(accessToken: string, campaignId: string, updateData: any): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`https://api.linkedin.com/rest/adCampaigns/${campaignId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
}

async function createCreative(accessToken: string, creativeData: any, supabase: any, userId: string): Promise<{ creative: any }> {
  try {
    // Create Direct Sponsored Content first
    const contentPayload = {
      author: `urn:li:sponsoredAccount:${creativeData.accountId}`,
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
      content: {
        contentEntities: [],
        title: creativeData.name,
        landingPage: {
          url: creativeData.clickUri || 'https://example.com'
        }
      },
      isTest: false
    };

    if (creativeData.description) {
      contentPayload.content.commentary = creativeData.description;
    }

    const contentResponse = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contentPayload)
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      throw new Error(`LinkedIn Content API error: ${contentResponse.status} ${errorText}`);
    }

    const contentResult = await contentResponse.json();
    const creativeId = contentResult.id;

    // Store in database
    await supabase
      .from('linkedin_creatives')
      .insert({
        id: creativeId,
        title: creativeData.name,
        description: creativeData.description,
        click_uri: creativeData.clickUri,
        account_id: creativeData.accountId,
        created_by: userId,
        status: 'ACTIVE',
        creative_data: contentResult
      });

    return { creative: contentResult };
  } catch (error) {
    console.error('Error creating creative:', error);
    throw error;
  }
}

async function getAccountCreatives(accessToken: string, accountId: string, supabase: any, userId: string): Promise<{ creatives: any[] }> {
  try {
    // First try to get from database
    const { data: dbCreatives } = await supabase
      .from('linkedin_creatives')
      .select('*')
      .eq('account_id', accountId)
      .eq('created_by', userId);

    if (dbCreatives && dbCreatives.length > 0) {
      return { creatives: dbCreatives };
    }

    // Fallback to API call
    const response = await fetch(`https://api.linkedin.com/rest/adAccounts/${accountId}/creatives?q=search&pageSize=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    if (!response.ok) {
      console.log(`API call failed with status ${response.status}, returning empty array`);
      return { creatives: [] };
    }

    const data = await response.json();
    return { creatives: data.elements || [] };
  } catch (error) {
    console.error('Error fetching creatives:', error);
    return { creatives: [] };
  }
}

=== DATABASE MIGRATIONS ===
Run these SQL commands using the migration tool:

-- Create linkedin_ad_accounts table
CREATE TABLE IF NOT EXISTS public.linkedin_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  linkedin_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, linkedin_account_id)
);

-- Create linkedin_campaigns table
CREATE TABLE IF NOT EXISTS public.linkedin_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  linkedin_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  campaign_type TEXT,
  objective_type TEXT,
  budget_amount NUMERIC,
  budget_currency TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create linkedin_creatives table
CREATE TABLE IF NOT EXISTS public.linkedin_creatives (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  click_uri TEXT,
  account_id TEXT NOT NULL,
  created_by UUID,
  status TEXT DEFAULT 'ACTIVE',
  creative_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create linkedin_user_tokens table
CREATE TABLE IF NOT EXISTS public.linkedin_user_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.linkedin_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_user_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for linkedin_ad_accounts
CREATE POLICY "Users can view their own LinkedIn ad accounts" ON public.linkedin_ad_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own LinkedIn ad accounts" ON public.linkedin_ad_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own LinkedIn ad accounts" ON public.linkedin_ad_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own LinkedIn ad accounts" ON public.linkedin_ad_accounts FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for linkedin_campaigns
CREATE POLICY "Users can view their own LinkedIn campaigns" ON public.linkedin_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own LinkedIn campaigns" ON public.linkedin_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own LinkedIn campaigns" ON public.linkedin_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own LinkedIn campaigns" ON public.linkedin_campaigns FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for linkedin_creatives
CREATE POLICY "Users can view their own creatives" ON public.linkedin_creatives FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create their own creatives" ON public.linkedin_creatives FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own creatives" ON public.linkedin_creatives FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own creatives" ON public.linkedin_creatives FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for linkedin_user_tokens
CREATE POLICY "Users can view their own LinkedIn tokens" ON public.linkedin_user_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own LinkedIn tokens" ON public.linkedin_user_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own LinkedIn tokens" ON public.linkedin_user_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own LinkedIn tokens" ON public.linkedin_user_tokens FOR DELETE USING (auth.uid() = user_id);

=== SUPABASE SECRETS NEEDED ===
Add these secrets in your Supabase dashboard:
- LINKEDIN_CLIENT_ID: Your LinkedIn app client ID
- LINKEDIN_CLIENT_SECRET: Your LinkedIn app client secret
- LINKEDIN_ACCESS_TOKEN: Your LinkedIn access token (optional, can use user-specific tokens)
*/