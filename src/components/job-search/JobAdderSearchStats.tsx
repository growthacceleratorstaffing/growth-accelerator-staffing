import { Card, CardContent } from "@/components/ui/card";
import { Search, Briefcase, Building } from "lucide-react";

interface JobAdderSearchStatsProps {
  searchQuery?: string;
  totalResults: number;
  isLoading: boolean;
}

export const JobAdderSearchStats = ({ searchQuery, totalResults, isLoading }: JobAdderSearchStatsProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">
              JobAdder {searchQuery ? `results for "${searchQuery}"` : "job listings"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-secondary" />
            <span className="font-medium">
              {isLoading ? "Loading..." : `${totalResults} positions found`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};