ALTER TABLE "Message_v2" ADD COLUMN "messageUuid" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_messageUuid_unique" UNIQUE("messageUuid");