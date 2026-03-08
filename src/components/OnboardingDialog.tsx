import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, 
  Users, 
  Brain, 
  FileText, 
  Video, 
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Gamepad2,
  Vote,
  FileSignature,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    title: "Welcome to AuraDesk",
    subtitle: "The anti-corporate workspace",
    description: "Chat, calls, AI, and even a virtual world — built for teams who want something different.",
    icon: Sparkles,
    gradient: "from-[hsl(280,70%,55%)] to-[hsl(180,80%,50%)]",
  },
  {
    title: "Pick a username",
    description: "This is how your teammates will find and message you.",
    icon: Users,
    gradient: "from-[hsl(200,70%,55%)] to-[hsl(180,80%,50%)]",
    hasInput: true,
  },
  {
    title: "You're in!",
    description: "Here's what makes AuraDesk different from everything else:",
    icon: CheckCircle2,
    gradient: "from-[hsl(150,70%,45%)] to-[hsl(180,70%,50%)]",
    features: [
      { icon: MessageSquare, text: "Rich chat with voice messages, reactions, and file sharing", action: '/chat' },
      { icon: Users, text: "Discord-style teams with text & voice channels", action: '/teams' },
      { icon: Brain, text: "Built-in AI assistant — no API key needed", action: '/ai' },
      { icon: Video, text: "HD video meetings with AI summaries", action: '/meetings' },
      { icon: Gamepad2, text: "AuraVille — walk around, visit houses, talk to people", action: '/auraville' },
      { icon: Vote, text: "Decision Rooms for team voting", action: '/teams' },
    ],
  },
];

export const OnboardingDialog = ({ open, onOpenChange }: OnboardingDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!username.match(/^[a-zA-Z0-9_]{3,20}$/)) {
        setError('Username must be 3-20 characters (letters, numbers, underscores only)');
        return;
      }
      
      setLoading(true);
      setError('');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user?.id);
      
      if (updateError) {
        if (updateError.message.includes('unique')) {
          setError('This username is already taken');
        } else {
          setError('Failed to save username. Please try again.');
        }
        setLoading(false);
        return;
      }
      
      setLoading(false);
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handleFeatureClick = (action: string) => {
    onOpenChange(false);
    navigate(action);
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/50 bg-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep 
                      ? 'w-8 bg-primary' 
                      : index < currentStep 
                        ? 'w-2 bg-primary/50'
                        : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} blur-2xl opacity-30`} />
                <div className={`relative h-20 w-20 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-1">{step.title}</h2>
              {'subtitle' in step && step.subtitle && (
                <p className="text-sm font-medium text-primary mb-2">{step.subtitle}</p>
              )}
              <p className="text-muted-foreground">{step.description}</p>
            </div>

            {/* Step-specific content */}
            {step.hasInput && (
              <div className="space-y-3 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="johndoe123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={error ? 'border-destructive' : ''}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This is how others will find you
                  </p>
                </div>
              </div>
            )}

            {step.features && (
              <div className="space-y-2 mb-6 max-h-[280px] overflow-y-auto">
                {step.features.map((feature, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    onClick={() => handleFeatureClick(feature.action)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm flex-1">{feature.text}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {currentStep === 1 && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="flex-1"
                >
                  Skip for now
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={loading}
                className={`gap-2 ${currentStep !== 1 ? 'w-full' : 'flex-1'}`}
              >
                {loading ? 'Saving...' : currentStep === steps.length - 1 ? (
                  <>
                    <Zap className="h-4 w-4" /> Let's go!
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
