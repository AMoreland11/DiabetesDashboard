import { Switch, Route, Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import GlucoseLog from "@/pages/glucose-log";
import MealPlans from "@/pages/meal-plans";
import DailyNotes from "@/pages/daily-notes";
import Calendar from "@/pages/calendar";
import AccountSettings from "@/pages/account-settings";
import { AuthProvider } from "./lib/auth";
import { useAuth } from "./lib/auth";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return isAuthenticated ? <Component {...rest} /> : <Redirect to="/login" />;
}

function PublicRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return isAuthenticated ? <Redirect to="/dashboard" /> : <Component {...rest} />;
}

function AppRouter() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/login">
          <PublicRoute component={Login} />
        </Route>
        <Route path="/register">
          <PublicRoute component={Register} />
        </Route>
        <Route path="/dashboard">
          <PrivateRoute component={Dashboard} />
        </Route>
        <Route path="/glucose-log">
          <PrivateRoute component={GlucoseLog} />
        </Route>
        <Route path="/meal-plans">
          <PrivateRoute component={MealPlans} />
        </Route>
        <Route path="/daily-notes">
          <PrivateRoute component={DailyNotes} />
        </Route>
        <Route path="/calendar">
          <PrivateRoute component={Calendar} />
        </Route>
        <Route path="/account-settings">
          <PrivateRoute component={AccountSettings} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
