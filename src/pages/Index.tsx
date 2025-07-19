import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Calendar,
  ExternalLink,
  Building,
  MapPin,
  Clock,
  DollarSign,
  UserCheck,
  Search,
  ChevronRight
} from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useJazzHRApplicants } from "@/hooks/useJazzHRApplicants";
import { useCandidates } from "@/hooks/useCandidates";
import { usePlacements } from "@/hooks/usePlacements";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    candidates: 0,
    talentPool: 0,
    jobs: 0,
    localJobs: 0,
    jazzhrJobs: 0
  });

  // Fetch data from hooks
  const { jobs, loading: jobsLoading } = useJobs();
  const { data: jazzhrCandidates = [], isLoading: candidatesLoading } = useJazzHRApplicants({});
  const { candidates, loading: talentPoolLoading } = useCandidates();
  const { placements, loading: placementsLoading } = usePlacements();

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get local job count
        const { count: localJobCount } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true });

        const newStats = {
          candidates: jazzhrCandidates?.length || 0,
          talentPool: candidates?.length || 0,
          jobs: jobs?.length || 0,
          localJobs: localJobCount || 0,
          jazzhrJobs: jobs?.filter(job => job.id)?.length || 0
        };

        setStats(newStats);
        console.log('Dashboard stats:', newStats);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      }
    };

    loadStats();
  }, [jobs, jazzhrCandidates, candidates]);

  const isLoading = jobsLoading || candidatesLoading || talentPoolLoading || placementsLoading;

  // Get recent items
  const recentJobs = jobs?.slice(0, 3) || [];
  const recentCandidates = jazzhrCandidates?.slice(0, 3) || [];
  const recentPlacements = placements?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of your recruitment activities</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/candidates')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">JazzHR Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.candidates}</div>
            )}
            <p className="text-xs text-muted-foreground">Active applicants</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/candidates')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Talent Pool</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.talentPool}</div>
            )}
            <p className="text-xs text-muted-foreground">Local candidates</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/jobs')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.jobs}</div>
            )}
            <p className="text-xs text-muted-foreground">Open positions</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/matches')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placements</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{recentPlacements.length}</div>
            )}
            <p className="text-xs text-muted-foreground">Successful matches</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
          <TabsTrigger value="candidates">Recent Candidates</TabsTrigger>
          <TabsTrigger value="placements">Recent Placements</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Job Openings</h2>
            <Button variant="outline" onClick={() => navigate('/jobs')} className="flex items-center gap-2">
              View All Jobs
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {jobsLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/job/${job.id}`)}>
                  <CardHeader>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {job.department || "Company"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {job.city && job.state ? `${job.city}, ${job.state}` : "Remote"}
                    </div>
                    
                    {job.employment_type && (
                      <Badge variant="secondary">{job.employment_type}</Badge>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.description ? 
                        job.description
                          .replace(/<[^>]*>/g, '')
                          .replace(/&amp;/g, '&')
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'")
                          .replace(/&nbsp;/g, ' ')
                        : "No description available"
                      }
                    </p>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-muted-foreground">
                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : "Recently posted"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {recentJobs.length === 0 && !jobsLoading && (
            <div className="text-center py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
              <p className="text-muted-foreground">Start by creating your first job posting.</p>
              <Button onClick={() => navigate('/job-posting')} className="mt-4">
                Post a Job
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="candidates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Candidates</h2>
            <Button variant="outline" onClick={() => navigate('/candidates')} className="flex items-center gap-2">
              View All Candidates
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {candidatesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-3/4 mb-4" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentCandidates.map((candidate) => (
                <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {candidate.first_name} {candidate.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      </div>
                      <Badge variant="outline">{typeof candidate.status === 'string' ? candidate.status : 'Applied'}</Badge>
                    </div>
                    
                    {candidate.phone && (
                      <p className="text-sm text-muted-foreground mb-2">{candidate.phone}</p>
                    )}
                    
                    {(candidate.city || candidate.state) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4" />
                        {[candidate.city, candidate.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Applied: Recently
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {recentCandidates.length === 0 && !candidatesLoading && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No candidates found</h3>
              <p className="text-muted-foreground">Candidates will appear here as they apply to your jobs.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="placements" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Placements</h2>
            <Button variant="outline" onClick={() => navigate('/matches')} className="flex items-center gap-2">
              View All Placements
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {placementsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-3/4 mb-4" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentPlacements.map((placement) => (
                <Card key={placement.placementId} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{placement.candidate?.firstName} {placement.candidate?.lastName}</h3>
                        <p className="text-sm text-muted-foreground">{placement.job?.jobTitle}</p>
                      </div>
                      <Badge variant="default">Placed</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {placement.job?.company?.name && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {placement.job.company.name}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Recently placed
                      </div>
                      
                       <div className="flex items-center gap-2">
                         <DollarSign className="h-4 w-4" />
                         Placement value available
                       </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {recentPlacements.length === 0 && !placementsLoading && (
            <div className="text-center py-8">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No placements yet</h3>
              <p className="text-muted-foreground">Successful placements will appear here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
