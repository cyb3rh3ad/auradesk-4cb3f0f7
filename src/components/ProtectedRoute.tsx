import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, loading, mfaRequired } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If MFA is required but not verified, redirect to auth page
  if (mfaRequired) {
    return <Navigate to="/auth" replace />;
  }

  // Must have both user AND session to access protected routes
  if (!user || !session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
