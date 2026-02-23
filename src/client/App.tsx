/**
 * BuildMate Application
 *
 * URL Structure (optimized for conversion tracking):
 * - / - Home page
 * - /build?id={buildId}&step={stepIndex} - Build step flow
 * - /complete?id={buildId} - Build completion page
 * - /s/:code - Shared builds (short code for easy sharing)
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout, ErrorBoundary } from "./components/layout";
import {
  HomePage,
  BuildPage,
  CompletePage,
  SharedBuildPage,
  NotFoundPage,
} from "./pages";
import { BuildsProvider } from "./contexts/BuildsContext";
import { TrackingProvider } from "./contexts/TrackingContext";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TrackingProvider>
          <BuildsProvider>
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/build" element={<BuildPage />} />
                  <Route path="/complete" element={<CompletePage />} />
                  <Route path="/s/:code" element={<SharedBuildPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </BuildsProvider>
        </TrackingProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
