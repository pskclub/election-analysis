'use client';

import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell
} from 'recharts';
import { 
    Users, Trophy, Search, MapPin, Flag, Activity, Map as MapIcon, 
    Layout, Filter, CloudLightning, Loader2, AlertTriangle, Zap, LucideIcon, Target, User, Shield
} from 'lucide-react';

// Import types and utilities
import type { AppData, Region, Province, Party, ElectionArea, Candidate, PartyStats, ElectionScores } from './types';
import { fNum } from './utils';

// Import new Phase 1 components
import { CandidateDeepDive } from './CandidateDeepDive';
import { TargetSeatAnalyzer } from './TargetSeatAnalyzer';
import { AdvancedFilters } from './AdvancedFilters';
import { EnhancedOverview } from './EnhancedOverview';
import { EnhancedRegionalAnalysis } from './EnhancedRegionalAnalysis';
import { EnhancedPartyAnalysis } from './EnhancedPartyAnalysis';

// --- Configuration ---
const API_URLS = {
    MASTER: "https://storage.googleapis.com/voicetv-election-data-prod/result/master-data.json",
    RESULT: "https://storage.googleapis.com/voicetv-election-data-prod/result/result.json"
};

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
    const [selectedProvince, setSelectedProvince] = useState<number | null>(null);
    const [selectedArea, setSelectedArea] = useState<number | null>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [simulationSwing, setSimulationSwing] = useState(0);

    const filteredAreas = useMemo(() => {
        if (selectedProvince === null) return [];
        return data.electionAreas.filter(a => a.provinceId === selectedProvince).sort((a,b) => a.areaNo - b.areaNo);
    }, [selectedProvince, data]);

    const areaAnalytics = useMemo(() => {
        if (!selectedProvince || !selectedArea) return null;
        const cands = data.candidates.filter(c => c.electionAreaId === selectedArea);
        const simulatedCands = cands.map(c => ({ ...c, score: Math.floor(c.score * (1 + (simulationSwing/100))) })).sort((a, b) => b.score - a.score);
        const totalVotes = simulatedCands.reduce((sum, c) => sum + c.score, 0);
        const winner = simulatedCands[0];
        const margin = winner ? (winner.score - (simulatedCands[1]?.score || 0)) : 0;
        const marginPercent = totalVotes > 0 ? (margin / totalVotes) * 100 : 0;
        return { candidates: simulatedCands, totalVotes, winner, margin, marginPercent };
    }, [selectedProvince, selectedArea, simulationSwing, data]);

    const renderIntelligence = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <MapPin className="text-gray-400" size={18} />
                    <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm w-full md:w-64 outline-none" value={selectedProvince || ''} onChange={(e) => { setSelectedProvince(e.target.value ? parseInt(e.target.value) : null); setSelectedArea(null); }}>
                        <option value="">เลือกจังหวัด (Province)</option>
                        {data.provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Target className="text-gray-400" size={18} />
                    <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm w-full md:w-64 outline-none" value={selectedArea || ''} onChange={(e) => setSelectedArea(e.target.value ? parseInt(e.target.value) : null)} disabled={selectedProvince === null}>
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

    const handleMenuClick = (tabId: string) => {
        setActiveTab(tabId);
        setIsMobileSidebarOpen(false); // Close mobile sidebar after selection
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Overlay */}
            {isMobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 bg-white border-r border-gray-200 flex flex-col h-screen
                fixed lg:sticky top-0 z-50 lg:z-auto
                transition-transform duration-300 ease-in-out
                ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo/Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-900 text-white p-2 rounded-lg">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h1 className="font-bold text-base">War Room</h1>
                                <p className="text-xs text-gray-500">Commander Edition</p>
                            </div>
                        </div>
                        {/* Close button for mobile */}
                        <button
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="lg:hidden p-1 hover:bg-gray-100 rounded"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="px-3 space-y-1">
                        {[
                            { id: 'overview', label: 'ภาพรวม', sublabel: 'Overview', icon: Layout },
                            { id: 'region', label: 'รายภาค', sublabel: 'Regional', icon: MapIcon },
                            { id: 'party', label: 'รายพรรค', sublabel: 'Party', icon: Flag },
                            { id: 'candidate', label: 'รายบุคคล', sublabel: 'Candidate', icon: User },
                            { id: 'target', label: 'เขตเป้าหมาย', sublabel: 'Target Seats', icon: Target },
                            { id: 'filters', label: 'ค้นหาขั้นสูง', sublabel: 'Advanced', icon: Filter },
                            { id: 'intelligence', label: 'เจาะลึกพื้นที่', sublabel: 'Intelligence', icon: Search },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleMenuClick(tab.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 group ${
                                    activeTab === tab.id 
                                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <tab.icon 
                                    size={18} 
                                    className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                                />
                                <div className="flex-1">
                                    <div className={`text-sm ${activeTab === tab.id ? 'font-semibold' : 'font-medium'}`}>
                                        {tab.label}
                                    </div>
                                    <div className="text-xs opacity-60">{tab.sublabel}</div>
                                </div>
                                {activeTab === tab.id && (
                                    <div className="w-1 h-8 bg-blue-600 rounded-full absolute right-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <button 
                        onClick={onReset} 
                        className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset Data
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto w-full lg:w-auto">
                {/* Mobile Header with Hamburger */}
                <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="bg-gray-900 text-white p-1.5 rounded">
                            <Activity size={16} />
                        </div>
                        <span className="font-bold text-sm">War Room</span>
                    </div>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>

                {/* Content Area */}
                <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
                    {activeTab === 'overview' && <EnhancedOverview data={data} />}
                    {activeTab === 'region' && <EnhancedRegionalAnalysis data={data} />}
                    {activeTab === 'party' && <EnhancedPartyAnalysis data={data} />}
                    {activeTab === 'candidate' && <CandidateDeepDive data={data} />}
                    {activeTab === 'target' && <TargetSeatAnalyzer data={data} />}
                    {activeTab === 'filters' && <AdvancedFilters data={data} />}
                    {activeTab === 'intelligence' && renderIntelligence()}
                </div>
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