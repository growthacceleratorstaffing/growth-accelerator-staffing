import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, RefreshCcw, Users, Building, Phone, Mail, Calendar } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  position: string;
  source: string;
  lastContact: string;
  status: "lead" | "prospect" | "customer" | "inactive";
}

interface Company {
  id: string;
  name: string;
  industry: string;
  size: string;
  location: string;
  contacts: number;
  source: string;
  lastActivity: string;
}

const CrmData = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mock data - in real app this would come from your CRM integrations
  const [contacts] = useState<Contact[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah.johnson@techcorp.com",
      phone: "+31 6 1234 5678",
      company: "TechCorp",
      position: "CTO",
      source: "HubSpot",
      lastContact: "2025-01-15",
      status: "prospect"
    },
    {
      id: "2",
      name: "Michael Chen",
      email: "m.chen@innovate.com",
      phone: "+31 6 8765 4321",
      company: "Innovate Solutions",
      position: "Head of Engineering",
      source: "Salesforce",
      lastContact: "2025-01-14",
      status: "lead"
    },
    {
      id: "3",
      name: "Emma Rodriguez",
      email: "emma@startupbv.nl",
      company: "Startup BV",
      position: "Founder",
      source: "Apollo",
      lastContact: "2025-01-12",
      status: "customer"
    },
    {
      id: "4",
      name: "David Thompson",
      email: "david.t@enterprise.com",
      phone: "+31 6 2468 1357",
      company: "Enterprise Corp",
      position: "VP of Technology",
      source: "Pipedrive",
      lastContact: "2025-01-10",
      status: "inactive"
    }
  ]);

  const [companies] = useState<Company[]>([
    {
      id: "1",
      name: "TechCorp",
      industry: "Technology",
      size: "500-1000",
      location: "Amsterdam",
      contacts: 15,
      source: "HubSpot",
      lastActivity: "2025-01-15"
    },
    {
      id: "2",
      name: "Innovate Solutions",
      industry: "Software",
      size: "100-500",
      location: "Rotterdam",
      contacts: 8,
      source: "Salesforce",
      lastActivity: "2025-01-14"
    },
    {
      id: "3",
      name: "Startup BV",
      industry: "FinTech",
      size: "10-50",
      location: "Utrecht",
      contacts: 3,
      source: "Apollo",
      lastActivity: "2025-01-12"
    }
  ]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call to refresh data
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Data Refreshed",
        description: "CRM data has been synchronized successfully.",
      });
    }, 2000);
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your CRM data export will be ready shortly.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lead": return "bg-blue-500";
      case "prospect": return "bg-yellow-500";
      case "customer": return "bg-green-500";
      case "inactive": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM Data</h1>
            <p className="text-muted-foreground">
              View and manage imported data from your connected CRM systems.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contacts.length}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies.length}</div>
              <p className="text-xs text-muted-foreground">
                +3 new this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contacts.filter(c => c.status === "lead" || c.status === "prospect").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for outreach
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2h ago</div>
              <p className="text-xs text-muted-foreground">
                All systems synced
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts, companies, or emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="contacts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
          </TabsList>
          
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
                <CardDescription>
                  All contacts imported from your CRM integrations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Last Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {contact.email}
                          </div>
                        </TableCell>
                        <TableCell>{contact.company}</TableCell>
                        <TableCell>{contact.position}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(contact.status)} text-white`}>
                            {contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{contact.source}</Badge>
                        </TableCell>
                        <TableCell>{contact.lastContact}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <CardTitle>Companies</CardTitle>
                <CardDescription>
                  All companies imported from your CRM integrations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.industry}</TableCell>
                        <TableCell>{company.size}</TableCell>
                        <TableCell>{company.location}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{company.contacts}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{company.source}</Badge>
                        </TableCell>
                        <TableCell>{company.lastActivity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CrmData;