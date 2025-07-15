import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { JazzHRApplicant } from "@/lib/jazzhr-api";
import { Calendar, MapPin, Phone, Mail, Star, Building2, FileText, UserPlus } from "lucide-react";

interface JazzHRCandidatesListProps {
  candidates: JazzHRApplicant[];
  onImportCandidate: (candidate: JazzHRApplicant) => void;
  importingCandidates: Set<string>;
}

const getJazzHRStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'new':
      return "bg-blue-500 text-white";
    case 'reviewed':
      return "bg-yellow-500 text-white";
    case 'interviewed':
      return "bg-purple-500 text-white";
    case 'hired':
      return "bg-green-500 text-white";
    case 'rejected':
      return "bg-red-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const JazzHRCandidatesList = ({ 
  candidates, 
  onImportCandidate, 
  importingCandidates 
}: JazzHRCandidatesListProps) => {
  const isLoading = importingCandidates.size > 0;
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="w-24 h-4 bg-gray-200 rounded mb-1"></div>
                    <div className="w-16 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-200 rounded"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-8">
        <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No JazzHR candidates found</h3>
        <p className="text-muted-foreground">No JazzHR candidates found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {candidates.map((candidate) => (
        <Card key={candidate.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-medium text-foreground">
                    {candidate.first_name} {candidate.last_name}
                  </CardTitle>
                  {candidate.status && (
                    <Badge className={getJazzHRStatusColor(candidate.status.name)}>
                      {candidate.status.name}
                    </Badge>
                  )}
                </div>
              </div>
              {candidate.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">{candidate.rating}/5</span>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {candidate.email && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{candidate.email}</span>
              </div>
            )}
            
            {candidate.phone && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{candidate.phone}</span>
              </div>
            )}
            
            {(candidate.city || candidate.state) && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{[candidate.city, candidate.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            
            {candidate.job && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{candidate.job.title}</span>
              </div>
            )}
            
            {candidate.apply_date && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Applied: {new Date(candidate.apply_date).toLocaleDateString()}</span>
              </div>
            )}
            
            {candidate.source && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Source: {candidate.source}</span>
              </div>
            )}
            
            <div className="pt-2">
              <Button
                onClick={() => onImportCandidate(candidate)}
                size="sm"
                className="w-full"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Import Candidate
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default JazzHRCandidatesList;