import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  Play, 
  Code, 
  Database, 
  Users, 
  Building, 
  FileText, 
  Activity,
  MessageSquare,
  Calendar,
  Search,
  Folder,
  Settings,
  Briefcase,
  UserCheck
} from "lucide-react";
import { useJobAdderAPI } from "@/hooks/useJobAdderAPI";

const JobAdderAPIExplorer = () => {
  const [selectedCategory, setSelectedCategory] = useState("jobs");
  const [selectedOperation, setSelectedOperation] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<any>(null);
  const [requestData, setRequestData] = useState("");
  
  const api = useJobAdderAPI();

  const apiCategories = {
    jobs: {
      icon: <Briefcase className="h-4 w-4" />,
      title: "Jobs",
      description: "Manage job postings and applications",
      operations: {
        "getJobs": { method: "GET", description: "Get all jobs", params: ["limit", "offset", "search"] },
        "getJob": { method: "GET", description: "Get specific job", params: ["jobId"] },
        "createJob": { method: "POST", description: "Create new job", params: [] },
        "updateJob": { method: "PUT", description: "Update existing job", params: ["jobId"] },
        "deleteJob": { method: "DELETE", description: "Delete job", params: ["jobId"] },
        "getJobApplications": { method: "GET", description: "Get job applications", params: ["jobId", "limit", "offset"] },
        "getJobApplication": { method: "GET", description: "Get specific application", params: ["applicationId"] }
      }
    },
    candidates: {
      icon: <Users className="h-4 w-4" />,
      title: "Candidates",
      description: "Manage candidate profiles and data",
      operations: {
        "getCandidates": { method: "GET", description: "Get all candidates", params: ["limit", "offset", "search"] },
        "getCandidate": { method: "GET", description: "Get specific candidate", params: ["candidateId"] },
        "createCandidate": { method: "POST", description: "Create new candidate", params: [] },
        "updateCandidate": { method: "PUT", description: "Update candidate", params: ["candidateId"] },
        "deleteCandidate": { method: "DELETE", description: "Delete candidate", params: ["candidateId"] }
      }
    },
    placements: {
      icon: <UserCheck className="h-4 w-4" />,
      title: "Placements",
      description: "Manage successful job placements",
      operations: {
        "getPlacements": { method: "GET", description: "Get all placements", params: ["limit", "offset", "search"] },
        "getPlacement": { method: "GET", description: "Get specific placement", params: ["placementId"] },
        "createPlacement": { method: "POST", description: "Create new placement", params: [] },
        "updatePlacement": { method: "PUT", description: "Update placement", params: ["placementId"] }
      }
    },
    companies: {
      icon: <Building className="h-4 w-4" />,
      title: "Companies",
      description: "Manage company profiles and contacts",
      operations: {
        "getCompanies": { method: "GET", description: "Get all companies", params: ["limit", "offset", "search"] },
        "getCompany": { method: "GET", description: "Get specific company", params: ["companyId"] },
        "createCompany": { method: "POST", description: "Create new company", params: [] },
        "updateCompany": { method: "PUT", description: "Update company", params: ["companyId"] },
        "getCompanyContacts": { method: "GET", description: "Get company contacts", params: ["companyId"] },
        "getCompanyJobs": { method: "GET", description: "Get company jobs", params: ["companyId"] }
      }
    },
    contacts: {
      icon: <Users className="h-4 w-4" />,
      title: "Contacts",
      description: "Manage individual contacts",
      operations: {
        "getContacts": { method: "GET", description: "Get all contacts", params: ["limit", "offset", "search"] },
        "getContact": { method: "GET", description: "Get specific contact", params: ["contactId"] },
        "createContact": { method: "POST", description: "Create new contact", params: [] },
        "updateContact": { method: "PUT", description: "Update contact", params: ["contactId"] }
      }
    },
    opportunities: {
      icon: <Database className="h-4 w-4" />,
      title: "Opportunities",
      description: "Manage business opportunities",
      operations: {
        "getOpportunities": { method: "GET", description: "Get all opportunities", params: ["limit", "offset", "search"] },
        "getOpportunity": { method: "GET", description: "Get specific opportunity", params: ["opportunityId"] },
        "createOpportunity": { method: "POST", description: "Create new opportunity", params: [] },
        "getOpportunityStages": { method: "GET", description: "Get opportunity stages", params: [] }
      }
    },
    attachments: {
      icon: <FileText className="h-4 w-4" />,
      title: "Attachments",
      description: "Manage files and documents",
      operations: {
        "getAttachments": { method: "GET", description: "Get entity attachments", params: ["entityType", "entityId"] },
        "getAttachment": { method: "GET", description: "Get specific attachment", params: ["entityType", "entityId", "attachmentId"] },
        "addAttachment": { method: "POST", description: "Add new attachment", params: ["entityType", "entityId"] },
        "deleteAttachment": { method: "DELETE", description: "Delete attachment", params: ["entityType", "entityId", "attachmentId"] }
      }
    },
    notes: {
      icon: <MessageSquare className="h-4 w-4" />,
      title: "Notes",
      description: "Manage notes and comments",
      operations: {
        "getNotes": { method: "GET", description: "Get entity notes", params: ["entityType", "entityId"] },
        "addNote": { method: "POST", description: "Add new note", params: ["entityType", "entityId"] },
        "getNoteTypes": { method: "GET", description: "Get note types", params: [] }
      }
    },
    activities: {
      icon: <Activity className="h-4 w-4" />,
      title: "Activities",
      description: "Track interactions and activities",
      operations: {
        "getActivities": { method: "GET", description: "Get entity activities", params: ["entityType", "entityId"] },
        "getActivity": { method: "GET", description: "Get specific activity", params: ["entityType", "entityId", "activityId"] },
        "addActivity": { method: "POST", description: "Add new activity", params: ["entityType", "entityId"] }
      }
    },
    interviews: {
      icon: <Calendar className="h-4 w-4" />,
      title: "Interviews",
      description: "Manage interviews and evaluations",
      operations: {
        "getInterviews": { method: "GET", description: "Get entity interviews", params: ["entityType", "entityId"] },
        "getInterview": { method: "GET", description: "Get specific interview", params: ["interviewId"] }
      }
    },
    search: {
      icon: <Search className="h-4 w-4" />,
      title: "Search",
      description: "Search functionality",
      operations: {
        "searchByEmail": { method: "GET", description: "Search by email address", params: ["email"] },
        "searchByPhone": { method: "GET", description: "Search by phone number", params: ["phone"] }
      }
    },
    reference: {
      icon: <Settings className="h-4 w-4" />,
      title: "Reference Data",
      description: "Get reference data and lookups",
      operations: {
        "getCategories": { method: "GET", description: "Get job categories", params: [] },
        "getLocations": { method: "GET", description: "Get locations", params: [] },
        "getCountries": { method: "GET", description: "Get countries", params: [] },
        "getWorkTypes": { method: "GET", description: "Get work types", params: [] },
        "getJobSources": { method: "GET", description: "Get job sources", params: [] },
        "getJobStatuses": { method: "GET", description: "Get job statuses", params: [] },
        "getCandidateSources": { method: "GET", description: "Get candidate sources", params: [] },
        "getCandidateStatuses": { method: "GET", description: "Get candidate statuses", params: [] }
      }
    }
  };

  const handleParamChange = (paramName: string, value: string) => {
    setParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const executeOperation = async () => {
    if (!selectedOperation) return;

    try {
      const operation = apiCategories[selectedCategory as keyof typeof apiCategories]?.operations[selectedOperation];
      if (!operation) return;

      let result;
      const apiMethod = (api as any)[selectedOperation];
      
      if (operation.method === 'GET') {
        if (operation.params.length === 0) {
          result = await apiMethod();
        } else if (operation.params.length === 1) {
          result = await apiMethod(params[operation.params[0]]);
        } else {
          result = await apiMethod(...operation.params.map(p => params[p]).filter(Boolean));
        }
      } else {
        // POST/PUT operations
        const requestBody = requestData ? JSON.parse(requestData) : {};
        if (operation.params.some(p => params[p])) {
          const paramValues = operation.params.filter(p => params[p]).map(p => params[p]);
          result = await apiMethod(...paramValues, requestBody);
        } else {
          result = await apiMethod(requestBody);
        }
      }
      
      setResponse(result);
    } catch (error) {
      setResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const currentCategory = apiCategories[selectedCategory as keyof typeof apiCategories];
  const currentOperation = selectedOperation ? currentCategory?.operations[selectedOperation] : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-6 w-6" />
            JobAdder API Explorer
          </CardTitle>
          <CardDescription>
            Test and explore all available JobAdder API endpoints
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 gap-1">
              {Object.entries(apiCategories).map(([key, category]) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  {category.icon}
                  <span className="hidden sm:inline ml-1">{category.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(apiCategories).map(([key, category]) => (
              <TabsContent key={key} value={key} className="space-y-4 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  {category.icon}
                  <div>
                    <h3 className="text-lg font-semibold">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Operations Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Available Operations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(category.operations).map(([opKey, operation]) => (
                        <Collapsible key={opKey}>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant={selectedOperation === opKey ? "default" : "outline"}
                              className="w-full justify-between"
                              onClick={() => setSelectedOperation(opKey)}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {operation.method}
                                </Badge>
                                <span className="text-sm">{operation.description}</span>
                              </div>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                          
                          {selectedOperation === opKey && (
                            <CollapsibleContent className="mt-2 p-4 border rounded-md bg-muted/50">
                              <div className="space-y-3">
                                {operation.params.map(param => (
                                  <div key={param} className="space-y-1">
                                    <Label htmlFor={param} className="text-xs font-medium">
                                      {param} {operation.params.indexOf(param) === 0 ? "*" : ""}
                                    </Label>
                                    <Input
                                      id={param}
                                      placeholder={`Enter ${param}`}
                                      value={params[param] || ""}
                                      onChange={(e) => handleParamChange(param, e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>
                                ))}
                                
                                {["POST", "PUT"].includes(operation.method) && (
                                  <div className="space-y-1">
                                    <Label htmlFor="requestData" className="text-xs font-medium">
                                      Request Body (JSON)
                                    </Label>
                                    <Textarea
                                      id="requestData"
                                      placeholder='{"field": "value"}'
                                      value={requestData}
                                      onChange={(e) => setRequestData(e.target.value)}
                                      rows={4}
                                      className="text-sm font-mono"
                                    />
                                  </div>
                                )}
                                
                                <Button 
                                  onClick={executeOperation}
                                  disabled={api.loading}
                                  className="w-full"
                                  size="sm"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  {api.loading ? "Executing..." : "Execute"}
                                </Button>
                              </div>
                            </CollapsibleContent>
                          )}
                        </Collapsible>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Response Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Response</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {api.loading ? (
                        <div className="flex items-center justify-center p-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : response ? (
                        <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
                          {JSON.stringify(response, null, 2)}
                        </pre>
                      ) : (
                        <div className="text-center text-muted-foreground p-8">
                          Select an operation and click Execute to see the response
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobAdderAPIExplorer;