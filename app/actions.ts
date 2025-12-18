'use server'

import { prisma } from '../lib/prisma'
import { AppData, Region, Province, Party, Candidate, PartyStats, ElectionScores, ElectionArea } from './types'

export async function getElectionData(year: number): Promise<AppData | null> {
    console.log(`Fetching data for Year ${year} from DB...`);
    
    // 1. Get Election
    const election = await prisma.election.findFirst({
        where: { year_th: year }
    });

    if (!election) {
        console.warn(`Election ${year} not found in DB.`);
        return null;
    }

    // 2. Fetch Master Data
    const [regionsDb, provincesDb, partiesDb, areasDb] = await Promise.all([
        prisma.region.findMany(),
        prisma.province.findMany(),
        prisma.party.findMany(),
        prisma.constituency.findMany({
            include: {
                election_stats: {
                    where: { election_id: election.id }
                }
            }
        })
    ]);

    // 3. Fetch Candidates & Scores
    const participations = await prisma.candidateParticipation.findMany({
        where: { election_id: election.id },
        include: {
            person: true,
            party: true
        }
    });

    console.log(`Found ${participations.length} participations for ${year}.`);

    // 4. Transform to AppData format

    // Regions
    const regions: Region[] = regionsDb.map(r => ({ id: r.id, name: r.name }));

    // Provinces
    const provinces: Province[] = provincesDb.map(p => ({
        id: p.id,
        name: p.name,
        regionId: p.region_id
    }));

    // Parties
    const parties: Party[] = partiesDb.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color || '#999'
    }));
    const partyMap = new Map<number, Party>(parties.map(p => [p.id, p]));

    // Areas
    const electionAreas: ElectionArea[] = areasDb.map(a => ({
        id: a.id,
        name: a.name || `เขต ${a.district_number}`,
        provinceId: a.province_id,
        areaNo: a.district_number
    }));

    // Candidates
    const candidates: Candidate[] = participations.map(p => {
        // Construct a unique-ish ID for frontend key
        const areaId = p.constituency_id!;
        const candNo = p.candidate_no || 0;
        // Logic from loader2562: areaId * 1000 + no? No, parseInt(`${areaId}${pad(candNo)}`)
        const id = parseInt(`${areaId}${String(candNo).padStart(3, '0')}`);
        
        return {
            id: id,
            fullName: `${p.person.first_name} ${p.person.last_name}`,
            partyId: p.party_id,
            electionAreaId: areaId,
            score: p.score,
            partyName: p.party.name,
            partyColor: p.party.color || '#ccc',
            isIncumbent: false // Not tracked yet
        };
    });

    // 5. Calculate Stats (On the fly aggregation)
    
    // Aggregation
    const partyScoreAggr: Record<number, number> = {};
    const zoneMaxScore: Record<number, number> = {};

    candidates.forEach(c => {
        // Party Score
        partyScoreAggr[c.partyId] = (partyScoreAggr[c.partyId] || 0) + c.score;

        // Zone Max
        const currentMax = zoneMaxScore[c.electionAreaId] || 0;
        if (c.score > currentMax) zoneMaxScore[c.electionAreaId] = c.score;
    });

    // Party Stats
    // Formula depends on year. For simplicity, we calculate "Constituency Seats" (Winners).
    // Party List seats requires more logic/data. We will approximate or leave 0 if unknown.
    // 2562: MMA. 2566: Parallel.
    
    // Total Votes (Constituency)
    const totalVotesAll = Object.values(partyScoreAggr).reduce((a,b)=>a+b, 0);
    const votePerMP = totalVotesAll / 500; // Assumption for 2562

    const partyStats: PartyStats[] = parties.map(p => {
        const score = partyScoreAggr[p.id] || 0;
        
        // Count Winners
        const constituencySeats = candidates.filter(c => 
            c.partyId === p.id && 
            c.score > 0 && 
            c.score === zoneMaxScore[c.electionAreaId]
        ).length;

        let totalSeats = constituencySeats;
        let partyListSeats = 0;

        if (year === 2562) {
            const theoretical = Math.round(score / votePerMP);
            partyListSeats = Math.max(0, theoretical - constituencySeats);
            totalSeats = constituencySeats + partyListSeats;
        } else {
             // 2566: We don't have Party List votes here (yet). 
             // So Party List Seats = 0 (unless we fetch 'candidate_type=PARTY_LIST' participations?)
             // My seed only fetched Constituency candidates for 2566 (m.candidates).
             // So Party List is missing.
             // We return what we have.
        }

        return {
            id: p.id,
            name: p.name,
            color: p.color,
            totalVotes: score,
            areaSeats: constituencySeats,
            partyListSeats: partyListSeats,
            totalSeat: totalSeats
        }
    }).filter(ps => ps.totalVotes > 0 || ps.totalSeat > 0).sort((a,b) => b.totalSeat - a.totalSeat);

    // Election Scores (Turnout)
    const electionScores: ElectionScores = {};
    let globalTurnoutVotes = 0;
    let globalEligible = 0;

    areasDb.forEach(a => {
        // Did we seed stats?
        const stats = a.election_stats[0]; // Filtered by election_id
        const eligible = stats?.total_eligible_voters || 0;
        const turnoutVotes = stats?.turnout_voters || 0; 
        
        // If stats missing, calculate turnout from candidates
        const calculatedTurnout = candidates.filter(c => c.electionAreaId === a.id).reduce((s,c) => s + c.score, 0);
        
        const finalTurnout = turnoutVotes > 0 ? turnoutVotes : calculatedTurnout;
        
        globalTurnoutVotes += finalTurnout;
        globalEligible += eligible; // likely 0 if not seeded

        electionScores[a.id] = {
            totalVotes: finalTurnout,
            percentVoter: eligible > 0 ? (finalTurnout / eligible) * 100 : 0
        };
    });
    
    // Global
    electionScores[0] = {
        totalVotes: globalTurnoutVotes,
        percentVoter: globalEligible > 0 ? (globalTurnoutVotes / globalEligible) * 100 : 0
    };

    return {
        regions,
        provinces,
        parties,
        candidates,
        partyStats,
        electionAreas,
        electionScores
    };
}
