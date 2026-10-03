CREATE TABLE "qit_questions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "qit_questions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"survey_name" text NOT NULL,
	"survey_abbrev" text NOT NULL,
	"year" text NOT NULL,
	"e_cigarettes" boolean NOT NULL,
	"question" text NOT NULL,
	"response" text
);
