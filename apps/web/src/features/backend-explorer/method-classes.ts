export function httpMethodClassName(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
    case "POST":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
    case "PUT":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
    case "PATCH":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
    case "DELETE":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
    default:
      return "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800";
  }
}
