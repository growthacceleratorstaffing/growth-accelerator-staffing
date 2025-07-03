import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Building, Clock, DollarSign, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  posted: string;
  applications: number;
}

const sampleJobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "Tech Corp",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$120,000 - $160,000",
    description: "We're looking for an experienced frontend developer to join our team...",
    posted: "2 days ago",
    applications: 23
  },
  {
    id: "2", 
    title: "Product Manager",
    company: "Innovation Inc",
    location: "New York, NY",
    type: "Full-time",
    salary: "$140,000 - $180,000",
    description: "Lead product strategy and development for our core platform...",
    posted: "1 week ago",
    applications: 15
  },
  {
    id: "3",
    title: "UX Designer",
    company: "Design Studio",
    location: "Remote",
    type: "Contract",
    salary: "$80,000 - $100,000",
    description: "Create beautiful and intuitive user experiences...",
    posted: "3 days ago",
    applications: 8
  }
];

const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredJobs, setFilteredJobs] = useState(sampleJobs);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = sampleJobs.filter(job => 
      job.title.toLowerCase().includes(value.toLowerCase()) ||
      job.company.toLowerCase().includes(value.toLowerCase()) ||
      job.location.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredJobs(filtered);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Job Listings</h1>
          <p className="text-muted-foreground mt-2">Find your next opportunity</p>
        </div>
        <Link to="/post-job">
          <Button>Post a Job</Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, companies, or locations..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-base">
                    <span className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{job.type}</Badge>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {job.posted}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{job.description}</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    {job.salary}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {job.applications} applications
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">View Details</Button>
                  <Button>Apply Now</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Jobs;