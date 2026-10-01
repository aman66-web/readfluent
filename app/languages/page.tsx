import "../welcome/welcome.css";
import { LanguagesView } from "@/components/library/LanguagesView";

export const metadata = { title: "Languages · ReadFluent" };

/** The first run's language choice, again, for changing it later. Progress is untouched by it. */
export default function LanguagesPage() {
  return <LanguagesView />;
}
