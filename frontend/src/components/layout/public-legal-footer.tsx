import Link from "next/link";

const legalLinks = [
  { href: "/terms-and-conditions", label: "Terms of service" },
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/refund-policy", label: "Refund policy" },
];

export function PublicLegalFooter() {
  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="font-semibold text-foreground">RiskNova</div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="max-w-3xl">
          RiskNova provides subscription-based occupational health and safety
          software for professional users.
        </p>
      </div>
    </footer>
  );
}
