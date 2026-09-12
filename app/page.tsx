import { redirect } from "next/navigation";

// The app is operated from two URLs: /host (control) and /display (projector).
// The bare root directs users to the public display screen by default.
export default function Home() {
  redirect("/display");
}
