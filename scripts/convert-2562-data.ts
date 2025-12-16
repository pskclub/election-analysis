/**
 * Script to convert 2562 (2019) election data to match 2566 (2023) format
 * 
 * Data structure differences:
 * - 2562: candidates.json, party.json, zone-to-parties.json, election-zones.json
 * - 2566: master-data.json, result.json
 * 
 * This script transforms 2562 data into the same structure as 2566
 */

import * as fs from 'fs';
import * as path from 'path';

// Types for 2562 data
interface Candidate2562 {
  CandidateId: string;
  CandidateNo: number;
  FirstName: string;
  LastName: string;
  PartyName: string;
  PartyNumber: number;
  Title: string;
  Votable: boolean;
  province_id: number;
  province_name: string;
  zone_number: number;
  Age?: number;
  Occupation?: string;
  HighestEducation?: string;
}

interface Party2562 {
  name: string;
  color: string;
  hilightColor: string;
  count: number;
}

interface ElectionZone2562 {
  province: string;
  zone: number;
  areas: Array<{
    area: string;
    interior: string[];
    exterior: string[];
    subinterior: string[];
  }>;
  prefixes: {
    area: string;
    sub_area: string;
  };
}

// Types for 2566 format (target)
interface MasterData {
  regions: Record<string, any>;
  provinces: any[];
  parties: Record<string, any>;
  candidates: any[];
  electionAreas: any[];
}

interface ResultData {
  electionScores: Record<string, any>;
  partyScores: Record<string, any>;
  areaBallotScores: any[];
}

// Province to Region mapping (based on Thai geography)
const PROVINCE_TO_REGION: Record<string, number> = {
  'กรุงเทพมหานคร': 1,
  'นนทบุรี': 2,
  'ปทุมธานี': 2,
  'สมุทรปราการ': 2,
  'สมุทรสาคร': 2,
  'นครปฐม': 2,
  'สมุทรสงคราม': 2,
  // ... (add all provinces - this is a simplified version)
  // Central: 2, North: 3, Northeast: 4, East: 5, West: 6, South: 7
};

const REGION_NAMES: Record<number, string> = {
  1: 'กรุงเทพมหานคร',
  2: 'ภาคกลาง',
  3: 'ภาคเหนือ',
  4: 'ภาคตะวันออกเฉียงเหนือ',
  5: 'ภาคตะวันออก',
  6: 'ภาคตะวันตก',
  7: 'ภาคใต้',
};

async function convertData() {
  console.log('🔄 Starting data conversion for 2562 election...');

  const dataDir = path.join(__dirname, '../public/data62');
  const outputDir = path.join(__dirname, '../public/data/2562');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read 2562 data files
  console.log('📖 Reading 2562 data files...');
  const candidates: Candidate2562[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'candidates.json'), 'utf-8')
  );
  const parties: Party2562[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'party.json'), 'utf-8')
  );
  const zoneToParties: Record<string, string[]> = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'zone-to-parties.json'), 'utf-8')
  );
  const electionZones: ElectionZone2562[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'election-zones.json'), 'utf-8')
  );

  console.log(`✅ Found ${candidates.length} candidates`);
  console.log(`✅ Found ${parties.length} parties`);
  console.log(`✅ Found ${electionZones.length} election zones`);

  // Create master-data.json structure
  console.log('🔨 Building master-data.json...');
  
  // Build regions
  const regions: Record<string, any> = {};
  Object.entries(REGION_NAMES).forEach(([id, name]) => {
    regions[id] = { id: parseInt(id), name };
  });

  // Build provinces from candidates
  const provinceMap = new Map<number, { id: number; name: string; regionId: number }>();
  candidates.forEach(c => {
    if (!provinceMap.has(c.province_id)) {
      provinceMap.set(c.province_id, {
        id: c.province_id,
        name: c.province_name,
        regionId: PROVINCE_TO_REGION[c.province_name] || 2, // Default to Central
      });
    }
  });
  const provincesArray = Array.from(provinceMap.values());

  // Build parties with IDs
  const partyMap = new Map<string, number>();
  const partiesRecord: Record<string, any> = {};
  parties.forEach((p, idx) => {
    const partyId = idx + 1;
    partyMap.set(p.name, partyId);
    partiesRecord[partyId] = {
      id: partyId.toString(),
      name: p.name,
      color: p.color,
      colorCode: p.color,
      number: parties.findIndex(party => party.name === p.name) + 1,
    };
  });

  // Build election areas from zones
  const electionAreas: any[] = [];
  let areaId = 1;
  electionZones.forEach(zone => {
    const province = provinceMap.get(
      Array.from(provinceMap.values()).find(p => p.name === zone.province)?.id || 0
    );
    
    zone.areas.forEach(area => {
      electionAreas.push({
        id: areaId++,
        name: `${zone.province} เขต ${zone.zone}`,
        areaNo: zone.zone,
        provinceId: province?.id || 0,
      });
    });
  });

  // Build candidates with proper IDs
  const candidatesArray = candidates.map((c, idx) => ({
    id: idx + 1,
    fullName: `${c.Title}${c.FirstName} ${c.LastName}`,
    firstName: c.FirstName,
    lastName: c.LastName,
    title: c.Title,
    partyId: partyMap.get(c.PartyName) || 0,
    electionAreaId: electionAreas.find(
      ea => ea.name.includes(c.province_name) && ea.areaNo === c.zone_number
    )?.id || 0,
    number: c.CandidateNo,
    age: c.Age || 0,
    occupation: c.Occupation || '',
    education: c.HighestEducation || '',
  }));

  const masterData: MasterData = {
    regions,
    provinces: provincesArray,
    parties: partiesRecord,
    candidates: candidatesArray,
    electionAreas,
  };

  // Create result.json structure
  console.log('🔨 Building result.json...');
  
  // Calculate party scores from candidates
  const partyScores: Record<string, any> = {};
  parties.forEach(p => {
    const partyId = partyMap.get(p.name);
    if (partyId) {
      partyScores[partyId] = {
        id: partyId,
        areaSeats: 0, // Will be calculated from actual results
        partyListSeats: 0,
        totalVotes: 0,
      };
    }
  });

  // For 2562, we know the final results:
  // พลังประชารัฐ: 116 seats (97 constituency + 19 party list)
  // เพื่อไทย: 136 seats (126 constituency + 10 party list)
  // อนาคตใหม่: 81 seats (30 constituency + 51 party list)
  // ประชาธิปัตย์: 53 seats (33 constituency + 20 party list)
  // ภูมิใจไทย: 51 seats (39 constituency + 12 party list)
  
  const knownResults: Record<string, { area: number; partyList: number }> = {
    'เพื่อไทย': { area: 126, partyList: 10 },
    'พลังประชารัฐ': { area: 97, partyList: 19 },
    'อนาคตใหม่': { area: 30, partyList: 51 },
    'ประชาธิปัตย์': { area: 33, partyList: 20 },
    'ภูมิใจไทย': { area: 39, partyList: 12 },
  };

  Object.entries(knownResults).forEach(([partyName, seats]) => {
    const partyId = partyMap.get(partyName);
    if (partyId && partyScores[partyId]) {
      partyScores[partyId].areaSeats = seats.area;
      partyScores[partyId].partyListSeats = seats.partyList;
    }
  });

  const resultData: ResultData = {
    electionScores: {
      1: {
        totalVotes: 38238858, // Actual 2562 total votes
        percentVoter: 74.69, // Actual 2562 turnout
      },
    },
    partyScores,
    areaBallotScores: [], // Would need actual vote counts per area
  };

  // Write output files
  console.log('💾 Writing output files...');
  fs.writeFileSync(
    path.join(outputDir, 'master-data.json'),
    JSON.stringify(masterData, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, 'result.json'),
    JSON.stringify(resultData, null, 2)
  );

  console.log('✅ Conversion complete!');
  console.log(`📁 Output files written to: ${outputDir}`);
  console.log(`   - master-data.json (${Object.keys(masterData.parties).length} parties, ${masterData.candidates.length} candidates)`);
  console.log(`   - result.json (${Object.keys(resultData.partyScores).length} party scores)`);
}

// Run conversion
convertData().catch(console.error);
