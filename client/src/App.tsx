import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Goals from "@/pages/Goals";
import Calendar from "@/pages/Calendar";
import Analytics from "@/pages/Analytics";
import Budget from "@/pages/Budget";
import Settings from "@/pages/Settings";
import OnboardingWizard from "@/pages/OnboardingWizard";
import { Skeleton } from "@/components/ui/skeleton";

function AuthenticatedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-96" />
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Show onboarding for new users
  if (!user?.onboardingCompleted) {
    return <OnboardingWizard />;
  }
  
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <AuthenticatedRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <AuthenticatedRoute component={Dashboard} />} />
      <Route path="/expenses" component={() => <AuthenticatedRoute component={Expenses} />} />
      <Route path="/goals" component={() => <AuthenticatedRoute component={Goals} />} />
      <Route path="/calendar" component={() => <AuthenticatedRoute component={Calendar} />} />
      <Route path="/analytics" component={() => <AuthenticatedRoute component={Analytics} />} />
      <Route path="/budget" component={() => <AuthenticatedRoute component={Budget} />} />
      <Route path="/ai-assistant" component={() => <AuthenticatedRoute component={Dashboard} />} />
      <Route path="/settings" component={() => <AuthenticatedRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
