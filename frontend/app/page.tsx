 "use client";

import { type FormEvent, useState } from "react";

type Sentiment = "positive" | "negative" | "neutral" | "mixed" | "uncertain";

type Evidence = {
  source_type: string;
  is_product_relevant?: boolean;
  aspect: string;
  sentiment: string;
  claim: string;
  evidence_excerpt: string;
  confidence: number;
  source_title?: string;
  source_url?: string;
};

type Source = {
  title: string;
  url: string;
  content: string;
  score: number | null;
  evidence?: Evidence[];
  analysis_error?: string | null;
};

type AspectSummary = {
  aspect: string;
  evidence_count: number;
  independent_source_count: number;
  sentiment_counts: Record<Sentiment, number>;
  positive_share_percent: number | null;
  negative_share_percent: number | null;
  evidence: Evidence[];
};

type Consensus = {
  unique_evidence_count: number;
  duplicate_evidence_count: number;
  aspect_count: number;
  overall_sentiment_counts: Record<Sentiment, number>;
  aspect_summaries: AspectSummary[];
  evidence: Evidence[];
};

type ResearchResponse = {
  product_name: string;
  source_count: number;
  sources: Source[];
  evidence_count?: number;
  evidence?: Evidence[];
  all_evidence?: Evidence[];
  consensus?: Consensus;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SENTIMENTS: Sentiment[] = [
  "positive",
  "negative",
  "neutral",
  "mixed",
  "uncertain",
];

function getSafeSourceUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function sentimentClasses(sentiment: string) {
  switch (sentiment.toLowerCase()) {
    case "positive":
      return "bg-emerald-50 text-emerald-800";
    case "negative":
      return "bg-rose-50 text-rose-800";
    case "mixed":
      return "bg-amber-50 text-amber-800";
    case "neutral":
      return "bg-stone-100 text-stone-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function Home() {
  const [product, setProduct] = useState("");
  const [results, setResults] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

async function handleSearch(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  console.log("Search button clicked");

  if (!product.trim()) return;

  setLoading(true);
  setError("");
  setResults(null);

  console.log("Sending request to:", `${API_URL}/api/research`);

  try {
    const response = await fetch(`${API_URL}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_name: product.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Research request failed.");
    }

    setResults(data);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not connect to the research server.",
    );
  } finally {
    setLoading(false);
  }
}

  const consensus = results?.consensus;
  const evidence =
    consensus?.evidence ?? results?.evidence ?? results?.all_evidence ?? [];
  const sentimentCounts = consensus?.overall_sentiment_counts;
  const failedSourceErrors = [
    ...new Set(
      results?.sources
        .map((source) => source.analysis_error)
        .filter((message): message is string => Boolean(message)) ?? [],
    ),
  ];
  const failedSources =
    results?.sources.filter((source) => source.analysis_error).length ?? 0;

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#20231f]">
      <nav className="border-b border-[#e5e5de] bg-[#f7f7f4]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="#" className="flex items-center gap-3" aria-label="Product Consensus home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#263f35] text-sm font-bold text-white">
              PC
            </div>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Product Consensus
            </span>
          </a>
          <span className="hidden text-xs text-[#73776f] sm:block">
            Independent research, gathered in one place
          </span>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#547363]">
              The research before the purchase
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">
              Less scrolling.
              <br />
              <span className="text-[#547363]">A clearer picture.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#656960] sm:text-lg">
              Search a product to bring reviews, community opinions and recurring
              trade-offs together. Every finding links back to its source.
            </p>
          </div>

          <aside className="border-l-2 border-[#d9ded5] pl-5 text-sm leading-6 text-[#656960]">
            <p className="font-semibold text-[#30372f]">How it works</p>
            <p className="mt-2">
              We collect public web results, extract product-related claims and
              group them by topic. Treat the findings as a research aid, not a
              substitute for checking the original reviews.
            </p>
          </aside>
        </div>

        <form
          onSubmit={handleSearch}
          className="mt-10 flex flex-col gap-3 rounded-2xl border border-[#dedfd7] bg-white p-2 shadow-[0_8px_30px_rgba(32,35,31,0.04)] sm:flex-row"
        >
          <label className="sr-only" htmlFor="product-search">
            Product name
          </label>
          <input
            id="product-search"
            value={product}
            onChange={(event) => setProduct(event.target.value)}
            placeholder="Try: Sony WH-1000XM5 headphones"
            minLength={2}
            maxLength={200}
            required
            className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-4 text-[#20231f] outline-none placeholder:text-[#999d94] focus:ring-2 focus:ring-[#9cb5a4]"
          />
          <button
            type="submit"
           /* disabled={loading || !product.trim()}*/
            className="rounded-xl bg-[#263f35] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#345647] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Gathering research…" : "Research product ↗"}
          </button>
        </form>

        {loading && (
          <div role="status" className="mt-8 border-y border-[#e2e3dc] py-7">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#547363] border-t-transparent" />
              <p className="font-medium">Looking across the web</p>
            </div>
            <p className="mt-2 pl-8 text-sm text-[#73776f]">
              Collecting sources and checking what they say about this product.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </div>
        )}

        {results && (
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dedfd7] pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#547363]">
                  Research notes
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {results.product_name}
                </h2>
              </div>
              <div className="text-sm text-[#656960]">
                <span className="font-semibold text-[#20231f]">
                  {results.source_count}
                </span>{" "}
                sources found
              </div>
            </div>

            {failedSources > 0 && (
              <p
                role="status"
                className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              >
                Evidence extraction failed for {failedSources} of{" "}
                {results.source_count} sources. The source links are still
                available. {failedSourceErrors.join(" ")}
              </p>
            )}

            {consensus && (
              <section className="mt-8" aria-labelledby="overview-heading">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#547363]">
                      At a glance
                    </p>
                    <h3 id="overview-heading" className="mt-1 text-xl font-semibold">
                      What the sources are saying
                    </h3>
                  </div>
                  <p className="text-xs text-[#73776f]">
                    Counts reflect extracted claims, not a poll of all buyers.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#dedfd7] bg-white p-5">
                    <p className="text-sm text-[#73776f]">Unique claims</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {consensus.unique_evidence_count}
                    </p>
                    <p className="mt-1 text-xs text-[#73776f]">
                      After exact duplicate removal
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#dedfd7] bg-white p-5">
                    <p className="text-sm text-[#73776f]">Topics covered</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {consensus.aspect_count}
                    </p>
                    <p className="mt-1 text-xs text-[#73776f]">
                      Product aspects identified
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#dedfd7] bg-white p-5">
                    <p className="text-sm text-[#73776f]">Duplicates removed</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {consensus.duplicate_evidence_count}
                    </p>
                    <p className="mt-1 text-xs text-[#73776f]">
                      Exact matching claims
                    </p>
                  </div>
                </div>

                {sentimentCounts && (
                  <div className="mt-4 rounded-2xl border border-[#dedfd7] bg-white p-5">
                    <h4 className="font-semibold">Sentiment in the extracted claims</h4>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {SENTIMENTS.map((sentiment) => (
                        <div key={sentiment} className="rounded-xl bg-[#f7f7f4] p-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${sentimentClasses(sentiment)}`}
                          >
                            {sentiment}
                          </span>
                          <p className="mt-3 text-2xl font-semibold">
                            {sentimentCounts[sentiment] ?? 0}
                          </p>
                          <p className="text-xs text-[#73776f]">claims</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {consensus?.aspect_summaries?.length ? (
              <section className="mt-10" aria-labelledby="aspects-heading">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#547363]">
                    By topic
                  </p>
                  <h3 id="aspects-heading" className="mt-1 text-xl font-semibold">
                    Where opinions land
                  </h3>
                </div>

                <div className="space-y-4">
                  {consensus.aspect_summaries.map((aspect, index) => {
                    const counts = aspect.sentiment_counts ?? ({} as Record<Sentiment, number>);
                    const positive = counts.positive ?? 0;
                    const negative = counts.negative ?? 0;
                    const neutral = counts.neutral ?? 0;
                    const mixed = counts.mixed ?? 0;
                    const uncertain = counts.uncertain ?? 0;
                    const total = positive + negative + neutral + mixed + uncertain;
                    const positiveWidth = total ? (positive / total) * 100 : 0;
                    const negativeWidth = total ? (negative / total) * 100 : 0;
                    const neutralWidth = total ? (neutral / total) * 100 : 0;
                    const mixedWidth = total ? (mixed / total) * 100 : 0;

                    return (
                      <article
                        key={`${aspect.aspect}-${index}`}
                        className="rounded-2xl border border-[#dedfd7] bg-white p-5 sm:p-6"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-semibold">{aspect.aspect}</h4>
                            <p className="mt-1 text-sm text-[#73776f]">
                              {aspect.evidence_count} claims ·{" "}
                              {aspect.independent_source_count} source
                              {aspect.independent_source_count === 1 ? "" : "s"}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold">
                              {aspect.positive_share_percent == null
                                ? "Not enough scored claims"
                                : `${aspect.positive_share_percent}% positive`}
                            </p>
                            {aspect.negative_share_percent != null && (
                              <p className="mt-1 text-xs text-[#73776f]">
                                {aspect.negative_share_percent}% negative
                              </p>
                            )}
                          </div>
                        </div>

                        <div
                          className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#ecece6]"
                          aria-label={`Sentiment distribution for ${aspect.aspect}`}
                        >
                          <div className="bg-emerald-600" style={{ width: `${positiveWidth}%` }} />
                          <div className="bg-rose-500" style={{ width: `${negativeWidth}%` }} />
                          <div className="bg-stone-400" style={{ width: `${neutralWidth}%` }} />
                          <div className="bg-amber-400" style={{ width: `${mixedWidth}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-[#73776f]">
                          Positive {positive} · Negative {negative} · Neutral {neutral} · Mixed {mixed} · Uncertain {uncertain}
                        </p>

                        {aspect.evidence?.length > 0 && (
                          <ul className="mt-5 divide-y divide-[#eeeee8]">
                            {aspect.evidence.slice(0, 3).map((item, itemIndex) => {
                              const sourceUrl = getSafeSourceUrl(item.source_url);
                              return (
                                <li key={`${item.source_url}-${itemIndex}`} className="py-3 first:pt-0 last:pb-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${sentimentClasses(item.sentiment)}`}>
                                      {item.sentiment}
                                    </span>
                                    <span className="text-xs text-[#73776f]">
                                      {formatLabel(item.source_type)}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm leading-6">{item.claim}</p>
                                  {item.evidence_excerpt && (
                                    <blockquote className="mt-2 border-l-2 border-[#d9ded5] pl-3 text-sm italic leading-6 text-[#656960]">
                                      “{item.evidence_excerpt}”
                                    </blockquote>
                                  )}
                                  <p className="mt-2 text-xs">
                                    {sourceUrl ? (
                                      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[#426b56] underline decoration-[#c7d5ca] underline-offset-4 hover:text-[#263f35]">
                                        {item.source_title || "Original source"} ↗
                                      </a>
                                    ) : (
                                      <span className="text-[#73776f]">{item.source_title || "Unknown source"}</span>
                                    )}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="mt-8 rounded-2xl border border-[#dedfd7] bg-white p-6">
                <h3 className="font-semibold">No grouped consensus yet</h3>
                <p className="mt-2 text-sm leading-6 text-[#656960]">
                  {evidence.length
                    ? "Evidence was returned, but the API did not include aspect summaries. Check that main.py returns the consensus object."
                    : "No product-relevant claims were extracted from the available sources."}
                </p>
              </section>
            )}

            <section className="mt-12" aria-labelledby="sources-heading">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#547363]">
                    Read for yourself
                  </p>
                  <h3 id="sources-heading" className="mt-1 text-xl font-semibold">
                    Sources reviewed
                  </h3>
                </div>
                <span className="text-sm text-[#73776f]">
                  {results.sources.length} results
                </span>
              </div>

              {results.sources.length === 0 ? (
                <div className="rounded-xl border border-[#dedfd7] bg-white p-6 text-[#656960]">
                  No sources were found. Try another product name.
                </div>
              ) : (
                <div className="divide-y divide-[#dedfd7] border-y border-[#dedfd7]">
                  {results.sources.map((source, index) => {
                    const sourceUrl = getSafeSourceUrl(source.url);
                    return (
                      <article key={source.url || index} className="py-5">
                        <div className="flex items-start gap-4">
                          <span className="pt-0.5 text-xs tabular-nums text-[#8a8e85]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold leading-6">
                              {source.title || "Untitled source"}
                            </h4>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#656960]">
                              {source.content || "No preview available."}
                            </p>
                            {sourceUrl && (
                              <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-block text-sm font-medium text-[#426b56] underline decoration-[#c7d5ca] underline-offset-4 hover:text-[#263f35]"
                              >
                                Read original source ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <p className="mt-6 max-w-3xl text-xs leading-5 text-[#858980]">
              These summaries reflect claims extracted from available web-search
              previews. Duplicate removal currently catches exact normalized
              matches only. Sentiment counts describe the extracted claims, not
              a representative survey of product owners. Check original sources
              before making a purchase decision.
            </p>
          </section>
        )}

        {!results && !loading && !error && (
          <div className="mt-12 border-t border-[#dedfd7] pt-5 text-sm text-[#73776f]">
            <span className="font-medium text-[#30372f]">Start with a product.</span>{" "}
            Try headphones, a laptop, a phone or another item you’re considering.
          </div>
        )}
      </section>

      <footer className="border-t border-[#e5e5de] px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 text-xs text-[#858980] sm:flex-row">
          <span>Product Consensus</span>
          <span>Research backed by sources, not hype.</span>
        </div>
      </footer>
    </main>
  );
}
