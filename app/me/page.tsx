import { ProfileView } from "@/components/me/ProfileView";

export const metadata = { title: "Profile · ReadFluent" };

/** The reader's profile: their name, how they are learning, their account, and the way to delete it. */
export default function MePage() {
  return <ProfileView />;
}
