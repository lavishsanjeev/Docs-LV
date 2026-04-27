import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Shield, Upload, Database, CreditCard } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-foreground">
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl font-heading font-semibold tracking-tight">Docs LV</span>
        </div>
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Dashboard
              </Button>
            </Link>
          </Show>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="animate-slide-up max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-2 border-b border-border pb-1 text-sm font-medium text-muted-foreground uppercase tracking-widest">
            <Shield className="h-3 w-3" />
            Secure &middot; Private &middot; Self-hosted
          </div>
          <h1 className="text-4xl font-heading font-semibold leading-tight tracking-tight md:text-5xl lg:text-7xl">
            Your documents,{" "}
            <span className="text-primary italic">your vault.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground md:text-xl font-light">
            Authenticate, pay once, connect your Supabase
            backend, and manage files with absolute confidence.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Show when="signed-out">
              <Link href="/sign-up">
                <Button size="lg" className="bg-primary hover:bg-primary/90 px-8 text-base">
                  Start for ₹1
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  Sign In
                </Button>
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard">
                <Button size="lg" className="bg-primary hover:bg-primary/90 px-8 text-base">
                  Go to Dashboard
                </Button>
              </Link>
            </Show>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-28 grid w-full max-w-4xl gap-8 sm:grid-cols-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {[
            {
              icon: CreditCard,
              title: "One-Time Payment",
              desc: "A singular payment to unlock lifetime access. No recurring subscriptions.",
            },
            {
              icon: Database,
              title: "BYO Supabase",
              desc: "Connect your autonomous backend instance. We store nothing.",
            },
            {
              icon: Upload,
              title: "Universal Storage",
              desc: "Upload complex files securely to your own partitioned storage.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="glass rounded-xl p-8 text-left transition-transform duration-300 hover:-translate-y-1"
            >
              <f.icon className="mb-5 h-8 w-8 text-primary/80 stroke-[1.5]" />
              <h3 className="mb-3 text-lg font-heading font-medium tracking-tight bg-transparent">{f.title}</h3>
              <p className="text-sm font-light leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Docs LV. Built with security-first mindset.
      </footer>
    </div>
  );
}
