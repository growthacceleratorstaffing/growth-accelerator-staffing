import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Calendar, Building } from "lucide-react";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  type: "full-time" | "part-time" | "contract" | "remote";
  postedDate: string;
  url: string;
  source: string;
}

interface JobListProps {
  jobs: JobListing[];
  isLoading: boolean;
}

export const JobList = ({ jobs, isLoading }: JobListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-4/5"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No jobs found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <Card key={job.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Building className="h-4 w-4" />
                  {job.company}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="ml-2">
                {job.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {job.location}
              </div>
              {job.salary && (
                <div className="text-sm font-medium text-secondary">
                  {job.salary}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(job.postedDate).toLocaleDateString()}
              </div>
            </div>
            
            {job.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {job.description}
              </p>
            )}
            
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="text-xs">
                {job.source}
              </Badge>
              <Button size="sm" asChild>
                <a href={job.url} target="_blank" rel="noopener noreferrer">
                  View Job
                  <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};