
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Matching = () => {
  const handleGoToMatching = () => {
    window.open('https://mijn.cootje.com/recruiter/kandidaten/b50e2506-9644-40be-8e87-08b2046ca3ee?view=Vacatures&tab=Koppelen', '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Matching</h1>
          <p className="text-muted-foreground mt-2">Match candidates with job opportunities</p>
        </div>
        <Button onClick={handleGoToMatching} className="flex items-center gap-2">
          Go to matching
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Candidate Matching</CardTitle>
            <CardDescription>AI-powered candidate job matching</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use advanced algorithms to match candidates with the most suitable job opportunities.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Matching</CardTitle>
            <CardDescription>Find the perfect jobs for candidates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Discover ideal job positions that align with candidate skills and preferences.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Match Analytics</CardTitle>
            <CardDescription>Track matching performance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor the success rate and quality of your candidate-job matches.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Matching;
