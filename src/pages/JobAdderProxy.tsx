import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const JobAdderProxy = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const authUrl = searchParams.get('auth_url');
    const returnOrigin = searchParams.get('return_origin');

    console.log('=== JobAdder Proxy Page ===');
    console.log('Auth URL:', authUrl);
    console.log('Return Origin:', returnOrigin);

    if (authUrl) {
      console.log('🔄 Redirecting to JobAdder OAuth...');
      // Redirect to JobAdder OAuth URL
      window.location.href = authUrl;
    } else {
      console.error('❌ No auth URL provided to proxy');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Redirecting to JobAdder...</p>
      </div>
    </div>
  );
};

export default JobAdderProxy;