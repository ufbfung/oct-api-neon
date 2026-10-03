// Full refresh of qit_questions from the CDC Question Inventory on Tobacco (SODA API).
// Run with: npm run db:load   (apply migrations first: npm run db:migrate)
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { qitQuestions } from "../db/schema";

const ENDPOINT = "https://data.cdc.gov/resource/vdgb-f9s3.json";
const FETCH_PAGE_SIZE = 50_000;
// 6 columns per row against Postgres' 65,535 bind-parameter limit.
const INSERT_BATCH_SIZE = 5_000;

type SodaRow = {
  surveyname: string;
  surveynameabbrev: string;
  year: string;
  e_cigarettes: string;
  question: string;
  responses?: string; // SODA omits null fields
};

async function soda<T>(params: Record<string, string>): Promise<T> {
  const token = process.env.SOCRATA_APP_TOKEN;
  const res = await fetch(`${ENDPOINT}?${new URLSearchParams(params)}`, {
    headers: token ? { "X-App-Token": token } : undefined,
  });
  if (!res.ok) {
    throw new Error(`CDC API responded with ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchAll(): Promise<SodaRow[]> {
  const rows: SodaRow[] = [];
  for (let offset = 0; ; offset += FETCH_PAGE_SIZE) {
    // Order by the system row id so pages don't overlap or skip rows.
    const page = await soda<SodaRow[]>({
      $order: ":id",
      $limit: String(FETCH_PAGE_SIZE),
      $offset: String(offset),
    });
    rows.push(...page);
    console.log(`Fetched ${rows.length} rows from the CDC`);
    if (page.length < FETCH_PAGE_SIZE) return rows;
  }
}

function toYesNo(value: string): boolean {
  if (value === "Yes") return true;
  if (value === "No") return false;
  throw new Error(`Unexpected e_cigarettes value: ${JSON.stringify(value)}`);
}

async function main() {
  const [{ count }] = await soda<{ count: string }[]>({ $select: "count(*)" });
  const expected = Number(count);
  const source = await fetchAll();
  if (source.length !== expected) {
    throw new Error(`Fetched ${source.length} rows but the CDC reports ${expected}`);
  }

  const values = source.map((r) => ({
    surveyName: r.surveyname,
    surveyAbbrev: r.surveynameabbrev,
    year: r.year,
    eCigarettes: toYesNo(r.e_cigarettes),
    question: r.question,
    response: r.responses ?? null,
  }));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  const db = drizzle({ client: pool });
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`truncate table ${qitQuestions} restart identity`);
      for (let i = 0; i < values.length; i += INSERT_BATCH_SIZE) {
        await tx.insert(qitQuestions).values(values.slice(i, i + INSERT_BATCH_SIZE));
        console.log(`Inserted ${Math.min(i + INSERT_BATCH_SIZE, values.length)} / ${values.length}`);
      }
      // Throwing here rolls the whole load back, leaving the previous data in place.
      const [{ n }] = await tx.execute<{ n: number }>(
        sql`select count(*)::int as n from ${qitQuestions}`,
      ).then((r) => r.rows);
      if (n !== expected) {
        throw new Error(`Table has ${n} rows after load, expected ${expected}`);
      }
    });
    console.log(`Done: qit_questions now holds ${expected} rows.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
