import { Suspense } from "react";
import { NewEvaluationWizard } from "@/components/evaluation/NewEvaluationWizard";

export default function NewEvaluationPage() {
  return (
    <Suspense>
      <NewEvaluationWizard />
    </Suspense>
  );
}
