import Link from "next/link";
import { DestinationBoard } from "@/components/landing/DestinationBoard";
import { BusPlan, TourRoute } from "@/components/landing/Illustrations";
import { Parallax } from "@/components/landing/Parallax";
import { PlayOnView } from "@/components/landing/PlayOnView";
import { IntroSeen } from "@/components/landing/IntroSeen";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { BRAND } from "@/lib/brand";
import { display } from "./fonts";

const [primary] = BRAND.phones;

const whatsapp = (tel: string, text?: string) =>
  `https://wa.me/${tel.replace("+", "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

const SERVICES = [
  {
    title: "Bus tickets",
    body: "Seats on routes all over India.",
    tags: ["AC", "Non-AC"],
    ask: "Hi, I'd like to book a bus ticket.",
    art: <BusPlan mode="pick" label="Seat plan of a bus with seater and sleeper berths, one seat picked" />,
  },
  {
    title: "Private bus hire",
    body: "A whole bus for your group, family trip or event.",
    tags: ["AC", "Non-AC"],
    ask: "Hi, I'd like to hire a private bus.",
    art: <BusPlan mode="fill" label="Seat plan of a bus with every seat filled" />,
  },
  {
    title: "Tour packages",
    body: "Tours for families and groups, with the travel arranged.",
    tags: [] as string[],
    ask: "Hi, I'd like to know about your tour packages.",
    art: <TourRoute label="A tour route with several stops" />,
  },
];

const BOARD =
  "  All India routes * AC * Non AC * Seater * Sleeper * Private bus hire * Tour packages * Open 24 hours *  ";


function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function ContactRows({ tone = "paper" }: { tone?: "paper" | "red" }) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${tone === "red" ? "contacts-on-red" : ""}`}>
      {BRAND.phones.map((p) => (
        <li key={p.tel} className="contact">
          <span className="contact-number">{p.display}</span>
          <a href={`tel:${p.tel}`} aria-label={`Call ${p.display}`} className="icon-btn icon-call">
            <PhoneIcon />
          </a>
          <a
            href={whatsapp(p.tel)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${p.display}`}
            className="icon-btn icon-whatsapp"
          >
            <WhatsAppIcon />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function Landing() {
  return (
    <div className={`landing ${display.variable}`}>
      <IntroSeen />
      <SmoothScroll />

      {/* ── Intro: the wordmark rises, the letterhead rule draws, the panel lifts ── */}
      <div className="intro" aria-hidden>
        <div className="intro-inner">
          <p className="intro-mark">
            <span className="intro-line">
              <span style={{ "--d": "0ms" } as React.CSSProperties}>Chaudhary</span>
            </span>
            <span className="intro-line">
              <span style={{ "--d": "90ms" } as React.CSSProperties}>Travels</span>
            </span>
          </p>
          <div className="intro-rule" />
        </div>
      </div>

      {/* ── Hero: the letterhead ── */}
      <div className="relative overflow-hidden">
        {/* Letterhead corner: the two triangles drift at different depths */}
        <Parallax anchor="hero" distance={200} className="pointer-events-none absolute right-0 top-0 w-[46vw] max-w-[380px]">
          <svg aria-hidden viewBox="0 0 300 330" className="w-full">
            <polygon points="300,24 300,330 92,160" fill="#D1D3D4" />
          </svg>
        </Parallax>
        <Parallax anchor="hero" distance={420} className="pointer-events-none absolute right-0 top-0 w-[46vw] max-w-[380px]">
          <svg aria-hidden viewBox="0 0 300 330" className="w-full">
            <polygon points="128,0 286,0 207,92" fill="#F8C4AD" />
          </svg>
        </Parallax>

        <section className="relative mx-auto flex max-w-[1180px] flex-col justify-center px-5 pb-16 pt-24 sm:px-10 md:min-h-[100svh] md:py-20">
          <Parallax anchor="hero" distance={240} fade className="w-fit max-w-full">
            <h1 className="wordmark">
              Chaudhary
              <br />
              Travels
            </h1>
            <div className="mt-5 h-[2px] w-full bg-[var(--ink)] sm:mt-7" />
            <p className="mt-5 max-w-[34ch] text-[1.1875rem] leading-snug sm:mt-7 sm:text-[1.375rem]">
              Bus tickets across India, private bus hire and tour packages.
            </p>

            <div className="mt-10 sm:mt-12">
              <DestinationBoard
                text={BOARD}
                label="All India routes. AC, non-AC, seater and sleeper buses. Private bus hire. Tour packages. Open 24 hours."
              />
            </div>

            <div className="mt-8">
              <ContactRows />
            </div>
          </Parallax>
        </section>
      </div>

      {/* ── Services ── */}
      <section className="relative z-10 bg-[var(--paper)]">
        <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-10 sm:pb-32">
        <h2 className="section-title">Services</h2>
        <ul className="mt-10 grid gap-5 sm:mt-12 sm:gap-6">
          {SERVICES.map((s) => (
            <li key={s.title} className="service rise">
              <PlayOnView className="service-art">
                <Parallax distance={36}>{s.art}</Parallax>
              </PlayOnView>
              <div className="service-body">
                <h3 className="service-title">{s.title}</h3>
                <p className="mt-3 text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]">{s.body}</p>
                {s.tags.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Bus types">
                    {s.tags.map((t) => (
                      <li key={t} className="tag">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                <a
                  href={whatsapp(primary.tel, s.ask)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ask mt-6"
                >
                  <WhatsAppIcon size={18} />
                  Ask on WhatsApp
                </a>
              </div>
            </li>
          ))}
        </ul>
        </div>
      </section>

      {/* ── Day or night ── */}
      <section className="relative z-10 overflow-hidden bg-[var(--red)] text-white">
        <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-10 sm:py-28">
          <Parallax distance={70}>
            <p className="band-statement">
              Open 24 hours.
              <br />
              All payment methods accepted.
            </p>
          </Parallax>
          <p className="mt-6 max-w-[40ch] text-[1.0625rem] text-white sm:text-[1.1875rem]">
            Call or WhatsApp any time, day or night.
          </p>
          <div className="mt-10">
            <ContactRows tone="red" />
          </div>
        </div>
      </section>

      {/* ── Footer: the letterhead's sign-off ── */}
      <footer className="relative overflow-hidden bg-[var(--ink)] text-white">
        {/* The hero's corner triangles, echoed quietly in the opposite corner */}
        <svg
          aria-hidden
          viewBox="0 0 300 330"
          className="pointer-events-none absolute bottom-0 left-0 w-[38vw] max-w-[300px] rotate-180 opacity-[0.07]"
        >
          <polygon points="300,24 300,330 92,160" fill="#D1D3D4" />
          <polygon points="128,0 286,0 207,92" fill="#F8C4AD" />
        </svg>

        <div className="relative mx-auto max-w-[1180px] px-5 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-16 sm:px-10 sm:pt-20">
          <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr] md:gap-8">
            <Link href="/" className="footer-mark w-fit" aria-label="Chaudhary Travels home">
              Chaudhary
              <br />
              Travels
            </Link>

            <div>
              <p className="text-[0.8125rem] text-white/45">Office</p>
              <address className="mt-2 text-[1rem] not-italic leading-relaxed text-white/85">
                {BRAND.address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <a
                href={BRAND.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link mt-3 inline-block text-[0.9375rem]"
              >
                Get directions
              </a>
            </div>

            <div>
              <p className="text-[0.8125rem] text-white/45">Registered</p>
              <p className="mt-2 text-[1rem] leading-relaxed text-white/85">
                GSTIN <span className="tabular-nums">{BRAND.gstin}</span>
              </p>
            </div>
          </div>

          <div className="mt-14 flex flex-col-reverse gap-3 border-t border-white/12 pt-6 text-[0.875rem] text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {BRAND.name}
            </p>
            <Link href="/login" className="footer-link w-fit">
              Staff sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
