import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, TrendingUp, UserCheck, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const features = [
    {
      icon: Briefcase,
      title: "Job Management",
      description: "Post and manage job opportunities with ease"
    },
    {
      icon: User,
      title: "Candidate Tracking",
      description: "Track applications and candidate progress"
    },
    {
      icon: TrendingUp,
      title: "Placement Matching",
      description: "Connect the right candidates with the right jobs"
    }
  ];

  const benefits = [
    "Comprehensive recruitment management system",
    "Streamlined job posting workflow",
    "Real-time candidate application tracking",
    "Secure authentication and data protection",
    "Role-based access control"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Growth Accelerator API</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your comprehensive recruitment platform for managing jobs, candidates, and placements. 
            Streamline your entire hiring process with our integrated solution.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Sign In to Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Why Choose Our Platform?</CardTitle>
            <CardDescription>
              Built specifically for recruitment agencies and HR teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-8 pt-6 border-t text-center">
              <Badge variant="secondary" className="mb-4">
                Secure Authentication Required
              </Badge>
              <p className="text-sm text-muted-foreground">
                Secure your account to get started. Your data is protected 
                with industry-standard security and encryption.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer with Privacy Policy and Disclaimer */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex items-center gap-4">
              <Link to="/privacy">
                <Button variant="ghost" size="sm">Privacy Policy</Button>
              </Link>
            </div>
            
            <div className="max-w-2xl text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Disclaimer:</strong> This platform provides comprehensive recruitment 
                management services including job posting, candidate tracking, and placement management. 
                All data is processed securely and in accordance with privacy regulations.
              </p>
              <p>
                By using this platform, you acknowledge that your data may be shared with employers 
                and recruitment partners as part of the hiring process. We are committed to protecting 
                your privacy and handling your information responsibly.
              </p>
            </div>
            
            <p className="text-xs text-muted-foreground">
              © 2025 Growth Accelerator. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;