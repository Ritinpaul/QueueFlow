import "./env.js";
import { JobWorker } from "./worker.js";

const PROJECT_ID = process.env.PROJECT_ID;

if (!PROJECT_ID) {
  console.error("ERROR: PROJECT_ID environment variable is required to start the worker.");
  process.exit(1);
}

const worker = new JobWorker({
  projectId: PROJECT_ID,
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
