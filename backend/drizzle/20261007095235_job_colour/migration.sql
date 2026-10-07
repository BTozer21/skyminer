ALTER TABLE "jobs" ADD COLUMN "colour" text;--> statement-breakpoint
UPDATE "jobs" SET "colour" = (ARRAY['red','orange','amber','lime','green','teal','cyan','blue','indigo','violet','fuchsia','pink'])[ordered.position % 12 + 1]
FROM (SELECT "id", row_number() OVER (ORDER BY "startDate", "id") - 1 AS position FROM "jobs") AS ordered
WHERE "jobs"."id" = ordered."id";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "colour" SET NOT NULL;
