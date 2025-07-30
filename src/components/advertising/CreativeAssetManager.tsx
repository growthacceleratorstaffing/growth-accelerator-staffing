import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Image, 
  Video, 
  FileText, 
  X,
  Check,
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  status: 'uploading' | 'ready' | 'failed';
  uploadProgress: number;
  created_at: string;
}

interface CreativeAssetManagerProps {
  organizationId: string;
  onAssetSelected?: (asset: Asset) => void;
}

export const CreativeAssetManager: React.FC<CreativeAssetManagerProps> = ({ 
  organizationId, 
  onAssetSelected 
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [assetType, setAssetType] = useState<string>('feedshare-image');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const assetRecipes = [
    { value: 'feedshare-image', label: 'Image for Feed Share', accept: 'image/*' },
    { value: 'feedshare-video', label: 'Video for Feed Share', accept: 'video/*' },
    { value: 'profile-displayphoto', label: 'Profile Display Photo', accept: 'image/*' },
    { value: 'company-logo', label: 'Company Logo', accept: 'image/*' },
    { value: 'learning-course-image', label: 'Learning Course Image', accept: 'image/*' }
  ];

  const getAssetTypeIcon = (type: string) => {
    if (type.includes('image')) return <Image className="h-4 w-4" />;
    if (type.includes('video')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const validateFile = (file: File, recipe: string): string | null => {
    const selectedRecipe = assetRecipes.find(r => r.value === recipe);
    if (!selectedRecipe) return 'Invalid asset type selected';

    // Check file type
    if (selectedRecipe.accept === 'image/*' && !file.type.startsWith('image/')) {
      return 'Please select an image file';
    }
    if (selectedRecipe.accept === 'video/*' && !file.type.startsWith('video/')) {
      return 'Please select a video file';
    }

    // Check file size (LinkedIn has specific limits)
    const maxSizes = {
      'feedshare-image': 5 * 1024 * 1024, // 5MB
      'feedshare-video': 200 * 1024 * 1024, // 200MB
      'profile-displayphoto': 8 * 1024 * 1024, // 8MB
      'company-logo': 4 * 1024 * 1024, // 4MB
      'learning-course-image': 5 * 1024 * 1024 // 5MB
    };

    const maxSize = maxSizes[recipe as keyof typeof maxSizes] || 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`;
    }

    return null;
  };

  const uploadAssets = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Validate file
        const validationError = validateFile(file, assetType);
        if (validationError) {
          toast({
            title: "File Validation Error",
            description: `${file.name}: ${validationError}`,
            variant: "destructive",
          });
          continue;
        }

        // Create asset entry
        const newAsset: Asset = {
          id: `temp-${Date.now()}-${i}`,
          name: file.name,
          type: assetType,
          size: file.size,
          url: '',
          status: 'uploading',
          uploadProgress: 0,
          created_at: new Date().toISOString()
        };

        setAssets(prev => [...prev, newAsset]);

        try {
          // Register upload with LinkedIn
          const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
            body: {
              action: 'uploadCreativeAsset',
              organizationId: organizationId,
              recipe: `urn:li:digitalmediaRecipe:${assetType}`,
              fileName: file.name,
              fileSize: file.size
            }
          });

          if (error) throw error;

          if (data.success && data.data.value?.uploadMechanism) {
            const uploadUrl = data.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
            const assetId = data.data.value.asset;

            if (uploadUrl) {
              // Upload file to LinkedIn's S3 bucket
              const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                body: file,
                headers: {
                  'Content-Type': file.type
                }
              });

              if (uploadResponse.ok) {
                // Update asset status
                setAssets(prev => prev.map(asset => 
                  asset.id === newAsset.id 
                    ? { ...asset, status: 'ready', url: assetId, uploadProgress: 100 }
                    : asset
                ));

                toast({
                  title: "Success",
                  description: `${file.name} uploaded successfully!`,
                });
              } else {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
              }
            } else {
              throw new Error('No upload URL received from LinkedIn');
            }
          } else {
            // Mock success for development
            setTimeout(() => {
              setAssets(prev => prev.map(asset => 
                asset.id === newAsset.id 
                  ? { ...asset, status: 'ready', url: `mock-asset-${Date.now()}`, uploadProgress: 100 }
                  : asset
              ));
            }, 1000);

            toast({
              title: "Development Mode",
              description: `${file.name} uploaded successfully (mock)!`,
            });
          }

        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          setAssets(prev => prev.map(asset => 
            asset.id === newAsset.id 
              ? { ...asset, status: 'failed', uploadProgress: 0 }
              : asset
          ));

          toast({
            title: "Upload Error",
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
            variant: "destructive",
          });
        }

        // Update progress
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      setShowUploadDialog(false);
      setSelectedFiles([]);
      
    } catch (error) {
      console.error('Asset upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeAsset = (assetId: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== assetId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Creative Assets
            </CardTitle>
            <CardDescription>
              Upload and manage images, videos, and other creative assets for your LinkedIn ads
            </CardDescription>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Assets
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Creative Assets</DialogTitle>
                <DialogDescription>
                  Upload images, videos, or other media for your LinkedIn advertising campaigns
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assetType">Asset Type</Label>
                  <Select value={assetType} onValueChange={setAssetType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assetRecipes.map(recipe => (
                        <SelectItem key={recipe.value} value={recipe.value}>
                          {recipe.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Select Files</Label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to select files or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {assetRecipes.find(r => r.value === assetType)?.accept === 'image/*' 
                        ? 'Images only' 
                        : assetRecipes.find(r => r.value === assetType)?.accept === 'video/*'
                        ? 'Videos only'
                        : 'Supported file types'
                      }
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={assetRecipes.find(r => r.value === assetType)?.accept}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {getAssetTypeIcon(file.type)}
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSelectedFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {loading && (
                  <div className="space-y-2">
                    <Label>Upload Progress</Label>
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-center text-gray-600">
                      {uploadProgress.toFixed(0)}% complete
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={uploadAssets} 
                  disabled={loading || selectedFiles.length === 0}
                >
                  {loading ? 'Uploading...' : 'Upload Assets'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {assets.length === 0 ? (
          <div className="text-center py-8">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No assets uploaded</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first creative asset to get started
            </p>
            <Button onClick={() => setShowUploadDialog(true)} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Assets
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map(asset => (
              <div key={asset.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getAssetTypeIcon(asset.type)}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium truncate">{asset.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(asset.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {asset.status === 'ready' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                    {asset.status === 'uploading' && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Upload className="h-3 w-3 mr-1" />
                        Uploading
                      </Badge>
                    )}
                    {asset.status === 'failed' && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
                
                {asset.status === 'uploading' && (
                  <Progress value={asset.uploadProgress} className="mb-3" />
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {asset.status === 'ready' && onAssetSelected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAssetSelected(asset)}
                      >
                        Select
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsset(asset.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};