// components/ErrorBoundary.tsx
// Minor change: Using alias path
import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import {
  ErrorBoundary as ReactErrorBoundary,
  type FallbackProps,
} from "react-error-boundary";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * A reusable error boundary using react‑error‑boundary.
 * Keeps the rest of the app alive and offers a quick reload.
 */
interface Props {
  readonly children: ReactNode;
}

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center p-6">
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
  );
}

export default function ErrorBoundary({ children }: Props) {
  return (
    <ReactErrorBoundary fallbackRender={Fallback}>{children}</ReactErrorBoundary>
  );
}
