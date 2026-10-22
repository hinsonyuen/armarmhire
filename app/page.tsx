import { redirect } from "next/navigation";

// The standalone homepage has been retired — the Candidates page is now
// the app's landing experience.
export default function RootPage() {
  redirect("/candidates");
}
