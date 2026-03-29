import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Profil ve Hesap | RiskNova",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
