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
import { SavedAudienceManager } from "@/components/advertising/SavedAudienceManager";

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

interface JobPosting {
  id: string;
  title: string;
  job_description: string;
  company_name?: string;
  location_name?: string;
  salary_rate_low?: number;
  salary_rate_high?: number;
  salary_currency?: string;
  work_type_name?: string;
  created_at: string;
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
  const [campaignGroups, setCampaignGroups] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<any>(null);

  const [creativeSource, setCreativeSource] = useState<"custom" | "job">("job"); // Default to job postings
  // Creative creation form state
  const [selectedJobPosting, setSelectedJobPosting] = useState("");
  const [creativeTitle, setCreativeTitle] = useState("");
  const [creativeDescription, setCreativeDescription] = useState("");
  const [creativeClickUri, setCreativeClickUri] = useState("");
  const [selectedAccountForCreative, setSelectedAccountForCreative] = useState("");
  const [isCreatingCreative, setIsCreatingCreative] = useState(false);
  
  // Campaign creation form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCampaignGroup, setSelectedCampaignGroup] = useState(""); // New: for campaign group selection
  const [selectedCreative, setSelectedCreative] = useState("");
  const [budget, setBudget] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [costType, setCostType] = useState("CPC");
  const [objective, setObjective] = useState("BRAND_AWARENESS");
  const [currency, setCurrency] = useState("USD");
  const [endDate, setEndDate] = useState("");
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  
  // Saved Audience state (ADS-303)
  const [selectedSavedAudience, setSelectedSavedAudience] = useState<any>(null);
  const [savedAudienceTargeting, setSavedAudienceTargeting] = useState<any>(null);

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

        // Fetch campaigns, creatives, campaign groups, and job postings from all accounts
        let allCampaigns: Campaign[] = [];
        let allCreatives: Creative[] = [];
        let allCampaignGroups: any[] = [];
        
        // Try to fetch campaigns, creatives, and campaign groups for each account
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

            // Fetch campaign groups with field projections
            console.log(`Fetching campaign groups for account: ${account.id}`);
            const { data: campaignGroupsData, error: campaignGroupsError } = await supabase.functions.invoke('linkedin-advertising-api', {
              body: { action: 'getCampaignGroups', accountId: account.id }
            });
            
            if (campaignGroupsData?.success && campaignGroupsData.data) {
              const campaignGroupsWithAccount = campaignGroupsData.data.map((group: any) => ({
                ...group,
                account_id: account.id,
                account_name: account.name,
                account_currency: account.currency || 'USD'
              }));
              allCampaignGroups.push(...campaignGroupsWithAccount);
            }

            // Fetch both regular creatives and direct sponsored contents
            console.log(`Fetching creatives for account: ${account.id}`);
            const [creativesResponse, directContentsResponse] = await Promise.all([
              supabase.functions.invoke('linkedin-advertising-api', {
                body: { action: 'getAccountCreatives', accountId: account.id }
              }),
              supabase.functions.invoke('linkedin-advertising-api', {
                body: { action: 'getDirectSponsoredContents', accountId: account.id }
              })
            ]);
            
            // Combine both types of creatives
            const creativesData = creativesResponse.data?.success ? creativesResponse.data.data : [];
            const directContentsData = directContentsResponse.data?.success ? directContentsResponse.data.data : [];
            
            const accountCreatives = [
              ...creativesData.map((c: any) => ({ 
                ...c, 
                creative_type: 'legacy',
                content: c.content || { title: `Creative ${c.id?.slice(-8) || 'Unknown'}`, description: '', clickUri: '' }
              })),
              ...directContentsData.map((c: any) => ({ 
                ...c, 
                creative_type: 'direct_content',
                content: c.content || { title: `Direct Content ${c.id?.slice(-8) || 'Unknown'}`, description: '', clickUri: '' }
              }))
            ];
            
            allCreatives.push(...accountCreatives);
            
          } catch (error) {
            console.error(`Error fetching data for account ${account.id}:`, error);
          }
        }
        
        // Fetch job postings from local database
        try {
          console.log('Fetching job postings...');
          const { data: jobPostingsData, error: jobPostingsError } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (!jobPostingsError && jobPostingsData) {
            // Ensure all jobs have valid IDs
            const validJobs = jobPostingsData.filter(job => {
              const hasValidId = job.id && typeof job.id === 'string' && job.id.trim() !== '';
              if (!hasValidId) {
                console.warn('Found job without valid ID:', job);
              }
              return hasValidId;
            });
            
            setJobPostings(validJobs);
            console.log(`Loaded ${validJobs.length} valid job postings out of ${jobPostingsData.length} total`);
            
            if (validJobs.length !== jobPostingsData.length) {
              console.warn(`Filtered out ${jobPostingsData.length - validJobs.length} jobs with invalid IDs`);
            }
          } else {
            console.error('Error fetching job postings:', jobPostingsError);
            setJobPostings([]);
          }
        } catch (error) {
          console.error('Error fetching job postings:', error);
          setJobPostings([]);
        }
        
        
        setCampaigns(allCampaigns);
        setCampaignGroups(allCampaignGroups);
        setCreatives(allCreatives);
        console.log(`Total campaigns loaded: ${allCampaigns.length}, campaign groups: ${allCampaignGroups.length}, creatives: ${allCreatives.length}`);
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
        setJobPostings([]);
      } else {
        console.log('No ad accounts data or API call failed');
        setAdAccounts([]);
        setCampaigns([]);
        setCreatives([]);
        setJobPostings([]);
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
      setJobPostings([]);
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
    if (creativeSource === "job") {
      // Creating creative from job posting
      if (!selectedJobPosting || !selectedAccountForCreative) {
        toast({
          title: "Error",
          description: "Please select both a job posting and an ad account",
          variant: "destructive"
        });
        return;
      }
      
      const jobPosting = jobPostings.find(job => job.id === selectedJobPosting);
      if (!jobPosting) {
        toast({
          title: "Error",
          description: "Selected job posting not found",
          variant: "destructive"
        });
        return;
      }

      setIsCreatingCreative(true);
      try {
        // Create a landing page URL for the job (you can customize this)
        const jobApplicationUrl = `${window.location.origin}/apply-job/${jobPosting.id}`;
        
        const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
          body: { 
            action: 'createCreative',
            account: selectedAccountForCreative,
            content: {
              title: jobPosting.title,
              description: jobPosting.job_description.substring(0, 300) + "...", // LinkedIn has description limits
              clickUri: jobApplicationUrl
            }
          }
        });
        
        if (error) throw error;
        
        if (data?.success) {
          toast({
            title: "Creative Created from Job Posting",
            description: `Advertisement creative has been created for "${jobPosting.title}".`,
          });
          // Reset form
          setSelectedJobPosting("");
          setSelectedAccountForCreative("");
          // Refresh data to show new creative
          await fetchAdvertisingData();
        } else {
          throw new Error(data?.message || 'Failed to create creative');
        }
      } catch (error) {
        console.error('Error creating creative from job posting:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to create creative from job posting",
          variant: "destructive"
        });
      } finally {
        setIsCreatingCreative(false);
      }
    } else {
      // Creating custom creative
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
            title: "Custom Creative Created",
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
        console.error('Error creating custom creative:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to create creative",
          variant: "destructive"
        });
      } finally {
        setIsCreatingCreative(false);
      }
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !campaignType || !budget || !selectedAccount || !selectedCampaignGroup) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Campaign Name, Type, Account, Campaign Group, and Budget)",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingCampaign(true);
    try {
      // Get the selected account to determine currency
      const selectedAccountData = adAccounts.find(acc => acc.id.toString() === selectedAccount);
      const accountCurrency = selectedAccountData?.currency || 'USD';
      
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'createCampaign',
          name: campaignName,
          type: campaignType,
          account: selectedAccount,
          campaignGroup: selectedCampaignGroup, // Pass the selected campaign group
          budget: parseFloat(budget),
          bidAmount: parseFloat(bidAmount) || 5.00,
          costType,
          objective,
          currency: accountCurrency, // Use account currency instead of form currency
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
            {/* Creative Source Selection */}
            <div>
              <Label>Creative Source</Label>
              <Select value={creativeSource} onValueChange={(value: "custom" | "job") => setCreativeSource(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job">Use Existing Job Posting</SelectItem>
                  <SelectItem value="custom">Create Custom Creative</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {creativeSource === "job" 
                  ? `Use one of your ${jobPostings.length} job postings as advertisement content`
                  : "Create a custom advertisement with your own content"
                }
              </p>
            </div>

            {creativeSource === "job" ? (
              // Job Posting Selection
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="selectedJobPosting">Select Job Posting *</Label>
                  <Select value={selectedJobPosting} onValueChange={setSelectedJobPosting}>
                    <SelectTrigger>
                      <SelectValue placeholder={jobPostings.length === 0 ? "No job postings available" : "Select a job posting"} />
                    </SelectTrigger>
                    <SelectContent>
                      {jobPostings.filter(job => job.id && job.id.toString().trim() !== '').map((job) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.title} {job.company_name && `• ${job.company_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {jobPostings.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      No job postings found. Create job postings in the Job Posting section first.
                    </p>
                  )}
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
            ) : (
              // Custom Creative Form
              <>
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
              </>
            )}

            {/* Preview for job posting */}
            {creativeSource === "job" && selectedJobPosting && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium">Advertisement Preview</Label>
                {(() => {
                  const selectedJob = jobPostings.find(job => job.id === selectedJobPosting);
                  if (!selectedJob) return null;
                  return (
                    <div className="mt-2 space-y-2">
                      <div className="font-medium">{selectedJob.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {selectedJob.job_description.substring(0, 200)}...
                      </div>
                      <div className="text-xs text-blue-600">
                        → {window.location.origin}/apply-job/{selectedJob.id}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleCreateCreative}
                disabled={
                  isCreatingCreative || 
                  adAccounts.length === 0 || 
                  (creativeSource === "job" && (!selectedJobPosting || jobPostings.length === 0))
                }
                className="min-w-[150px]"
              >
                {isCreatingCreative ? "Creating..." : creativeSource === "job" ? "Create Creative from Job" : "Create Custom Creative"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Create LinkedIn Campaign</CardTitle>
            <CardDescription>
              Create a campaign using your advertisement creatives or job postings. You need at least one creative before creating a campaign.
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
                    <SelectItem value="SPONSORED_UPDATES">Sponsored Content</SelectItem>
                    <SelectItem value="SPONSORED_MESSAGING">Sponsored Messaging</SelectItem>
                    <SelectItem value="TEXT_ADS">Text Ads</SelectItem>
                    <SelectItem value="DYNAMIC_ADS">Dynamic Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="selectedCampaignGroup">Campaign Group *</Label>
                <Select value={selectedCampaignGroup} onValueChange={setSelectedCampaignGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      campaignGroups.filter(group => !selectedAccount || group.account_id?.toString() === selectedAccount).length === 0 
                        ? "No campaign groups found" 
                        : "Select campaign group"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignGroups
                      .filter(group => !selectedAccount || group.account_id?.toString() === selectedAccount)
                      .map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name} (ID: {group.id})
                        </SelectItem>
                      ))}
                    {campaignGroups.filter(group => !selectedAccount || group.account_id?.toString() === selectedAccount).length === 0 && (
                      <SelectItem value="none" disabled>
                        No campaign groups available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {campaignGroups.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    No campaign groups found. Campaign groups are required for campaigns.
                  </p>
                )}
                {selectedAccount && campaignGroups.filter(g => g.account_id?.toString() === selectedAccount).length === 0 && campaignGroups.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    No campaign groups found for selected account.
                  </p>
                )}
                {campaignGroups.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Found {campaignGroups.filter(group => !selectedAccount || group.account_id?.toString() === selectedAccount).length} campaign groups{selectedAccount ? ' for this account' : ' total'}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="selectedCreative">Advertisement Creative (Optional)</Label>
                <Select value={selectedCreative} onValueChange={setSelectedCreative}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select creative (optional for some campaign types)" />
                  </SelectTrigger>
                  <SelectContent>
                    {creatives.map((creative) => (
                      <SelectItem key={creative.id} value={creative.id.toString()}>
                        {creative.content.title || `Creative ${creative.id.slice(-8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">For some campaign types like job postings, creatives are automatically generated</p>
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
                disabled={isCreatingCampaign}
                className="min-w-[150px]"
              >
                {isCreatingCampaign ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ADS-303: Saved Audiences Demonstration */}
        {selectedAccount && (
          <SavedAudienceManager
            accountId={selectedAccount}
            onAudienceSelected={(audience) => {
              setSelectedSavedAudience(audience);
              setSavedAudienceTargeting(audience.targetingCriteria);
              toast({
                title: "✅ ADS-303 Demonstrated",
                description: `Successfully applied saved audience "${audience.name}" to campaign targeting. This demonstrates LinkedIn Marketing API requirement ADS-303.`,
              });
            }}
            selectedAudienceId={selectedSavedAudience?.id}
          />
        )}

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