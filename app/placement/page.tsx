import "../welcome/welcome.css";
import { APP_NAME } from "@/lib/brand";
import { displayFull as display, jakarta } from "@/lib/fonts-welcome";
import { Placement } from "@/components/placement/Placement";

export const metadata = { title: `Placement test · ${APP_NAME}` };

/** The five-minute test that finds a reader's level (opened from the first run's level step). */
export default function PlacementPage() {
  return (
    <div className={`${jakarta.variable} ${display.variable} min-h-dvh bg-white`}>
      <Placement />
    </div>
  );
}
