import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SignatureCanvas } from './SignatureCanvas';
import { Promise as PromiseType } from '@/hooks/usePromises';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, Clock, FileSignature, Shield, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PromiseCardProps {
  promise: PromiseType;
  onSign: (promiseId: string, signatureData: string) => Promise<boolean>;
  onDecline: (promiseId: string) => Promise<boolean>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
  fulfilled: { label: 'Fulfilled', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: Shield },
  broken: { label: 'Broken', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: X },
};

export function PromiseCard({ promise, onSign, onDecline }: PromiseCardProps) {
  const { user } = useAuth();
  const [signOpen, setSignOpen] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signing, setSigning] = useState(false);
  const [viewSigOpen, setViewSigOpen] = useState(false);

  const mySig = promise.signatures.find(s => s.user_id === user?.id);
  const canSign = mySig?.status === 'pending';
  const status = statusConfig[promise.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const signedCount = promise.signatures.filter(s => s.status === 'signed').length;
  const totalCount = promise.signatures.length;

  const handleSign = async () => {
    if (!signatureData) return;
    setSigning(true);
    await onSign(promise.id, signatureData);
    setSigning(false);
    setSignOpen(false);
    setSignatureData('');
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileSignature className="w-5 h-5 text-primary shrink-0" />
                <CardTitle className="text-base truncate">{promise.title}</CardTitle>
              </div>
              <Badge variant="outline" className={cn('shrink-0 gap-1', status.color)}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {promise.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{promise.description}</p>
            )}

            {promise.deadline && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="w-3.5 h-3.5" />
                Deadline: {format(new Date(promise.deadline), 'PPp')}
              </div>
            )}

            {/* Signers */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Signatures ({signedCount}/{totalCount})
              </p>
              <div className="flex flex-wrap gap-2">
                {promise.signatures.map(sig => (
                  <button
                    key={sig.id}
                    onClick={() => sig.signature_data ? setViewSigOpen(true) : undefined}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition-colors',
                      sig.status === 'signed'
                        ? 'bg-green-500/10 border-green-500/20 text-green-600'
                        : sig.status === 'declined'
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-muted border-border text-muted-foreground'
                    )}
                  >
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={sig.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {(sig.profile?.full_name || sig.profile?.username || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {sig.profile?.full_name || sig.profile?.username || 'User'}
                    {sig.status === 'signed' && <Check className="w-3 h-3" />}
                    {sig.status === 'declined' && <X className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            {canSign && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => setSignOpen(true)} className="gap-1.5">
                  <FileSignature className="w-3.5 h-3.5" />
                  Sign
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDecline(promise.id)} className="gap-1.5 text-destructive hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                  Decline
                </Button>
              </div>
            )}

            {/* Created by */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
              <Avatar className="w-4 h-4">
                <AvatarImage src={promise.creator_profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {(promise.creator_profile?.full_name || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              Created by {promise.creator_profile?.full_name || promise.creator_profile?.username || 'User'} · {format(new Date(promise.created_at), 'PP')}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Signature Dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Promise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="font-medium text-sm">{promise.title}</p>
              {promise.description && <p className="text-xs text-muted-foreground mt-1">{promise.description}</p>}
            </div>
            <p className="text-sm text-muted-foreground">Draw your signature below to verify this promise:</p>
            <SignatureCanvas onSignature={setSignatureData} width={380} height={160} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)}>Cancel</Button>
            <Button onClick={handleSign} disabled={!signatureData || signing} className="gap-1.5">
              {signing ? <Clock className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Verify & Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Signatures Dialog */}
      <Dialog open={viewSigOpen} onOpenChange={setViewSigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Signatures for "{promise.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            {promise.signatures.filter(s => s.signature_data).map(sig => (
              <div key={sig.id} className="space-y-2 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={sig.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{(sig.profile?.full_name || '?').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{sig.profile?.full_name || sig.profile?.username}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {sig.signed_at && format(new Date(sig.signed_at), 'PPp')}
                  </span>
                </div>
                <img src={sig.signature_data!} alt="Signature" className="w-full h-24 object-contain rounded bg-muted/30" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
