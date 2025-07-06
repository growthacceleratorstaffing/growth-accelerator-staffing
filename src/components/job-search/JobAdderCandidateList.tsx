import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Mail, Phone, Calendar, Building, Download, User, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JobAdderCandidate {
  candidateId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  currentPosition?: string;
  company?: string;
  skills?: string[];
  rating?: number;
  status?: {
    name: string;
    statusId: number;
  };
  source?: string;
  createdAt?: string;
  linkedinUrl?: string;
  profilePictureUrl?: string;
}

interface JobAdderCandidateListProps {
  candidates: JobAdderCandidate[];
  isLoading: boolean;
}

export const JobAdderCandidateList = ({ candidates, isLoading }: JobAdderCandidateListProps) => {
  const [importingCandidates, setImportingCandidates] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleImportCandidate = async (candidate: JobAdderCandidate) => {
    setImportingCandidates(prev => new Set([...prev, candidate.candidateId]));
    
    try {
      // Get user access token from OAuth2 manager
      const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
      const userAccessToken = await oauth2Manager.getValidAccessToken();
      
      if (!userAccessToken) {
        throw new Error('No JobAdder access token available. Please authenticate first.');
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'import-candidate',
          candidate: candidate,
          accessToken: userAccessToken
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Candidate Imported Successfully",
        description: `${candidate.firstName} ${candidate.lastName} has been imported to your candidate database.`,
      });

      console.log('Candidate imported:', data);
    } catch (error) {
      console.error('Error importing candidate:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Failed to import candidate',
        variant: "destructive"
      });
    } finally {
      setImportingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidate.candidateId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800";
    
    switch (status.toLowerCase()) {
      case "available":
      case "active": 
        return "bg-green-100 text-green-800";
      case "interviewing":
      case "in process": 
        return "bg-yellow-100 text-yellow-800"; 
      case "hired":
      case "placed": 
        return "bg-blue-100 text-blue-800";
      case "unavailable":
      case "inactive":
        return "bg-red-100 text-red-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-4/5"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No JobAdder candidates found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {candidates.map((candidate) => (
        <Card key={candidate.candidateId} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={candidate.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${candidate.firstName}${candidate.lastName}`} 
                />
                <AvatarFallback className="text-lg">
                  {`${candidate.firstName[0]}${candidate.lastName[0]}`}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg line-clamp-2">
                      {candidate.firstName} {candidate.lastName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Building className="h-4 w-4" />
                      {candidate.currentPosition || 'Position not specified'}
                    </CardDescription>
                  </div>
                  {candidate.status && (
                    <Badge className={getStatusColor(candidate.status.name)}>
                      {candidate.status.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {candidate.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {candidate.email}
                </div>
              )}
              
              {(candidate.phone || candidate.mobile) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {candidate.phone || candidate.mobile}
                </div>
              )}
              
              {candidate.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {candidate.address.city && candidate.address.state 
                    ? `${candidate.address.city}, ${candidate.address.state}`
                    : candidate.address.city || candidate.address.state || 'Location not specified'}
                </div>
              )}
              
              {candidate.company && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  {candidate.company}
                </div>
              )}
              
              {candidate.rating && (
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {candidate.rating}/5
                </div>
              )}
              
              {candidate.createdAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Added: {new Date(candidate.createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
            
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.skills.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {candidate.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{candidate.skills.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  ID: {candidate.candidateId}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1" 
                  onClick={() => handleImportCandidate(candidate)}
                  disabled={importingCandidates.has(candidate.candidateId)}
                >
                  {importingCandidates.has(candidate.candidateId) ? (
                    <>
                      <Download className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Import
                    </>
                  )}
                </Button>
                <Button size="sm" className="gap-1">
                  View Profile
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};