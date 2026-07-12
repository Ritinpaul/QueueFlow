"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCcw, Activity, CheckCircle2, XCircle, Clock, Play } from "lucide-react";
import { fetchApi } from "../../../../lib/api";
import { useParams } from "next/navigation";

type Job = {
  id: string;
  type: string;
  status: "pending" | "scheduled" | "running" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
  attemptCount: number;
};

type QueueDetails = {
  name: string;
};

export default function QueueJobsPage() {
  const params = useParams();
  const queueId = params.queueId as string;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [queueName, setQueueName] = useState<string>("Loading...");
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      
      const jobsRes = await fetchApi(`/queues/${queueId}/jobs`);
      setJobs(jobsRes.data || []);

      // Unfortunately we don't have a GET /queues/:id endpoint that just returns queue info,
      // but we can parse the breadcrumbs or just show the ID if we have to.
      // We will try to fetch the queue from the list of queues for the project, but we don't know the project ID here directly.
      // For now, we will display jobs and a nice title.
      setQueueName("JOB EXPLORER");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (queueId) {
      loadData();
      const interval = setInterval(() => loadData(false), 3000); // Poll every 3s
      return () => clearInterval(interval);
    }
  }, [queueId]);

  const dispatchTestJob = async () => {
    setIsDispatching(true);
    try {
      await fetchApi(`/queues/${queueId}/test-job`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      loadData(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  const stats = {
    pending: jobs.filter(j => j.status === "pending" || j.status === "scheduled").length,
    running: jobs.filter(j => j.status === "running").length,
    completed: jobs.filter(j => j.status === "completed").length,
    failed: jobs.filter(j => j.status === "failed").length,
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-[1.5px] border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-red-600 font-bold">{error}</p>
        <button onClick={() => loadData()} className="mt-4 inline-block font-bold underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-4xl font-black tracking-tighter uppercase">
            {queueName}
          </h1>
          <p className="text-foreground/60 mt-1 font-medium font-mono text-sm">
            QUEUE: {queueId}
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => loadData(true)}
            className="bg-white text-foreground border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 font-bold py-2.5 px-4 transition-all duration-200"
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={dispatchTestJob}
            disabled={isDispatching}
            className="bg-primary text-foreground border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 font-bold py-2.5 px-5 transition-all duration-200 flex items-center gap-2"
          >
            {isDispatching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            DISPATCH TEST JOB
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border-[1.5px] border-foreground p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <span className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-1">Pending</span>
          <span className="text-3xl font-black">{stats.pending}</span>
        </div>
        <div className="bg-white border-[1.5px] border-foreground p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <span className="text-xs font-bold text-blue-600/80 uppercase tracking-widest mb-1">Running</span>
          <span className="text-3xl font-black text-blue-600">{stats.running}</span>
        </div>
        <div className="bg-primary/20 border-[1.5px] border-foreground p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <span className="text-xs font-bold text-green-700/80 uppercase tracking-widest mb-1">Completed</span>
          <span className="text-3xl font-black text-green-700">{stats.completed}</span>
        </div>
        <div className="bg-red-50 border-[1.5px] border-red-600 p-5 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] flex flex-col">
          <span className="text-xs font-bold text-red-600/80 uppercase tracking-widest mb-1">Failed</span>
          <span className="text-3xl font-black text-red-600">{stats.failed}</span>
        </div>
      </div>

      <div className="bg-white border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-foreground bg-background/50">
                <th className="py-4 px-6 font-bold text-sm uppercase tracking-widest">ID / Type</th>
                <th className="py-4 px-6 font-bold text-sm uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 font-bold text-sm uppercase tracking-widest">Created</th>
                <th className="py-4 px-6 font-bold text-sm uppercase tracking-widest">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-foreground/50 font-medium">
                    No jobs found in this queue. Click "Dispatch Test Job" to create one.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-foreground/10 hover:bg-background/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold">{job.type}</div>
                      <div className="font-mono text-xs text-foreground/50 mt-1">{job.id}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 border-[1.5px] text-xs font-bold uppercase tracking-wider ${
                        job.status === "completed" ? "bg-green-100 text-green-800 border-green-800" :
                        job.status === "failed" ? "bg-red-100 text-red-800 border-red-800" :
                        job.status === "running" ? "bg-blue-100 text-blue-800 border-blue-800" :
                        "bg-foreground text-background border-foreground"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold font-mono">
                      {job.attemptCount}
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
