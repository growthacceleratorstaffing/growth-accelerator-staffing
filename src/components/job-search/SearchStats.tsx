import { Card, CardContent } from "@/components/ui/card";
import { Search, Briefcase } from "lucide-react";

interface SearchStatsProps {
  query: string;
  totalResults: number;
  isLoading: boolean;
}

export const SearchStats = ({ query, totalResults, isLoading }: SearchStatsProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {query ? `Search results for "${query}"` : "All available positions"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-secondary" />
            <span className="font-medium">
              {isLoading ? "Loading..." : `${totalResults} jobs found`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};