ALTER TABLE "script_pages"
ADD COLUMN "is_reviewed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "script_pages" AS page
SET "is_reviewed" = true
WHERE EXISTS (
  SELECT 1
  FROM "annotations" AS annotation
  WHERE annotation."script_page_id" = page."id"
);
