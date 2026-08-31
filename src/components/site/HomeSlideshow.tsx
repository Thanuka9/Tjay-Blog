"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CoverMedia } from "@/components/site/CoverMedia";
import { Container } from "@/components/site/layout";
import { formatDate } from "@/lib/site";
import type { PostMeta, Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HomeSlideshow({
  slides,
  topics,
}: {
  slides: PostMeta[];
  topics: Topic[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  if (slides.length === 0) return null;

  const slide = slides[index] ?? slides[0];
  const topic = topics.find((item) => item.slug === slide.topic);

  function go(next: number) {
    setIndex((next + slides.length) % slides.length);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured articles"
      className="border-b border-border"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative">
        <Link
          href={`/articles/${slide.slug}`}
          className="relative block aspect-[16/9] min-h-[19rem] overflow-hidden bg-muted sm:min-h-[24rem] lg:aspect-[2.4/1]"
        >
          {slide.coverImage ? (
            <CoverMedia
              src={slide.coverImage}
              alt=""
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
          <Container className="absolute inset-x-0 bottom-0 pb-8 sm:pb-12">
            {topic ? (
              <p className="text-[11px] font-medium tracking-[0.22em] text-white/80 uppercase">
                {topic.name}
              </p>
            ) : null}
            <h2 className="mt-2 max-w-3xl font-serif text-3xl leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
              {slide.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              {slide.excerpt}
            </p>
            <p className="mt-4 text-xs text-white/70">
              {formatDate(slide.publishedAt)} · {slide.readingTime} min read
            </p>
          </Container>
        </Link>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              className="absolute top-1/2 left-3 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-[0_0_20px_-6px_oklch(0.4_0.08_175/0.7)] hover:bg-black/55 sm:left-5"
              onClick={() => go(index - 1)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              className="absolute top-1/2 right-3 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-[0_0_20px_-6px_oklch(0.4_0.08_175/0.7)] hover:bg-black/55 sm:right-5"
              onClick={() => go(index + 1)}
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute right-5 bottom-5 z-10 flex gap-2 sm:right-8 sm:bottom-8">
              {slides.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show slide ${itemIndex + 1}: ${item.title}`}
                  aria-current={itemIndex === index}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    itemIndex === index ? "w-6 bg-white" : "w-2 bg-white/45 hover:bg-white/70",
                  )}
                  onClick={() => setIndex(itemIndex)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
