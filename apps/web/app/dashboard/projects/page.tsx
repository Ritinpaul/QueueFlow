"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Copy, Check, Key, FolderArchive, Loader2 } from "lucide-react";
import { fetchApi } from "../../../lib/api";

type Project = {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await fetchApi("/projects");
      setProjects(data.projects || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await fetchApi("/projects", {
        method: "POST",
        body: JSON.stringify({ name: newProjectName }),
      });
      setNewProjectName("");
      setIsModalOpen(false);
      loadProjects();
    } catch (err: any) {
      alert(err.message); // In a real app use toast
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
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
          <h1 className="font-heading text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your workspaces and API keys.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-card/30 border border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center">
          <FolderArchive className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-heading text-xl font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Get started by creating your first project to organize your background job queues.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-xl transition-all"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-card/40 backdrop-blur-sm border border-border/60 hover:border-primary/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.15)] flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="font-heading text-xl font-semibold hover:text-primary transition-colors"
                >
                  {project.name}
                </Link>
                <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  Active
                </div>
              </div>

              <div className="mt-auto pt-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  API Key
                </label>
                <div className="flex items-center justify-between bg-background/50 border border-border rounded-lg px-3 py-2">
                  <div className="flex items-center text-sm font-mono text-muted-foreground truncate mr-3">
                    <Key className="w-4 h-4 mr-2 flex-shrink-0" />
                    ••••••••••••••••
                  </div>
                  <button
                    onClick={() => copyToClipboard(project.apiKey, project.id)}
                    className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy API Key"
                  >
                    {copiedKey === project.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="font-heading text-2xl font-semibold mb-1">Create Project</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Give your new project a name to get started.
              </p>
              
              <form onSubmit={handleCreateProject}>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted-foreground"
                      placeholder="e.g. Production Cluster"
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
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Project"}
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
