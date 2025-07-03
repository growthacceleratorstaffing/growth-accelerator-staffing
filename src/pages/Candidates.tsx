import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Mail, Phone, Search, Star, Download } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  experience: string;
  skills: string[];
  rating: number;
  avatar?: string;
  status: "Available" | "Interviewing" | "Hired";
}

const sampleCandidates: Candidate[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    title: "Senior Frontend Developer",
    experience: "5+ years",
    skills: ["React", "TypeScript", "Next.js", "Tailwind"],
    rating: 4.8,
    status: "Available"
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "michael.chen@email.com", 
    phone: "+1 (555) 987-6543",
    location: "New York, NY",
    title: "Product Manager",
    experience: "7+ years",
    skills: ["Product Strategy", "Agile", "Analytics", "Leadership"],
    rating: 4.9,
    status: "Interviewing"
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@email.com",
    phone: "+1 (555) 456-7890", 
    location: "Austin, TX",
    title: "UX Designer",
    experience: "4+ years",
    skills: ["Figma", "User Research", "Prototyping", "Design Systems"],
    rating: 4.7,
    status: "Available"
  },
  {
    id: "4",
    name: "David Kim",
    email: "david.kim@email.com",
    phone: "+1 (555) 321-0987",
    location: "Seattle, WA", 
    title: "Full Stack Developer",
    experience: "6+ years",
    skills: ["Node.js", "Python", "PostgreSQL", "AWS"],
    rating: 4.6,
    status: "Hired"
  }
];

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCandidates, setFilteredCandidates] = useState(sampleCandidates);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = sampleCandidates.filter(candidate => 
      candidate.name.toLowerCase().includes(value.toLowerCase()) ||
      candidate.title.toLowerCase().includes(value.toLowerCase()) ||
      candidate.skills.some(skill => skill.toLowerCase().includes(value.toLowerCase())) ||
      candidate.location.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredCandidates(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "bg-green-100 text-green-800";
      case "Interviewing": return "bg-yellow-100 text-yellow-800"; 
      case "Hired": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground mt-2">Manage your talent pipeline</p>
        </div>
        <Button>Add Candidate</Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, title, skills, or location..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {filteredCandidates.map((candidate) => (
          <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={candidate.avatar} />
                  <AvatarFallback className="text-lg">
                    {candidate.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <CardTitle className="text-xl">{candidate.name}</CardTitle>
                      <CardDescription className="text-base font-medium">
                        {candidate.title}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(candidate.status)}>
                      {candidate.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {candidate.location}
                    </span>
                    <span>{candidate.experience} experience</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {candidate.rating}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, index) => (
                      <Badge key={index} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {candidate.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {candidate.phone}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                    <Button variant="outline" size="sm">Contact</Button>
                    <Button size="sm">View Profile</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Candidates;