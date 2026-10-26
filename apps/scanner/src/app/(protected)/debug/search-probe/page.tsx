import { PROBE_TARGETS, probe } from "@/lib/search-probe";
import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

// Runs on every request, from wherever the app is deployed: on Vercel, that's the point.
export const dynamic = "force-dynamic";

export default async function SearchProbePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  const results = await Promise.all(PROBE_TARGETS.map((t) => probe(t)));
  const runtime = process.env.VERCEL_REGION ?? "local";

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-(--text)">Store search reachability</h1>
        <p className="text-sm text-(--text-muted)">
          Fetched from <span className="font-mono">{runtime}</span> at {new Date().toISOString()}
        </p>
      </div>
      {results.map((r) => {
        const ok = r.status === 200 && (r.count ?? 0) > 0;
        return (
          <section key={r.label} className="rounded-[18px] bg-(--card) p-4 text-sm">
            <h2 className="font-semibold text-(--text)">
              {r.label}: {ok ? "OK" : "FAILED"}
            </h2>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-(--text-secondary)">
              <dt>Status</dt>
              <dd className="font-mono">
                {r.status ?? "none"} in {r.ms} ms
              </dd>
              <dt>Final URL</dt>
              <dd className="break-all font-mono">{r.finalUrl ?? "none"}</dd>
              <dt>Results</dt>
              <dd className="font-mono">
                {r.count ?? "none"}
                {r.first ? `, first: ${r.first}` : ""}
              </dd>
              {r.error && (
                <>
                  <dt>Error</dt>
                  <dd className="break-all font-mono">{r.error}</dd>
                </>
              )}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
