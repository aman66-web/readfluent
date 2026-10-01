import { LibraryView } from "@/components/library/LibraryView";

export const metadata = { title: "Library · ReadFluent" };

/** Every book, by category. Preview content only until the content pipeline exists (lib/preview/catalog.ts). */
export default function LibraryPage() {
  return <LibraryView />;
}
