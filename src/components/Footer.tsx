import { BookOpen, Quote, Star, Sparkles } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const Footer = () => {
  const { get } = useSiteContent();
  const quote = get("footer_quote");
  const values = get("footer_values");
  const note = get("footer_note");
  const brand = get("brand");

  const valueList = (values.content ?? "")
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);

  return (
    <footer className="relative overflow-hidden bg-hero-gradient text-primary-foreground py-20">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
             style={{ background: "radial-gradient(circle, hsl(var(--v-electric-blue)) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 right-1/5 w-[420px] h-[420px] rounded-full blur-3xl opacity-25"
             style={{ background: "radial-gradient(circle, hsl(var(--v-magenta)) 0%, transparent 70%)" }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Quote */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <Quote className="w-12 h-12 text-gold/50 mx-auto mb-6"
                 style={{ filter: "drop-shadow(0 0 18px hsl(var(--gold) / 0.6))" }} />
          <h3 className="font-display text-3xl md:text-4xl font-bold mb-4 text-gradient-luminous"
              style={{ filter: "drop-shadow(0 0 28px hsl(var(--v-electric-blue) / 0.5))" }}>
            {quote.title}
          </h3>
          <blockquote className="font-display text-lg md:text-xl italic text-primary-foreground/80 leading-relaxed">
            {quote.content}
          </blockquote>
        </div>

        {/* CLAIRE values */}
        {values.visible && valueList.length > 0 && (
          <div className="max-w-4xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary-foreground/60 mb-5">
              <Star className="w-3.5 h-3.5 text-gold" />
              {values.title}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {valueList.map((v) => (
                <span
                  key={v}
                  className="px-4 py-2 rounded-full text-sm font-medium border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-sm transition-shadow hover:shadow-[0_0_25px_-4px_hsl(var(--gold))]"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="w-24 h-px bg-gold/30 mx-auto mb-12" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center"
                 style={{ boxShadow: "0 0 24px -4px hsl(var(--gold) / 0.7)" }}>
              <BookOpen className="w-5 h-5 text-gold" />
            </div>
            <div>
              <span className="font-display font-semibold">{brand.title}</span>
              <p className="text-primary-foreground/60 text-sm">{brand.content}</p>
            </div>
          </div>

          {/* Creator badge */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-md shadow-md text-left">
            <div className="w-8 h-8 rounded-xl bg-gold/25 text-gold flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-gold">Platform Creator</div>
              <div className="text-xs font-semibold text-primary-foreground">
                Created By <strong className="text-gold font-bold">Tonny Odundo</strong>
              </div>
            </div>
          </div>

          <div className="text-primary-foreground/60 text-sm text-center md:text-right">
            <div className="font-medium text-primary-foreground/80">{note.title}</div>
            <div>{note.content}</div>
          </div>
        </div>

        {/* Creator Acknowledgement Sub-bar */}
        <div className="mt-12 pt-6 border-t border-primary-foreground/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-primary-foreground/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold inline-block animate-pulse" />
            <span>Official M-PESA Foundation Academy Reading Challenge Portal</span>
          </div>
          <div className="text-center font-medium text-primary-foreground/90">
            Created By <span className="text-gold font-bold">Tonny Odundo</span>
          </div>
          <div className="text-right text-[11px] text-primary-foreground/60">
            Thinkers. Doers. Leaders.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
