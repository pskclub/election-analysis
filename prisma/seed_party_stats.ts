import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const API_RESULT_2566 = "https://storage.googleapis.com/voicetv-election-data-prod/result/result.json";
const API_MASTER_2566 = "https://storage.googleapis.com/voicetv-election-data-prod/result/master-data.json";

async function main() {
    console.log("--- Seeding Party Election Stats (Mapped) ---");
    
    // 1. Seed 2566 Stats from API
    try {
         console.log("Clearing old 2566 stats...");
         await prisma.partyElectionStats.deleteMany({ where: { election_id: 2 } });
         
         console.log("Fetching 2566 Data...");
         const [resResult, resMaster] = await Promise.all([
             fetch(API_RESULT_2566),
             fetch(API_MASTER_2566)
         ]);

         const r = await resResult.json() as any;
         const m = await resMaster.json() as any;
         
         const partyScores = r.partyScores || {};
         const apiParties = m.parties || {}; // Object key=id

         // Build API ID -> Name Map
         const apiIdToName = new Map<number, string>();
         Object.values(apiParties).forEach((p: any) => {
             apiIdToName.set(p.id, p.name);
         });

         // Get DB Parties
         const dbParties = await prisma.party.findMany();
         
         // Build DB Name -> ID Map
         const dbNameToId = new Map<string, number>();
         
         // 1. Exact Matches & Standard Normalization
         dbParties.forEach(p => {
             const cleanName = p.name.trim();
             dbNameToId.set(cleanName, p.id);
             
             if(cleanName.startsWith("พรรค")) {
                 dbNameToId.set(cleanName.replace("พรรค", "").trim(), p.id);
             } else {
                 dbNameToId.set("พรรค" + cleanName, p.id);
             }
         });

         // 2. Specific Manual Aliases (Safe from Overwriting by other parties)
         // Find specific IDs first
         const pPheuThai = dbParties.find(p => p.name === "เพื่อไทย");
         if (pPheuThai) dbNameToId.set("เพื่อไทย", pPheuThai.id);

         const pKaoKlai = dbParties.find(p => p.name === "ก้าวไกล");
         if (pKaoKlai) dbNameToId.set("ก้าวไกล", pKaoKlai.id);

         const pBhumjaithai = dbParties.find(p => p.name === "ภูมิใจไทย");
         if (pBhumjaithai) dbNameToId.set("ภูมิใจไทย", pBhumjaithai.id);

         const pRTSC = dbParties.find(p => p.name === "รวมไทยสร้างชาติ");
         if (pRTSC) dbNameToId.set("รวมไทยสร้างชาติ", pRTSC.id);
         
         const pDemocrat = dbParties.find(p => p.name === "ประชาธิปัตย์");
         if (pDemocrat) dbNameToId.set("ประชาธิปัตย์", pDemocrat.id);

         const pPPRP = dbParties.find(p => p.name === "พลังประชารัฐ");
         if (pPPRP) dbNameToId.set("พลังประชารัฐ", pPPRP.id);


         // Election ID 2 = 2566
         for (const [pIdStr, stats] of Object.entries(partyScores) as any) {
             const apiPartyId = parseInt(pIdStr);
             const s = stats;
             
             // 1. Get Name from API
             const partyName = apiIdToName.get(apiPartyId);
             if(!partyName) {
                 continue; // Unknown party in Master
             }

             // 2. Find DB ID
             let dbPartyId = dbNameToId.get(partyName.trim());
             
             // Fuzzy fallback if exact match fails
             if(!dbPartyId) {
                // Warning: This fuzzy match was the source of issues too if not careful.
                // e.g. "เพื่อไทย" matched "พลังเพื่อไทย"
                // Let's remove aggressive fuzzy matching or check strictly equals.
                const fuzzy = dbParties.find(p => p.name === partyName);
                if(fuzzy) dbPartyId = fuzzy.id;
             }

             if(!dbPartyId) {
                // console.warn(`Skipping stats for "${partyName}" (API ID: ${apiPartyId}) - Not found in specific DB.`);
                continue;
             }

             // Create stats
             await prisma.partyElectionStats.create({
                data: {
                    election_id: 2,
                    party_id: dbPartyId,
                    total_votes: s.totalVotes || 0,
                    constituency_seats: s.areaSeats || 0,
                    partylist_seats: s.partyListSeats || 0,
                    total_seats: (s.areaSeats || 0) + (s.partyListSeats || 0)
                }
             });
         }
         console.log("Seeded 2566 Party Stats with correct mapping.");

    } catch (e) {
        console.error("Error seeding 2566 stats:", e);
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
