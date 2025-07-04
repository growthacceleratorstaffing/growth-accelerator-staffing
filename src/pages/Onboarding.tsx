import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle } from "lucide-react";

const Onboarding = () => {
  const handleRedirect = () => {
    window.open("https://www.contractdossier.nl", "_blank");
  };

  const steps = [
    "Complete your profile setup",
    "Configure your preferences", 
    "Connect with our platform",
    "Start your journey"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6">
            Welcome to <span className="text-pink-500">Growth Accelerator</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12">
            Let's get you started with your onboarding process. Follow the steps below to complete your setup.
          </p>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Onboarding Steps</CardTitle>
              <CardDescription>
                Complete these steps to get the most out of our platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 text-left">
                {steps.map((step, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Button 
              size="lg" 
              className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 text-lg"
              onClick={handleRedirect}
            >
              Continue to Contract Dossier
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-sm text-muted-foreground">
              This will open Contract Dossier in a new tab to continue your onboarding process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;