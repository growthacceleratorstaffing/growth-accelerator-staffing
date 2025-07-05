import { Card, CardContent } from "@/components/ui/card";
import { Search, Briefcase, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobAdderSearchStatsProps {
  query: string;
  totalResults: number;
  isLoading: boolean;
  error?: string | null;
}

export const JobAdderSearchStats = ({ query, totalResults, isLoading, error }: JobAdderSearchStatsProps) => {
  return (
    <div className="mb-6 space-y-4">
      {error && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {query ? `JobAdder search results for "${query}"` : "All available JobAdder positions"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-secondary" />
              <span className="font-medium">
                {isLoading ? "Loading..." : `${totalResults} opportunities found`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};