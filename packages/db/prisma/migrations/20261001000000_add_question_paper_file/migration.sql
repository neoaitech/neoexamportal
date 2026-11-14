ALTER TABLE "question_papers" ADD COLUMN     "file_key" TEXT,
ADD COLUMN     "file_mime" TEXT,
ADD COLUMN     "file_name" TEXT,
ADD COLUMN     "created_by_id" TEXT;
ALTER TABLE "questions" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;
