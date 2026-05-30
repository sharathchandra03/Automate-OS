import { Logo } from "@/components/layout/Logo";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col gradient-mesh">
      <header className="border-b border-border/50 bg-background/40 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/"><Logo /></Link>
          <p className="text-sm text-muted-foreground">Need help? <a href="mailto:hi@automateos.app" className="text-primary hover:underline">Contact us</a></p>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">{children}</main>
    </div>
  );
}
