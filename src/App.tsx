import { Route, Switch, Router } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatProvider } from "@/contexts/ChatContext";
import Home from "@/pages/Home";
import PromptLibrary from "@/pages/PromptLibrary";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <ChatProvider>
          <Toaster />
          <Router base={(import.meta as any).env?.BASE_URL || "/"}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/prompts" component={PromptLibrary} />
              <Route path="/library" component={PromptLibrary} />
            </Switch>
          </Router>
        </ChatProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
