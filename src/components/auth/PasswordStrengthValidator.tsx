import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Common weak passwords to block
const COMMON_PASSWORDS = [
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  'qwerty', 'abc123', 'monkey', 'letmein', 'dragon', 'master', 'admin',
  'welcome', 'login', 'passw0rd', 'shadow', 'sunshine', 'princess',
  'iloveyou', 'trustno1', 'football', 'baseball', 'superman', 'batman',
  '1234567', '12345', '1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'
];

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthValidatorProps {
  password: string;
  className?: string;
}

export const validatePassword = (password: string): { isValid: boolean; requirements: PasswordRequirement[] } => {
  const requirements: PasswordRequirement[] = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Contains lowercase letter',
      met: /[a-z]/.test(password)
    },
    {
      label: 'Contains a number',
      met: /[0-9]/.test(password)
    },
    {
      label: 'Contains special character (!@#$%^&*)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    },
    {
      label: 'Not a common password',
      met: password.length === 0 || !COMMON_PASSWORDS.includes(password.toLowerCase())
    }
  ];

  const isValid = requirements.every(req => req.met) && password.length > 0;

  return { isValid, requirements };
};

export const getPasswordStrength = (password: string): { level: 'weak' | 'fair' | 'good' | 'strong'; score: number } => {
  const { requirements } = validatePassword(password);
  const metCount = requirements.filter(r => r.met).length;
  
  if (password.length === 0) return { level: 'weak', score: 0 };
  if (metCount <= 2) return { level: 'weak', score: 25 };
  if (metCount <= 4) return { level: 'fair', score: 50 };
  if (metCount <= 5) return { level: 'good', score: 75 };
  return { level: 'strong', score: 100 };
};

export const PasswordStrengthValidator = ({ password, className }: PasswordStrengthValidatorProps) => {
  const { requirements } = useMemo(() => validatePassword(password), [password]);
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  const strengthColors = {
    weak: 'bg-destructive',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500'
  };

  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong'
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            strength.level === 'weak' && 'text-destructive',
            strength.level === 'fair' && 'text-orange-500',
            strength.level === 'good' && 'text-yellow-500',
            strength.level === 'strong' && 'text-green-500'
          )}>
            {strengthLabels[strength.level]}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn('h-full transition-all duration-300', strengthColors[strength.level])}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1 text-xs">
        {requirements.map((req, index) => (
          <li 
            key={index}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              req.met ? 'text-green-500' : 'text-muted-foreground'
            )}
          >
            {req.met ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
};
