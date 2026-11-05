import Link from "next/link";
import { guideTitle, guideSections } from "@/src/content/guide";
export default function GuidePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Link href="/" className="text-indigo-600 underline dark:text-indigo-400">
        codaryn
      </Link>
      <h1 className="text-3xl font-semibold">{guideTitle}</h1>
      <p>
        This public guide contains no workspace data. Download it for use
        without a network connection.
      </p>
      <a
        href="/guide.txt"
        download="codaryn-guide.txt"
        className="self-start rounded-lg border border-zinc-400 px-4 py-2 focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        Download offline guide
      </a>
      {guideSections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-2 text-xl font-semibold">{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
    </main>
  );
}
