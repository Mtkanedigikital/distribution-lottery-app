// ============================================================================
// File: frontend/src/index.js
// Version: v0.1_002 (2025-08-24)
// ============================================================================
// Specifications:
// - Mount <App /> with BrowserRouter
// - Wrap with React.StrictMode and ErrorBoundary
// ============================================================================
// History (recent only):
// - 2025-08-24: Header unified to official format; add StrictMode and ErrorBoundary
// ============================================================================

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import ErrorBoundary from "./ui/ErrorBoundary";

const el = document.getElementById("root");
const root = createRoot(el);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
