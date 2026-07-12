import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-foreground">
      {/* ── Navigation ───────────────────────────────── */}
      <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md border-[1.5px] border-foreground rounded-full flex items-center px-6 py-2.5 gap-8 pointer-events-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Link href="/" className="font-heading font-black text-lg tracking-tighter">
            QueueFlow®
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#features" className="hover:underline underline-offset-4">Features</Link>
            <Link href="#architecture" className="hover:underline underline-offset-4">Architecture</Link>
            <Link href="#pricing" className="hover:underline underline-offset-4">Pricing</Link>
            <Link href="#docs" className="hover:underline underline-offset-4">Documentation</Link>
            <Link href="/login" className="hover:underline underline-offset-4">Dashboard</Link>
          </div>
          <Link
            href="/login"
            className="bg-foreground text-background rounded-full px-5 py-2 text-sm font-semibold flex items-center gap-2 hover:bg-foreground/90 transition-colors"
          >
            Start <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 min-h-screen flex items-center">
        {/* Neon Yellow Accent Panel */}
        <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-primary border-r-[1.5px] border-foreground hidden lg:block z-0" />

        <div className="max-w-[1400px] mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 flex flex-col justify-between py-12 lg:min-h-[600px]">
            <p className="text-xl font-medium max-w-[280px] leading-tight">
              From zero to millions of background jobs processed reliably.
            </p>
            
            <div className="mt-12 lg:mt-0">
              <Link href="/login" className="inline-flex items-center gap-2 font-bold hover:underline underline-offset-4">
                Details <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col justify-center lg:pl-12">
            <h1 className="text-[clamp(4rem,10vw,12rem)] font-heading font-black leading-none tracking-tighter uppercase">
              Scale <br />
              Beyond <br />
              <span className="text-foreground/10 relative">
                Limits
                <span className="absolute inset-0 text-foreground mix-blend-overlay">Limits</span>
              </span>
            </h1>
            
            <div className="flex items-end justify-between mt-12 lg:mt-24">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest">Est.</p>
                <p className="text-3xl font-heading font-black">2026</p>
                <p className="text-sm font-mono mt-1">// queueflow®</p>
              </div>
              <div className="text-right text-sm font-medium">
                Distributed Job <br />
                Scheduling Engine
              </div>
            </div>
          </div>
        </div>
        
        {/* Massive Background Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-heading font-black text-foreground/[0.03] pointer-events-none select-none z-0 whitespace-nowrap overflow-hidden">
          queueflow
        </div>
      </section>

      {/* ── Features Section ────────────────── */}
      <section id="features" className="border-t-[1.5px] border-foreground py-24 px-6 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-16">
            <p className="text-sm font-mono uppercase tracking-widest">01 — Features</p>
            <p className="text-sm font-mono text-muted-foreground">Snapshot — v1.0</p>
          </div>

          <h2 className="text-[clamp(3rem,6vw,7rem)] font-heading font-black leading-[0.9] tracking-tighter max-w-4xl mb-20">
            Powered by reliable architecture.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-foreground text-background border-[1.5px] border-foreground p-6 flex flex-col justify-between min-h-[400px]">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase bg-background text-foreground px-2 py-1">Core</span>
                <span className="text-sm font-bold text-primary">Postgres</span>
              </div>
              <div className="mt-auto">
                <div className="text-[12rem] font-heading font-black leading-none -ml-4 mb-4">D</div>
                <h3 className="text-xl font-bold mb-2">Database First</h3>
                <p className="text-sm text-background/70 font-medium">Atomic job claiming via SKIP LOCKED ensures exactly-once processing.</p>
              </div>
            </div>

            {/* Card 2 (Highlight) */}
            <div className="bg-primary text-foreground border-[1.5px] border-foreground p-6 flex flex-col justify-between min-h-[400px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative -top-2 -left-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase bg-foreground text-background px-2 py-1">Speed</span>
                <span className="text-sm font-bold text-foreground">Redis</span>
              </div>
              <div className="mt-auto">
                <div className="text-[12rem] font-heading font-black leading-none -ml-4 mb-4">R</div>
                <h3 className="text-xl font-bold mb-2">BullMQ Engine</h3>
                <p className="text-sm font-medium">Lightning fast job dispatch, rate limiting, and delayed execution.</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-foreground text-background border-[1.5px] border-foreground p-6 flex flex-col justify-between min-h-[400px]">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase bg-background text-foreground px-2 py-1">API</span>
                <span className="text-sm font-bold text-primary">Fastify</span>
              </div>
              <div className="mt-auto">
                <div className="text-[12rem] font-heading font-black leading-none -ml-4 mb-4">F</div>
                <h3 className="text-xl font-bold mb-2">RESTful</h3>
                <p className="text-sm text-background/70 font-medium">Project scoped API keys, JWT auth, and fully typed endpoints.</p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white text-foreground border-[1.5px] border-foreground p-6 flex flex-col justify-between min-h-[400px]">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono uppercase bg-foreground text-background px-2 py-1">UI</span>
                <span className="text-sm font-bold">Next.js</span>
              </div>
              <div className="mt-auto">
                <div className="text-[12rem] font-heading font-black leading-none -ml-4 mb-4">N</div>
                <h3 className="text-xl font-bold mb-2">Dashboard</h3>
                <p className="text-sm text-foreground/70 font-medium">Beautiful interface to monitor queues, workers, and job failures.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="border-t-[1.5px] border-foreground bg-foreground text-background py-12 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-heading font-black text-2xl tracking-tighter">QueueFlow®</div>
          <div className="text-sm font-mono text-background/50 uppercase tracking-widest">
            © {new Date().getFullYear()} — Built for scale.
          </div>
        </div>
      </footer>
    </div>
  );
}
