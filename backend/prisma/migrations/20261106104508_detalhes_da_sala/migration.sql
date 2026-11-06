-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "campaign_type" TEXT NOT NULL DEFAULT 'campaign',
ADD COLUMN     "cover_url" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "max_players" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "schedule" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "starting_level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "system" TEXT NOT NULL DEFAULT 'dnd5e';
