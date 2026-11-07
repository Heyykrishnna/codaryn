import { z } from "zod";

export const methodSchema = z.enum([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);
export type Method = z.infer<typeof methodSchema>;
export type RequestDraft = {
  name: string;
  method: Method;
  path: string;
  body: string;
};

const openApiSchema = z.object({
  openapi: z.string(),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
});
const postmanUrl = z.union([z.string(), z.object({ raw: z.string() })]);
const postmanRequest = z.object({
  method: z.string(),
  url: postmanUrl,
  body: z.object({ mode: z.string(), raw: z.string().optional() }).optional(),
});
const postmanItem = z.object({
  name: z.string().optional(),
  request: postmanRequest.optional(),
  item: z.array(z.unknown()).optional(),
});
const insomniaSchema = z.object({ resources: z.array(z.unknown()) });
const insomniaRequest = z.object({
  _type: z.literal("request"),
  name: z.string(),
  method: z.string(),
  url: z.string(),
  body: z.object({ text: z.string().optional() }).optional(),
});

function draft(
  name: string,
  rawMethod: string,
  rawPath: string,
  body = "",
): RequestDraft[] {
  const method = methodSchema.safeParse(rawMethod.toUpperCase());
  const path = rawPath.replace(
    /^(?:https?:\/\/[^/]+|\{\{[^}]+\}\})(?=\/)/i,
    "",
  );
  if (
    !method.success ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.length > 2048 ||
    body.length > 65536
  )
    return [];
  return [{ name: name.slice(0, 160), method: method.data, path, body }];
}

export function importRequests(input: unknown): RequestDraft[] {
  const openApi = openApiSchema.safeParse(input);
  if (openApi.success) {
    return Object.entries(openApi.data.paths)
      .flatMap(([path, operations]) =>
        Object.keys(operations).flatMap((method) =>
          draft(`${method.toUpperCase()} ${path}`, method, path),
        ),
      )
      .slice(0, 100);
  }
  const postman = z
    .object({
      info: z.object({ schema: z.string() }),
      item: z.array(z.unknown()),
    })
    .safeParse(input);
  if (postman.success) {
    const result: RequestDraft[] = [];
    function visit(items: unknown[], depth: number) {
      if (depth > 12) return;
      for (const item of items) {
        if (result.length >= 100) return;
        const parsed = postmanItem.safeParse(item);
        if (!parsed.success) continue;
        const { name, request, item: children } = parsed.data;
        if (request)
          result.push(
            ...draft(
              name ?? request.method,
              request.method,
              typeof request.url === "string" ? request.url : request.url.raw,
              request.body?.mode === "raw" ? request.body.raw : undefined,
            ),
          );
        if (children) visit(children, depth + 1);
      }
    }
    visit(postman.data.item, 0);
    return result;
  }
  const insomnia = insomniaSchema.safeParse(input);
  if (insomnia.success) {
    return insomnia.data.resources
      .flatMap((item) => {
        const request = insomniaRequest.safeParse(item);
        return request.success
          ? draft(
              request.data.name,
              request.data.method,
              request.data.url,
              request.data.body?.text,
            )
          : [];
      })
      .slice(0, 100);
  }
  throw new Error("Choose an OpenAPI, Postman, or Insomnia JSON export.");
}

export function requestUrl(
  origin: string,
  path: string,
  allowed: string[],
  appHostname: string,
) {
  if (
    !allowed.includes(origin) ||
    !path.startsWith("/") ||
    /[\\\u0000-\u001f\u007f]/.test(path) ||
    path.includes("#")
  ) {
    throw new Error(
      "Select an allowed origin and enter a relative request path.",
    );
  }
  const url = new URL(path, origin);
  if (
    url.origin !== origin ||
    url.hostname === appHostname ||
    url.username ||
    url.password
  ) {
    throw new Error("The request must stay on the selected test host.");
  }
  return url;
}

export async function readResponse(
  response: Response,
  update: (body: string) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (bytes < 65536) {
      const result = await reader.read();
      if (result.done) return text + decoder.decode();
      const chunk = result.value.subarray(0, 65536 - bytes);
      bytes += chunk.length;
      text += decoder.decode(chunk, { stream: true });
      if (response.headers.get("content-type")?.includes("text/event-stream"))
        update(text);
    }
    return text + "\n[Preview limited to 64 KiB]";
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
