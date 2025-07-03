import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Mail, Phone, Search, Star, Download } from "lucide-react";

interface Candidate {
  candidateId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  mobileNormalized?: string;
  contactMethod?: string;
  salutation?: string;
  unsubscribed?: boolean;
  address?: {
    street?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
  };
  status: {
    statusId: number;
    name: string;
    active: boolean;
    default: boolean;
  };
  rating?: string;
  source?: string;
  seeking?: string;
  // Additional fields for UI
  position?: string;
  experience?: string;
  skills?: string[];
  avatar?: string;
}

const sampleCandidates: Candidate[] = [
  {
    candidateId: 1,
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    mobile: "+1 (555) 123-4567",
    contactMethod: "Email",
    salutation: "Ms.",
    unsubscribed: false,
    address: {
      street: ["123 Tech Street"],
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      country: "United States",
      countryCode: "US"
    },
    status: {
      statusId: 1,
      name: "Available",
      active: true,
      default: true
    },
    rating: "4.8",
    source: "LinkedIn",
    seeking: "Yes",
    position: "Senior Frontend Developer",
    experience: "5+ years",
    skills: ["React", "TypeScript", "Next.js", "Tailwind"]
  },
  {
    candidateId: 2,
    firstName: "Michael",
    lastName: "Chen",
    email: "michael.chen@email.com",
    phone: "+1 (555) 987-6543",
    mobile: "+1 (555) 987-6543",
    contactMethod: "Phone",
    salutation: "Mr.",
    unsubscribed: false,
    address: {
      street: ["456 Business Ave"],
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "United States",
      countryCode: "US"
    },
    status: {
      statusId: 2,
      name: "Interviewing",
      active: true,
      default: false
    },
    rating: "4.9",
    source: "Company Website",
    seeking: "Yes",
    position: "Product Manager",
    experience: "7+ years",
    skills: ["Product Strategy", "Agile", "Analytics", "Leadership"]
  },
  {
    candidateId: 3,
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@email.com",
    phone: "+1 (555) 456-7890",
    mobile: "+1 (555) 456-7890",
    contactMethod: "Email",
    salutation: "Ms.",
    unsubscribed: false,
    address: {
      street: ["789 Design Lane"],
      city: "Austin",
      state: "TX",
      postalCode: "73301",
      country: "United States",
      countryCode: "US"
    },
    status: {
      statusId: 1,
      name: "Available",
      active: true,
      default: true
    },
    rating: "4.7",
    source: "Dribbble",
    seeking: "Yes",
    position: "UX Designer",
    experience: "4+ years",
    skills: ["Figma", "User Research", "Prototyping", "Design Systems"]
  },
  {
    candidateId: 4,
    firstName: "David",
    lastName: "Kim",
    email: "david.kim@email.com",
    phone: "+1 (555) 321-0987",
    mobile: "+1 (555) 321-0987",
    contactMethod: "Phone",
    salutation: "Mr.",
    unsubscribed: false,
    address: {
      street: ["321 Code Street"],
      city: "Seattle",
      state: "WA",
      postalCode: "98101",
      country: "United States",
      countryCode: "US"
    },
    status: {
      statusId: 3,
      name: "Hired",
      active: false,
      default: false
    },
    rating: "4.6",
    source: "GitHub",
    seeking: "No",
    position: "Full Stack Developer",
    experience: "6+ years",
    skills: ["Node.js", "Python", "PostgreSQL", "AWS"]
  }
];

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCandidates, setFilteredCandidates] = useState(sampleCandidates);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = sampleCandidates.filter(candidate => 
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(value.toLowerCase()) ||
      candidate.position?.toLowerCase().includes(value.toLowerCase()) ||
      candidate.skills?.some(skill => skill.toLowerCase().includes(value.toLowerCase())) ||
      candidate.address?.city?.toLowerCase().includes(value.toLowerCase())
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
          <Card key={candidate.candidateId} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={candidate.avatar} />
                  <AvatarFallback className="text-lg">
                    {`${candidate.firstName[0]}${candidate.lastName[0]}`}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <CardTitle className="text-xl">
                        {candidate.salutation ? `${candidate.salutation} ` : ''}{candidate.firstName} {candidate.lastName}
                      </CardTitle>
                      <CardDescription className="text-base font-medium">
                        {candidate.position}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(candidate.status.name)}>
                      {candidate.status.name}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {candidate.address ? `${candidate.address.city}, ${candidate.address.state}` : 'Location not specified'}
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
                    {candidate.skills?.map((skill, index) => (
                      <Badge key={index} variant="outline">{skill}</Badge>
                    )) || <span className="text-muted-foreground">No skills listed</span>}
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
                      {candidate.phone || candidate.mobile}
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