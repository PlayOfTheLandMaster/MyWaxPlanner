import { redirect } from "next/navigation";

// The rating card now lives on the session page itself. This address is kept
// so links from before (and from a phone's history) still land in the right place.
export default async function RateRedirect({ params }: PageProps<"/history/[id]/rate">) {
  const { id } = await params;
  redirect(`/session/${id}#rate`);
}
