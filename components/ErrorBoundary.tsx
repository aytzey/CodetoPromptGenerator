// components/ErrorBoundary.tsx
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * A reusable error boundary using react‑error‑boundary.
 * Keeps the rest of the app alive and offers a quick reload.
 */
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { ErrorBoundary } = require("react-error-boundary");

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="p-6 flex flex-col items-center">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="break-all">
              {error.message}
            </AlertDescription>
            <Button
              className="mt-3"
              variant="outline"
              onClick={resetErrorBoundary}
            >
              Reload section
            </Button>
          </Alert>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
