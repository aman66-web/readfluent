import "../welcome/welcome.css";
import { Placement } from "@/components/placement/Placement";

export const metadata = { title: "Placement test · ReadFluent" };

/** The five-minute test that finds a reader's level (opened from the first run's level step). */
export default function PlacementPage() {
  return <Placement />;
}
