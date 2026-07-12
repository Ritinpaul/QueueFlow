"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Settings2, Activity, Play, Pause, Loader2, ListTree } from "lucide-react";
import { fetchApi } from "../../../../lib/api";

type Queue = {
  id: string;
  projectId: string;
  name: string;
  concurrencyLimit: number;
  maxRetries: number;
  isPaused: boolean;
};

export default function QueuesPage({ params }: { params: { projectId: string } }) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadQueues();
  }, [params.projectId]);

  const loadQueues = async () => {
    try {
      setIsLoading(true);
      const data = await fetchApi(`/projects/${params.projectId}/queues`);
      setQueues(data.queues || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await fetchApi(`/projects/${params.projectId}/queues`, {
        method: "POST",
        body: JSON.stringify({ name: newQueueName }),
      });
      setNewQueueName("");
      setIsModalOpen(false);
      loadQueues();
    } catch (err: any) {
      alert(err.message);
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
    return <div className="text-destructive font-medium">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Queues</h1>
          <p className="text-muted-foreground mt-1">Manage processing queues for this project.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Queue
        </button>
      </div>

      {queues.length === 0 ? (
        <div className="bg-card/30 border border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center">
          <ListTree className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-heading text-xl font-semibold mb-2">No queues configured</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Create your first queue to start accepting and processing background jobs.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-xl transition-all"
          >
            Create Queue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {queues.map((queue) => (
            <div
              key={queue.id}
              className="bg-card/40 backdrop-blur-sm border border-border/60 hover:border-border rounded-2xl p-6 transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Link
                    href={`/dashboard/queues/${queue.id}`}
                    className="font-heading text-xl font-semibold hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {queue.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      queue.isPaused ? "bg-muted text-muted-foreground" : "bg-green-500/10 text-green-500"
                    }`}>
                      {queue.isPaused ? (
                        <Pause className="w-3 h-3 mr-1" />
                      ) : (
                        <Play className="w-3 h-3 mr-1" />
                      )}
                      {queue.isPaused ? "Paused" : "Active"}
                    </span>
                  </div>
                </div>
                
                <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                  <Settings2 className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                  <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center">
                    <Activity className="w-4 h-4 mr-2" />
                    Concurrency
                  </div>
                  <div className="text-2xl font-semibold">{queue.concurrencyLimit}</div>
                </div>
                <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                  <div className="text-muted-foreground text-sm font-medium mb-1">
                    Max Retries
                  </div>
                  <div className="text-2xl font-semibold">{queue.maxRetries}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Queue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="font-heading text-2xl font-semibold mb-1">Create Queue</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Set up a new processing queue for jobs.
              </p>
              
              <form onSubmit={handleCreateQueue}>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Queue Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newQueueName}
                      onChange={(e) => setNewQueueName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted-foreground"
                      placeholder="e.g. email-sender"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-70"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Queue"}
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
