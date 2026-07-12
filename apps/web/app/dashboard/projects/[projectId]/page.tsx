"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Activity, Loader2, ListTree, Layers } from "lucide-react";
import { fetchApi } from "../../../../lib/api";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  name: string;
  description: string | null;
  apiKeyPrefix: string;
  createdAt: string;
};

type Queue = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  concurrencyLimit: number;
  rateLimitPerMinute: number | null;
  createdAt: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueDesc, setNewQueueDesc] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Load projects list and find this one by ID (no single-project endpoint needed)
      const [projectsRes, queuesRes] = await Promise.all([
        fetchApi("/projects"),
        fetchApi(`/queues?projectId=${projectId}`),
      ]);

      const found = projectsRes.data?.find((p: Project) => p.id === projectId);
      setProject(found || null);
      setQueues(queuesRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      await fetchApi("/queues", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          name: newQueueName,
          description: newQueueDesc || undefined,
        }),
      });
      setNewQueueName("");
      setNewQueueDesc("");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
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
        <Link href="/dashboard/projects" className="mt-4 inline-block font-bold underline">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="font-heading text-4xl font-black tracking-tighter uppercase">
            {project?.name ?? "Project"}
          </h1>
          <p className="text-foreground/60 mt-1 font-medium font-mono text-sm">
            {projectId}
          </p>
          {project?.description && (
            <p className="text-foreground/70 mt-2 font-medium">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-foreground border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 font-bold py-2.5 px-5 transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Queue
        </button>
      </div>

      {/* Queue list */}
      {queues.length === 0 ? (
        <div className="bg-white border-[1.5px] border-foreground p-12 text-center flex flex-col items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <ListTree className="w-12 h-12 text-foreground mb-4" />
          <h3 className="font-heading text-2xl font-black mb-2 uppercase">No queues yet</h3>
          <p className="text-foreground/70 max-w-sm mb-8 font-medium">
            Create your first queue to start submitting background jobs to this project.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-foreground text-background border-[1.5px] border-foreground font-bold py-2.5 px-6 hover:bg-foreground/90 transition-all"
          >
            Create Queue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {queues.map((queue) => (
            <div
              key={queue.id}
              className="bg-white border-[1.5px] border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Link href={`/dashboard/queues/${queue.id}`} className="hover:underline">
                    <h3 className="font-heading text-xl font-black uppercase tracking-tight">
                      {queue.name}
                    </h3>
                  </Link>
                  {queue.description && (
                    <p className="text-foreground/60 text-sm font-medium mt-1">{queue.description}</p>
                  )}
                </div>
                <div
                  className={`px-2 py-1 border-[1.5px] border-foreground text-xs font-bold uppercase tracking-wider ${
                    queue.status === "active"
                      ? "bg-primary text-foreground"
                      : "bg-foreground text-background"
                  }`}
                >
                  {queue.status}
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-3">
                <div className="bg-background border-[1.5px] border-foreground p-3">
                  <div className="text-xs font-bold text-foreground/60 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Concurrency
                  </div>
                  <div className="text-2xl font-black">{queue.concurrencyLimit}</div>
                </div>
                <div className="bg-background border-[1.5px] border-foreground p-3">
                  <div className="text-xs font-bold text-foreground/60 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Rate Limit
                  </div>
                  <div className="text-2xl font-black">
                    {queue.rateLimitPerMinute ?? "∞"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Queue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-white border-[1.5px] border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <h2 className="font-heading text-3xl font-black uppercase tracking-tighter mb-2">
                Create Queue
              </h2>
              <p className="text-foreground/70 text-sm mb-8 font-medium">
                Add a new processing queue to <strong className="text-foreground">{project?.name}</strong>.
              </p>

              {createError && (
                <div className="mb-6 p-3 bg-red-50 border-[1.5px] border-red-500 text-red-600 text-sm font-bold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateQueue} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-foreground block mb-2 uppercase tracking-widest">
                    Queue Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newQueueName}
                    onChange={(e) => setNewQueueName(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-foreground focus:ring-2 focus:ring-primary focus:border-foreground outline-none transition-all placeholder:text-foreground/40 font-bold"
                    placeholder="e.g. email-sender"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-foreground block mb-2 uppercase tracking-widest">
                    Description <span className="font-normal text-foreground/50">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newQueueDesc}
                    onChange={(e) => setNewQueueDesc(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-foreground focus:ring-2 focus:ring-primary focus:border-foreground outline-none transition-all placeholder:text-foreground/40 font-medium"
                    placeholder="What does this queue process?"
                  />
                </div>

                <div className="flex items-center justify-end gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setCreateError(null); }}
                    className="px-5 py-2.5 font-bold text-foreground hover:bg-background border-[1.5px] border-transparent hover:border-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-primary text-foreground border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 font-bold py-2.5 px-6 transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Queue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
