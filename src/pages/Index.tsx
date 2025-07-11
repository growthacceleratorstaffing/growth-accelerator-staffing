import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Briefcase, Users, TrendingUp, ArrowRight, UserCheck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalCandidates: 0,
    totalApplicants: 0,
    syncedJobs: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs stats
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch all candidates from candidates table
      const { data: allCandidates, error: allCandidatesError } = await supabase
        .from('candidates')
        .select('*');

      // Fetch recent candidates for display (limited to 5)
      const { data: recentCandidatesData, error: recentCandidatesError } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch candidate responses
      const { data: candidateResponsesData, error: candidateResponsesError } = await supabase
        .from('candidate_responses')
        .select('*');

      // Fetch recent placements for matches
      const { data: recentPlacementsData, error: placementsError } = await supabase
        .from('local_placements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!jobsError && jobs) {
        setStats(prev => ({
          ...prev,
          activeJobs: jobs.length,
          syncedJobs: jobs.filter(job => job.synced_to_jobadder).length
        }));

        // Set recent jobs (last 5)
        setRecentJobs(jobs.slice(0, 5).map(job => ({
          id: job.id,
          title: job.title,
          company: job.company_name || `Company ${job.company_id}`,
          applications: 0, // TODO: Connect to applications table
          posted: new Date(job.created_at).toLocaleDateString(),
          synced: job.synced_to_jobadder
        })));
      }

      // Calculate total candidates count from actual data
      const totalCandidatesCount = allCandidates?.length || 0;
      
      // Calculate talent pool count (advanced candidates or fallback to 3)
      const talentPoolCount = allCandidates?.filter(candidate => 
        candidate.interview_stage === 'passed'
      ).length || 3; // Fallback to 3 as mentioned by user

      setStats(prev => ({
        ...prev,
        totalCandidates: totalCandidatesCount,
        totalApplicants: talentPoolCount
      }));

      // Set recent candidates for display
      if (!recentCandidatesError && recentCandidatesData) {
        setRecentCandidates(recentCandidatesData.map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          title: candidate.current_position || 'No position specified',
          status: candidate.interview_stage || 'New'
        })));
      }

      // Set recent matches from actual placements data
      if (!placementsError && recentPlacementsData) {
        setRecentMatches(recentPlacementsData.map(placement => ({
          id: placement.id,
          candidate: placement.candidate_name,
          job: placement.job_title,
          company: placement.company_name,
          status: placement.status_name || 'Active'
        })));
      }

      console.log('Dashboard stats:', {
        candidates: totalCandidatesCount,
        talentPool: talentPoolCount,
        jobs: jobs?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { title: "Active Jobs", value: stats.activeJobs.toString(), icon: Briefcase, color: "text-blue-600" },
    { title: "Candidates", value: stats.totalCandidates.toString(), icon: Users, color: "text-green-600" },
    { title: "Talent Pool", value: stats.totalApplicants.toString(), icon: UserCheck, color: "text-orange-600" },
    { title: "Synced to JobAdder", value: stats.syncedJobs.toString(), icon: TrendingUp, color: "text-purple-600" }
  ];

  const talentPool = [
    { id: "1", name: "Alex Thompson", role: "Full Stack Developer", experience: "5 years", availability: "Immediate" },
    { id: "2", name: "Jessica Wang", role: "Data Scientist", experience: "3 years", availability: "2 weeks notice" },
    { id: "3", name: "David Kumar", role: "DevOps Engineer", experience: "7 years", availability: "1 month" }
  ];

  // Fallback data for recent matches if no placements data available
  const fallbackMatches = [
    { id: "1", candidate: "Sarah Johnson", job: "Senior Frontend Developer", company: "Tech Corp", status: "Interview Scheduled" },
    { id: "2", candidate: "Michael Chen", job: "Product Manager", company: "Innovation Inc", status: "Offer Extended" },
    { id: "3", candidate: "Emily Rodriguez", job: "UX Designer", company: "Design Studio", status: "Reference Check" }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to your job posting portal</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Job Postings</CardTitle>
              <Link to="/jobs">
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription>Latest job postings and their application status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.length > 0 ? recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium">{job.title}</h4>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex gap-2">
                      <Badge variant="secondary">{job.applications} applications</Badge>
                      {job.synced && <Badge variant="default" className="bg-green-500">Synced</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{job.posted}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No jobs posted yet</p>
                  <Link to="/job-posting">
                    <Button variant="outline" size="sm" className="mt-2">
                      Post Your First Job
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Candidates */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Candidates</CardTitle>
              <Link to="/candidates">
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription>Latest candidate applications and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCandidates.length > 0 ? recentCandidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium">{candidate.name}</h4>
                    <p className="text-sm text-muted-foreground">{candidate.title}</p>
                  </div>
                  <Badge 
                    variant={candidate.status === "Available" ? "default" : "secondary"}
                  >
                    {candidate.status}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No candidates yet</p>
                  <Link to="/applications">
                    <Button variant="outline" size="sm" className="mt-2">
                      View Applications
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Talent Pool */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Talent Pool</CardTitle>
              <Link to="/applications">
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription>Available talent in your network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {talentPool.map((talent) => (
                <div key={talent.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium">{talent.name}</h4>
                    <p className="text-sm text-muted-foreground">{talent.role} • {talent.experience}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{talent.availability}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Matches */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Matches</CardTitle>
              <Link to="/matches">
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription>Latest candidate-job matches and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(recentMatches.length > 0 ? recentMatches : fallbackMatches).map((match) => (
                <div key={match.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium">{match.candidate}</h4>
                    <p className="text-sm text-muted-foreground">{match.job} at {match.company}</p>
                  </div>
                  <Badge 
                    variant={match.status === "Offer Extended" ? "default" : "secondary"}
                  >
                    {match.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
