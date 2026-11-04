import type { Metadata } from "next";
import { Mail, MapPin, Clock3 } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Reveal } from "@/components/reveal";
import { Kicker } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Write to the PARADELLE atelier — orders, gifting, wholesale and press.",
};

const CHANNELS = [
  { icon: Mail, title: "hello@paradelle.store", text: "Orders, gifting and general notes — answered personally.", href: "mailto:hello@paradelle.store" },
  { icon: Mail, title: "privacy@paradelle.store", text: "Data access, correction or deletion requests.", href: "mailto:privacy@paradelle.store" },
  { icon: MapPin, title: "The Atelier", text: "PARADELLE Atelier, Mumbai, India. Visits by appointment.", href: null },
  { icon: Clock3, title: "Response within 2 days", text: "Monday–Saturday, 10:00–18:00 IST.", href: null },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pt-20">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <Reveal>
          <div>
            <Kicker>Contact</Kicker>
            <h1 className="font-display mt-4 text-4xl leading-[1.08] text-espresso lg:text-5xl">
              We answer <span className="text-gilt">personally.</span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-espresso/65">
              No ticket queues, no chatbots reading from scripts. Every note reaches the atelier and receives a
              considered reply.
            </p>
            <ul className="mt-10 space-y-6">
              {CHANNELS.map((c) => (
                <li key={c.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream text-bronze ring-1 ring-espresso/10">
                    <c.icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <div>
                    {c.href ? (
                      <a href={c.href} className="font-display text-lg text-espresso underline-offset-4 transition-colors hover:text-bronze hover:underline">
                        {c.title}
                      </a>
                    ) : (
                      <p className="font-display text-lg text-espresso">{c.title}</p>
                    )}
                    <p className="mt-0.5 text-[13px] leading-relaxed text-espresso/55">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={140}>
          <div className="rounded-[2rem] border hairline-gold bg-ivory p-6 shadow-[0_30px_60px_-40px_rgba(41,24,19,0.3)] sm:p-9">
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
