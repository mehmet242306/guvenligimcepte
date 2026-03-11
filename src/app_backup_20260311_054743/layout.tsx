import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "guvenligimcepte",
  description: "AI Destekli ISG Risk Analizi ve Operasyon Platformu",
};

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={sidebarLinkStyle}>
      {label}
    </Link>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body style={bodyStyle}>
        <div style={appShellStyle}>
          <header style={headerStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={brandStyle}>guvenligimcepte</div>
              <div style={taglineStyle}>AI Destekli ISG Risk Analizi ve Operasyon Platformu</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Link href="/login" style={topNavLinkStyle}>Login</Link>
              <Link href="/dashboard" style={topNavLinkStyle}>Dashboard</Link>

              <div style={userChipStyle}>
                <div style={avatarStyle}>MY</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Mehmet Yildirim</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>ISG Uzmani</div>
                </div>
              </div>
            </div>
          </header>

          <div style={contentWrapStyle}>
            <aside style={asideStyle}>
              <div style={sectionTitleStyle}>Menu</div>

              <div style={{ marginBottom: 18 }}>
                <SidebarLink href="/document-generator" label="AI ile Dokuman Hazirla" />
              </div>

              <div style={sectionLabelStyle}>OPERASYON</div>
              <div style={linksGroupStyle}>
                <SidebarLink href="/dashboard" label="Operasyon Merkezi" />
                <SidebarLink href="/calendar" label="Takvim ve Hatirlatmalar" />
                <SidebarLink href="/notifications" label="Bildirim Merkezi" />
                <SidebarLink href="/workflow" label="Gorev Zinciri" />
              </div>

              <div style={sectionLabelStyle}>KURUM VE SAHA</div>
              <div style={linksGroupStyle}>
                <SidebarLink href="/companies" label="Firmalar / Kurumlar" />
                <SidebarLink href="/field-inspection" label="Saha Denetimi" />
                <SidebarLink href="/findings" label="Tespit ve Oneri" />
              </div>

              <div style={sectionLabelStyle}>RISK VE METODOLOJI</div>
              <div style={linksGroupStyle}>
                <SidebarLink href="/risk-analysis" label="Risk Analizi" />
                <SidebarLink href="/visual-risk" label="Gorsel Risk Tespiti" />
                <SidebarLink href="/legislation-assistant" label="Mevzuat Asistani" />
                <SidebarLink href="/hazard-library" label="Tehlike Kutuphanesi" />
                <SidebarLink href="/rham" label="RHAM Sistemi" />
                <SidebarLink href="/r-skor-2d" label="R-SKOR 2D" />
              </div>

              <div style={sectionLabelStyle}>SISTEM</div>
              <div style={linksGroupStyle}>
                <SidebarLink href="/profile" label="Profil ve Hesap" />
                <SidebarLink href="/settings" label="Ayarlar" />
              </div>

              <div style={footerNoteStyle}>
                Cekirdek akis: ziyaret - tespit - skor - dokuman - aksiyon - takip - rapor - revizyon
              </div>
            </aside>

            <main style={mainStyle}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

const bodyStyle: CSSProperties = {
  margin: 0,
  background: "#f7f7f8",
  color: "#111827",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const appShellStyle: CSSProperties = {
  minHeight: "100vh",
};

const headerStyle: CSSProperties = {
  height: 72,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  background: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const brandStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

const taglineStyle: CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
};

const topNavLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#111827",
  fontWeight: 700,
};

const userChipStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "6px 12px",
};

const avatarStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "#f3f4f6",
  fontWeight: 800,
  fontSize: 13,
};

const contentWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "250px 1fr",
  minHeight: "calc(100vh - 72px)",
};

const asideStyle: CSSProperties = {
  background: "#ffffff",
  borderRight: "1px solid #e5e7eb",
  padding: 16,
  overflowY: "auto",
};

const mainStyle: CSSProperties = {
  padding: 24,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 14,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "#6b7280",
  marginTop: 18,
  marginBottom: 8,
};

const linksGroupStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const sidebarLinkStyle: CSSProperties = {
  display: "block",
  textDecoration: "none",
  color: "#111827",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "12px 14px",
  fontWeight: 700,
};

const footerNoteStyle: CSSProperties = {
  marginTop: 18,
  paddingTop: 12,
  borderTop: "1px solid #e5e7eb",
  fontSize: 12,
  color: "#6b7280",
  lineHeight: 1.6,
};