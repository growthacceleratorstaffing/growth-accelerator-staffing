import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Users, Calendar, FileText, UserPlus, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PreOnboarding = () => {
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successfulMatches, setSuccessfulMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [preboardingStats, setPreboardingStats] = useState({
    pending: 0,
    inProgress: 0,
    readyForOnboarding: 0
  });
  const { toast } = useToast();

  // Fetch successful matches on component mount
  useEffect(() => {
    const fetchSuccessfulMatches = async () => {
      try {
        const { data, error } = await supabase
          .from('local_placements')
          .select('*')
          .eq('status_name', 'Active')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching successful matches:', error);
          toast({
            title: "Error loading matches",
            description: "Failed to load successful matches for preboarding.",
            variant: "destructive",
          });
          return;
        }

        setSuccessfulMatches(data || []);
        
        // Calculate preboarding stats (for now, using sample data)
        setPreboardingStats({
          pending: data?.length || 0,
          inProgress: Math.floor((data?.length || 0) / 2),
          readyForOnboarding: Math.floor((data?.length || 0) / 3)
        });
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchSuccessfulMatches();
  }, [toast]);

  const handleSendPreboardingEmail = async () => {
    if (!selectedCandidate) {
      toast({
        title: "Please select a candidate",
        description: "You need to select a candidate before sending the preboarding email.",
        variant: "destructive",
      });
      return;
    }

    const candidate = successfulMatches.find(c => c.id === selectedCandidate);
    if (!candidate) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-preboarding-email', {
        body: {
          candidateName: candidate.candidate_name,
          candidateEmail: candidate.candidate_email,
          position: candidate.job_title,
          companyName: candidate.company_name,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Preboarding email sent!",
        description: `Successfully sent preboarding email to ${candidate.candidate_name}`,
      });

      // Reset the form
      setSelectedCandidate("");
    } catch (error) {
      console.error('Error sending preboarding email:', error);
      toast({
        title: "Failed to send email",
        description: "There was an error sending the preboarding email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Employee Preboarding</h1>
        <p className="text-muted-foreground">
          Prepare and manage preboarding activities for new hires
        </p>
      </div>

      {/* Total Candidates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Preboarding
            </CardTitle>
            <div className="text-3xl font-bold">{loadingMatches ? "..." : preboardingStats.pending}</div>
            <p className="text-sm text-muted-foreground">
              Candidates awaiting preboarding
            </p>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <div className="text-3xl font-bold">{loadingMatches ? "..." : preboardingStats.inProgress}</div>
            <p className="text-sm text-muted-foreground">
              Currently in preboarding process
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready for Onboarding
            </CardTitle>
            <div className="text-3xl font-bold">{loadingMatches ? "..." : preboardingStats.readyForOnboarding}</div>
            <p className="text-sm text-muted-foreground">
              Completed preboarding steps
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Send Pre-Onboarding Email */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Send Preboarding Email</CardTitle>
          </div>
          <CardDescription>
            Select a successful match to send them a preboarding email with initial requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a successful match for preboarding" />
              </SelectTrigger>
              <SelectContent>
                {loadingMatches ? (
                  <SelectItem value="loading" disabled>
                    Loading successful matches...
                  </SelectItem>
                ) : successfulMatches.length === 0 ? (
                  <SelectItem value="no-matches" disabled>
                    No successful matches found
                  </SelectItem>
                ) : (
                  successfulMatches.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.candidate_name} - {candidate.job_title} at {candidate.company_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button 
            className="w-full" 
            onClick={handleSendPreboardingEmail}
            disabled={isLoading || loadingMatches || successfulMatches.length === 0}
          >
            {isLoading ? "Sending..." : "Begin Preboarding"}
          </Button>
        </CardContent>
      </Card>

      {/* Pre-Onboarding Pipeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Preboarding Pipeline</CardTitle>
          </div>
          <CardDescription>
            Track and manage the preboarding process for new employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Start Preboarding</h3>
            <p className="text-muted-foreground mb-8">
              Select a successful match above to begin their preboarding journey through our 4-step process
            </p>

            {/* Preboarding Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="text-center p-4 border rounded-lg">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mx-auto mb-2">
                  1
                </div>
                <h4 className="font-medium mb-1">Welcome Email</h4>
                <p className="text-sm text-muted-foreground">
                  Send welcome email to new hire
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mx-auto mb-2">
                  2
                </div>
                <h4 className="font-medium mb-1">Create Account</h4>
                <p className="text-sm text-muted-foreground">
                  Set up company accounts and credentials
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mx-auto mb-2">
                  3
                </div>
                <h4 className="font-medium mb-1">Sign Contract</h4>
                <p className="text-sm text-muted-foreground">
                  Complete employment contract signing
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mx-auto mb-2">
                  4
                </div>
                <h4 className="font-medium mb-1">Team Introduction</h4>
                <p className="text-sm text-muted-foreground">
                  Introduce to team members and schedule meetings
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreOnboarding;