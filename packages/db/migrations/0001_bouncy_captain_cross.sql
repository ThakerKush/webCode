ALTER TABLE "projects" ADD COLUMN "last_heartbeat" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "workspace_status" varchar DEFAULT 'inactive';