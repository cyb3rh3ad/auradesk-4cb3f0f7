import { useState, useEffect } from 'react';
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
  ChevronRight, 
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    title: "Welcome to AuraDesk!",
    description: "Your intelligent workspace for seamless collaboration. Let's get you set up in just a few steps.",
    icon: Sparkles,
    color: "from-primary to-purple-500"
  },
  {
    title: "Set Your Profile",
    description: "Add a username so your teammates can find and connect with you.",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
    hasInput: true
  },
  {
    title: "You're All Set!",
    description: "Here's what you can do with AuraDesk:",
    icon: CheckCircle2,
    color: "from-green-500 to-emerald-500",
    features: [
      { icon: MessageSquare, text: "Chat with friends and teams in real-time" },
      { icon: Video, text: "Schedule and join video meetings" },
      { icon: Brain, text: "Get help from Aura, your AI assistant" },
      { icon: FileText, text: "Store and share files securely" },
    ]
  }
];

export const OnboardingDialog = ({ open, onOpenChange }: OnboardingDialogProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate and save username
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
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} blur-2xl opacity-30`} />
                <div className={`relative h-20 w-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
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
              <div className="space-y-3 mb-6">
                {step.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">{feature.text}</span>
                  </motion.div>
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
                {loading ? 'Saving...' : currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};