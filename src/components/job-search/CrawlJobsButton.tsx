import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CrawlJobsButtonProps {
  onCrawl: () => Promise<any>;
}

export const CrawlJobsButton = ({ onCrawl }: CrawlJobsButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCrawl = async () => {
    setIsLoading(true);
    try {
      await onCrawl();
      toast({
        title: "Success",
        description: "Jobs crawled successfully! The list will update shortly.",
      });
    } catch (error) {
      console.error("Crawl error:", error);
      toast({
        title: "Error",
        description: "Failed to crawl jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCrawl}
      disabled={isLoading}
      className="bg-secondary hover:bg-secondary/90"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {isLoading ? "Crawling Jobs..." : "Refresh Jobs"}
    </Button>
  );
};