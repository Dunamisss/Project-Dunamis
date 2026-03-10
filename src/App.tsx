import { Suspense, lazy } from "react";
import { ChatProvider } from "./contexts/ChatContext";
import { Route, Router, Switch } from "wouter";

const Home = lazy(() => import("./pages/Home"));
const Optimizer = lazy(() => import("./pages/Optimizer"));
const PromptLibrary = lazy(() => import("./pages/PromptLibrary"));
const ImageLibrary = lazy(() => import("./pages/ImageLibrary"));
const Tutorials = lazy(() => import("./pages/Tutorials"));
const AuditJson = lazy(() => import("./pages/AuditJson"));
const PromptBoxes = lazy(() => import("./pages/PromptBoxes"));
const PromptRepair = lazy(() => import("./pages/PromptRepair"));
const Privacy = lazy(() => import("./pages/Privacy"));

function App() {
  return (
    <ChatProvider>
      <Router>
        <Suspense
          fallback={
            <div className="min-h-screen bg-black text-white">
              <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8">
                <div className="rounded-lg border border-yellow-500/30 bg-black/70 px-5 py-4 text-sm text-yellow-100">
                  Loading workspace...
                </div>
              </div>
            </div>
          }
        >
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/optimizer" component={Optimizer} />
            <Route path="/tutorials" component={Tutorials} />
            <Route path="/frameworks" component={Tutorials} />
            <Route path="/audit-json" component={AuditJson} />
            <Route path="/prompt-boxes" component={PromptBoxes} />
            <Route path="/prompt-repair" component={PromptRepair} />
            <Route path="/prompts" component={PromptLibrary} />
            <Route path="/images" component={ImageLibrary} />
            <Route path="/privacy" component={Privacy} />
            <Route component={Home} />
          </Switch>
        </Suspense>
      </Router>
    </ChatProvider>
  );
}

export default App;
