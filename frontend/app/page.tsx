
"use client";

import { type FormEvent, useState } from "react";

type Source = {
  title: string;
  url: string;
  content: string;
  score: number | null;
};

type ResearchResponse = {
  product_name: string;
  source_count: number;
  sources: Source[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [product, setProduct] = useState("");
  const [results, setResults] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!product.trim()) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch(`${API_URL}/api/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: product.trim(),
        }),
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
          : "Could not connect to the research server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-xl font-bold">
            P
          </div>
          <div>
            <h1 className="text-lg font-semibold">Product Consensus</h1>
            <p className="text-xs text-slate-400">
              Research smarter. Buy confidently.
            </p>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20">
        <div className="mb-10 text-center">
          <p className="mb-5 text-sm font-medium text-violet-300">
            AI-POWERED PRODUCT RESEARCH
          </p>

          <h2 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Before you buy,
            <br />
            <span className="text-violet-400">know the consensus.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-400">
            Discover what customers and online communities say about
            products. Find reviews, recurring complaints, and useful
            sources in one place.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl sm:flex-row"
        >
          <input
            value={product}
            onChange={(event) => setProduct(event.target.value)}
            placeholder="e.g. Sony WH-1000XM5 headphones"
            aria-label="Product name"
            minLength={2}
            maxLength={200}
            required
            className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500"
          />

          <button
            type="submit"
            disabled={loading || !product.trim()}
            className="rounded-xl bg-violet-600 px-7 py-4 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Researching..." : "Research product →"}
          </button>
        </form>

        {loading && (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
          >
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            <p className="font-medium">Searching the web...</p>
            <p className="mt-2 text-sm text-slate-400">
              Gathering product discussions and review sources.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {results && (
          <section className="mt-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-violet-300">
                  RESEARCH RESULTS
                </p>
                <h3 className="mt-2 text-2xl font-bold">
                  {results.product_name}
                </h3>
              </div>

              <p className="text-sm text-slate-400">
                {results.source_count} unique sources
              </p>
            </div>

            {results.sources.length === 0 ? (
              <div className="rounded-xl border border-white/10 p-6 text-slate-400">
                No sources were found. Try another product name.
              </div>
            ) : (
              <div className="space-y-4">
                {results.sources.map((source, index) => (
                  <article
                    key={source.url || index}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-violet-400/40"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-sm font-semibold text-violet-300">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold leading-6">
                          {source.title || "Untitled source"}
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {source.content || "No preview available."}
                        </p>

                        {source.url &&
                          (() => {
                            try {
                              const parsed = new URL(source.url);

                              if (
                                !["http:", "https:"].includes(parsed.protocol)
                              ) {
                                return null;
                              }

                              return (
                                <a
                                  href={parsed.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-4 inline-block text-sm font-medium text-violet-300 hover:text-violet-200"
                                >
                                  Read original source ↗
                                </a>
                              );
                            } catch {
                              return null;
                            }
                          })()}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="mt-6 text-xs leading-5 text-slate-500">
              These are web-search results, not yet verified customer
              reviews or a calculated consensus. Sources may include
              general articles, discussions, and product reviews.
            </p>
          </section>
        )}

        {!results && !loading && !error && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Try headphones, laptops, smartphones, or another product.
          </p>
        )}
      </section>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-slate-500">
        Product Consensus AI · Research backed by sources
      </footer>
    </main>
  );
}
