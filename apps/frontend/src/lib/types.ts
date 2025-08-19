// Basic document type for artifacts (simplified)
export interface Document {
  id: string;
  content: string;
  createdAt: Date;
}

// Simplified schema types
export interface Vote {
  id: string;
  type: "up" | "down";
}

// Window size hook placeholder (simplified)
export function useWindowSize() {
  return {
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  };
}

export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  return callback; // Simplified implementation
}
