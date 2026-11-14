import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchResults } from "./search-results";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-7xl gutter pb-24 pt-10">
      <h1 className="mb-6 font-display text-[clamp(3.5rem,10vw,7rem)] uppercase leading-[0.85]">Search</h1>
      <Suspense fallback={<div className="h-40" />}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
