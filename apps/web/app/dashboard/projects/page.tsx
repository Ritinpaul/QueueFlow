"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Copy, Check, Key, FolderArchive, Loader2 } from "lucide-react";
import { fetchApi } from "../../../lib/api";

type Project = {
  id: string;
  name: string;
  apiKeyPrefix: string;
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
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{name: string, key: string} | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await fetchApi("/projects");
      setProjects(data.data || []);
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
      const response = await fetchApi("/projects", {
        method: "POST",
        body: JSON.stringify({ name: newProjectName }),
      });
      setNewProjectName("");
      setIsModalOpen(false);
      setNewlyCreatedKey({ name: response.data.name, key: response.apiKey });
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
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="font-heading text-4xl font-black tracking-tighter uppercase">Projects</h1>
          <p className="text-foreground/70 mt-1 font-medium">Manage your workspaces and API keys.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-foreground border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 font-bold py-2.5 px-5 transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border-[1.5px] border-foreground p-12 text-center flex flex-col items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <FolderArchive className="w-12 h-12 text-foreground mb-4" />
          <h3 className="font-heading text-2xl font-black mb-2 uppercase">No projects found</h3>
          <p className="text-foreground/70 max-w-sm mb-8 font-medium">
            Get started by creating your first project to organize your background job queues.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-foreground text-background border-[1.5px] border-foreground font-bold py-2.5 px-6 transition-all hover:bg-foreground/90"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-white border-[1.5px] border-foreground p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="font-heading text-2xl font-black uppercase hover:underline decoration-2 underline-offset-4"
                >
                  {project.name}
                </Link>
                <div className="px-3 py-1 bg-primary border-[1.5px] border-foreground text-foreground text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Active
                </div>
              </div>

              <div className="mt-auto pt-6">
                <label className="text-xs font-bold text-foreground/70 uppercase tracking-widest mb-2 block">
                  API Key
                </label>
                <div className="flex items-center justify-between bg-background border-[1.5px] border-foreground px-3 py-2">
                  <div className="flex items-center text-sm font-mono font-bold text-foreground truncate mr-3">
                    <Key className="w-4 h-4 mr-2 flex-shrink-0" />
                    {project.apiKeyPrefix}••••••••••••••••
                  </div>
                  <button
                    onClick={() => copyToClipboard(project.apiKeyPrefix + "...", project.id)}
                    className="p-1.5 hover:bg-foreground hover:text-background border-[1.5px] border-transparent hover:border-foreground transition-colors"
                    title="Copy API Key"
                  >
                    {copiedKey === project.id ? (
                      <Check className="w-4 h-4 text-primary" />
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
          <div className="bg-white border-[1.5px] border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <h2 className="font-heading text-3xl font-black uppercase tracking-tighter mb-2">Create Project</h2>
              <p className="text-foreground/70 text-sm mb-8 font-medium">
                Give your new project a name to get started.
              </p>
              
              <form onSubmit={handleCreateProject}>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-foreground block mb-2 uppercase tracking-widest">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-[1.5px] border-foreground focus:ring-2 focus:ring-primary focus:border-foreground outline-none transition-all placeholder:text-foreground/40 font-bold"
                      placeholder="e.g. PRODUCTION CLUSTER"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 font-bold text-foreground hover:bg-background border-[1.5px] border-transparent hover:border-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-primary text-foreground border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 font-bold py-2.5 px-6 transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New API Key Modal */}
      {newlyCreatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-white border-[1.5px] border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-6 border-[1.5px] border-foreground">
                <Check className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="font-heading text-3xl font-black uppercase tracking-tighter mb-2">Project Created</h2>
              <p className="text-foreground/70 text-sm mb-6 font-medium">
                Here is the API key for <strong className="text-foreground">{newlyCreatedKey.name}</strong>. Please copy it now, as you won't be able to see it again.
              </p>
              
              <div className="bg-background border-[1.5px] border-foreground p-4 mb-8 flex justify-between items-center">
                <code className="font-mono text-sm font-bold">{newlyCreatedKey.key}</code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey.key, 'new-key')}
                  className="bg-primary px-3 py-1.5 border-[1.5px] border-foreground text-xs font-bold uppercase tracking-widest hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
                >
                  {copiedKey === 'new-key' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'new-key' ? "Copied" : "Copy"}
                </button>
              </div>

              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="w-full bg-foreground text-background font-bold py-3 hover:bg-foreground/90 transition-colors"
              >
                I have copied my key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
