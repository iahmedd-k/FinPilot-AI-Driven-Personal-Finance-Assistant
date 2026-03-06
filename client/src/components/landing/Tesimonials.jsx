import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "SARAH M.",
    quote: "FinPilot makes spend tracking so easy and simple. It's so nice to see my net worth and all my finances in one centralized place.",
    gradient: "linear-gradient(135deg, #67e8f9 0%, #0d9488 50%, #0f766e 100%)",
  },
  {
    name: "MIKE K.",
    quote: "All my transactions connect and everything is accurate and up to date. I love being able to ask the AI anything and get personalized advice.",
    gradient: "linear-gradient(135deg, #93c5fd 0%, #6366f1 50%, #4f46e5 100%)",
  },
  {
    name: "EMMA R.",
    quote: "FinPilot is a one-stop shop for everything financial in your life. The AI categorization saves me hours every month.",
    gradient: "linear-gradient(135deg, #67e8f9 0%, #38bdf8 50%, #fb923c 100%)",
  },
];

function StarRating() {
  return (
    <div className="flex justify-center gap-0.5 mb-4" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="text-white/95 text-lg" style={{ textShadow: "0 0 1px rgba(0,0,0,0.2)" }}>★</span>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((i) => (i === 0 ? testimonials.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === testimonials.length - 1 ? 0 : i + 1));

  return (
    <section id="use-cases" className="py-24 px-6 bg-[#0f172a]">
      <div className="max-w-[700px] mx-auto text-center mb-14">
        <h2
          className="text-3xl md:text-4xl text-white/95 tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Read what people say
        </h2>
      </div>

      {/* Cards: show all 3 on desktop, carousel on mobile */}
      <div className="max-w-[1200px] mx-auto">
        <div className="hidden md:grid grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-[28px] p-8 flex flex-col min-h-[280px]"
              style={{
                background: t.gradient,
                boxShadow: "0 24px 48px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.15)",
              }}
            >
              <StarRating />
              <p className="text-white/95 text-[0.95rem] leading-relaxed text-left flex-1 mb-6 font-sans">
                {t.quote}
              </p>
              <p className="text-white/90 text-sm font-semibold tracking-wider text-center uppercase">
                {t.name}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="md:hidden overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="w-full shrink-0 px-2"
              >
                <div
                  className="rounded-[28px] p-8 flex flex-col min-h-[260px]"
                  style={{
                    background: t.gradient,
                    boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
                  }}
                >
                  <StarRating />
                  <p className="text-white/95 text-[0.95rem] leading-relaxed text-left flex-1 mb-6 font-sans">
                    {t.quote}
                  </p>
                  <p className="text-white/90 text-sm font-semibold tracking-wider text-center uppercase">
                    {t.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel arrows (mobile only) */}
        <div className="flex md:hidden justify-center gap-4 mt-8">
          <button
            type="button"
            onClick={prev}
            className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20 bg-black/30 text-white/90 hover:bg-black/50 hover:border-white/30 transition-all"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={next}
            className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20 bg-black/30 text-white/90 hover:bg-black/50 hover:border-white/30 transition-all"
            aria-label="Next testimonial"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>
    </section>
  );
}
