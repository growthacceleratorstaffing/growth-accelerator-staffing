import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, RefreshCw, ExternalLink, Info } from "lucide-react";
import { Link } from "react-router-dom";

export function JobAdderTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isJobAdderConnected, setIsJobAdderConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkJobAdderConnection();
  }, []);

  const checkJobAdderConnection = async () => {
    try {
      setCheckingConnection(true);
      const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
      const authenticated = await oauth2Manager.isAuthenticated();
      setIsJobAdderConnected(authenticated);
    } catch (error) {
      console.error('Failed to check JobAdder connection:', error);
      setIsJobAdderConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const runTests = async () => {
    if (!isJobAdderConnected) {
      toast({
        title: "JobAdder Not Connected",
        description: "Please connect your JobAdder account first in the Auth page.",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    setResults([]);
    const testResults: any[] = [];

    try {
      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        testResults.push({
          test: "User Authentication",
          status: "failed",
          message: "No user session found"
        });
        setResults([...testResults]);
        setTesting(false);
        return;
      }

      testResults.push({
        test: "User Authentication",
        status: "passed",
        message: `User ID: ${userId}`
      });

      testResults.push({
        test: "JobAdder Connection",
        status: "passed", 
        message: "JobAdder OAuth tokens found and valid"
      });

      // Test 1: Check current user
      try {
        const { data: userData, error: userError } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'current-user'
          },
          headers: {
            'x-user-id': userId
          }
        });

        if (userError) {
          testResults.push({
            test: "Current User API",
            status: "failed", 
            message: userError.message
          });
        } else if (userData?.success) {
          testResults.push({
            test: "Current User API",
            status: "passed",
            message: `Connected as: ${userData.data?.name || 'Unknown'}`
          });
        } else {
          testResults.push({
            test: "Current User API",
            status: "failed",
            message: userData?.error || 'Unknown error'
          });
        }
      } catch (err) {
        testResults.push({
          test: "Current User API",
          status: "failed",
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      setResults([...testResults]);

      // Test 2: Jobs endpoint
      try {
        const { data: jobsData, error: jobsError } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'jobs',
            limit: 5
          },
          headers: {
            'x-user-id': userId
          }
        });

        if (jobsError) {
          testResults.push({
            test: "Jobs API",
            status: "failed",
            message: jobsError.message
          });
        } else if (jobsData?.success) {
          testResults.push({
            test: "Jobs API", 
            status: "passed",
            message: `Found ${jobsData.data?.items?.length || 0} jobs`
          });
        } else {
          testResults.push({
            test: "Jobs API",
            status: "failed",
            message: jobsData?.error || 'Unknown error'
          });
        }
      } catch (err) {
        testResults.push({
          test: "Jobs API",
          status: "failed",
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      setResults([...testResults]);

      // Test 3: Candidates endpoint  
      try {
        const { data: candidatesData, error: candidatesError } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'candidates',
            limit: 5
          },
          headers: {
            'x-user-id': userId
          }
        });

        if (candidatesError) {
          testResults.push({
            test: "Candidates API",
            status: "failed",
            message: candidatesError.message
          });
        } else if (candidatesData?.success) {
          testResults.push({
            test: "Candidates API",
            status: "passed", 
            message: `Found ${candidatesData.data?.items?.length || 0} candidates`
          });
        } else {
          testResults.push({
            test: "Candidates API",
            status: "failed",
            message: candidatesData?.error || 'Unknown error'
          });
        }
      } catch (err) {
        testResults.push({
          test: "Candidates API",
          status: "failed",
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      setResults([...testResults]);

      // Test 4: Applications endpoint
      try {
        const { data: appsData, error: appsError } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'applications',
            limit: 5
          },
          headers: {
            'x-user-id': userId
          }
        });

        if (appsError) {
          testResults.push({
            test: "Applications API",
            status: "failed",
            message: appsError.message
          });
        } else if (appsData?.success) {
          testResults.push({
            test: "Applications API",
            status: "passed",
            message: `Found ${appsData.data?.items?.length || 0} applications`
          });
        } else {
          testResults.push({
            test: "Applications API", 
            status: "failed",
            message: appsData?.error || 'Unknown error'
          });
        }
      } catch (err) {
        testResults.push({
          test: "Applications API",
          status: "failed",
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      setResults([...testResults]);

    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  if (checkingConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Checking JobAdder Connection...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          JobAdder API Test Suite
        </CardTitle>
        <CardDescription>
          Test JobAdder API connectivity and functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isJobAdderConnected ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>JobAdder Not Connected</strong></p>
                  <p>To run API tests, you need to connect your JobAdder account first.</p>
                  <p className="text-sm text-muted-foreground">
                    Go to the Auth page and complete the JobAdder OAuth integration.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button asChild variant="default">
                <Link to="/auth" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Go to Auth Page
                </Link>
              </Button>
              <Button variant="outline" onClick={checkJobAdderConnection}>
                <RefreshCw className="h-4 w-4" />
                Recheck Connection
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>JobAdder Connected</strong> - Ready to run API tests
              </AlertDescription>
            </Alert>

            <Button 
              onClick={runTests} 
              disabled={testing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Running Tests...' : 'Run API Tests'}
            </Button>
          </>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            {results.map((result, index) => (
              <Alert key={index} variant={result.status === 'failed' ? 'destructive' : 'default'}>
                <div className="flex items-center gap-2">
                  {result.status === 'passed' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">{result.test}</span>
                </div>
                <AlertDescription className="mt-1">
                  {result.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}