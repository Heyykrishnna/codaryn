"use client";
import PageError from "./error";
export default function GlobalError(
  props: Readonly<{ error: unknown; retry: () => void }>,
) {
  return (
    <html lang="en">
      <body>
        <PageError {...props} />
      </body>
    </html>
  );
}
