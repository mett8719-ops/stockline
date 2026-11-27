import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import DocumentsPage from "./pages/DocumentsPage.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";

const DocumentDetailPage = lazy(
  () => import("./pages/DocumentDetailPage.jsx"),
);

export default function DocumentsRoute() {
  const { id } = useParams();
  if (id) {
    return (
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl space-y-5">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        }
      >
        <DocumentDetailPage />
      </Suspense>
    );
  }
  return <DocumentsPage />;
}
