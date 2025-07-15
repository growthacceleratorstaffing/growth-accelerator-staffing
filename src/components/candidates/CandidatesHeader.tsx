import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface CandidatesHeaderProps {
  candidateCount: number;
  isLoading: boolean;
  onRefresh: () => void;
}

const CandidatesHeader = ({ candidateCount, isLoading, onRefresh }: CandidatesHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold">Candidates</h1>
        <p className="text-muted-foreground mt-2">
          Manage candidates from your applications and JobAdder ({candidateCount} candidates)
        </p>
      </div>
      <Button 
        onClick={onRefresh}
        disabled={isLoading}
        variant="outline"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
};

export default CandidatesHeader;