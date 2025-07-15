import { Search, Briefcase } from "lucide-react";

interface JazzHRSearchStatsProps {
  searchQuery: string;
  totalResults: number;
  isLoading: boolean;
}

export const JazzHRSearchStats = ({ searchQuery, totalResults, isLoading }: JazzHRSearchStatsProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span>Loading JazzHR jobs...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <Briefcase className="h-4 w-4" />
      <span>
        JazzHR {searchQuery ? `results for "${searchQuery}"` : "job listings"}
      </span>
      <span className="text-primary font-medium">
        {totalResults} {totalResults === 1 ? 'position' : 'positions'} found
      </span>
    </div>
  );
};