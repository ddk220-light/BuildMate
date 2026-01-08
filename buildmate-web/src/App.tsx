/**
 * BuildMate Application
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout, ErrorBoundary } from "./components/layout";
import { HomePage, BuildPage, CompletePage, NotFoundPage } from "./pages";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/build/:id" element={<BuildPage />} />
            <Route path="/build/:id/complete" element={<CompletePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
