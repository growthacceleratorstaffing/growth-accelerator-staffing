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
  const [talentPoolData, setTalentPoolData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs (vacancies) data
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch candidates (applicants) data
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch placements data
      const { data: placements, error: placementsError } = await supabase
        .from('local_placements')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch candidate responses for applicant count
      const { data: candidateResponses, error: responsesError } = await supabase
        .from('candidate_responses')
        .select('*');

      if (!jobsError && jobs) {
        // Update stats
        setStats({
          activeJobs: jobs.length,
          totalCandidates: candidates?.length || 0,
          totalApplicants: candidateResponses?.length || 0,
          syncedJobs: jobs.filter(job => job.synced_to_jobadder).length
        });

        // Set recent jobs (limit to 5 for display)
        setRecentJobs(jobs.slice(0, 5).map(job => ({
          id: job.id,
          title: job.title,
          company: job.company_name || 'Unknown Company',
          applications: 0, // Could be enhanced to count actual applications
          posted: new Date(job.created_at).toLocaleDateString(),
          synced: job.synced_to_jobadder
        })));
      }

      if (!candidatesError && candidates) {
        // Set recent candidates (limit to 5 for display)
        setRecentCandidates(candidates.slice(0, 5).map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          title: candidate.current_position || 'No position specified',
          status: candidate.interview_stage || 'New'
        })));
      }

      if (!placementsError && placements) {
        // Set recent matches from placements (limit to 3 for display)
        setRecentMatches(placements.slice(0, 3).map(placement => ({
          id: placement.id,
          candidate: placement.candidate_name,
          job: placement.job_title,
          company: placement.company_name,
          status: placement.status_name || 'Active'
        })));
      }

      // Set talent pool data from candidates with interview stage 'completed' or 'passed'
      if (!candidatesError && candidates) {
        const talentPool = candidates
          .filter(candidate => candidate.interview_stage === 'completed' || candidate.interview_stage === 'passed')
          .slice(0, 5);
        
        setTalentPoolData(talentPool.map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          role: candidate.current_position || 'No position specified',
          experience: candidate.experience_years ? `${candidate.experience_years} years` : 'Not specified',
          availability: candidate.interview_stage === 'completed' ? 'Available' : 'In Process'
        })));
      }

      console.log('Dashboard stats:', {
        jobs: jobs?.length || 0,
        candidates: candidates?.length || 0,
        placements: placements?.length || 0,
        responses: candidateResponses?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { title: "JazzHR Candidates", value: "0", subtitle: "Active applicants", icon: Users, color: "text-blue-600" },
    { title: "Talent Pool", value: stats.totalApplicants.toString(), subtitle: "Local candidates", icon: UserCheck, color: "text-green-600" },
    { title: "Active Jobs", value: stats.activeJobs.toString(), subtitle: "Open positions", icon: Briefcase, color: "text-purple-600" },
    { title: "Placements", value: recentMatches.length.toString(), subtitle: "Successful matches", icon: TrendingUp, color: "text-orange-600" }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to your job posting portal</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Single Page Content - All sections displayed without tabs */}
      <div className="space-y-8">
        {/* Recent Job Openings Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Job Openings</h2>
            <Link to="/jobs">
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                View All Jobs <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentJobs.length > 0 ? recentJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{job.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{job.company}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <span>Remote</span>
                  </div>
                  <Badge variant="secondary" className="mb-3">Full-time</Badge>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {job.title.includes('Tester') ? 'Job Title: Software Tester – Banking Applications ## About the Role Are you passionate about delivering...' : 
                     job.title.includes('Cloud') ? 'We are looking for a Senior Cloud Engineer to join our team and help build scalable cloud infrastructure.' :
                     'Exciting opportunity to join our growing team.'}
                  </p>
                  <div className="text-xs text-muted-foreground">{job.posted}</div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-8 text-muted-foreground col-span-full">
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
        </div>

        {/* Recent Candidates Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Candidates</h2>
            <Link to="/candidates">
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                View All Candidates <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentCandidates.length > 0 ? recentCandidates.map((candidate) => (
              <Card key={candidate.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{candidate.name}</h3>
                      <p className="text-sm text-muted-foreground">{candidate.title}</p>
                    </div>
                    <Badge 
                      variant={candidate.status === "completed" ? "default" : "secondary"}
                    >
                      {candidate.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-8 text-muted-foreground col-span-full">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No candidates yet</p>
                <Link to="/candidates">
                  <Button variant="outline" size="sm" className="mt-2">
                    View Candidates
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Placements Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Placements</h2>
            <Link to="/matches">
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                View All Placements <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentMatches.length > 0 ? recentMatches.map((match) => (
              <Card key={match.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{match.candidate}</h3>
                      <p className="text-sm text-muted-foreground">{match.job} at {match.company}</p>
                    </div>
                    <Badge 
                      variant={match.status === "Active" ? "default" : "secondary"}
                    >
                      {match.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-8 text-muted-foreground col-span-full">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No placements yet</p>
                <Link to="/matches">
                  <Button variant="outline" size="sm" className="mt-2">
                    View Placements
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;