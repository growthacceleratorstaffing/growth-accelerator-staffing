import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, X, Users, Target, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TargetingFacet {
  facetName: string;
  entityTypes: string[];
  availableEntityFinders: string[];
  $URN: string;
}

interface TargetingEntity {
  urn: string;
  name: string;
  facetUrn: string;
}

interface TargetingCriteria {
  include: {
    and: Array<{
      or: Record<string, string[]>;
    }>;
  };
  exclude?: {
    or: Record<string, string[]>;
  };
}

interface LinkedInTargetingBuilderProps {
  onTargetingChange: (criteria: TargetingCriteria) => void;
  initialCriteria?: TargetingCriteria;
  accountId?: string;
}

export const LinkedInTargetingBuilder = ({ 
  onTargetingChange, 
  initialCriteria,
  accountId 
}: LinkedInTargetingBuilderProps) => {
  const { toast } = useToast();
  const [facets, setFacets] = useState<TargetingFacet[]>([]);
  const [entities, setEntities] = useState<Record<string, TargetingEntity[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedFacet, setSelectedFacet] = useState<string>("");
  const [entitySearch, setEntitySearch] = useState<string>("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [savedAudiences, setSavedAudiences] = useState<any[]>([]);
  
  const [targetingCriteria, setTargetingCriteria] = useState<TargetingCriteria>(
    initialCriteria || {
      include: {
        and: []
      }
    }
  );

  // Load targeting facets on component mount
  useEffect(() => {
    loadTargetingFacets();
    if (accountId) {
      loadSavedAudiences();
    }
  }, [accountId]);

  // Update audience count when targeting changes
  useEffect(() => {
    if (targetingCriteria.include.and.length > 0) {
      updateAudienceCount();
    }
    onTargetingChange(targetingCriteria);
  }, [targetingCriteria, onTargetingChange]);

  const loadTargetingFacets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { action: 'getTargetingFacets' }
      });

      if (error) throw error;

      if (data.success) {
        setFacets(data.data);
        console.log('Loaded targeting facets:', data.data);
      } else {
        throw new Error(data.error || 'Failed to load targeting facets');
      }
    } catch (error) {
      console.error('Error loading targeting facets:', error);
      toast({
        title: "Error",
        description: "Failed to load targeting options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTargetingEntities = async (facetUrn: string, query?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'getTargetingEntities',
          facet: facetUrn,
          query: query
        }
      });

      if (error) throw error;

      if (data.success) {
        setEntities(prev => ({
          ...prev,
          [facetUrn]: data.data
        }));
        console.log(`Loaded entities for ${facetUrn}:`, data.data);
      } else {
        throw new Error(data.error || 'Failed to load targeting entities');
      }
    } catch (error) {
      console.error('Error loading targeting entities:', error);
      toast({
        title: "Error",
        description: "Failed to load targeting options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAudiences = async () => {
    if (!accountId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'getSavedAudiences',
          accountId: accountId
        }
      });

      if (error) throw error;

      if (data.success) {
        setSavedAudiences(data.data);
        console.log('Loaded saved audiences:', data.data);
      }
    } catch (error) {
      console.error('Error loading saved audiences:', error);
      // Don't show error toast for this as it's optional feature
    }
  };

  const updateAudienceCount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'getAudienceCounts',
          targetingCriteria: targetingCriteria
        }
      });

      if (error) throw error;

      if (data.success && data.data.length > 0) {
        setAudienceCount(data.data[0].total || 0);
      }
    } catch (error) {
      console.error('Error getting audience count:', error);
      // Don't show error for this as it's informational
    }
  };

  const addTargetingRule = (facetName: string, entityUrn: string, entityName: string, isExclude: boolean = false) => {
    const facetKey = `urn:li:adTargetingFacet:${facetName}`;
    
    if (isExclude) {
      // Add to exclude criteria
      setTargetingCriteria(prev => ({
        ...prev,
        exclude: {
          ...prev.exclude,
          or: {
            ...prev.exclude?.or,
            [facetKey]: [...(prev.exclude?.or?.[facetKey] || []), entityUrn]
          }
        }
      }));
    } else {
      // Add to include criteria
      setTargetingCriteria(prev => {
        const newCriteria = { ...prev };
        
        // Find existing AND group with this facet or create new one
        let targetAndGroup = newCriteria.include.and.find(andGroup => 
          andGroup.or && andGroup.or[facetKey]
        );
        
        if (targetAndGroup) {
          // Add to existing group
          targetAndGroup.or[facetKey] = [...(targetAndGroup.or[facetKey] || []), entityUrn];
        } else {
          // Create new AND group
          newCriteria.include.and.push({
            or: {
              [facetKey]: [entityUrn]
            }
          });
        }
        
        return newCriteria;
      });
    }

    toast({
      title: "Targeting Added",
      description: `${isExclude ? 'Excluded' : 'Included'}: ${entityName}`,
    });
  };

  const removeTargetingRule = (facetKey: string, entityUrn: string, isExclude: boolean = false) => {
    if (isExclude) {
      setTargetingCriteria(prev => ({
        ...prev,
        exclude: {
          ...prev.exclude,
          or: {
            ...prev.exclude?.or,
            [facetKey]: prev.exclude?.or?.[facetKey]?.filter(urn => urn !== entityUrn) || []
          }
        }
      }));
    } else {
      setTargetingCriteria(prev => {
        const newCriteria = { ...prev };
        
        newCriteria.include.and = newCriteria.include.and.map(andGroup => ({
          ...andGroup,
          or: {
            ...andGroup.or,
            [facetKey]: andGroup.or[facetKey]?.filter(urn => urn !== entityUrn) || []
          }
        })).filter(andGroup => 
          Object.values(andGroup.or).some(entities => entities.length > 0)
        );
        
        return newCriteria;
      });
    }
  };

  const getFacetDisplayName = (facetName: string) => {
    const displayNames: Record<string, string> = {
      locations: "Locations",
      industries: "Industries", 
      seniorities: "Seniority Levels",
      jobFunctions: "Job Functions",
      skills: "Skills",
      companies: "Companies",
      schools: "Schools",
      fieldsOfStudy: "Fields of Study",
      degrees: "Degrees",
      interfaceLocales: "Languages",
      ageRanges: "Age Ranges",
      genders: "Gender"
    };
    return displayNames[facetName] || facetName;
  };

  const renderSelectedTargeting = () => {
    const allSelected: Array<{facet: string, entity: string, name: string, isExclude: boolean}> = [];
    
    // Collect included entities
    targetingCriteria.include.and.forEach(andGroup => {
      Object.entries(andGroup.or).forEach(([facetKey, entityUrns]) => {
        const facetName = facetKey.split(':').pop() || '';
        entityUrns.forEach(entityUrn => {
          const entityName = getEntityName(facetKey, entityUrn);
          allSelected.push({
            facet: facetKey,
            entity: entityUrn,
            name: entityName,
            isExclude: false
          });
        });
      });
    });
    
    // Collect excluded entities
    if (targetingCriteria.exclude?.or) {
      Object.entries(targetingCriteria.exclude.or).forEach(([facetKey, entityUrns]) => {
        entityUrns.forEach(entityUrn => {
          const entityName = getEntityName(facetKey, entityUrn);
          allSelected.push({
            facet: facetKey,
            entity: entityUrn,
            name: entityName,
            isExclude: true
          });
        });
      });
    }
    
    return (
      <div className="space-y-2">
        {allSelected.map((item, index) => (
          <Badge 
            key={index} 
            variant={item.isExclude ? "destructive" : "default"}
            className="mr-2 mb-2"
          >
            {item.isExclude ? "Exclude: " : "Include: "}
            {item.name}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-4 w-4 p-0"
              onClick={() => removeTargetingRule(item.facet, item.entity, item.isExclude)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        
        {audienceCount !== null && (
          <div className="flex items-center gap-2 mt-4">
            <Users className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              Estimated Audience: {audienceCount.toLocaleString()} members
            </span>
            {audienceCount < 300 && (
              <Badge variant="destructive" className="text-xs">
                Below minimum (300)
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  const getEntityName = (facetKey: string, entityUrn: string): string => {
    const facetEntities = entities[facetKey] || [];
    const entity = facetEntities.find(e => e.urn === entityUrn);
    return entity?.name || entityUrn.split(':').pop() || entityUrn;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          LinkedIn Audience Targeting
        </CardTitle>
        <CardDescription>
          Define your target audience for LinkedIn advertising campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="builder">Targeting Builder</TabsTrigger>
            <TabsTrigger value="selected">Selected Criteria</TabsTrigger>
            <TabsTrigger value="saved">Saved Audiences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="builder" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="facet-select">Select Targeting Category</Label>
                <Select value={selectedFacet} onValueChange={setSelectedFacet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a targeting category" />
                  </SelectTrigger>
                  <SelectContent>
                    {facets.map((facet) => (
                      <SelectItem key={facet.$URN} value={facet.$URN}>
                        {getFacetDisplayName(facet.facetName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedFacet && (
                <div>
                  <Label htmlFor="entity-search">Search Options</Label>
                  <div className="flex gap-2">
                    <Input
                      id="entity-search"
                      placeholder="Search for targeting options..."
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                    />
                    <Button 
                      onClick={() => loadTargetingEntities(selectedFacet, entitySearch)}
                      disabled={loading}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {selectedFacet && entities[selectedFacet] && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Available Options</h4>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {entities[selectedFacet].map((entity) => (
                    <div key={entity.urn} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{entity.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addTargetingRule(
                            selectedFacet.split(':').pop() || '',
                            entity.urn,
                            entity.name,
                            false
                          )}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Include
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addTargetingRule(
                            selectedFacet.split(':').pop() || '',
                            entity.urn,
                            entity.name,
                            true
                          )}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Exclude
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="selected" className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Selected Targeting Criteria</h4>
              {renderSelectedTargeting()}
            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Saved Audiences</h4>
              {savedAudiences.length > 0 ? (
                <div className="space-y-2">
                  {savedAudiences.map((audience) => (
                    <div key={audience.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{audience.name}</span>
                        <p className="text-sm text-muted-foreground">{audience.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Load saved audience criteria
                          if (audience.targetingCriteria) {
                            setTargetingCriteria(audience.targetingCriteria);
                          }
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No saved audiences found for this account.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};