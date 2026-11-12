import { Quote, Star } from "lucide-react";
import { testimonials } from "../landing.testimonials.js";

export default function LandingTestimonials() {
  return (
    <section
      id="apropos"
      className="scroll-mt-16 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-brand-600">
            Pensé pour les commerçants
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Ils gèrent leur boutique avec Stockline
          </h2>
        </div>

        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.items.map((testimonial) => (
            <li
              key={testimonial.initials}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex gap-0.5 text-amber-400" aria-label="5 étoiles">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      aria-hidden="true"
                      size={15}
                      fill="currentColor"
                    />
                  ))}
                </span>
                <Quote
                  aria-hidden="true"
                  className="text-brand-100"
                  size={25}
                  fill="currentColor"
                />
              </div>
              <blockquote className="mt-5 flex-1 text-sm leading-7 text-slate-600">
                “{testimonial.quote}”
              </blockquote>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-brand-700">
                  {testimonial.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {testimonial.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {testimonial.business} · {testimonial.city}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {testimonials.FICTIF && (
          <p className="mt-5 text-center text-xs text-slate-500">
            Témoignages de démonstration — à remplacer par des avis vérifiés
            avant publication.
          </p>
        )}
      </div>
    </section>
  );
}
