'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
    FileText, BarChart2, Target, TrendingUp, AlertTriangle, 
    Users, Trophy, Search, MapPin, User, CheckCircle, XCircle, 
    Edit3, Loader2, Flag, Activity, Zap, Shield, Map as MapIcon, Layout, Filter, CloudLightning, LucideIcon
} from 'lucide-react';

// --- Type Definitions ---
interface Region {
    id: number;
    name: string;
}

interface Province {
    id: number;
    name: string;
    regionId: number;
}

interface Party {
    id: number;
    name: string;
    color: string;
}

interface ElectionArea {
    id: number;
    name: string;
    provinceId: number;
    areaNo: number;
}

interface Candidate {
    id: number;
    fullName: string;
    partyId: number;
    electionAreaId: number;
    score: number;
    partyName: string;
    partyColor: string;
}

interface PartyStats extends Party {
    totalSeat: number;
    areaSeats?: number;
    partyListSeats?: number;
}

interface ElectionScores {
    [key: number]: {
        totalVotes: number;
        percentVoter: number;
    };
}

interface AppData {
    regions: Region[];
    provinces: Province[];
    parties: Party[];
    candidates: Candidate[];
    partyStats: PartyStats[];
    electionAreas: ElectionArea[];
    electionScores: ElectionScores;
}

// --- Configuration ---
const API_URLS = {
    MASTER: "https://storage.googleapis.com/voicetv-election-data-prod/result/master-data.json",
    RESULT: "https://storage.googleapis.com/voicetv-election-data-prod/result/result.json"
};

// --- Helper Functions ---
const fNum = (n: number): string => new Intl.NumberFormat('th-TH').format(n);

// --- Sub-Components ---

interface StatCardProps {
    title: string;
    value: string;
    subtext?: React.ReactNode;
    icon: LucideIcon;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'indigo';
    size?: 'normal' | 'large';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon: Icon, color = "blue", size="normal" }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        red: 'bg-red-50 text-red-600',
        indigo: 'bg-indigo-50 text-indigo-600'
    };

    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all ${size === 'large' ? 'p-6' : 'p-4'}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
                    <h3 className={`font-bold text-gray-800 mt-1 ${size === 'large' ? 'text-3xl' : 'text-xl'}`}>{value}</h3>
                </div>
                <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={size === 'large' ? 24 : 20} />
                </div>
            </div>
            {subtext && <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">{subtext}</p>}
        </div>
    );
};

// --- Analysis Views ---

interface RegionalAnalysisProps {
    data: AppData;
}

const RegionalAnalysis: React.FC<RegionalAnalysisProps> = ({ data }) => {
    interface RegionStat {
        id: number;
        name: string;
        totalVotes: number;
        seats: number;
        partyBreakdown: Record<number, number>;
    }

    const regionStats = useMemo(() => {
        const stats: Record<number, RegionStat> = {};
        data.regions.forEach(r => {
            stats[r.id] = { id: r.id, name: r.name, totalVotes: 0, seats: 0, partyBreakdown: {} };
        });

        data.candidates.forEach(c => {
            const area = data.electionAreas.find(a => a.id === c.electionAreaId);
            const province = area ? data.provinces.find(p => p.id === area.provinceId) : null;
            
            if (province && stats[province.regionId]) {
                const reg = stats[province.regionId];
                reg.totalVotes += c.score;
                if (!reg.partyBreakdown[c.partyId]) reg.partyBreakdown[c.partyId] = 0;
                reg.partyBreakdown[c.partyId] += c.score;
            }
        });

        return Object.values(stats).map(reg => {
            const topPartyId = Object.keys(reg.partyBreakdown).reduce((a, b) => reg.partyBreakdown[parseInt(a)] > reg.partyBreakdown[parseInt(b)] ? a : b, '');
            const topParty = topPartyId ? data.parties.find(p => p.id === parseInt(topPartyId)) : null;

            return {
                ...reg,
                topPartyName: topParty?.name || '-',
                topPartyColor: topParty?.color || '#ccc',
                ...Object.keys(reg.partyBreakdown).reduce((acc: Record<string, number>, pid) => {
                    const pName = data.parties.find(p => p.id === parseInt(pid))?.name || pid;
                    if(reg.partyBreakdown[parseInt(pid)] > (reg.totalVotes * 0.05)) {
                        acc[pName] = reg.partyBreakdown[parseInt(pid)];
                    }
                    return acc;
                }, {})
            };
        });
    }, [data]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-2">
                    <h3 className="font-bold text-gray-800 mb-4">ส่วนแบ่งคะแนนรายภาค (Regional Vote Share)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} />
                                <Tooltip formatter={(val) => fNum(val as number)} />
                                <Legend />
                                {data.parties.slice(0, 5).map((p) => (
                                    <Bar key={p.id} dataKey={p.name} stackId="a" fill={p.color} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {regionStats.map(reg => (
                    <div key={reg.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                        <div>
                            <div className="text-gray-500 text-xs uppercase font-bold tracking-wider">{reg.name}</div>
                            <div className="text-2xl font-bold text-gray-800 mt-1">{fNum(reg.totalVotes)} <span className="text-sm font-normal text-gray-400">เสียง</span></div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400 mb-1">พรรคยอดนิยม</div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: reg.topPartyColor }}>
                                {reg.topPartyName}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface PartyAnalysisProps {
    data: AppData;
}

const PartyAnalysis: React.FC<PartyAnalysisProps> = ({ data }) => {
    const [selectedPartyId, setSelectedPartyId] = useState<number | string>(data.parties[0]?.id || '');
    
    const partyStats = useMemo(() => {
        if (!selectedPartyId) return null;
        
        const partyIdNum = typeof selectedPartyId === 'string' ? parseInt(selectedPartyId) : selectedPartyId;
        const party = data.parties.find(p => p.id === partyIdNum);
        const candidates = data.candidates.filter(c => c.partyId === partyIdNum).sort((a, b) => b.score - a.score);
        const totalVotes = candidates.reduce((sum, c) => sum + c.score, 0);
        
        const provinceScores: Record<number, number> = {};
        candidates.forEach(c => {
            const area = data.electionAreas.find(a => a.id === c.electionAreaId);
            if(area) {
                if(!provinceScores[area.provinceId]) provinceScores[area.provinceId] = 0;
                provinceScores[area.provinceId] += c.score;
            }
        });
        
        const bestProvinceId = Object.keys(provinceScores).reduce((a, b) => provinceScores[parseInt(a)] > provinceScores[parseInt(b)] ? a : b, '');
        const bestProvince = bestProvinceId ? data.provinces.find(p => p.id === parseInt(bestProvinceId)) : null;

        const topCandidates = candidates.slice(0, 5).map(c => {
             const area = data.electionAreas.find(a => a.id === c.electionAreaId);
             const province = area ? data.provinces.find(p => p.id === area.provinceId) : null;
             return { ...c, areaName: area?.name, provinceName: province?.name };
        });

        return { party, totalVotes, bestProvince, topCandidates };
    }, [selectedPartyId, data]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <Flag className="text-gray-400" />
                <span className="font-bold text-gray-700">เลือกพรรคการเมือง:</span>
                <select 
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                >
                    {data.parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {partyStats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border-l-4 shadow-sm" style={{ borderLeftColor: partyStats.party?.color || '#ccc' }}>
                            <div className="text-gray-500 text-xs font-bold uppercase">คะแนนรวม (Total Votes)</div>
                            <div className="text-3xl font-bold mt-2">{fNum(partyStats.totalVotes)}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-gray-500 text-xs font-bold uppercase">ฐานเสียงหลัก (Stronghold)</div>
                            <div className="text-xl font-bold mt-2 text-gray-800">{partyStats.bestProvince?.name || '-'}</div>
                            <div className="text-xs text-gray-400 mt-1">จังหวัดที่ได้คะแนนรวมสูงสุด</div>
                        </div>
                         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-gray-500 text-xs font-bold uppercase">จำนวนผู้สมัคร (Candidates)</div>
                            <div className="text-3xl font-bold mt-2 text-gray-800">{fNum(data.candidates.filter(c => c.partyId === (typeof selectedPartyId === 'string' ? parseInt(selectedPartyId) : selectedPartyId)).length)}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-800">Top 5 ขุนพล (Highest Votes)</div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3">ชื่อ</th>
                                        <th className="px-6 py-3">พื้นที่</th>
                                        <th className="px-6 py-3 text-right">คะแนน</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {partyStats.topCandidates.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-6 py-3 font-medium">{c.fullName}</td>
                                            <td className="px-6 py-3 text-gray-500">{c.provinceName} / {c.areaName}</td>
                                            <td className="px-6 py-3 text-right font-mono text-blue-600">{fNum(c.score)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                             <div className="font-bold text-gray-800 mb-4">จุดยุทธศาสตร์รายภาค (Regional Strength)</div>
                             <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.regions.map(r => {
                                         const partyIdNum = typeof selectedPartyId === 'string' ? parseInt(selectedPartyId) : selectedPartyId;
                                         const score = data.candidates
                                            .filter(c => c.partyId === partyIdNum)
                                            .filter(c => {
                                                const area = data.electionAreas.find(a => a.id === c.electionAreaId);
                                                const prov = area ? data.provinces.find(p => p.id === area.provinceId) : null;
                                                return prov && prov.regionId === r.id;
                                            })
                                            .reduce((sum, c) => sum + c.score, 0);
                                         return { name: r.name, votes: score };
                                    })}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip formatter={(val) => fNum(val as number)} />
                                        <Bar dataKey="votes" fill={partyStats.party?.color || '#3b82f6'} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                             </div>
                         </div>
                    </div>
                </>
            )}
        </div>
    );
};

interface WarRoomDashboardProps {
    data: AppData;
    onReset: () => void;
}

const WarRoomDashboard: React.FC<WarRoomDashboardProps> = ({ data, onReset }) => {
    const [activeTab, setActiveTab] = useState('overview');
    
    // Existing "Intelligence" Logic
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [simulationSwing, setSimulationSwing] = useState(0);

    const filteredAreas = useMemo(() => {
        if (!selectedProvince) return [];
        return data.electionAreas.filter(a => a.provinceId === parseInt(selectedProvince)).sort((a,b) => a.areaNo - b.areaNo);
    }, [selectedProvince, data]);

    const areaAnalytics = useMemo(() => {
        if (!selectedProvince || !selectedArea) return null;
        const cands = data.candidates.filter(c => c.electionAreaId === parseInt(selectedArea));
        const simulatedCands = cands.map(c => ({ ...c, score: Math.floor(c.score * (1 + (simulationSwing/100))) })).sort((a, b) => b.score - a.score);
        const totalVotes = simulatedCands.reduce((sum, c) => sum + c.score, 0);
        const winner = simulatedCands[0];
        const margin = winner ? (winner.score - (simulatedCands[1]?.score || 0)) : 0;
        const marginPercent = totalVotes > 0 ? (margin / totalVotes) * 100 : 0;
        return { candidates: simulatedCands, totalVotes, winner, margin, marginPercent };
    }, [selectedProvince, selectedArea, simulationSwing, data]);

    const renderIntelligence = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center sticky top-20 z-20">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <MapPin className="text-gray-400" size={18} />
                    <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm w-full md:w-64 outline-none" value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setSelectedArea(''); }}>
                        <option value="">เลือกจังหวัด (Province)</option>
                        {data.provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Target className="text-gray-400" size={18} />
                    <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm w-full md:w-64 outline-none" value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} disabled={!selectedProvince}>
                        <option value="">เลือกเขต (Area)</option>
                        {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                 {areaAnalytics && (
                    <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 ml-auto">
                        <span className="text-xs font-bold text-blue-700 uppercase">Sim</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSimulationSwing(s => s - 5)} className="w-6 h-6 rounded bg-white text-blue-600 flex items-center justify-center hover:bg-blue-100">-</button>
                            <span className="text-sm font-mono w-12 text-center">{simulationSwing > 0 ? '+' : ''}{simulationSwing}%</span>
                            <button onClick={() => setSimulationSwing(s => s + 5)} className="w-6 h-6 rounded bg-white text-blue-600 flex items-center justify-center hover:bg-blue-100">+</button>
                        </div>
                    </div>
                )}
            </div>
            
            {areaAnalytics ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-4">
                        <StatCard title="Winner" value={areaAnalytics.winner.fullName} subtext={areaAnalytics.winner.partyName} icon={Trophy} color="yellow" />
                        <StatCard title="Margin" value={`+${fNum(areaAnalytics.margin)}`} subtext={`${areaAnalytics.marginPercent.toFixed(1)}% Gap`} icon={Shield} color={areaAnalytics.marginPercent > 10 ? 'green' : 'red'} />
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                         <div className="px-6 py-4 border-b border-gray-100 font-bold">ผลการเลือกตั้ง (Simulation Mode)</div>
                         <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500"><tr><th className="px-6 py-3">ผู้สมัคร</th><th className="px-6 py-3 text-right">คะแนน</th><th className="px-6 py-3 text-right">%</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {areaAnalytics.candidates.map(c => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-gray-800">{c.fullName}</div>
                                            <div className="text-xs text-gray-500">{c.partyName}</div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-blue-600">{fNum(c.score)}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">{((c.score/areaAnalytics.totalVotes)*100).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-xl">เลือกพื้นที่เพื่อเริ่มวิเคราะห์</div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
             <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-900 text-white p-2 rounded-lg"><Activity size={20} /></div>
                        <h1 className="font-bold text-lg">War Room <span className="text-gray-400 font-normal text-sm ml-2">Commander Edition</span></h1>
                    </div>
                    <button onClick={onReset} className="text-sm text-red-500 hover:text-red-700 font-medium">Reset Data</button>
                </div>
                <div className="border-t border-gray-100 bg-gray-50/50 backdrop-blur">
                    <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-1">
                        {[
                            { id: 'overview', label: 'ภาพรวม (Overview)', icon: Layout },
                            { id: 'region', label: 'รายภาค (Regional)', icon: MapIcon }, // Use aliased MapIcon
                            { id: 'party', label: 'รายพรรค (Party)', icon: Flag },
                            { id: 'intelligence', label: 'เจาะลึกพื้นที่ (Intelligence)', icon: Search },
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
                                    ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <StatCard title="Total Votes" value={fNum(data.electionScores?.[1]?.totalVotes || 0)} icon={Users} />
                            <StatCard title="Turnout" value={`${data.electionScores?.[1]?.percentVoter || 0}%`} icon={Activity} color="green" />
                            <StatCard title="Winning Party" value={data.partyStats[0]?.name || '-'} icon={Trophy} color="yellow" />
                            <StatCard title="Candidates" value={fNum(data.candidates.length)} icon={User} color="indigo" />
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold mb-4">Parliament Composition</h3>
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.partyStats.slice(0, 10)} layout="vertical" margin={{left:20}}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={120} style={{fontSize:12}} />
                                        <Tooltip formatter={(val) => fNum(val as number)} />
                                        <Bar dataKey="totalSeat" fill="#3b82f6" radius={[0,4,4,0]} barSize={24}>
                                            {data.partyStats.slice(0, 10).map((e,i) => <Cell key={i} fill={e.color || '#ccc'} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'region' && <RegionalAnalysis data={data} />}
                {activeTab === 'party' && <PartyAnalysis data={data} />}
                {activeTab === 'intelligence' && renderIntelligence()}
            </main>
        </div>
    );
};

interface DataLoaderProps {
    onDataLoaded: (data: AppData) => void;
}

const DataLoader: React.FC<DataLoaderProps> = ({ onDataLoaded }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        setError("");
        try {
            const [masterRes, resultRes] = await Promise.all([
                fetch(API_URLS.MASTER),
                fetch(API_URLS.RESULT)
            ]);

            if (!masterRes.ok || !resultRes.ok) throw new Error("Failed to connect to Data API");

            const m: any = await masterRes.json();
            const r: any = await resultRes.json();

            // Process Data
            const regions: Region[] = Object.values(m.regions || {}).map((v: any) => v as Region);
            const provinces: Province[] = (m.provinces || []) as Province[];
            const parties: Party[] = Object.values(m.parties || {}).map((v: any) => ({...v, id: parseInt(v.id || 0)})) as Party[];
            const partyMap = new Map(parties.map(p => [p.id, p]));
            
            const scoreMap = new Map<number, number>();
            (r.areaBallotScores || []).forEach((area: any) => {
                if(area.candidates) area.candidates.forEach((c: any) => scoreMap.set(c.id, c.totalVotes));
            });

            const candidates: Candidate[] = (m.candidates || []).map((c: any) => ({
                ...c,
                score: scoreMap.get(c.id) || 0,
                partyName: partyMap.get(c.partyId)?.name || 'N/A',
                partyColor: partyMap.get(c.partyId)?.color || '#ccc'
            })) as Candidate[];

            const partyStats: PartyStats[] = Object.values(r.partyScores || {}).map((s: any) => ({
                ...s, ...(partyMap.get(s.id) || {}),
                totalSeat: (s.areaSeats || 0) + (s.partyListSeats || 0)
            })).sort((a: any, b: any) => b.totalSeat - a.totalSeat) as PartyStats[];

            onDataLoaded({
                regions, 
                provinces, 
                parties, 
                candidates, 
                partyStats,
                electionAreas: (m.electionAreas || []) as ElectionArea[],
                electionScores: (r.electionScores || {}) as ElectionScores
            });
        } catch (e: any) { 
            setError(e.message || "An error occurred"); 
        } finally { 
            setIsLoading(false); 
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><CloudLightning size={32}/></div>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Live Election Data</h2>
                <p className="text-gray-500 mb-8 text-sm">เชื่อมต่อ API เพื่อดึงข้อมูลการเลือกตั้งล่าสุด</p>
                
                {error && <div className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg flex items-center gap-2 justify-center"><AlertTriangle size={16}/> {error}</div>}
                
                <button onClick={fetchData} disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    {isLoading ? <Loader2 className="animate-spin"/> : <Zap size={18} />}
                    {isLoading ? 'Downloading...' : 'Connect Live Data'}
                </button>
            </div>
        </div>
    );
};

const Main: React.FC = () => {
    const [data, setData] = useState<AppData | null>(null);
    return (
        <>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap'); body { font-family: 'Sarabun', sans-serif; }`}</style>
            {!data ? <DataLoader onDataLoaded={setData} /> : <WarRoomDashboard data={data} onReset={() => setData(null)} />}
        </>
    );
};

export default Main;