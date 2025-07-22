import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  Phone, 
  Calendar, 
  Building,
  Eye,
  Edit,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the stages based on your attachment
const KANBAN_STAGES = [
  { id: 'new', name: 'NEW', color: 'bg-blue-50 border-blue-200' },
  { id: 'interview', name: 'INTERVIEW', color: 'bg-purple-50 border-purple-200' },
  { id: 'client_introduction', name: 'CLIENT INTRODUCTION', color: 'bg-orange-50 border-orange-200' },
  { id: 'hired', name: 'HIRED', color: 'bg-green-50 border-green-200' },
  { id: 'disqualified', name: 'DISQUALIFIED', color: 'bg-red-50 border-red-200' },
];

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  apply_date?: string;
  job?: {
    id: string;
    title: string;
  };
  source?: string;
  stage?: string;
}

interface CandidateKanbanBoardProps {
  candidates: Candidate[];
  onStageChange: (candidateId: string, newStage: string) => void;
  onViewDetails: (candidate: Candidate) => void;
  onUpdateStage: (candidate: Candidate) => void;
}

const CandidateCard: React.FC<{
  candidate: Candidate;
  onViewDetails: (candidate: Candidate) => void;
  onUpdateStage: (candidate: Candidate) => void;
}> = ({ candidate, onViewDetails, onUpdateStage }) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-move mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${candidate.first_name}${candidate.last_name}`} />
            <AvatarFallback className="text-sm">
              {`${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {candidate.first_name} {candidate.last_name}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {candidate.job?.title || 'N/A'}
            </p>
          </div>
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{candidate.email}</span>
          </div>
          {candidate.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.apply_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(candidate.apply_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <Badge variant="outline" className="text-xs">
            {candidate.source || 'Local'}
          </Badge>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(candidate);
              }}
              className="h-7 w-7 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStage(candidate);
              }}
              className="h-7 w-7 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DroppableColumn: React.FC<{
  stage: typeof KANBAN_STAGES[0];
  candidates: Candidate[];
  onViewDetails: (candidate: Candidate) => void;
  onUpdateStage: (candidate: Candidate) => void;
}> = ({ stage, candidates, onViewDetails, onUpdateStage }) => {
  return (
    <div className={`rounded-lg border-2 border-dashed p-4 min-h-[600px] ${stage.color}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-pink-600">{stage.name}</h3>
          <p className="text-xs text-muted-foreground">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      <SortableContext items={candidates.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <div key={candidate.id}>
              <CandidateCard
                candidate={candidate}
                onViewDetails={onViewDetails}
                onUpdateStage={onUpdateStage}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export const CandidateKanbanBoard: React.FC<CandidateKanbanBoardProps> = ({
  candidates,
  onStageChange,
  onViewDetails,
  onUpdateStage,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Map candidates to stages, defaulting to 'new' if no stage is set
  const candidatesByStage = React.useMemo(() => {
    const groups: Record<string, Candidate[]> = {};
    
    KANBAN_STAGES.forEach(stage => {
      groups[stage.id] = [];
    });

    candidates.forEach(candidate => {
      const stage = candidate.stage || 'new';
      if (groups[stage]) {
        groups[stage].push(candidate);
      } else {
        groups['new'].push(candidate);
      }
    });

    return groups;
  }, [candidates]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const candidateId = active.id as string;
    const targetStage = over.id as string;
    
    // Find which stage the target belongs to
    const stageId = KANBAN_STAGES.find(stage => 
      stage.id === targetStage || targetStage.startsWith(stage.id)
    )?.id;

    if (stageId) {
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate && candidate.stage !== stageId) {
        onStageChange(candidateId, stageId);
        
        const stageName = KANBAN_STAGES.find(s => s.id === stageId)?.name;
        toast({
          title: "Stage Updated",
          description: `${candidate.first_name} ${candidate.last_name} moved to ${stageName}`,
        });
      }
    }
    
    setActiveId(null);
  };

  const activeDragCandidate = activeId ? candidates.find(c => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {KANBAN_STAGES.map((stage) => (
          <div key={stage.id} id={stage.id}>
            <DroppableColumn
              stage={stage}
              candidates={candidatesByStage[stage.id] || []}
              onViewDetails={onViewDetails}
              onUpdateStage={onUpdateStage}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeDragCandidate && (
          <div className="opacity-90">
            <CandidateCard
              candidate={activeDragCandidate}
              onViewDetails={onViewDetails}
              onUpdateStage={onUpdateStage}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};