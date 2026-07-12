import "./env.js";
import { JobWorker } from "./worker.js";

import { db } from "@scheduler/db";
import { projects } from "@scheduler/db/src/schema.js";

import { eq } from "drizzle-orm";

async function run() {
  let projectId = process.env.PROJECT_ID;

  let validProject = false;
  if (projectId) {
    // Only check if it's a valid UUID format, then check DB
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
      const check = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
      if (check.length > 0) validProject = true;
    }
  }

  if (!validProject) {
    console.log(`Provided PROJECT_ID is invalid or not provided. Fetching a default project from the database...`);
    const projectRows = await db.select({ id: projects.id }).from(projects).limit(1);
    if (projectRows.length > 0) {
      projectId = projectRows[0].id;
      console.log(`Using Project ID: ${projectId}`);
    } else {
      console.error("ERROR: No projects found in the database. Please create a project first.");
      process.exit(1);
    }
  }

  const worker = new JobWorker({
    projectId: projectId,
    concurrency: process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : 5,
    pollIntervalMs: process.env.POLL_INTERVAL ? parseInt(process.env.POLL_INTERVAL, 10) : 1000,
  });

// Register sample handlers
worker.registerHandler("email.send", async (payload) => {
  console.log(`[Handler: email.send] Sending email to ${payload.to}...`);
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 1500));
  
  if (payload.simulateError) {
    throw new Error("Simulated email sending failure");
  }

  console.log(`[Handler: email.send] Email sent successfully to ${payload.to}`);
  return { delivered: true, timestamp: Date.now() };
});

worker.registerHandler("data.sync", async (payload) => {
  console.log(`[Handler: data.sync] Syncing data from ${payload.source}...`);
  await new Promise((r) => setTimeout(r, 3000));
  return { syncedRecords: 142 };
});

worker.registerHandler("test-job", async (payload) => {
  console.log(`[Handler: test-job] Received test job payload:`, payload);
  await new Promise((r) => setTimeout(r, 2000));
  return { status: "Success!", processedAt: Date.now() };
});

  // Start the worker
  worker.start().catch((err) => {
    console.error("Failed to start worker:", err);
    process.exit(1);
  });

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    await worker.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

run();
