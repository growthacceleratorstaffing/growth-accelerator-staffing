
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Backoffice = () => {
  const handleGoToBackoffice = () => {
    window.open('https://mijn.cootje.com/dashboard/voortgang', '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Backoffice</h1>
          <p className="text-muted-foreground mt-2">Manage your backoffice operations and progress tracking</p>
        </div>
        <Button onClick={handleGoToBackoffice} className="flex items-center gap-2">
          Go to backoffice
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Progress Tracking</CardTitle>
            <CardDescription>Monitor progress across all your operations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View detailed progress reports and analytics for your recruitment activities.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard Overview</CardTitle>
            <CardDescription>Comprehensive business intelligence</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Access key metrics, KPIs, and performance indicators in one central location.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations Management</CardTitle>
            <CardDescription>Streamline your workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage day-to-day operations and optimize your recruitment processes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Backoffice;
