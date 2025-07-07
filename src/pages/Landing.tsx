import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const services = [
    {
      title: "Growth Accelerator Staffing",
      description: "Eliminate all administration concerns with full risk coverage—plus, offer contract-to-perm solutions as an intermediary. Enjoy the benefits of staffing without the burdens of being an employer.",
      roles: ["INTERMEDIARIES", "PRE-FINANCING", "HIRING MANAGERS", "FREELANCERS"],
      link: "/candidates"
    },
    {
      title: "Growth Accelerator Contracting",
      description: "Your back office in our hands, in collaboration with The Compliance Factory. Why pay a lot of money for your own outsourced back office? Get full coverage at the lowest price in the market.",
      roles: ["INTERMEDIARIES", "PRE-FINANCING", "HIRING MANAGERS", "FREELANCERS"],
      link: "/matches"
    },
    {
      title: "Growth Accelerator Services",
      description: "We also provide freelance and contract-to-perm solutions to our partner companies. Work through our staffing agency as an intermediary or freelancer.",
      roles: ["HIRING MANAGERS", "FULL-TIME EMPLOYEES", "FREELANCERS"],
      link: "https://www.growthaccelerator.nl",
      external: true
    },
    {
      title: "Growth Accelerator Jobs",
      description: "Fill vacancies quickly and easily. Bring job openings to the attention of millions of people through our sponsored partnership with LinkedIn and our job boards.",
      roles: ["INTERMEDIARIES", "HIRING MANAGERS", "FREELANCERS"],
      link: "/jobs"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-8">
            <span className="text-pink-500">Growth Accelerator Staffing Services</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-4xl mx-auto">
            Four ways to attract, match, onboard and hire your new (external) employees. Everything you 
            need into one platform, or separate if you prefer.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
            <Link to="/auth">
              <Button size="lg" className="w-full px-8 py-4 text-lg bg-white text-black hover:bg-gray-100">
                Sign in as an agency
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full px-8 py-4 text-lg bg-white text-black border-white hover:bg-gray-100"
              asChild
            >
              <a 
                href="https://startup-accelerator.hiringmanager.com/Account/login" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-full"
              >
                Hiring Manager Portal
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <CardTitle className="text-xl text-pink-500 mb-4">{service.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed mb-6">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button 
                  variant="ghost" 
                  className="text-muted-foreground hover:text-pink-500 p-0 h-auto font-normal mb-4"
                  asChild
                >
                  {service.external ? (
                    <a href={service.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      MORE INFORMATION <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link to={service.link} className="flex items-center gap-2">
                      MORE INFORMATION <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Suitable for</p>
                  <p className="font-medium">
                    {service.roles.join(" | ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer with Privacy Policy */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="flex items-center gap-4">
              <Link to="/privacy">
                <Button variant="ghost" size="sm">
                  Privacy Policy
                </Button>
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