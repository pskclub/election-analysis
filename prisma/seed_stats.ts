import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const API_MASTER = "https://storage.googleapis.com/voicetv-election-data-prod/result/master-data.json";
const API_RESULT = "https://storage.googleapis.com/voicetv-election-data-prod/result/result.json";

async function main() {
    console.log("--- Seeding 2566 Election Stats ---");
    
    const [mRes, rRes] = await Promise.all([
        fetch(API_MASTER),
        fetch(API_RESULT)
    ]);
    
    if(!mRes.ok || !rRes.ok) throw new Error("Failed to fetch data");
    
    const m = await mRes.json() as any;
    const r = await rRes.json() as any;

    // Map M-ID to Real-ID
    const mIdToRealId = new Map<number, number>();
    // Also check if m.electionAreas has eligible info
    let hasEligibleInMaster = false;
    
    for(const z of m.electionAreas) {
        const prov = m.provinces.find((p: any) => p.id === z.provinceId);
        if(prov) {
            const realId = prov.code * 100 + z.areaNo;
            mIdToRealId.set(z.id, realId);
            
            if (z.eligible || z.voters) hasEligibleInMaster = true;
        }
    }
    console.log(`Master Data: Has Eligible? ${hasEligibleInMaster}.`);
    console.log(`Mapped ${mIdToRealId.size} areas.`);

    const scores = r.electionScores || {};
    const scoreKeys = Object.keys(scores);
    console.log(`Result Scores Keys: ${scoreKeys.length} (Sample: ${scoreKeys.slice(0,5)})`);

    let count = 0;

    // Strategy 1: Use electionScores if plenty
    if(scoreKeys.length > 10) {
        for (const [key, val] of Object.entries(scores)) {
            if (key === '0') continue; 
            const mId = parseInt(key);
            const realId = mIdToRealId.get(mId);
            if (!realId) continue;

            // @ts-ignore
            const totalVotes = val.totalVotes || 0;
            // @ts-ignore
            const percent = val.percentVoter || 0;
            
            let eligible = 0;
            if (percent > 0) {
                eligible = Math.round(totalVotes / (percent / 100));
            }

            try {
                const existing = await prisma.constituencyElectionStats.findFirst({
                    where: { election_id: 2, constituency_id: realId }
                });

                if (existing) {
                    await prisma.constituencyElectionStats.update({
                        where: { id: existing.id },
                        data: {
                            turnout_voters: totalVotes,
                            total_eligible_voters: eligible
                        }
                    });
                } else {
                    await prisma.constituencyElectionStats.create({
                        data: {
                            election_id: 2,
                            constituency_id: realId,
                            turnout_voters: totalVotes,
                            total_eligible_voters: eligible
                        }
                    });
                }
                count++;
            } catch (e) {
               // ignore
            }
        }
    } else {
        // Strategy 2: Calculate from Candidates + Master Data (Eligible) if available
        // If master has eligible, update stats.
        // Turnout = Sum of Candidates? (Roughly)
        // Check Master sample
        const z0 = m.electionAreas[0];
        console.log("Sample Area Master:", JSON.stringify(z0));
    }
    
    console.log(`Seeded stats for ${count} areas.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
