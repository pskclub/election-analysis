// --- Core Data Types ---

export interface Region {
    id: number;
    name: string;
}

export interface Province {
    id: number;
    name: string;
    regionId: number;
}

export interface Party {
    id: number;
    name: string;
    color: string;
}

export interface ElectionArea {
    id: number;
    name: string;
    provinceId: number;
    areaNo: number;
}

export interface Candidate {
    id: number;
    fullName: string;
    partyId: number;
    electionAreaId: number;
    score: number;
    partyName: string;
    partyColor: string;
    // Extended fields for historical tracking
    previousPartyId?: number;
    previousScore?: number;
    isIncumbent?: boolean;
    yearsInPolitics?: number;
}

export interface PartyStats extends Party {
    totalSeat: number;
    areaSeats?: number;
    partyListSeats?: number;
    totalVotes?: number;
}

export interface ElectionScores {
    [key: number]: {
        totalVotes: number;
        percentVoter: number;
    };
}

export interface AppData {
    regions: Region[];
    provinces: Province[];
    parties: Party[];
    candidates: Candidate[];
    partyStats: PartyStats[];
    electionAreas: ElectionArea[];
    electionScores: ElectionScores;
}

// --- Multi-Year Election Types ---

export interface ElectionYear {
    year: number;
    label: string; // e.g., "2566", "2562"
    description: string; // e.g., "การเลือกตั้งทั่วไป พ.ศ. 2566"
    date: string; // ISO date string
    data: AppData;
}

export interface MultiYearData {
    years: ElectionYear[];
    currentYear: number;
}

export interface TrendData {
    year: number;
    label: string;
    totalVotes: number;
    turnout: number;
    totalSeats: number;
    partySeats: Record<number, number>; // partyId -> seats
}

export interface PartyTrend {
    partyId: number;
    partyName: string;
    partyColor: string;
    yearlyData: {
        year: number;
        seats: number;
        votes: number;
        seatChange?: number;
        voteChange?: number;
    }[];
}

// --- Analysis Types ---

export interface CandidateAnalysis extends Candidate {
    areaName?: string;
    provinceName?: string;
    regionName?: string;
    rank?: number;
    isWinner?: boolean;
    marginVotes?: number;
    marginPercent?: number;
    voteShare?: number;
    potentialScore?: number;
    competitiveIndex?: number;
}

export interface SeatAnalysis {
    id: number;
    areaName: string;
    provinceName: string;
    regionName: string;
    winner: CandidateAnalysis;
    runnerUp?: CandidateAnalysis;
    margin: number;
    marginPercent: number;
    totalVotes: number;
    category: 'safe' | 'marginal' | 'competitive' | 'lost';
    competitiveIndex: number;
}

export interface ProvinceAnalysis {
    id: number;
    name: string;
    regionId: number;
    regionName: string;
    totalVotes: number;
    totalSeats: number;
    partyBreakdown: Record<number, number>;
    dominantPartyId?: number;
    competitiveSeats: number;
    turnoutPercent?: number;
}

export interface FilterOptions {
    searchQuery: string;
    selectedParties: number[];
    selectedProvinces: number[];
    selectedRegions: number[];
    scoreRange: [number, number];
    status: 'all' | 'winner' | 'loser' | 'competitive';
    seatCategory: 'all' | 'safe' | 'marginal' | 'competitive' | 'lost';
}
