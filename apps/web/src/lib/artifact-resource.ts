import { useEffect, useState } from "react";
import { z } from "zod";
export function useArtifactResource<T>(
  url: string | null,
  schema: z.ZodType<T>,
) {
  const [state, setState] = useState<{
    url: string;
    data: T | null;
    error: string;
  }>({ url: "", data: null, error: "" });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Analysis data unavailable. Check access, wait for extraction or retry.",
          );
        const data = schema.parse(await response.json());
        if (!controller.signal.aborted) setState({ url, data, error: "" });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            url,
            data: null,
            error: "Analysis data unavailable. Check access and retry.",
          });
      });
    return () => controller.abort();
  }, [url, schema]);
  return {
    data: state.url === url ? state.data : null,
    error: state.url === url ? state.error : "",
    loading: !!url && (state.url !== url || (!state.data && !state.error)),
  };
}
