"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCcw, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { fetchApi } from "../../../../lib/api";

type Job = {
  id: string;
  type: string;
  status: "pending" | "scheduled" | "running" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
  attemptCount: number;
};

export default function QueueJobsPage({ params }: { params: { queueId: string } }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      
      const data = await fetchApi(`/queues/${params.queueId}/jobs`);
      setJobs(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(() => loadJobs(false), 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [params.queueId]);

  const stats = {
    pending: jobs.filter(j => j.status === "pending" || j.status === "scheduled").length,
    running: jobs.filter(j => j.status === "running").length,
    completed: jobs.filter(j => j.status === "completed").length,
    failed: jobs.filter(j => j.status === "failed").length,
  };

  const getStatusIcon = (status: Job["status"]) => {
    switch (status) {
      case "pending":
      case "scheduled":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusClass = (status: Job["status"]) => {
    switch (status) {
      case "pending":
      case "scheduled":
        return "bg-muted text-muted-foreground";
      case "running":
        return "bg-primary/10 text-primary border border-primary/20";
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "failed":
        return "bg-destructive/10 text-destructive";
    }
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return <div className="text-destructive font-medium">{error}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center text-sm font-medium">
        <Link href="/dashboard/projects" className="text-muted-foreground hover:text-foreground flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to projects
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Job Monitoring</h1>
          <p className="text-muted-foreground mt-1">Real-time status of recent jobs in this queue.</p>
        </div>
        <button
          onClick={() => loadJobs(true)}
          disabled={isRefreshing}
          className="p-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl transition-all"
        >
          <RefreshCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-2xl p-5">
          <div className="flex items-center text-muted-foreground text-sm font-medium mb-2">
            <Activity className="w-4 h-4 mr-2 text-primary" />
            Running
          </div>
          <div className="text-3xl font-semibold">{stats.running}</div>
        </div>
        <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-2xl p-5">
          <div className="flex items-center text-muted-foreground text-sm font-medium mb-2">
            <Clock className="w-4 h-4 mr-2" />
            Pending / Scheduled
          </div>
          <div className="text-3xl font-semibold">{stats.pending}</div>
        </div>
        <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-2xl p-5">
          <div className="flex items-center text-muted-foreground text-sm font-medium mb-2">
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            Completed
          </div>
          <div className="text-3xl font-semibold">{stats.completed}</div>
        </div>
        <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-2xl p-5">
          <div className="flex items-center text-muted-foreground text-sm font-medium mb-2">
            <XCircle className="w-4 h-4 mr-2 text-destructive" />
            Failed
          </div>
          <div className="text-3xl font-semibold">{stats.failed}</div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Attempts</th>
                <th className="px-6 py-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No jobs found in this queue.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-muted-foreground truncate max-w-[120px]">
                      {job.id}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {job.type}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(job.status)}`}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1.5 capitalize">{job.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {job.attemptCount}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
