/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppData, Region, Province, Party, ElectionArea, Candidate, PartyStats, ElectionScores } from './types';

// CSV Parsing Helper
interface CsvRow {
    province: string;
    zone: string;
    no: string;
    name: string;
    party: string;
    score: string;
}

const parseCSV = (text: string): CsvRow[] => {
    const lines = text.split(/\r?\n/);
    const rows: CsvRow[] = [];
    let currentProvince = "";
    let currentZone = "";

    // Find header row index (starts with "จังหวัด")
    const headerIndex = lines.findIndex(l => l.startsWith("จังหวัด"));
    if (headerIndex === -1) return [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Custom CSV split that respects quotes i.e. "23,246"
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        // The above regex is too simple for complex CSVs but might work for this specific file.
        // Let's use a more robust split for standard CSV:
        // Split by comma, but ignore commas inside quotes.
        
        const cols: string[] = [];
        let inQuote = false;
        let buffer = "";
        for (const char of line) {
             if (char === '"') {
                 inQuote = !inQuote;
             } else if (char === ',' && !inQuote) {
                 cols.push(buffer);
                 buffer = "";
             } else {
                 buffer += char;
             }
        }
        cols.push(buffer); // Last col

        if (cols.length < 6) continue;

        // cols[0] = Province, cols[1] = Zone
        // Handle "grouped" empty cells
        const rawProv = cols[0].trim();
        const rawZone = cols[1].trim();
        
        if (rawProv) currentProvince = rawProv;
        if (rawZone) currentZone = rawZone;

        rows.push({
            province: currentProvince,
            zone: currentZone,
            no: cols[2].trim(),
            name: cols[3].trim(),
            party: cols[4].trim(),
            score: cols[5].trim().replace(/["',]/g, '') // Remove quotes and commas
        });
    }
    return rows;
};

export const load2562Data = async (): Promise<AppData> => {
    try {
        console.log("Starting 2562 Data Load (Using CSV Source)...");
        
        const [provincesRes, zonesRes, partiesRes, summaryRes, csvRes] = await Promise.all([
            fetch('/data/2562/information/_provinces.json'),
            fetch('/data/2562/information/_zones.json'),
            fetch('/data/2562/information/_parties.json'),
            fetch('/data/2562/information/Summary20190322080003.json'), // Keep for 'eligible' stats
            fetch('/data/2562/ผลคะแนน.csv')
        ]);

        if (!provincesRes.ok || !zonesRes.ok || !partiesRes.ok || !csvRes.ok) {
            throw new Error("Failed to load 2562 data files");
        }

        const rawProvinces = await provincesRes.json();
        const rawZones = await zonesRes.json();
        const rawParties = await partiesRes.json();
        const rawSummary = await summaryRes.ok ? await summaryRes.json() : {};
        const csvText = await csvRes.text();

        // 1. Process CSV
        const csvRows = parseCSV(csvText);
        console.log(`Parsed ${csvRows.length} rows from CSV`);

        // 2. Map Basic Entities
        const regions: Region[] = [
            { id: 1, name: "ภาคเหนือ" },
            { id: 2, name: "ภาคตะวันออกเฉียงเหนือ" },
            { id: 3, name: "ภาคกลาง" },
            { id: 4, name: "ภาคใต้" }
        ];

        const provinces: Province[] = rawProvinces.map((p: any) => ({
            id: p.id,
            name: p.name,
            regionId: p.regionId
        }));
        const provinceMap = new Map(provinces.map(p => [p.name.trim(), p.id]));
        // Map common variations if needed (e.g. Bangkok)
        provinceMap.set("กรุงเทพมหานคร", provinceMap.get("กรุงเทพมหานคร") || 10); 

        const parties: Party[] = rawParties.map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color
        }));
        
        // Party Name Map
        const partyNameMap = new Map(parties.map(p => [p.name.trim(), p.id]));
        const partyMap = new Map(parties.map(p => [p.id, p]));

        const electionAreas: ElectionArea[] = rawZones.map((z: any) => ({
            id: z.provinceId * 100 + z.no,
            name: `เขต ${z.no}`,
            provinceId: z.provinceId,
            areaNo: z.no
        }));

        // 3. Process Candidates & Scores from CSV
        const candidates: Candidate[] = [];
        const partyScoreAggregated: Record<number, number> = {}; // Party ID -> Total Score
        const zoneMaxScore: Record<number, number> = {}; // Area ID -> Max Score (to determine winner)

        const existingCandidateIds = new Set<string>();

        csvRows.forEach(row => {
            const provName = row.province;
            const provId = provinceMap.get(provName);

            if (!provId) {
                // console.warn(`Unmapped province: ${provName}`);
                return;
            }

            const zoneNo = parseInt(row.zone);
            const areaId = provId * 100 + zoneNo;
            const candidateNo = parseInt(row.no);
            const score = parseInt(row.score) || 0;
            
            // Resolve Party
            let partyId = partyNameMap.get(row.party);
            if (!partyId) {
                // Try finding by cleaning up name
                // console.warn(`Unmapped party: ${row.party}`);
                partyId = 0; 
            }
            // Aggregate Party Score (For Party List Calc)
            if (partyId > 0) {
              partyScoreAggregated[partyId] = (partyScoreAggregated[partyId] || 0) + score;
            }

            // Track Max Score for Zone
            if (!zoneMaxScore[areaId] || score > zoneMaxScore[areaId]) {
                zoneMaxScore[areaId] = score;
            }

            const party = partyMap.get(partyId);

            // Generate ID
            const candidateId = parseInt(`${areaId}${String(candidateNo).padStart(3, '0')}`);
            if (existingCandidateIds.has(candidateId.toString())) return; 
            existingCandidateIds.add(candidateId.toString());

            candidates.push({
                id: candidateId,
                fullName: row.name,
                partyId: partyId,
                electionAreaId: areaId,
                score: score,
                partyName: party?.name || row.party || 'N/A',
                partyColor: party?.color || '#ccc',
                isIncumbent: false // No data
            });
        });

        // 4. Calculate Party Stats
        const totalVotesAllParties = Object.values(partyScoreAggregated).reduce((a, b) => a + b, 0);
        const votePerMP = totalVotesAllParties / 500;

        const partyCalculations = parties.map(p => {
            const score = partyScoreAggregated[p.id] || 0;
            
            // Winners Logic: A candidate is a winner if their score == maxScore in that area
            // Note: ties are rare but possible.
            const constituencySeats = candidates.filter(c => 
                c.partyId === p.id && 
                c.score > 0 && 
                c.score === zoneMaxScore[c.electionAreaId]
            ).length;
            
            // Tentative Total MPs
            const tentativeTotalMPs = score / votePerMP;
            
            // Party List = Tentative - Constituency (Floor, min 0)
            const totalSeatsTheoretical = Math.round(tentativeTotalMPs); 
            const partyListSeats = Math.max(0, totalSeatsTheoretical - constituencySeats);

            return {
                party: p,
                score,
                constituencySeats,
                partyListSeats,
                totalSeats: constituencySeats + partyListSeats
            };
        });

        const partyStats: PartyStats[] = partyCalculations.map(pc => ({
            ...pc.party,
            totalSeat: pc.totalSeats,
            areaSeats: pc.constituencySeats,
            partyListSeats: pc.partyListSeats,
            totalVotes: pc.score
        }))
        .filter(p => p.totalSeat > 0 || p.totalVotes > 0)
        .sort((a, b) => b.totalSeat - a.totalSeat);

        // 5. Election Scores & Turnout
        // We use CSV votes for 'totalVotes' (Sum of candidates)
        // We use Summary/Zones for 'eligible' to calc %
        const electionScores: ElectionScores = {};
        
        // Build map of Total Votes per Area from CSV
        const areaTotalVotes: Record<number, number> = {};
        candidates.forEach(c => {
             areaTotalVotes[c.electionAreaId] = (areaTotalVotes[c.electionAreaId] || 0) + c.score;
        });

        // Metadata for Eligible Voters
        const zoneStatsMap = rawSummary.zoneStatsMap || {};
        const rawZonesMap: Record<number, any> = {};
        rawZones.forEach((z: any) => { 
            rawZonesMap[z.provinceId*100 + z.no] = z; 
        });

        let globalTotalVoters = 0;
        let globalEligibleVoters = 0;

        electionAreas.forEach(area => {
            const areaId = area.id;
            const actualVotes = areaTotalVotes[areaId] || 0;
            
            // Try to find Eligible count
            // 1. From Zone Stats (Progress update file)
            let eligible = zoneStatsMap[area.provinceId]?. [area.areaNo]?.eligible;
            // 2. Fallback to static Zone file
            if (!eligible) {
                eligible = rawZonesMap[areaId]?.eligible || 0;
            }

            globalTotalVoters += actualVotes;
            globalEligibleVoters += eligible;

            const percent = eligible > 0 ? (actualVotes / eligible) * 100 : 0;
            
            electionScores[areaId] = {
                totalVotes: actualVotes,
                percentVoter: percent
            };
        });

        // Global Overview
        if (globalEligibleVoters > 0) {
            electionScores[0] = {
                totalVotes: globalTotalVoters,
                percentVoter: (globalTotalVoters / globalEligibleVoters) * 100
            };
        } else {
             electionScores[0] = { totalVotes: 0, percentVoter: 0 };
        }

        console.log(`Loaded 2562 Data (CSV). Global Votes: ${globalTotalVoters}, Future Forward Seats: ${partyStats.find(p => p.id === 68)?.totalSeat}`);

        return {
            regions,
            provinces,
            parties,
            candidates,
            partyStats,
            electionAreas,
            electionScores
        };
    } catch (e) {
        console.error("Error processing 2562 data:", e);
        throw e;
    }
};
