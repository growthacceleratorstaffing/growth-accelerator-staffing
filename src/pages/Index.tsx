import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Briefcase, Users, TrendingUp, Clock, Plus, ArrowRight, UserCheck, User } from "lucide-react";

const Index = () => {
  const stats = [
    { title: "Active Jobs", value: "23", icon: Briefcase, color: "text-blue-600" },
    { title: "Total Candidates", value: "156", icon: Users, color: "text-green-600" },
    { title: "Successful Matches", value: "12", icon: TrendingUp, color: "text-purple-600" },
    { title: "Pending Reviews", value: "8", icon: Clock, color: "text-orange-600" }
  ];

  const recentJobs = [
    { id: "1", title: "Senior Frontend Developer", company: "Tech Corp", applications: 23, posted: "2 days ago" },
    { id: "2", title: "Product Manager", company: "Innovation Inc", applications: 15, posted: "1 week ago" },
    { id: "3", title: "UX Designer", company: "Design Studio", applications: 8, posted: "3 days ago" }
  ];

  const recentCandidates = [
    { id: "1", name: "Sarah Johnson", title: "Senior Frontend Developer", status: "Available" },
    { id: "2", name: "Michael Chen", title: "Product Manager", status: "Interviewing" },
    { id: "3", name: "Emily Rodriguez", title: "UX Designer", status: "Available" }
  ];

  const talentPool = [
    { id: "1", name: "Alex Thompson", role: "Full Stack Developer", experience: "5 years", availability: "Immediate" },
    { id: "2", name: "Jessica Wang", role: "Data Scientist", experience: "3 years", availability: "2 weeks notice" },
    { id: "3", name: "David Kumar", role: "DevOps Engineer", experience: "7 years", availability: "1 month" }
  ];

  const recentMatches = [
    { id: "1", candidate: "Sarah Johnson", job: "Senior Frontend Developer", company: "Tech Corp", status: "Interview Scheduled" },
    { id: "2", candidate: "Michael Chen", job: "Product Manager", company: "Innovation Inc", status: "Offer Extended" },
    { id: "3", candidate: "Emily Rodriguez", job: "UX Designer", company: "Design Studio", status: "Reference Check" }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to your job posting portal</p>
        </div>
        <Link to="/post-job">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
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
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium">{job.title}</h4>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{job.applications} applications</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{job.posted}</p>
                  </div>
                </div>
              ))}
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
              {recentCandidates.map((candidate) => (
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
              ))}
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
              {recentMatches.map((match) => (
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
