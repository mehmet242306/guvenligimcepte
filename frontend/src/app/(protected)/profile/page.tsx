import Link from "next/link";

export default function ProfilePage() {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>Profil ve Hesap</h1>
        <p style={{ opacity: 0.8, lineHeight: 1.7, maxWidth: 980 }}>
          Bu sayfa Supabase Auth gecisi kapsaminda yeniden duzenleniyor.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 18,
          padding: 18,
          background: "#fff",
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #eee",
            background: "#fafafa",
            lineHeight: 1.7,
          }}
        >
          Profil bilgileri ekrani gecici olarak devre disi. Bu alan mevcut Supabase tabanli
          kimlik dogrulama yapisina uygun sekilde yeniden baglanacak.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fafafa",
              fontWeight: 700,
              textDecoration: "none",
              color: "#111827",
            }}
          >
            Dashboarda Don
          </Link>

          <Link
            href="/login"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fafafa",
              fontWeight: 700,
              textDecoration: "none",
              color: "#111827",
            }}
          >
            Giris Sayfasi
          </Link>
        </div>
      </div>
    </div>
  );
}
