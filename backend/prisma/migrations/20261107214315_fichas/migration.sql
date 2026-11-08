-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('PLAYER', 'NPC');

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "type" "CharacterType" NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL DEFAULT '',
    "player_id" TEXT,
    "visible_to_players" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "characters_room_id_idx" ON "characters"("room_id");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
