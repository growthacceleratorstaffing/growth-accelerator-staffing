import JazzHRAPIExplorer from "@/components/candidates/JazzHRCandidatesList";
import { useJazzHRApplicants } from "@/hooks/useJazzHRApplicants";

const APIExplorer = () => {
  const { data: candidates = [], isLoading } = useJazzHRApplicants();
  
  const handleImportCandidate = async (candidate: any) => {
    console.log('Import candidate:', candidate);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">JazzHR API Explorer</h1>
        <p className="text-muted-foreground">Explore candidates from JazzHR</p>
      </div>
      
      <JazzHRAPIExplorer 
        candidates={candidates}
        onImportCandidate={handleImportCandidate}
        importingCandidates={new Set()}
      />
    </div>
  );
};

export default APIExplorer;