import { redirect } from "next/navigation";

// Settings became the Account page; old links and bookmarks still land there.
export default function SettingsPage() {
  redirect("/account");
}
