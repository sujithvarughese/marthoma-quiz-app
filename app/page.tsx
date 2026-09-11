import { redirect } from "next/navigation";

// The app is operated from two URLs: /host (control) and /display (projector).
// The bare root just sends the operator to the control screen.
export default function Home() {
  redirect("/host");
}
