import { PrismaClient, Party as PrismaParty } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

// @ts-ignore
const prisma = new PrismaClient()

// --- Interfaces for 2566 Data ---
interface M2566_Region { id: number; code: string; name: string; }
interface M2566_Province { id: number; code: number; name: string; regionId: number; }
interface M2566_Area { id: number; name: string; areaNo: number; provinceId: number; }
interface M2566_Party { id: number; name: string; color: string; code: string; }
interface M2566_Candidate { id: number; title?: string; fullName: string; partyId: number; electionAreaId: number; no: number; }
interface M2566_PartyList { id: number; title?: string; fullName: string; partyId: number; no: number; }

interface MasterData2566 {
    regions: Record<string, M2566_Region>;
    provinces: M2566_Province[];
    electionAreas: M2566_Area[];
    parties: Record<string, M2566_Party>;
    candidates: M2566_Candidate[];
    partylists: M2566_PartyList[];
}

interface ResultData2566 {
    areaBallotScores: Array<{
        candidates: Array<{ id: number; totalVotes: number }>;
    }>;
}

const API_2566 = {
    MASTER: "https://storage.googleapis.com/voicetv-election-data-prod/result/master-data.json",
    RESULT: "https://storage.googleapis.com/voicetv-election-data-prod/result/result.json"
};

async function seed2562(
    peopleMap: Map<string, number>, 
    partyMap: Map<string, number>,
    provinceMap: Map<string, number>,
    zoneMap: Map<string, number>
) {
    console.log("--- Seeding 2562 ---");
    
    // 1. Create Election 2562
    const election = await prisma.election.upsert({
        where: { id: 1 }, 
        update: {},
        create: {
            year_th: 2562,
            election_date: new Date('2019-03-24'),
            description: 'การเลือกตั้งทั่วไป พ.ศ. 2562',
            is_active: true
        }
    });

    // 2. Regions (2562 local data)
    const regionsData = [
        { id: 1, name: "ภาคเหนือ" },
        { id: 2, name: "ภาคตะวันออกเฉียงเหนือ" },
        { id: 3, name: "ภาคกลาง" },
        { id: 4, name: "ภาคใต้" }
    ]
    for (const r of regionsData) {
        await prisma.region.upsert({
            where: { id: r.id },
            update: { name: r.name },
            create: r
        })
    }

    // 3. Provinces (2562 local data)
    const provincesPath = path.join(process.cwd(), 'public/data/2562/information/_provinces.json')
    const provinces = JSON.parse(fs.readFileSync(provincesPath, 'utf-8'))
    
    for (const p of provinces) {
        const prov = await prisma.province.upsert({
            where: { id: p.id },
            update: { name: p.name, region_id: p.regionId },
            create: { id: p.id, name: p.name, region_id: p.regionId }
        })
        provinceMap.set(p.name.trim(), prov.id)
        if (p.name === "กรุงเทพมหานคร") provinceMap.set("กทม", prov.id);
    }

    // 4. Constituencies (2562 local data)
    const zonesPath = path.join(process.cwd(), 'public/data/2562/information/_zones.json')
    const zones = JSON.parse(fs.readFileSync(zonesPath, 'utf-8'))
    
    for (const z of zones) {
        const id = z.provinceId * 100 + z.no
        await prisma.constituency.upsert({
            where: { id: id },
            update: {
                province_id: z.provinceId,
                district_number: z.no,
                name: `เขต ${z.no}` 
            },
            create: {
                id: id,
                province_id: z.provinceId,
                district_number: z.no,
                name: `เขต ${z.no}`
            }
        })
        zoneMap.set(`${z.provinceId}-${z.no}`, id)
    }

    // 5. Parties (2562 local data)
    const partiesPath = path.join(process.cwd(), 'public/data/2562/information/_parties.json')
    const partiesRaw = JSON.parse(fs.readFileSync(partiesPath, 'utf-8'))
    
    for (const p of partiesRaw) {
        const party = await prisma.party.upsert({
            where: { id: p.id },
            update: { name: p.name, color: p.color },
            create: {
                id: p.id,
                name: p.name,
                color: p.color,
                status: 'ACTIVE'
            }
        })
        partyMap.set(p.name.trim(), party.id)
    }

    // 6. Scores (2562 local CSV)
    const csvPath = path.join(process.cwd(), 'public/data/2562/ผลคะแนน.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const scoreMap = new Map<string, number>()
    const zoneMaxScore = new Map<string, number>() 

    const lines = csvContent.split(/\r?\n/)
    let currentProv = ""
    let currentZoneStr = ""
    let startIdx = 0
    for(let i=0; i<lines.length; i++) {
        if (lines[i].includes("จังหวัด") && lines[i].includes("เขต")) {
            startIdx = i+1; break;
        }
    }

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols: string[] = [];
        let inQuote = false;
        let buffer = "";
        for (const char of line) {
             if (char === '"') { inQuote = !inQuote; }
             else if (char === ',' && !inQuote) { cols.push(buffer); buffer = ""; }
             else { buffer += char; }
        }
        cols.push(buffer);
        if (cols.length < 6) continue;

        const rawProv = cols[0].trim();
        const rawZone = cols[1].trim();
        if (rawProv) currentProv = rawProv;
        if (rawZone) currentZoneStr = rawZone;
        
        const no = cols[2].trim();
        const scoreStr = cols[5]?.trim().replace(/["',]/g, '') || "0";
        const score = parseInt(scoreStr);
        
        const key = `${currentProv}-${currentZoneStr}-${no}`;
        scoreMap.set(key, score);

        const provId = provinceMap.get(currentProv);
        if (provId) {
            const zKey = `${provId}-${currentZoneStr}`;
            const currentMax = zoneMaxScore.get(zKey) || 0;
            if (score > currentMax) zoneMaxScore.set(zKey, score);
        }
    }

    // 7. Candidates (2562 local JSON)
    const candidatesPath = path.join(process.cwd(), 'public/data/2562/information/candidates.json')
    const candidatesRaw = JSON.parse(fs.readFileSync(candidatesPath, 'utf-8'));
    
    // Identify New People
    const newPeopleToCreate = new Map<string, any>();
    for (const c of candidatesRaw) {
        const firstName = c.FirstName?.trim();
        const lastName = c.LastName?.trim();
        if (!firstName || !lastName) continue;

        const key = `${firstName}|${lastName}`;
        if (!peopleMap.has(key) && !newPeopleToCreate.has(key)) {
            let edu: any = null;
            if (c.HighestEducation) { edu = { level: c.HighestEducation }; }
            newPeopleToCreate.set(key, {
                prefix: c.Title,
                first_name: firstName,
                last_name: lastName,
                ex_occupation: c.Occupation,
                education: edu ? edu : undefined
            });
        }
    }

    // Upsert New People (Batch)
    const limit = 3; 
    const newPeopleValues = Array.from(newPeopleToCreate.values());
    for (let i = 0; i < newPeopleValues.length; i += limit) {
        const chunk = newPeopleValues.slice(i, i + limit);
        await Promise.all(chunk.map(async (data) => {
            try {
                const existing = await prisma.person.findFirst({ where: { first_name: data.first_name, last_name: data.last_name }})
                if(existing) {
                    peopleMap.set(`${data.first_name}|${data.last_name}`, existing.id);
                } else {
                    const p = await prisma.person.create({ data });
                    peopleMap.set(`${p.first_name}|${p.last_name}`, p.id);
                }
            } catch (e) {
                console.error(`Failed to create person ${data.first_name} ${data.last_name}:`, e);
            }
        }));
    }

    // Prepare Participations
    const participationsData: any[] = [];
    const existingParts = await prisma.candidateParticipation.findMany({
        where: { election_id: election.id },
        select: { person_id: true, party_id: true } 
    });
    const existingPartSet = new Set<string>();
    existingParts.forEach(ep => existingPartSet.add(`${ep.person_id}-${ep.party_id}`));
    const localSet = new Set<string>();

    for (const c of candidatesRaw) {
        const firstName = c.FirstName?.trim();
        const lastName = c.LastName?.trim();
        if (!firstName || !lastName) continue;

        const personId = peopleMap.get(`${firstName}|${lastName}`);
        if (!personId) continue;

        const partyName = c.PartyName?.trim();
        const partyId = partyMap.get(partyName);
        if (!partyId) continue;

        const provName = c.province_name?.trim()
        const provId = provinceMap.get(provName)
        if (!provId) continue;
        
        const zoneNo = c.zone_number;
        const constituencyId = zoneMap.get(`${provId}-${zoneNo}`);
        
        const scoreKey = `${provName}-${zoneNo}-${c.CandidateNo}`;
        const score = scoreMap.get(scoreKey) || 0;
        const maxScore = zoneMaxScore.get(`${provId}-${zoneNo}`) || 0;
        const isWinner = (score > 0 && score === maxScore);

        const key = `${personId}-${partyId}`;
        if (existingPartSet.has(key) || localSet.has(key)) continue;
        localSet.add(key);

        participationsData.push({
            election_id: election.id,
            person_id: personId,
            party_id: partyId,
            constituency_id: constituencyId,
            candidate_type: 'CONSTITUENCY',
            candidate_no: c.CandidateNo,
            score: score,
            is_winner: isWinner
        });
    }

    const partLimit = 1000;
    for (let i = 0; i < participationsData.length; i += partLimit) {
        const chunk = participationsData.slice(i, i + partLimit);
        await prisma.candidateParticipation.createMany({
            data: chunk,
            skipDuplicates: true
        });
        console.log(`2562: Inserted ${Math.min(i + partLimit, participationsData.length)} participations.`);
    }
}

async function resetSequences() {
    console.log("Resetting sequences...");
    const tables = ['parties', 'provinces', 'regions', 'constituencies', 'elections', 'people', 'candidate_participations'];
    for (const table of tables) {
        try {
            await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id)+1, 1), false) FROM "${table}";`);
        } catch(e) {
            console.warn(`Could not reset sequence for ${table} (might not exist or have serial):`, e);
        }
    }
    console.log("Sequences reset.");
}

async function seed2566(
    peopleMap: Map<string, number>, 
    partyMap: Map<string, number>,
    provinceMap: Map<string, number>,
    zoneMap: Map<string, number>
) {
    console.log("--- Seeding 2566 ---");
    console.log("Fetching data from API...");
    
    // @ts-ignore
    const [mRes, rRes] = await Promise.all([
        fetch(API_2566.MASTER),
        fetch(API_2566.RESULT)
    ]);
    
    if(!mRes.ok || !rRes.ok) throw new Error("Failed to fetch 2566 Data");
    
    const m = await mRes.json() as MasterData2566;
    const r = await rRes.json() as ResultData2566;
    
    console.log("Data fetched. Processing...");

    // 1. Create Election 2566
    const election = await prisma.election.upsert({
        where: { id: 2 }, 
        update: {},
        create: {
            year_th: 2566,
            election_date: new Date('2023-05-14'),
            description: 'การเลือกตั้งทั่วไป พ.ศ. 2566',
            is_active: true
        }
    });

    // 3. Provinces
    for (const p of m.provinces) {
        const provId = p.code; 
        const prov = await prisma.province.upsert({
            where: { id: provId },
            update: { name: p.name },
            create: { id: provId, name: p.name, region_id: p.regionId <= 4 ? p.regionId : 4 }
        });
        provinceMap.set(p.name.trim(), prov.id);
    }

    // 4. Constituencies
    for (const z of m.electionAreas) {
        const prov = m.provinces.find(p => p.id === z.provinceId);
        if (!prov) continue;
        
        const realProvId = prov.code;
        const id = realProvId * 100 + z.areaNo;
        
        await prisma.constituency.upsert({
            where: { id: id },
            update: {
                province_id: realProvId,
                district_number: z.areaNo,
                name: `เขต ${z.areaNo}` 
            },
            create: {
                id: id,
                province_id: realProvId,
                district_number: z.areaNo,
                name: `เขต ${z.areaNo}`
            }
        });
        zoneMap.set(`M-${z.id}`, id);
        zoneMap.set(`${realProvId}-${z.areaNo}`, id);
    }

    // 5. Parties
    const mParties = Object.values(m.parties);
    for (const p of mParties) {
        const pName = p.name.trim();
        let dbPartyId = partyMap.get(pName);
        
        if (!dbPartyId) {
            try {
                const newP = await prisma.party.create({
                    data: {
                        name: pName,
                        color: p.color,
                        status: 'ACTIVE'
                    }
                });
                dbPartyId = newP.id;
                partyMap.set(pName, dbPartyId);
            } catch(e) {
                console.error(`Failed to create party ${pName}:`, e);
                // Try to find if race condition
                const existing = await prisma.party.findFirst({ where: { name: pName }});
                if(existing) {
                    dbPartyId = existing.id;
                    partyMap.set(pName, dbPartyId);
                }
            }
        }
        partyMap.set(`M-${p.id}`, dbPartyId!);
    }

    // 6. Scores
    const candidateScoreMap = new Map<number, number>();
    if (r.areaBallotScores) {
        r.areaBallotScores.forEach((area) => {
            if (area.candidates) {
                area.candidates.forEach((c) => {
                    candidateScoreMap.set(c.id, c.totalVotes || 0);
                });
            }
        });
    }

    // 7. Candidates
    const newPeopleToCreate = new Map<string, any>();
    
    const processName = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length < 2) return { first: fullName, last: '-' };
        const first = parts[0];
        const last = parts.slice(1).join(' ');
        return { first, last };
    };

    for (const c of m.candidates) {
        const { first, last } = processName(c.fullName);
        const key = `${first}|${last}`;
        if (!peopleMap.has(key) && !newPeopleToCreate.has(key)) {
            newPeopleToCreate.set(key, {
                prefix: c.title,
                first_name: first,
                last_name: last
            });
        }
    }

    const limit = 3;
    const newPeopleValues = Array.from(newPeopleToCreate.values());
    for (let i = 0; i < newPeopleValues.length; i += limit) {
        const chunk = newPeopleValues.slice(i, i + limit);
        await Promise.all(chunk.map(async (data) => {
            try {
                 const existing = await prisma.person.findFirst({ where: { first_name: data.first_name, last_name: data.last_name }})
                 if(existing) {
                      peopleMap.set(`${data.first_name}|${data.last_name}`, existing.id);
                 } else {
                     const p = await prisma.person.create({ data });
                     peopleMap.set(`${p.first_name}|${p.last_name}`, p.id);
                 }
            } catch (e) {
                console.error(`Failed to create person (2566) ${data.first_name}:`, e);
            }
        }));
    }

    // Participations
    const participationsData: any[] = [];
    const existingParts = await prisma.candidateParticipation.findMany({
        where: { election_id: election.id },
        select: { person_id: true, party_id: true } 
    });
    const existingPartSet = new Set<string>();
    existingParts.forEach(ep => existingPartSet.add(`${ep.person_id}-${ep.party_id}`));
    const localSet = new Set<string>();

    for(const c of m.candidates) {
        const { first, last } = processName(c.fullName);
        const personId = peopleMap.get(`${first}|${last}`);
        if(!personId) continue;

        const partyId = partyMap.get(`M-${c.partyId}`);
        if(!partyId) continue;

        const constituencyId = zoneMap.get(`M-${c.electionAreaId}`);
        if(!constituencyId) continue;

        const score = candidateScoreMap.get(c.id) || 0;
        
        const key = `${personId}-${partyId}`;
        if (existingPartSet.has(key) || localSet.has(key)) continue;
        localSet.add(key);
        
        participationsData.push({
            election_id: election.id,
            person_id: personId,
            party_id: partyId,
            constituency_id: constituencyId,
            candidate_type: 'CONSTITUENCY',
            candidate_no: c.no,
            score: score,
            is_winner: false 
        });
    }

    // Determine Winners
    const zoneMax = new Map<number, number>();
    participationsData.forEach(p => {
        const current = zoneMax.get(p.constituency_id) || 0;
        if(p.score > current) zoneMax.set(p.constituency_id, p.score);
    });
    participationsData.forEach(p => {
        const max = zoneMax.get(p.constituency_id) || 0;
        if(p.score > 0 && p.score === max) p.is_winner = true;
    });

    const partLimit = 1000;
    for (let i = 0; i < participationsData.length; i += partLimit) {
        const chunk = participationsData.slice(i, i + partLimit);
        await prisma.candidateParticipation.createMany({
            data: chunk,
            skipDuplicates: true
        });
        console.log(`2566: Inserted ${Math.min(i + partLimit, participationsData.length)} participations.`);
    }
}

async function main() {
  console.log("Starting Unified Seeding...");

  // Shared Caches
  const peopleMap = new Map<string, number>(); // "First|Last" -> ID
  const partyMap = new Map<string, number>(); // Name -> ID
  const provinceMap = new Map<string, number>(); // Name -> ID
  const zoneMap = new Map<string, number>(); // Key -> ID

  // Pre-load current DB state
  const allPeople = await prisma.person.findMany({ select: { id: true, first_name: true, last_name: true } });
  for (const p of allPeople) { peopleMap.set(`${p.first_name.trim()}|${p.last_name.trim()}`, p.id); }
  
  const allParties = await prisma.party.findMany({ select: { id: true, name: true } });
  for (const p of allParties) { partyMap.set(p.name.trim(), p.id); }

  const allProvs = await prisma.province.findMany({ select: { id: true, name: true }});
  for (const p of allProvs) { provinceMap.set(p.name.trim(), p.id); }

  console.log(`Pre-loaded: ${allPeople.length} People, ${allParties.length} Parties.`);

  // Run Seeds
  await seed2562(peopleMap, partyMap, provinceMap, zoneMap);
  
  // Reset sequences after 2562 (which uses hardcoded IDs)
  await resetSequences();

  try {
    await seed2566(peopleMap, partyMap, provinceMap, zoneMap);
  } catch(e) {
    console.error("2566 Seeding Failed (Network error?):", e);
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
