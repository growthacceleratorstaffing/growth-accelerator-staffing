import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Users, Calendar, FileText, UserPlus, CheckCircle } from "lucide-react";

const PreOnboarding = () => {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Employee Preboarding</h1>
        <p className="text-muted-foreground">
          Prepare and manage preboarding activities for new hires
        </p>
      </div>

      {/* Total Candidates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Preboarding
            </CardTitle>
            <div className="text-3xl font-bold">24</div>
            <p className="text-sm text-muted-foreground">
              Candidates awaiting preboarding
            </p>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <div className="text-3xl font-bold">12</div>
            <p className="text-sm text-muted-foreground">
              Currently in preboarding process
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready for Onboarding
            </CardTitle>
            <div className="text-3xl font-bold">8</div>
            <p className="text-sm text-muted-foreground">
              Completed preboarding steps
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Send Pre-Onboarding Email */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Send Preboarding Email</CardTitle>
          </div>
          <CardDescription>
            Select a candidate to send them a preboarding email with initial requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a candidate for preboarding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidate1">John Doe - Software Engineer</SelectItem>
                <SelectItem value="candidate2">Jane Smith - Marketing Manager</SelectItem>
                <SelectItem value="candidate3">Mike Johnson - Sales Representative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full">
            Begin Preboarding
          </Button>
        </CardContent>
      </Card>

      {/* Pre-Onboarding Pipeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Preboarding Pipeline</CardTitle>
          </div>
          <CardDescription>
            Track and manage the preboarding process for new employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Start Preboarding</h3>
            <p className="text-muted-foreground mb-8">
              Select a candidate above to begin their preboarding journey through our 4-step process
            </p>

            {/* Preboarding Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="text-center p-4 border rounded-lg">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mx-auto mb-2">
                  1
                </div>
                <h4 className="font-medium mb-1">Welcome Email</h4>
                <p className="text-sm text-muted-foreground">
                  Send welcome email to new hire
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mx-auto mb-2">
                  2
                </div>
                <h4 className="font-medium mb-1">Create Account</h4>
                <p className="text-sm text-muted-foreground">
                  Set up company accounts and credentials
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mx-auto mb-2">
                  3
                </div>
                <h4 className="font-medium mb-1">Sign Contract</h4>
                <p className="text-sm text-muted-foreground">
                  Complete employment contract signing
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mx-auto mb-2">
                  4
                </div>
                <h4 className="font-medium mb-1">Team Introduction</h4>
                <p className="text-sm text-muted-foreground">
                  Introduce to team members and schedule meetings
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreOnboarding;