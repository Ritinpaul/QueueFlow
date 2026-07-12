"use client";

import Link from "next/link";
import { ArrowRight, FolderArchive, Settings, Activity } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-12">
        <h1 className="font-heading text-4xl font-black tracking-tighter uppercase">Dashboard</h1>
        <p className="text-foreground/70 mt-1 font-medium">Welcome back to QueueFlow overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-primary text-foreground border-[1.5px] border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <h3 className="font-heading font-black text-xl uppercase">System Status</h3>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-black">All Systems Go</div>
            <div className="text-sm font-bold uppercase tracking-widest mt-1">API + DB + Redis running</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border-[1.5px] border-foreground p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform group">
          <FolderArchive className="w-10 h-10 mb-6" />
          <h3 className="font-heading text-3xl font-black uppercase mb-4">Projects</h3>
          <p className="text-foreground/70 font-medium mb-8">Manage your API keys and job queues grouped by project environments.</p>
          <Link href="/dashboard/projects" className="inline-flex items-center gap-2 font-bold uppercase tracking-widest hover:underline underline-offset-4">
            View Projects <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="bg-white border-[1.5px] border-foreground p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform group">
          <Settings className="w-10 h-10 mb-6" />
          <h3 className="font-heading text-3xl font-black uppercase mb-4">Settings</h3>
          <p className="text-foreground/70 font-medium mb-8">Configure your account details, manage billing, and update security.</p>
          <Link href="/dashboard/settings" className="inline-flex items-center gap-2 font-bold uppercase tracking-widest hover:underline underline-offset-4">
            Manage Profile <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
