import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ApiKeyInfo {
  service_name: string;
  key_label?: string;
  created_at: string;
  updated_at: string;
}

export function useSecureApiKeys() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const storeApiKey = async (serviceName: string, apiKey: string, keyLabel?: string) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('secure-api-key-manager', {
        body: {
          action: 'store',
          service_name: serviceName,
          api_key: apiKey,
          key_label: keyLabel
        }
      });

      if (response.error) {
        throw new Error(`Failed to store API key: ${response.error.message}`);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to store API key securely');
      }

      toast({
        title: "API Key Stored",
        description: `Successfully stored ${serviceName} API key securely.`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Storage Failed",
        description: error instanceof Error ? error.message : 'Failed to store API key',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const retrieveApiKey = async (serviceName: string): Promise<string | null> => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('secure-api-key-manager', {
        body: {
          action: 'retrieve',
          service_name: serviceName
        }
      });

      if (response.error) {
        throw new Error(`Failed to retrieve API key: ${response.error.message}`);
      }

      const result = response.data;
      if (!result.success) {
        return null; // Key not found
      }

      return result.api_key;
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (serviceName: string) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('secure-api-key-manager', {
        body: {
          action: 'delete',
          service_name: serviceName
        }
      });

      if (response.error) {
        throw new Error(`Failed to delete API key: ${response.error.message}`);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete API key');
      }

      toast({
        title: "API Key Deleted",
        description: `Successfully deleted ${serviceName} API key.`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : 'Failed to delete API key',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const listApiKeys = async (): Promise<ApiKeyInfo[]> => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('secure-api-key-manager', {
        body: {
          action: 'list'
        }
      });

      if (response.error) {
        throw new Error(`Failed to list API keys: ${response.error.message}`);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to list API keys');
      }

      return result.api_keys || [];
    } catch (error) {
      console.error('Failed to list API keys:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const testApiKey = async (serviceName: string) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('secure-api-key-manager', {
        body: {
          action: 'test',
          service_name: serviceName
        }
      });

      if (response.error) {
        throw new Error(`Failed to test API key: ${response.error.message}`);
      }

      const result = response.data;
      
      if (result.success) {
        toast({
          title: "API Key Valid",
          description: `${serviceName} API key is working correctly.`,
        });
      } else {
        toast({
          title: "API Key Invalid",
          description: result.message || `${serviceName} API key test failed.`,
          variant: "destructive",
        });
      }

      return result.success;
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Failed to test API key',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const makeSecureApiCall = async (
    serviceName: string, 
    endpoint: string, 
    method: string = 'GET', 
    body?: any, 
    headers?: Record<string, string>
  ) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('secure-crm-proxy', {
        body: {
          service_name: serviceName,
          endpoint,
          method,
          body,
          headers
        }
      });

      if (response.error) {
        throw new Error(`API call failed: ${response.error.message}`);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'API call failed');
      }

      return result.data;
    } catch (error) {
      console.error('Secure API call failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    storeApiKey,
    retrieveApiKey,
    deleteApiKey,
    listApiKeys,
    testApiKey,
    makeSecureApiCall
  };
}