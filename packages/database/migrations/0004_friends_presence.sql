CREATE TYPE "friend_request_state" AS ENUM ('pending','accepted','rejected','cancelled','expired');
CREATE TYPE "friendship_state" AS ENUM ('active','ended');
CREATE TYPE "mute_scope" AS ENUM ('all','messages','calls');
CREATE TABLE "friend_requests" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "sender_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "recipient_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "source_encounter_id" uuid REFERENCES encounters(id) ON DELETE SET NULL,
 "state" friend_request_state NOT NULL DEFAULT 'pending', "expires_at" timestamptz NOT NULL, "resolved_at" timestamptz,
 "purge_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "friend_requests_not_self" CHECK(sender_id <> recipient_id));
CREATE UNIQUE INDEX "friend_requests_pending_pair_uidx" ON friend_requests(sender_id,recipient_id) WHERE state='pending';
CREATE INDEX "friend_requests_recipient_idx" ON friend_requests(recipient_id,state,created_at);
CREATE INDEX "friend_requests_cleanup_idx" ON friend_requests(purge_at,id);
CREATE TABLE "friendships" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "first_user_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "second_user_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "source_encounter_id" uuid REFERENCES encounters(id) ON DELETE SET NULL,
 "thread_id" uuid NOT NULL UNIQUE REFERENCES threads(id) ON DELETE RESTRICT, "state" friendship_state NOT NULL DEFAULT 'active', "ended_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "friendships_canonical_pair" CHECK(first_user_id < second_user_id));
CREATE UNIQUE INDEX "friendships_active_pair_uidx" ON friendships(first_user_id,second_user_id) WHERE state='active';
CREATE INDEX "friendships_second_idx" ON friendships(second_user_id,state);
CREATE TABLE "mutes" ("muter_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "muted_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "scope" mute_scope NOT NULL DEFAULT 'all', "expires_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(muter_id,muted_id,scope), CONSTRAINT "mutes_not_self" CHECK(muter_id <> muted_id));
