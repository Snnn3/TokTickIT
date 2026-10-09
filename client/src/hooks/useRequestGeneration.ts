import { useCallback, useRef } from "react";

export function useRequestGeneration() {
  const generationRef = useRef(0);

  const beginRequest = useCallback(() => {
    const generation = ++generationRef.current;
    return () => generation === generationRef.current;
  }, []);

  const invalidateRequests = useCallback(() => {
    generationRef.current += 1;
  }, []);

  return { beginRequest, invalidateRequests };
}
