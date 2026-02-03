import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatProvider } from "@/contexts/ChatContext";
import Home from "@/pages/Home";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <ChatProvider>
          <Toaster />
          <Home />
        </ChatProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
