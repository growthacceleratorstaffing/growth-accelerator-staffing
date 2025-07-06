import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JobAdderCandidateList } from "@/components/job-search/JobAdderCandidateList";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const JobAdderCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchCandidates = async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get user access token from OAuth2 manager
      const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
      const userAccessToken = await oauth2Manager.getValidAccessToken();
      
      if (!userAccessToken) {
        throw new Error('No JobAdder access token available. Please authenticate first.');
      }

      const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'candidates',
          limit: 50,
          offset: 0,
          search: search,
          accessToken: userAccessToken
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data?.items) {
        setCandidates(data.items);
        console.log('Fetched JobAdder candidates:', data.items.length);
      } else {
        setCandidates([]);
        setError('No candidates found');
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch candidates');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchCandidates(value);
  };

  const handleRefresh = () => {
    fetchCandidates(searchTerm);
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-pink-500">
              JobAdder Candidates
            </h1>
            <p className="text-xl text-muted-foreground mt-2">
              Browse and import candidates from JobAdder
            </p>
          </div>
          
          <Button 
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {error.includes('authenticate') && (
                <span className="block mt-2">
                  Please go to <a href="/jobadder-auth" className="underline">JobAdder Auth</a> to connect your account.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates by name, email, position, or company..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <JobAdderCandidateList 
          candidates={candidates}
          isLoading={loading}
        />
      </div>
    </div>
  );
};

export default JobAdderCandidates;