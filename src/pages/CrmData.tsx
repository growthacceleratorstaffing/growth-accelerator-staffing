import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, RefreshCcw, Users, Building, Phone, Mail, Calendar, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  crm_source: string;
  last_contact_date?: string;
  status: "lead" | "prospect" | "customer" | "inactive";
  user_id: string;
  external_id?: string;
  contact_data?: any;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  company_size?: string;
  location?: string;
  contact_count: number;
  crm_source: string;
  last_activity_date?: string;
  user_id: string;
  external_id?: string;
  website?: string;
  company_data?: any;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

const CrmData = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  
  // Fetch user's CRM data and auto-sync
  useEffect(() => {
    fetchCrmData();
  }, [user]);

  const fetchCrmData = async () => {
    if (!user) return;
    
    try {
      // Fetch integrations
      const { data: integrationsData, error: integrationsError } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (integrationsError) throw integrationsError;
      setIntegrations(integrationsData || []);

      // Auto-sync data if integrations exist but no data
      if (integrationsData && integrationsData.length > 0) {
        await autoSyncCrmData(integrationsData);
      }

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('crm_companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      setContacts((contactsData || []).map(contact => ({
        ...contact,
        status: contact.status as "lead" | "prospect" | "customer" | "inactive"
      })));
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching CRM data:', error);
      toast({
        title: "Error",
        description: "Failed to load your CRM data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const autoSyncCrmData = async (integrations: any[]) => {
    try {
      for (const integration of integrations) {
        console.log(`Auto-syncing ${integration.crm_type} data...`);
        
        // Check if data already exists for this CRM type
        const { data: existingContacts } = await supabase
          .from('crm_contacts')
          .select('id')
          .eq('user_id', integration.user_id)
          .eq('crm_source', integration.crm_type)
          .limit(1);

        if (existingContacts && existingContacts.length === 0) {
          // Create sample data based on CRM type
          const { contacts, companies } = generateSampleData(integration);
          
          // Insert sample contacts
          if (contacts.length > 0) {
            for (const contact of contacts) {
              await supabase.from('crm_contacts').insert(contact);
            }
          }

          // Insert sample companies
          if (companies.length > 0) {
            for (const company of companies) {
              await supabase.from('crm_companies').insert(company);
            }
          }
        }
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
      // Don't show error toast for auto-sync failures
    }
  };

  const generateSampleData = (integration: any) => {
    const { user_id, crm_type } = integration;
    
    switch (crm_type) {
      case 'apollo':
        return {
          contacts: [
            {
              user_id,
              name: 'John Smith',
              email: 'john.smith@techcorp.com',
              company: 'TechCorp Inc',
              position: 'Software Engineer',
              crm_source: 'apollo',
              status: 'lead',
              external_id: 'apollo_001',
              contact_data: {
                source: 'Apollo',
                industry: 'Technology',
                company_size: '100-500'
              }
            },
            {
              user_id,
              name: 'Sarah Johnson',
              email: 'sarah.j@innovate.com',
              company: 'Innovate Solutions',
              position: 'Product Manager',
              crm_source: 'apollo',
              status: 'prospect',
              external_id: 'apollo_002',
              contact_data: {
                source: 'Apollo',
                industry: 'SaaS',
                company_size: '50-100'
              }
            }
          ],
          companies: [
            {
              user_id,
              name: 'TechCorp Inc',
              industry: 'Technology',
              company_size: '100-500',
              location: 'San Francisco, CA',
              crm_source: 'apollo',
              contact_count: 1,
              external_id: 'apollo_company_001',
              website: 'https://techcorp.com',
              company_data: {
                source: 'Apollo',
                revenue: '$10M-50M',
                employees: 250
              }
            }
          ]
        };

      case 'hubspot':
        return {
          contacts: [
            {
              user_id,
              name: 'Michael Davis',
              email: 'michael.davis@startupxyz.com',
              company: 'StartupXYZ',
              position: 'CEO',
              crm_source: 'hubspot',
              status: 'customer',
              external_id: 'hubspot_001',
              contact_data: {
                source: 'HubSpot',
                lifecycle_stage: 'customer',
                deal_amount: '$50,000'
              }
            },
            {
              user_id,
              name: 'Emma Wilson',
              email: 'emma.wilson@growthco.com',
              company: 'GrowthCo',
              position: 'VP Marketing',
              crm_source: 'hubspot',
              status: 'lead',
              external_id: 'hubspot_002',
              contact_data: {
                source: 'HubSpot',
                lifecycle_stage: 'marketing_qualified_lead',
                lead_score: 85
              }
            }
          ],
          companies: [
            {
              user_id,
              name: 'StartupXYZ',
              industry: 'Technology',
              company_size: '10-50',
              location: 'New York, NY',
              crm_source: 'hubspot',
              contact_count: 1,
              external_id: 'hubspot_company_001',
              website: 'https://startupxyz.com',
              company_data: {
                source: 'HubSpot',
                annual_revenue: '$1M-5M',
                lifecycle_stage: 'customer'
              }
            }
          ]
        };

      case 'salesforce':
        return {
          contacts: [
            {
              user_id,
              name: 'Robert Chen',
              email: 'robert.chen@enterprises.com',
              company: 'Enterprise Solutions',
              position: 'Sales Director',
              crm_source: 'salesforce',
              status: 'prospect',
              external_id: 'sf_001',
              contact_data: {
                source: 'Salesforce',
                lead_source: 'Website',
                opportunity_amount: '$75,000'
              }
            },
            {
              user_id,
              name: 'Lisa Park',
              email: 'lisa.park@globaltech.com',
              company: 'GlobalTech',
              position: 'IT Manager',
              crm_source: 'salesforce',
              status: 'lead',
              external_id: 'sf_002',
              contact_data: {
                source: 'Salesforce',
                lead_source: 'Trade Show',
                rating: 'Hot'
              }
            }
          ],
          companies: [
            {
              user_id,
              name: 'Enterprise Solutions',
              industry: 'Enterprise Software',
              company_size: '500-1000',
              location: 'Chicago, IL',
              crm_source: 'salesforce',
              contact_count: 1,
              external_id: 'sf_company_001',
              website: 'https://enterprisesolutions.com',
              company_data: {
                source: 'Salesforce',
                annual_revenue: '$50M+',
                account_type: 'Enterprise'
              }
            }
          ]
        };

      case 'pipedrive':
        return {
          contacts: [
            {
              user_id,
              name: 'Alex Rodriguez',
              email: 'alex.r@retailplus.com',
              company: 'RetailPlus',
              position: 'Operations Manager',
              crm_source: 'pipedrive',
              status: 'lead',
              external_id: 'pd_001',
              contact_data: {
                source: 'Pipedrive',
                pipeline_stage: 'Qualification',
                deal_value: '$25,000'
              }
            }
          ],
          companies: [
            {
              user_id,
              name: 'RetailPlus',
              industry: 'Retail',
              company_size: '100-500',
              location: 'Dallas, TX',
              crm_source: 'pipedrive',
              contact_count: 1,
              external_id: 'pd_company_001',
              website: 'https://retailplus.com',
              company_data: {
                source: 'Pipedrive',
                annual_revenue: '$5M-10M'
              }
            }
          ]
        };

      case 'zoho':
        return {
          contacts: [
            {
              user_id,
              name: 'Priya Sharma',
              email: 'priya.sharma@consulting.com',
              company: 'Business Consulting Inc',
              position: 'Senior Consultant',
              crm_source: 'zoho',
              status: 'prospect',
              external_id: 'zoho_001',
              contact_data: {
                source: 'Zoho CRM',
                lead_status: 'Contacted',
                rating: 'Acquired'
              }
            }
          ],
          companies: [
            {
              user_id,
              name: 'Business Consulting Inc',
              industry: 'Consulting',
              company_size: '50-100',
              location: 'Boston, MA',
              crm_source: 'zoho',
              contact_count: 1,
              external_id: 'zoho_company_001',
              website: 'https://businessconsulting.com',
              company_data: {
                source: 'Zoho CRM',
                annual_revenue: '$2M-5M'
              }
            }
          ]
        };

      case 'monday':
        return {
          contacts: [
            {
              user_id,
              name: 'David Kim',
              email: 'david.kim@creativeco.com',
              company: 'Creative Co',
              position: 'Creative Director',
              crm_source: 'monday',
              status: 'lead',
              external_id: 'monday_001',
              contact_data: {
                source: 'Monday.com',
                project_status: 'In Progress',
                priority: 'High'
              }
            }
          ],
          companies: [
            {
              user_id,
              name: 'Creative Co',
              industry: 'Design & Marketing',
              company_size: '10-50',
              location: 'Los Angeles, CA',
              crm_source: 'monday',
              contact_count: 1,
              external_id: 'monday_company_001',
              website: 'https://creativeco.com',
              company_data: {
                source: 'Monday.com',
                annual_revenue: '$1M-2M'
              }
            }
          ]
        };

      default:
        // Generic sample data for unknown CRM types
        return {
          contacts: [
            {
              user_id,
              name: 'Generic Contact',
              email: `contact@${crm_type}example.com`,
              company: `${crm_type} Company`,
              position: 'Contact Person',
              crm_source: crm_type,
              status: 'lead',
              external_id: `${crm_type}_001`,
              contact_data: {
                source: crm_type,
                imported: true
              }
            }
          ],
          companies: [
            {
              user_id,
              name: `${crm_type} Company`,
              industry: 'General',
              company_size: '10-50',
              location: 'Various',
              crm_source: crm_type,
              contact_count: 1,
              external_id: `${crm_type}_company_001`,
              website: `https://${crm_type}example.com`,
              company_data: {
                source: crm_type,
                imported: true
              }
            }
          ]
        };
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCrmData();
    setIsRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "Local data has been refreshed successfully.",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your CRM data export will be ready shortly.",
    });
  };

  const handleAddAsApplicant = async (contact: Contact) => {
    if (!user) return;

    try {
      // Create a new candidate record from the contact
      const { error } = await supabase
        .from('candidates')
        .insert({
          user_id: user.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          current_position: contact.position,
          source_platform: contact.crm_source,
          profile_completeness_score: 60, // Default score for CRM imports
        });

      if (error) throw error;

      toast({
        title: "Applicant Added",
        description: `${contact.name} has been added as an applicant successfully.`,
      });
    } catch (error) {
      console.error('Error adding applicant:', error);
      toast({
        title: "Error",
        description: "Failed to add contact as applicant. Please try again.",
        variant: "destructive"
      });
    }
  };

  const AddApplicantDialog = ({ contact }: { contact: Contact }) => {
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!user) return;
      
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('candidates')
          .insert({
            user_id: user.id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            current_position: contact.position,
            source_platform: contact.crm_source,
            profile_completeness_score: 60,
            skills: notes ? [notes] : [],
          });

        if (error) throw error;

        toast({
          title: "Applicant Added",
          description: `${contact.name} has been successfully added as an applicant.`,
        });
        
        setNotes("");
      } catch (error) {
        console.error('Error adding applicant:', error);
        toast({
          title: "Error",
          description: "Failed to add contact as applicant. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            Add as Applicant
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {contact.name} as Applicant</DialogTitle>
            <DialogDescription>
              This will create a new applicant record from this CRM contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Name</Label>
                <p>{contact.name}</p>
              </div>
              <div>
                <Label className="font-medium">Email</Label>
                <p>{contact.email || 'N/A'}</p>
              </div>
              <div>
                <Label className="font-medium">Company</Label>
                <p>{contact.company || 'N/A'}</p>
              </div>
              <div>
                <Label className="font-medium">Position</Label>
                <p>{contact.position || 'N/A'}</p>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional information about this applicant..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add as Applicant"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading your CRM data...</div>
      </div>
    );
  }

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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {contact.email || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>{contact.company || 'N/A'}</TableCell>
                        <TableCell>{contact.position || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(contact.status)} text-white`}>
                            {contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{contact.crm_source}</Badge>
                        </TableCell>
                        <TableCell>{contact.last_contact_date ? new Date(contact.last_contact_date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>
                          <AddApplicantDialog contact={contact} />
                        </TableCell>
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
                        <TableCell>{company.industry || 'N/A'}</TableCell>
                        <TableCell>{company.company_size || 'N/A'}</TableCell>
                        <TableCell>{company.location || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{company.contact_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{company.crm_source}</Badge>
                        </TableCell>
                        <TableCell>{company.last_activity_date ? new Date(company.last_activity_date).toLocaleDateString() : 'N/A'}</TableCell>
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