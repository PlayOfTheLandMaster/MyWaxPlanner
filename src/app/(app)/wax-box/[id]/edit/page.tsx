import { Suspense } from "react";
import { BackLink } from "@/components/nav-trail";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth/current-user";
import { loadBoxRow, loadBrands } from "@/lib/wax-box/load";
import { WaxForm } from "../../wax-form";
import { updateWax } from "../../actions";

export const metadata: Metadata = { title: "Edit wax · My Wax Planner" };

export default function EditWaxPage({ params }: PageProps<"/wax-box/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Edit params={params} />
      </Suspense>
    </main>
  );
}

async function Edit({ params }: { params: PageProps<"/wax-box/[id]/edit">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const [row, brands, user] = await Promise.all([loadBoxRow(supabase, id), loadBrands(supabase), currentUser()]);
  if (!row) notFound();
  const p = row.product;

  return (
    <>
      <div>
        <BackLink fallback={`/wax-box/${row.id}`} fallbackLabel={`${p.brand.name} ${p.name}`} />
        <h1 className="text-2xl font-bold">Edit wax</h1>
      </div>
      {p.created_by !== user?.id ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-muted">
          This wax comes from the shared catalogue, so its details can&apos;t be changed. Its amount and notes are
          yours to change on the wax&apos;s page.
        </p>
      ) : (
        <WaxForm
          brands={brands}
          save={updateWax.bind(null, row.id)}
          submitLabel="Save changes"
          initial={{
            brand: p.brand.name,
            name: p.name,
            category: p.category,
            form: p.form,
            published_temp_min_c: p.published_temp_min_c,
            published_temp_max_c: p.published_temp_max_c,
            temp_min_c: p.temp_min_c,
            temp_max_c: p.temp_max_c,
            snow_types: p.snow_types,
            humidity_bands: p.humidity_bands,
            layer_roles: p.layer_roles,
            fluoro_status: p.fluoro_status,
            iron_temp_c: p.iron_temp_c,
            amount_left: row.amount_left,
            notes: row.notes,
          }}
        />
      )}
    </>
  );
}
