import { bigint, boolean, pgTable, text } from "drizzle-orm/pg-core";

// CDC Question Inventory on Tobacco: https://data.cdc.gov/resource/vdgb-f9s3
export const qitQuestions = pgTable("qit_questions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  surveyName: text("survey_name").notNull(),
  surveyAbbrev: text("survey_abbrev").notNull(),
  // Text, not integer: the CDC uses values like "2001/2002", "1987 CC" and "1994A".
  year: text("year").notNull(),
  eCigarettes: boolean("e_cigarettes").notNull(),
  question: text("question").notNull(),
  // The CDC data has a couple of rows with no response.
  response: text("response"),
});
