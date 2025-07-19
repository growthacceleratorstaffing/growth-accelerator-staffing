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
      // Fetch JazzHR jobs data
      const { data: jazzhrJobs, error: jazzhrJobsError } = await supabase.functions.invoke('jazzhr-api', {
        body: { action: 'getJobs', params: {} }
      });

      // Fetch JazzHR applicants data
      const { data: jazzhrApplicants, error: jazzhrApplicantsError } = await supabase.functions.invoke('jazzhr-api', {
        body: { action: 'getApplicants', params: {} }
      });

      // Fetch local placements data (keep this as it's our internal data)
      const { data: placements, error: placementsError } = await supabase
        .from('local_placements')
        .select('*')
        .order('created_at', { ascending: false });

      // Process JazzHR jobs
      if (!jazzhrJobsError && jazzhrJobs && Array.isArray(jazzhrJobs)) {
        console.log('JazzHR Jobs fetched:', jazzhrJobs.length);
        
        // Update stats with real JazzHR data
        setStats({
          activeJobs: jazzhrJobs.length,
          totalCandidates: Array.isArray(jazzhrApplicants) ? jazzhrApplicants.length : 0,
          totalApplicants: Array.isArray(jazzhrApplicants) ? jazzhrApplicants.length : 0,
          syncedJobs: jazzhrJobs.length // All JazzHR jobs are considered synced
        });

        // Set recent jobs from JazzHR (limit to 6 for display)
        setRecentJobs(jazzhrJobs.slice(0, 6).map(job => ({
          id: job.id,
          title: job.title || 'Untitled Job',
          company: job.department || job.company || 'Company',
          applications: 0, // Will be calculated from applicants if needed
          posted: job.original_open_date ? new Date(job.original_open_date).toLocaleDateString() : 'Recently posted',
          synced: true // JazzHR jobs are always synced
        })));
      } else {
        console.error('Error fetching JazzHR jobs:', jazzhrJobsError);
        // Fallback to empty state
        setStats({
          activeJobs: 0,
          totalCandidates: 0,
          totalApplicants: 0,
          syncedJobs: 0
        });
        setRecentJobs([]);
      }

      // Process JazzHR applicants
      if (!jazzhrApplicantsError && jazzhrApplicants && Array.isArray(jazzhrApplicants)) {
        console.log('JazzHR Applicants fetched:', jazzhrApplicants.length);
        
        // Set recent candidates from JazzHR (limit to 6 for display)
        setRecentCandidates(jazzhrApplicants.slice(0, 6).map(applicant => ({
          id: applicant.id,
          name: `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || 'Unknown Candidate',
          title: applicant.job_title || 'No position specified',
          status: applicant.prospect_detail?.status || 'Applied'
        })));

        // Set talent pool data from qualified JazzHR applicants
        const qualifiedApplicants = jazzhrApplicants
          .filter(applicant => applicant.prospect_detail?.status === 'interviewed' || applicant.prospect_detail?.status === 'qualified')
          .slice(0, 5);
        
        setTalentPoolData(qualifiedApplicants.map(applicant => ({
          id: applicant.id,
          name: `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() || 'Unknown Candidate',
          role: applicant.job_title || 'No position specified',
          experience: 'Not specified',
          availability: applicant.prospect_detail?.status === 'interviewed' ? 'Available' : 'In Process'
        })));
      } else {
        console.error('Error fetching JazzHR applicants:', jazzhrApplicantsError);
        setRecentCandidates([]);
        setTalentPoolData([]);
      }

      // Process local placements (keep as is)
      if (!placementsError && placements) {
        setRecentMatches(placements.slice(0, 3).map(placement => ({
          id: placement.id,
          candidate: placement.candidate_name,
          job: placement.job_title,
          company: placement.company_name,
          status: placement.status_name || 'Active'
        })));
      } else {
        setRecentMatches([]);
      }

      console.log('Dashboard stats:', {
        jobs: jazzhrJobs?.length || 0,
        applicants: jazzhrApplicants?.length || 0,
        placements: placements?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty state on error
      setStats({
        activeJobs: 0,
        totalCandidates: 0,
        totalApplicants: 0,
        syncedJobs: 0
      });
      setRecentJobs([]);
      setRecentCandidates([]);
      setRecentMatches([]);
      setTalentPoolData([]);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { title: "JazzHR Candidates", value: stats.totalApplicants.toString(), subtitle: "Active applicants", icon: Users, color: "text-blue-600" },
    { title: "Talent Pool", value: talentPoolData.length.toString(), subtitle: "Qualified candidates", icon: UserCheck, color: "text-green-600" },
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

      {/* JazzHR Data Cards */}
      <div className="space-y-6">
        {/* JazzHR Jobs Overview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                JazzHR Jobs
              </CardTitle>
              <Link to="/jobs">
                <Button variant="outline" size="sm">
                  View All Jobs
                </Button>
              </Link>
            </div>
            <CardDescription>Live job postings from your JazzHR account</CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length > 0 ? (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.company}
                        </span>
                        <span>Remote</span>
                        <span>Posted: {job.posted}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Full-time</Badge>
                      {job.synced && <Badge variant="default" className="bg-green-500">JazzHR</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No JazzHR jobs found</p>
                <p className="text-sm">Jobs will appear here when available in your JazzHR account</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* JazzHR Candidates Overview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                JazzHR Candidates
              </CardTitle>
              <Link to="/candidates">
                <Button variant="outline" size="sm">
                  View All Candidates
                </Button>
              </Link>
            </div>
            <CardDescription>Live candidate data from your JazzHR account</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCandidates.length > 0 ? (
              <div className="space-y-4">
                {recentCandidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{candidate.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{candidate.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={candidate.status === "interviewed" ? "default" : "secondary"}>
                        {candidate.status}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50">JazzHR</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No JazzHR candidates found</p>
                <p className="text-sm">Candidates will appear here as they apply to your jobs</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Talent Pool Overview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Qualified Talent Pool
              </CardTitle>
              <Link to="/applications">
                <Button variant="outline" size="sm">
                  View Talent Pool
                </Button>
              </Link>
            </div>
            <CardDescription>Qualified candidates from JazzHR ready for placement</CardDescription>
          </CardHeader>
          <CardContent>
            {talentPoolData.length > 0 ? (
              <div className="space-y-4">
                {talentPoolData.map((talent) => (
                  <div key={talent.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{talent.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{talent.role}</span>
                        <span>{talent.experience}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">
                        {talent.availability}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50">Qualified</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No qualified candidates yet</p>
                <p className="text-sm">Qualified candidates from JazzHR will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;