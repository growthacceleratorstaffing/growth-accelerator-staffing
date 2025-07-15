import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Mail, Phone, Star, Download, Building, Calendar, User } from "lucide-react";
import { JobAdderCandidate } from "@/hooks/useJobAdderCandidates";

interface JobAdderCandidatesListProps {
  candidates: JobAdderCandidate[];
  onImportCandidate: (candidate: JobAdderCandidate) => void;
  importingCandidates: Set<string>;
}

const getJobAdderStatusColor = (status?: string) => {
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

const JobAdderCandidatesList = ({ 
  candidates, 
  onImportCandidate, 
  importingCandidates 
}: JobAdderCandidatesListProps) => {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No JobAdder candidates found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {candidates.map((candidate) => (
        <Card key={candidate.candidateId} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={candidate.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${candidate.firstName}${candidate.lastName}`} />
                <AvatarFallback className="text-lg">
                  {`${candidate.firstName[0]}${candidate.lastName[0]}`}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <CardTitle className="text-xl">
                      {candidate.firstName} {candidate.lastName}
                    </CardTitle>
                    <CardDescription className="text-base font-medium">
                      {candidate.currentPosition || "Position not specified"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    {candidate.status && (
                      <Badge className={getJobAdderStatusColor(candidate.status.name)}>
                        {candidate.status.name}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  {candidate.company && (
                    <span className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {candidate.company}
                    </span>
                  )}
                  {candidate.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {candidate.address.city}, {candidate.address.state}
                    </span>
                  )}
                  {candidate.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {candidate.rating}
                    </span>
                  )}
                  {candidate.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(candidate.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="mb-4">
                    <span className="font-medium text-sm">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {candidate.skills.slice(0, 5).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {candidate.skills.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{candidate.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-4 text-sm">
                  {candidate.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {candidate.email}
                    </span>
                  )}
                  {(candidate.phone || candidate.mobile) && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {candidate.phone || candidate.mobile}
                    </span>
                  )}
                  {candidate.source && (
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Source: {candidate.source}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onImportCandidate(candidate)}
                    disabled={importingCandidates.has(candidate.candidateId)}
                  >
                    {importingCandidates.has(candidate.candidateId) ? (
                      <>
                        <Download className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Import
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm">Contact</Button>
                  <Button size="sm">View Profile</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default JobAdderCandidatesList;