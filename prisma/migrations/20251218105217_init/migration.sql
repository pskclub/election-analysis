-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('ACTIVE', 'DISSOLVED', 'MERGED');

-- CreateEnum
CREATE TYPE "CandidateType" AS ENUM ('CONSTITUENCY', 'PARTY_LIST', 'PM');

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color_code" TEXT,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code_name" TEXT,
    "total_districts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constituencies" (
    "id" SERIAL NOT NULL,
    "province_id" INTEGER NOT NULL,
    "district_number" INTEGER NOT NULL,
    "name" TEXT,
    "geojson_url" TEXT,

    CONSTRAINT "constituencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" SERIAL NOT NULL,
    "year_th" INTEGER NOT NULL,
    "election_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constituency_election_stats" (
    "id" SERIAL NOT NULL,
    "election_id" INTEGER NOT NULL,
    "constituency_id" INTEGER NOT NULL,
    "total_eligible_voters" INTEGER NOT NULL DEFAULT 0,
    "turnout_voters" INTEGER NOT NULL DEFAULT 0,
    "invalid_votes" INTEGER NOT NULL DEFAULT 0,
    "no_votes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "constituency_election_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "color" TEXT,
    "logo_url" TEXT,
    "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE',
    "established_date" TIMESTAMP(3),
    "dissolved_date" TIMESTAMP(3),
    "successor_party_id" INTEGER,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_election_stats" (
    "id" SERIAL NOT NULL,
    "election_id" INTEGER NOT NULL,
    "party_id" INTEGER NOT NULL,
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "constituency_seats" INTEGER NOT NULL DEFAULT 0,
    "partylist_seats" INTEGER NOT NULL DEFAULT 0,
    "total_seats" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "party_election_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" SERIAL NOT NULL,
    "prefix" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "nickname" TEXT,
    "birth_date" TIMESTAMP(3),
    "gender" TEXT,
    "education" JSONB,
    "ex_occupation" TEXT,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_participations" (
    "id" SERIAL NOT NULL,
    "election_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "party_id" INTEGER NOT NULL,
    "constituency_id" INTEGER,
    "candidate_type" "CandidateType" NOT NULL,
    "candidate_no" INTEGER,
    "list_order" INTEGER,
    "score" INTEGER NOT NULL DEFAULT 0,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,

    CONSTRAINT "candidate_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "political_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "influence_area" TEXT,

    CONSTRAINT "political_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "political_relationships" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "role" TEXT,

    CONSTRAINT "political_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_simulations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "config_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "user_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("user_id","person_id")
);

-- CreateTable
CREATE TABLE "social_stats_daily" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "person_id" INTEGER,
    "party_id" INTEGER,
    "platform" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "mentions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "social_stats_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituencies" ADD CONSTRAINT "constituencies_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituency_election_stats" ADD CONSTRAINT "constituency_election_stats_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constituency_election_stats" ADD CONSTRAINT "constituency_election_stats_constituency_id_fkey" FOREIGN KEY ("constituency_id") REFERENCES "constituencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_successor_party_id_fkey" FOREIGN KEY ("successor_party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_election_stats" ADD CONSTRAINT "party_election_stats_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_election_stats" ADD CONSTRAINT "party_election_stats_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_participations" ADD CONSTRAINT "candidate_participations_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_participations" ADD CONSTRAINT "candidate_participations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_participations" ADD CONSTRAINT "candidate_participations_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_participations" ADD CONSTRAINT "candidate_participations_constituency_id_fkey" FOREIGN KEY ("constituency_id") REFERENCES "constituencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "political_relationships" ADD CONSTRAINT "political_relationships_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "political_relationships" ADD CONSTRAINT "political_relationships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "political_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_simulations" ADD CONSTRAINT "user_simulations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_stats_daily" ADD CONSTRAINT "social_stats_daily_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;
