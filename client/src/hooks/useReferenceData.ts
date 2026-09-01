import { useState, useEffect } from "react";
import type { Category, RelatedSystem } from "../types/ticket";

/**
 * Shared hook to load active categories and related systems together.
 */
export function useReferenceData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [catRes, sysRes] = await Promise.all([
          fetch("/api/reference/categories"),
          fetch("/api/reference/systems"),
        ]);

        if (catRes.ok && sysRes.ok) {
          const catData = await catRes.json();
          const sysData = await sysRes.json();
          if (isMounted) {
            setCategories(catData.categories || []);
            setSystems(sysData.systems || []);
          }
        } else {
          if (isMounted) setError("Failed to load reference data.");
        }
      } catch {
        if (isMounted) setError("Network error loading reference data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, systems, loading, error };
}

/**
 * Convenience hook to load active ticket categories for dropdowns and filters.
 */
export function useCategories() {
  const { categories, loading, error } = useReferenceData();
  return { categories, loading, error };
}
