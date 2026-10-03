import { count, desc } from "drizzle-orm";
import { db } from "@/db";
import { qitQuestions } from "@/db/schema";

// CDC Question Inventory on Tobacco (QIT), loaded into Neon by `npm run db:load`.
// Source: https://dev.socrata.com/foundry/data.cdc.gov/vdgb-f9s3
const PAGE_SIZE = 25;

// This page reads the database rather than calling fetch(), so Next would otherwise
// prerender it once at build time. Revalidate daily instead; the data last changed in 2016.
export const revalidate = 86400;

async function getData() {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(qitQuestions)
      .orderBy(desc(qitQuestions.year), qitQuestions.id)
      .limit(PAGE_SIZE),
    db.select({ total: count() }).from(qitQuestions),
  ]);
  return { rows, total };
}

export default async function Home() {
  let data: Awaited<ReturnType<typeof getData>> | null = null;
  let error: string | null = null;
  try {
    data = await getData();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col gap-8 bg-white px-6 py-16 dark:bg-black sm:px-16 sm:py-24">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Question Inventory on Tobacco
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Historical tobacco-related survey questions compiled by the CDC
            Office on Smoking and Health, via{" "}
            <a
              href="https://dev.socrata.com/foundry/data.cdc.gov/vdgb-f9s3"
              className="font-medium text-zinc-950 underline dark:text-zinc-50"
              target="_blank"
              rel="noopener noreferrer"
            >
              data.cdc.gov
            </a>
            .
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            Couldn&apos;t load data from the database: {error}
          </p>
        )}

        {data && (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing the {data.rows.length} most recent of{" "}
              {data.total.toLocaleString("en-US")} rows.
            </p>
            <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Year</th>
                    <th className="px-4 py-3 font-medium">Survey</th>
                    <th className="px-4 py-3 font-medium">Question</th>
                    <th className="px-4 py-3 font-medium">Response</th>
                    <th className="px-4 py-3 font-medium">E-cig</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[.08] text-zinc-950 dark:divide-white/[.145] dark:text-zinc-50">
                  {data.rows.map((row, i) => (
                    <tr key={i} className="align-top">
                      <td className="px-4 py-3 tabular-nums">{row.year}</td>
                      <td className="px-4 py-3" title={row.surveyName}>
                        {row.surveyAbbrev}
                      </td>
                      <td className="px-4 py-3">{row.question}</td>
                      <td className="px-4 py-3">{row.response ?? "—"}</td>
                      <td className="px-4 py-3">
                        {row.eCigarettes ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
