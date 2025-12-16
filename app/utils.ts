import { 
    AppData, 
    CandidateAnalysis, 
    SeatAnalysis, 
    ProvinceAnalysis,
    Candidate,
    ElectionArea,
    Province
} from './types';

// --- Number Formatting ---
export const fNum = (n: number): string => new Intl.NumberFormat('th-TH').format(n);

export const fPercent = (n: number, decimals: number = 1): string => 
    `${n.toFixed(decimals)}%`;

// --- Candidate Analysis Utilities ---

export function analyzeCandidates(data: AppData): CandidateAnalysis[] {
    const analyzed: CandidateAnalysis[] = [];

    // Group candidates by election area
    const areaGroups = new Map<number, Candidate[]>();
    data.candidates.forEach(c => {
        if (!areaGroups.has(c.electionAreaId)) {
            areaGroups.set(c.electionAreaId, []);
        }
        areaGroups.get(c.electionAreaId)!.push(c);
    });

    // Analyze each area
    areaGroups.forEach((candidates, areaId) => {
        const sorted = [...candidates].sort((a, b) => b.score - a.score);
        const totalVotes = sorted.reduce((sum, c) => sum + c.score, 0);
        const area = data.electionAreas.find(a => a.id === areaId);
        const province = area ? data.provinces.find(p => p.id === area.provinceId) : null;
        const region = province ? data.regions.find(r => r.id === province.regionId) : null;

        sorted.forEach((candidate, index) => {
            const isWinner = index === 0;
            const marginVotes = isWinner && sorted[1] 
                ? candidate.score - sorted[1].score 
                : (sorted[0] ? sorted[0].score - candidate.score : 0);
            const marginPercent = totalVotes > 0 ? (marginVotes / totalVotes) * 100 : 0;
            const voteShare = totalVotes > 0 ? (candidate.score / totalVotes) * 100 : 0;

            analyzed.push({
                ...candidate,
                areaName: area?.name,
                provinceName: province?.name,
                regionName: region?.name,
                rank: index + 1,
                isWinner,
                marginVotes,
                marginPercent: Math.abs(marginPercent),
                voteShare,
                potentialScore: calculatePotentialScore(candidate, isWinner, marginPercent),
                competitiveIndex: calculateCompetitiveIndex(marginPercent)
            });
        });
    });

    return analyzed;
}

function calculatePotentialScore(
    candidate: Candidate, 
    isWinner: boolean, 
    marginPercent: number
): number {
    let score = 50; // Base score

    if (isWinner) score += 30;
    else if (marginPercent < 5) score += 20; // Close race
    else if (marginPercent < 10) score += 10;

    // Bonus for high vote count
    if (candidate.score > 100000) score += 10;
    else if (candidate.score > 50000) score += 5;

    return Math.min(100, score);
}

function calculateCompetitiveIndex(marginPercent: number): number {
    if (marginPercent < 3) return 100; // Extremely competitive
    if (marginPercent < 5) return 80;
    if (marginPercent < 10) return 60;
    if (marginPercent < 15) return 40;
    if (marginPercent < 20) return 20;
    return 0; // Not competitive
}

// --- Seat Analysis Utilities ---

export function analyzeSeatsByCategory(data: AppData): {
    safe: SeatAnalysis[];
    marginal: SeatAnalysis[];
    competitive: SeatAnalysis[];
    lost: SeatAnalysis[];
    all: SeatAnalysis[];
} {
    const seats: SeatAnalysis[] = [];
    const candidateAnalysis = analyzeCandidates(data);

    // Group by area
    const areaGroups = new Map<number, CandidateAnalysis[]>();
    candidateAnalysis.forEach(c => {
        if (!areaGroups.has(c.electionAreaId)) {
            areaGroups.set(c.electionAreaId, []);
        }
        areaGroups.get(c.electionAreaId)!.push(c);
    });

    areaGroups.forEach((candidates, areaId) => {
        const sorted = [...candidates].sort((a, b) => b.score - a.score);
        if (sorted.length < 1) return;

        const winner = sorted[0];
        const runnerUp = sorted[1];
        const totalVotes = sorted.reduce((sum, c) => sum + c.score, 0);
        const margin = runnerUp ? winner.score - runnerUp.score : winner.score;
        const marginPercent = totalVotes > 0 ? (margin / totalVotes) * 100 : 0;
        const competitiveIndex = calculateCompetitiveIndex(marginPercent);

        let category: 'safe' | 'marginal' | 'competitive' | 'lost';
        if (marginPercent > 20) category = 'safe';
        else if (marginPercent > 10) category = 'marginal';
        else if (marginPercent > 5) category = 'competitive';
        else category = 'lost'; // Too close to call or lost

        seats.push({
            id: areaId,
            areaName: winner.areaName || '',
            provinceName: winner.provinceName || '',
            regionName: winner.regionName || '',
            winner,
            runnerUp,
            margin,
            marginPercent,
            totalVotes,
            category,
            competitiveIndex
        });
    });

    return {
        all: seats,
        safe: seats.filter(s => s.category === 'safe'),
        marginal: seats.filter(s => s.category === 'marginal'),
        competitive: seats.filter(s => s.category === 'competitive'),
        lost: seats.filter(s => s.category === 'lost')
    };
}

// --- Province Analysis Utilities ---

export function analyzeProvinces(data: AppData): ProvinceAnalysis[] {
    const provinceMap = new Map<number, ProvinceAnalysis>();

    data.provinces.forEach(province => {
        const region = data.regions.find(r => r.id === province.regionId);
        provinceMap.set(province.id, {
            id: province.id,
            name: province.name,
            regionId: province.regionId,
            regionName: region?.name || '',
            totalVotes: 0,
            totalSeats: 0,
            partyBreakdown: {},
            competitiveSeats: 0
        });
    });

    // Aggregate data
    const seatAnalysis = analyzeSeatsByCategory(data);
    
    seatAnalysis.all.forEach(seat => {
        const area = data.electionAreas.find(a => a.id === seat.id);
        if (!area) return;

        const provinceData = provinceMap.get(area.provinceId);
        if (!provinceData) return;

        provinceData.totalVotes += seat.totalVotes;
        provinceData.totalSeats += 1;

        if (!provinceData.partyBreakdown[seat.winner.partyId]) {
            provinceData.partyBreakdown[seat.winner.partyId] = 0;
        }
        provinceData.partyBreakdown[seat.winner.partyId] += 1;

        if (seat.category === 'competitive' || seat.category === 'marginal') {
            provinceData.competitiveSeats += 1;
        }
    });

    // Find dominant party
    provinceMap.forEach(province => {
        const parties = Object.entries(province.partyBreakdown);
        if (parties.length > 0) {
            const dominant = parties.reduce((a, b) => a[1] > b[1] ? a : b);
            province.dominantPartyId = parseInt(dominant[0]);
        }
    });

    return Array.from(provinceMap.values());
}

// --- Search & Filter Utilities ---

export function searchCandidates(
    candidates: CandidateAnalysis[],
    query: string
): CandidateAnalysis[] {
    if (!query.trim()) return candidates;

    const lowerQuery = query.toLowerCase().trim();
    return candidates.filter(c => 
        c.fullName.toLowerCase().includes(lowerQuery) ||
        c.partyName.toLowerCase().includes(lowerQuery) ||
        c.areaName?.toLowerCase().includes(lowerQuery) ||
        c.provinceName?.toLowerCase().includes(lowerQuery)
    );
}

// --- Color Utilities ---

export function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        safe: '#10b981', // green
        marginal: '#f59e0b', // amber
        competitive: '#ef4444', // red
        lost: '#6b7280' // gray
    };
    return colors[category] || '#6b7280';
}

export function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        safe: 'ชนะแน่นอน',
        marginal: 'ชนะห่างน้อย',
        competitive: 'ดุเดือด',
        lost: 'แพ้/ไม่แน่นอน'
    };
    return labels[category] || category;
}
