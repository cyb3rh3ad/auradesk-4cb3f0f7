import { useState } from 'react';
import { DecisionRoom } from '@/hooks/useDecisionRooms';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Vote, Lock, Clock, Trash2, CheckCircle2, Users, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast } from 'date-fns';

interface DecisionRoomCardProps {
  room: DecisionRoom;
  onVote: (roomId: string, optionId: string) => void;
  onClose: (roomId: string) => void;
  onDelete: (roomId: string) => void;
}

export function DecisionRoomCard({ room, onVote, onClose, onDelete }: DecisionRoomCardProps) {
  const { user } = useAuth();
  const isCreator = user?.id === room.created_by;
  const isActive = room.status === 'active' && (!room.deadline || !isPast(new Date(room.deadline)));
  const totalVotes = room.total_votes || 0;
  const maxVotes = Math.max(...(room.options?.map(o => o.vote_count || 0) || [0]), 1);

  return (
    <Card className={cn(
      "overflow-hidden transition-all border",
      isActive 
        ? "border-primary/20 shadow-md shadow-primary/5" 
        : "border-border/50 opacity-80"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isActive ? (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  <Vote className="w-3 h-3 mr-1" /> Live
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <Lock className="w-3 h-3 mr-1" /> Closed
                </Badge>
              )}
              {room.is_anonymous && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Anonymous
                </Badge>
              )}
              {room.voting_type === 'multiple' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Multi-vote
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-tight">{room.title}</h3>
            {room.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{room.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </span>
          <span>by {room.creator_name}</span>
          {room.deadline && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isPast(new Date(room.deadline)) ? 'Ended' : `Ends ${format(new Date(room.deadline), 'MMM d, h:mm a')}`}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        <AnimatePresence mode="popLayout">
          {room.options?.map((option) => {
            const percentage = totalVotes > 0 ? Math.round(((option.vote_count || 0) / totalVotes) * 100) : 0;
            const isWinner = !isActive && option.vote_count === maxVotes && (option.vote_count || 0) > 0;

            return (
              <motion.button
                key={option.id}
                layout
                type="button"
                disabled={!isActive}
                onClick={() => isActive && onVote(room.id, option.id)}
                className={cn(
                  "w-full relative rounded-xl overflow-hidden text-left transition-all",
                  "border px-3 py-2.5 min-h-[44px]",
                  isActive && "hover:border-primary/40 active:scale-[0.99] cursor-pointer",
                  option.voted_by_me && "border-primary/50 bg-primary/5",
                  !option.voted_by_me && "border-border/50",
                  isWinner && "border-emerald-500/50 bg-emerald-500/5",
                  !isActive && "cursor-default",
                )}
              >
                {/* Progress bar background */}
                <motion.div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-xl",
                    option.voted_by_me ? "bg-primary/10" : "bg-muted/50",
                    isWinner && "bg-emerald-500/10",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />

                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 border-2"
                      style={{
                        borderColor: option.color || '#6366f1',
                        backgroundColor: option.voted_by_me ? (option.color || '#6366f1') : 'transparent',
                      }}
                    />
                    <span className={cn(
                      "text-sm truncate",
                      option.voted_by_me && "font-medium",
                      isWinner && "font-semibold",
                    )}>
                      {option.label}
                    </span>
                    {isWinner && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-medium tabular-nums">{percentage}%</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">({option.vote_count || 0})</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Actions */}
        {isCreator && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
            {isActive && (
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onClose(room.id)}>
                <Lock className="w-3 h-3 mr-1" /> End Voting
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => onDelete(room.id)}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
