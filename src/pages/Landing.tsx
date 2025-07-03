import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-end px-8 py-6">
        <Link to="/auth">
          <Button className="bg-secondary text-white hover:bg-secondary/90">
            CLIENT PORTAL
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3 mb-12">
          <img 
            src="/lovable-uploads/1f532f91-9114-4076-931d-e16a868fef79.png" 
            alt="Startup Accelerator" 
            className="h-12 w-12"
          />
          <span className="font-bold text-2xl text-primary">Startup Accelerator</span>
        </div>
        <h1 className="text-6xl font-bold mb-8 max-w-5xl leading-tight">
          <span className="text-secondary">A Smarter Way to</span>{" "}
          <span className="text-secondary">Staff</span>
          <br />
          <span className="text-secondary">Your Company</span>
        </h1>
        
        <h2 className="text-3xl font-semibold text-primary mb-12">
          Attract. Match. Hire. Onboard.
        </h2>
        
        <p className="text-lg text-gray-600 max-w-4xl leading-relaxed">
          Growth Accelerator enables companies and intermediaries to{" "}
          <span className="text-secondary font-medium">attract, match, onboard</span> and{" "}
          <span className="text-secondary font-medium">hire</span> external employees, without the need to establish 
          their own staffing company. Whether it's full-time employees, freelancers, or contractors - on our payroll, we've got you covered
        </p>
      </div>
    </div>
  );
};

export default Landing;