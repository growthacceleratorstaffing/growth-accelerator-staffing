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

  const [talentPoolData, setTalentPoolData] = useState([]);

  const statsCards = [
    { title: "Active Jobs", value: stats.activeJobs.toString(), icon: Briefcase, color: "text-blue-600" },
    { title: "Candidates", value: stats.totalCandidates.toString(), icon: Users, color: "text-green-600" },
    { title: "Talent Pool", value: stats.totalApplicants.toString(), icon: UserCheck, color: "text-orange-600" },
    { title: "Synced to JazzHR", value: stats.syncedJobs.toString(), icon: TrendingUp, color: "text-purple-600" }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {talentPoolData.length > 0 ? talentPoolData.map((talent) => (
                <div key={talent.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium">{talent.name}</h4>
                    <p className="text-sm text-muted-foreground">{talent.role} • {talent.experience}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{talent.availability}</Badge>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No talent pool data yet</p>
                  <Link to="/candidates">
                    <Button variant="outline" size="sm" className="mt-2">
                      View Candidates
                    </Button>
                  </Link>
                </div>
              )}
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
              {recentMatches.length > 0 ? recentMatches.map((match) => (
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
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No matches yet</p>
                  <Link to="/matches">
                    <Button variant="outline" size="sm" className="mt-2">
                      View Matches
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
