import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Eye, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_id: string | null;
}

export default function SecurityAuditDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { toast } = useToast();
  const { hasRole } = useAuth();

  // Only admins can view security logs
  if (!hasRole('admin')) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Admin access required to view security audit logs</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    fetchSecurityEvents();
  }, [filter]);

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.like('event_type', `%${filter}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setEvents((data as SecurityEvent[]) || []);
    } catch (error) {
      console.error('Failed to fetch security events:', error);
      toast({
        title: "Error",
        description: "Failed to load security audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login')) return <User className="h-4 w-4" />;
    if (eventType.includes('api_key')) return <Shield className="h-4 w-4" />;
    if (eventType.includes('failed')) return <AlertTriangle className="h-4 w-4" />;
    return <Eye className="h-4 w-4" />;
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('failed')) return 'destructive';
    if (eventType.includes('login')) return 'default';
    if (eventType.includes('api_key')) return 'secondary';
    return 'outline';
  };

  const formatEventTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateDetails = (details: any) => {
    const str = JSON.stringify(details);
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security Audit Dashboard</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
              >
                All Events
              </Button>
              <Button 
                variant={filter === 'login' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('login')}
              >
                Logins
              </Button>
              <Button 
                variant={filter === 'api_key' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('api_key')}
              >
                API Keys
              </Button>
              <Button 
                variant={filter === 'failed' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('failed')}
              >
                Failed Attempts
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">No security events found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.event_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={getEventColor(event.event_type) as any}>
                        {event.event_type.replace(/_/g, ' ')}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatEventTime(event.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      {event.ip_address && (
                        <p className="text-muted-foreground">
                          IP: <span className="font-mono">{event.ip_address}</span>
                        </p>
                      )}
                      
                      {event.event_details && (
                        <p className="text-muted-foreground">
                          Details: <span className="font-mono text-xs">
                            {truncateDetails(event.event_details)}
                          </span>
                        </p>
                      )}
                      
                      {event.user_agent && (
                        <p className="text-muted-foreground text-xs truncate">
                          User Agent: {event.user_agent}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}