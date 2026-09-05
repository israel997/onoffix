import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ConfirmProvider } from "@/lib/confirm-context";
import { ToastProvider } from "@/lib/toast-context";
import "./globals.css";
// Chargé ici (racine, toujours monté) plutôt que dans chaque page marketing/doc qui
// l'importe déjà : sinon, sur mobile, une navigation côté client vers une de ces pages
// peut peindre avant que son chunk CSS dédié n'ait fini de charger (flash ~1s de mise
// en page non stylée). Une fois chargé ici, il est en cache pour toute la session.
// Sans risque pour le reste de l'app : tout le fichier est scopé sous .landing, sauf
// une unique règle globale (scroll-behavior: smooth) inoffensive.
import "./landing.css";

// Même trio que la landing page (landing.css) : titres en Space Grotesk, corps de
// texte en IBM Plex Sans, chiffres/horodatages en IBM Plex Mono.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display-src",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body-src",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-src",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "OOffix",
  description: "Know exactly how your team is progressing on their tasks.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
