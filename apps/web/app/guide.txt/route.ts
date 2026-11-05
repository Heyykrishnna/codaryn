import { offlineGuide } from "@/src/content/guide";
export function GET() {
  return new Response(offlineGuide, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "content-disposition": "attachment; filename=codaryn-guide.txt",
      "x-content-type-options": "nosniff",
    },
  });
}
