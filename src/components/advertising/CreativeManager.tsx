import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Image, 
  Video, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Eye, 
  Upload,
  Copy,
  BarChart3,
  ExternalLink
} from 'lucide-react';

interface Creative {
  id: string;
  status: string;
  type: string;
  account: string;
  campaign: string;
  content: any;
  variables?: any;
  created_at: string;
  updated_at: string;
  creative_data: any;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  account_id: string;
}

interface CreativeManagerProps {
  accountId: string;
  campaigns?: Campaign[];
  onCreativeCreated?: (creative: Creative) => void;
  onCreativeUpdated?: (creative: Creative) => void;
}

export const CreativeManager: React.FC<CreativeManagerProps> = ({ 
  accountId, 
  campaigns = [],
  onCreativeCreated,
  onCreativeUpdated 
}) => {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Form states
  const [creativeForm, setCreativeForm] = useState({
    campaign: '',
    type: 'SPONSORED_CONTENT',
    status: 'ACTIVE',
    clickUri: '',
    title: '',
    description: '',
    callToAction: 'LEARN_MORE',
    directSponsoredContent: '',
    shareMediaCategory: 'NONE'
  });

  const { toast } = useToast();

  useEffect(() => {
    if (accountId) {
      loadCreatives();
    }
  }, [accountId]);

  const loadCreatives = async () => {
    try {
      setLoading(true);
      console.log('Loading creatives for account:', accountId);
      
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'getAccountCreatives',
          accountId: accountId
        }
      });

      if (error) throw error;

      if (data.success) {
        setCreatives(data.data || []);
        console.log(`Loaded ${data.data?.length || 0} creatives`);
      } else {
        throw new Error(data.error || 'Failed to fetch creatives');
      }

    } catch (error) {
      console.error('Error loading creatives:', error);
      toast({
        title: "Error",
        description: "Failed to load creatives. This is normal if no creatives exist yet.",
        variant: "destructive",
      });
      setCreatives([]);
    } finally {
      setLoading(false);
    }
  };

  const createCreative = async () => {
    try {
      setLoading(true);
      console.log('Creating creative with form data:', creativeForm);

      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'createCreative',
          account: accountId,
          campaign: creativeForm.campaign,
          status: creativeForm.status,
          intendedStatus: creativeForm.status,
          clickUri: creativeForm.clickUri,
          directSponsoredContent: creativeForm.directSponsoredContent,
          shareMediaCategory: creativeForm.shareMediaCategory
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Creative created successfully!",
        });
        
        setShowCreateDialog(false);
        setCreativeForm({
          campaign: '',
          type: 'SPONSORED_CONTENT',
          status: 'ACTIVE',
          clickUri: '',
          title: '',
          description: '',
          callToAction: 'LEARN_MORE',
          directSponsoredContent: '',
          shareMediaCategory: 'NONE'
        });
        
        await loadCreatives();
        onCreativeCreated?.(data.data);
      } else {
        throw new Error(data.error || 'Failed to create creative');
      }

    } catch (error) {
      console.error('Error creating creative:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create creative. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCreativeStatus = async (creative: Creative, newStatus: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'updateCreative',
          creativeId: creative.id,
          status: newStatus,
          intendedStatus: newStatus
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: `Creative ${newStatus.toLowerCase()} successfully!`,
        });
        
        await loadCreatives();
        onCreativeUpdated?.(data.data);
      } else {
        throw new Error(data.error || 'Failed to update creative');
      }

    } catch (error) {
      console.error('Error updating creative:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update creative. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCreative = async (creative: Creative) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'deleteCreative',
          creativeId: creative.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: "Creative paused successfully!",
        });
        
        await loadCreatives();
      } else {
        throw new Error(data.error || 'Failed to delete creative');
      }

    } catch (error) {
      console.error('Error deleting creative:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete creative. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DRAFT': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ARCHIVED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCreativeTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'SPONSORED_CONTENT': return <FileText className="h-4 w-4" />;
      case 'SINGLE_IMAGE_AD': return <Image className="h-4 w-4" />;
      case 'VIDEO_AD': return <Video className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading && creatives.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Creative Management
            </CardTitle>
            <CardDescription>
              Create and manage LinkedIn ad creatives for your campaigns
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Creative
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Creative</DialogTitle>
                <DialogDescription>
                  Create a new LinkedIn ad creative for your campaigns
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign">Campaign *</Label>
                    <Select
                      value={creativeForm.campaign}
                      onValueChange={(value) => setCreativeForm(prev => ({ ...prev, campaign: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map(campaign => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={creativeForm.status}
                      onValueChange={(value) => setCreativeForm(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clickUri">Click URL</Label>
                  <Input
                    id="clickUri"
                    value={creativeForm.clickUri}
                    onChange={(e) => setCreativeForm(prev => ({ ...prev, clickUri: e.target.value }))}
                    placeholder="https://example.com/landing-page"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="directSponsoredContent">Direct Sponsored Content URN</Label>
                  <Input
                    id="directSponsoredContent"
                    value={creativeForm.directSponsoredContent}
                    onChange={(e) => setCreativeForm(prev => ({ ...prev, directSponsoredContent: e.target.value }))}
                    placeholder="urn:li:ugcPost:1234567890"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="shareMediaCategory">Media Category</Label>
                  <Select
                    value={creativeForm.shareMediaCategory}
                    onValueChange={(value) => setCreativeForm(prev => ({ ...prev, shareMediaCategory: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="RICH">Rich Media</SelectItem>
                      <SelectItem value="ARTICLE">Article</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createCreative} 
                  disabled={loading || !creativeForm.campaign}
                >
                  {loading ? 'Creating...' : 'Create Creative'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Creative List</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            {creatives.length === 0 ? (
              <div className="text-center py-8">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No creatives found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first LinkedIn ad creative to get started
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Creative
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {creatives.map(creative => (
                  <div key={creative.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getCreativeTypeIcon(creative.type)}
                        <div>
                          <h4 className="font-medium">{creative.content?.title || 'Untitled Creative'}</h4>
                          <p className="text-sm text-muted-foreground">
                            ID: {creative.id}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(creative.status)}>
                        {creative.status}
                      </Badge>
                    </div>
                    
                    {creative.content?.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {creative.content.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(creative.created_at).toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCreative(creative)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {creative.status === 'ACTIVE' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateCreativeStatus(creative, 'PAUSED')}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateCreativeStatus(creative, 'ACTIVE')}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Creative</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will pause the creative. Are you sure you want to continue?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCreative(creative)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Performance Analytics</h3>
              <p className="text-muted-foreground">
                Creative performance data will be available once campaigns are running
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Creative Details Dialog */}
      <Dialog open={!!selectedCreative} onOpenChange={() => setSelectedCreative(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Creative Details</DialogTitle>
            <DialogDescription>
              View and manage creative information
            </DialogDescription>
          </DialogHeader>
          
          {selectedCreative && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedCreative.status)}>
                    {selectedCreative.status}
                  </Badge>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="text-sm">{selectedCreative.type}</p>
                </div>
              </div>
              
              <div>
                <Label>Creative ID</Label>
                <p className="text-sm font-mono">{selectedCreative.id}</p>
              </div>
              
              {selectedCreative.variables?.clickUri && (
                <div>
                  <Label>Click URL</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm truncate">{selectedCreative.variables.clickUri}</p>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <Label>Created</Label>
                  <p>{new Date(selectedCreative.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Updated</Label>
                  <p>{new Date(selectedCreative.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};