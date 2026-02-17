import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CourseCatalog from "./pages/CourseCatalog";
import CourseDetail from "./pages/CourseDetail";
import LessonPlayer from "./pages/LessonPlayer";
import QuizPage from "./pages/QuizPage";
import Leaderboard from "./pages/Leaderboard";
import MyBadges from "./pages/MyBadges";
import ChatBot from "./pages/ChatBot";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminCourseEditor from "./pages/admin/AdminCourseEditor";
import AdminQuizBuilder from "./pages/admin/AdminQuizBuilder";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAllocate from "./pages/admin/AdminAllocate";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/courses" component={CourseCatalog} />
      <Route path="/courses/:id" component={CourseDetail} />
      <Route path="/lesson/:id" component={LessonPlayer} />
      <Route path="/quiz/:id" component={QuizPage} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/badges" component={MyBadges} />
      <Route path="/chat" component={ChatBot} />
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/courses/:id" component={AdminCourseEditor} />
      <Route path="/admin/quiz/:id" component={AdminQuizBuilder} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/allocate" component={AdminAllocate} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
