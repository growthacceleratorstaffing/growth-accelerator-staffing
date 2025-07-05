import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

interface JobAdderSearchBarProps {
  onSearch: (params: { search?: string; limit?: number; offset?: number }) => void;
  isLoading?: boolean;
}

export const JobAdderSearchBar = ({ onSearch, isLoading }: JobAdderSearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState("20");

  const handleSearch = () => {
    onSearch({
      search: searchTerm.trim() || undefined,
      limit: parseInt(limit),
      offset: 0
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-card rounded-lg p-6 space-y-4 shadow-sm border">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search JobAdder positions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
          />
        </div>
        
        <Select value={limit} onValueChange={setLimit}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 jobs</SelectItem>
            <SelectItem value="20">20 jobs</SelectItem>
            <SelectItem value="50">50 jobs</SelectItem>
            <SelectItem value="100">100 jobs</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          onClick={handleSearch} 
          disabled={isLoading}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>
    </div>
  );
};