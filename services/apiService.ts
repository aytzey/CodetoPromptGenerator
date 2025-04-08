// File: services/apiService.ts
// NEW FILE
import { useAppStore } from '@/stores/useAppStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

/**
 * Generic fetch wrapper to handle common logic like setting headers,
 * checking response status, parsing JSON, and setting global error state.
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  // Optional function to call on specific error codes BEFORE setting global error
  handleError?: (status: number, errorData: any) => boolean | void
): Promise<T | null> {
  const { setError, clearError } = useAppStore.getState();
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  // Clear previous global error for this new request attempt
  // Consider if this is always desired. Maybe only clear on success?
  // clearError();

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: defaultHeaders,
    });

    // Handle empty response bodies (e.g., 204 No Content)
    if (response.status === 204) {
        return null; // Or return a specific indicator like { success: true } if needed
    }

    const data = await response.json();

    if (!response.ok) {
      // Allow specific error handler to intervene
      const handled = handleError?.(response.status, data);
      if (handled === true) {
        // Error was handled specifically, don't set global error
        return null; // Indicate failure without global popup
      }

      // Default error handling: set global error message
      const errorMessage = data?.error || data?.message || `HTTP error ${response.status}`;
      console.error(`API Error (${endpoint}): ${response.status}`, data);
      setError(`API Error: ${errorMessage}`);
      return null; // Indicate failure
    }

    // If response is ok, potentially clear any existing global error
    // clearError();

    // Check for explicit success=false in the response body
    if (data?.success === false) {
        const errorMessage = data?.error || data?.message || "API returned success=false";
        console.error(`API Logic Error (${endpoint}):`, data);
        setError(`API Error: ${errorMessage}`);
        return null;
    }

    // Return the 'data' field if it exists, otherwise the full response
    // Adapt based on backend's consistent response structure
    return data?.data ?? data;

  } catch (error) {
    console.error(`Network or fetch error (${endpoint}):`, error);
    let message = 'Network error. Please check your connection and the backend server.';
    if (error instanceof Error) {
        message = `Network Error: ${error.message}`;
    }
    setError(message);
    return null; // Indicate failure
  }
}

// Example Usage (within other service hooks):
// const projectData = await fetchApi<{ tree: FileNode[] }>('/api/projects/tree?rootDir=...');
// if (projectData) {
//   useProjectStore.setState({ fileTree: projectData.tree });
// }
