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
import type { AppData, Region, Province, Party, ElectionArea, Candidate, PartyStats, ElectionScores, MultiYearData, ElectionYear } from './types';
import { fNum } from './utils';
// import { load2562Data } from './loader2562'; // Deprecated
import { getElectionData } from './actions';
import { signOut } from 'next-auth/react';

// Import new Phase 1 components
import { CandidateDeepDive } from './CandidateDeepDive';
import { TargetSeatAnalyzer } from './TargetSeatAnalyzer';
import { AdvancedFilters } from './AdvancedFilters';
import { EnhancedOverview } from './EnhancedOverview';
import { EnhancedRegionalAnalysis } from './EnhancedRegionalAnalysis';
import { EnhancedPartyAnalysis } from './EnhancedPartyAnalysis';
import { TrendAnalysis } from './TrendAnalysis';

// --- Configuration ---
// const API_URLS = { ... } // Unused

// --- Sub-Components ---
// ... (StatCard, RegionalAnalysis, PartyAnalysis, WarRoomDashboard kept same as previous file view)
// Only replacing DataLoader and Main

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

interface WarRoomDashboardProps {
    multiYearData: MultiYearData;
    onReset: () => void;
}

const WarRoomDashboard: React.FC<WarRoomDashboardProps> = ({ multiYearData, onReset }) => {
    // ... Copy exact logic from previous `WarRoomDashboard`
     const [activeTab, setActiveTab] = useState('overview');
    const [selectedYear, setSelectedYear] = useState(multiYearData.currentYear);
    const [selectedProvince, setSelectedProvince] = useState<number | null>(null);
    const [selectedArea, setSelectedArea] = useState<number | null>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [simulationSwing, setSimulationSwing] = useState(0);

    // Get current year data
    const currentYearData = useMemo(() => {
        return multiYearData.years.find(y => y.year === selectedYear);
    }, [multiYearData, selectedYear]);

    const data = currentYearData?.data || multiYearData.years[0].data;

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
                        {areaAnalytics.winner ? (
                            <>
                                <StatCard title="Winner" value={areaAnalytics.winner.fullName} subtext={areaAnalytics.winner.partyName} icon={Trophy} color="yellow" />
                                <StatCard title="Margin" value={`+${fNum(areaAnalytics.margin)}`} subtext={`${areaAnalytics.marginPercent.toFixed(1)}% Gap`} icon={Shield} color={areaAnalytics.marginPercent > 10 ? 'green' : 'red'} />
                            </>
                        ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                                <AlertTriangle className="mx-auto mb-2 text-yellow-600" size={32} />
                                <p className="text-yellow-800 font-semibold">ไม่มีข้อมูลคะแนนเสียงรายเขต</p>
                                <p className="text-yellow-600 text-sm mt-1">ข้อมูลปี 2562 ไม่มีคะแนนเสียงระดับเขตเลือกตั้ง</p>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                         {areaAnalytics.candidates.length > 0 ? (
                             <>
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
                             </>
                         ) : (
                             <div className="px-6 py-12 text-center text-gray-400">
                                 <p>ไม่มีข้อมูลผู้สมัครในเขตนี้</p>
                             </div>
                         )}
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
                            { id: 'trends', label: 'แนวโน้ม', sublabel: 'Trends', icon: Activity },
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
                        className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-2"
                    >
                         <Shield size={16} />
                        Reset Data
                    </button>
                    <button 
                        onClick={() => signOut()} 
                        className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <User size={16} />
                        Logout
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
                    {/* Year Selector - Show only if not on trends tab and multiple years available */}
                    {activeTab !== 'trends' && multiYearData.years.length > 1 && (
                        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="font-bold text-gray-700">เลือกปีการเลือกตั้ง:</span>
                                <div className="flex gap-2">
                                    {multiYearData.years.map(year => (
                                        <button
                                            key={year.year}
                                            onClick={() => setSelectedYear(year.year)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                                selectedYear === year.year
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {year.label}
                                        </button>
                                    ))}
                                </div>
                                {currentYearData && (
                                    <span className="text-sm text-gray-500 ml-auto">
                                        {currentYearData.description}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'overview' && <EnhancedOverview data={data} />}
                    {activeTab === 'region' && <EnhancedRegionalAnalysis data={data} />}
                    {activeTab === 'party' && <EnhancedPartyAnalysis data={data} />}
                    {activeTab === 'candidate' && <CandidateDeepDive data={data} />}
                    {activeTab === 'target' && <TargetSeatAnalyzer data={data} />}
                    {activeTab === 'filters' && <AdvancedFilters data={data} />}
                    {activeTab === 'intelligence' && renderIntelligence()}
                    {activeTab === 'trends' && <TrendAnalysis multiYearData={multiYearData} />}
                </div>
            </main>
        </div>
    );
};

interface DataLoaderProps {
    onDataLoaded: (multiYearData: MultiYearData) => void;
}

const DataLoader: React.FC<DataLoaderProps> = ({ onDataLoaded }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        setError("");
        try {
            const years: ElectionYear[] = [];

            // 1. Load 2566 Data
            try {
                // @ts-ignore
                const appData2566 = await getElectionData(2566);
                if (appData2566) {
                    years.push({
                        year: 2566,
                        label: "2566",
                        description: "การเลือกตั้งทั่วไป พ.ศ. 2566",
                        date: "2023-05-14",
                        data: appData2566
                    });
                     console.log("✅ Loaded 2566 data from DB");
                } else {
                     console.warn("❌ 2566 Data not found in DB");
                }
            } catch (e) {
                console.warn("DB Load 2566 failed", e);
            }

            // 2. Load 2562 Data
            try {
                 // @ts-ignore
                 const appData2562 = await getElectionData(2562);
                 if (appData2562) {
                     years.push({
                        year: 2562,
                        label: "2562",
                        description: "การเลือกตั้งทั่วไป พ.ศ. 2562",
                        date: "2019-03-24",
                        data: appData2562
                    });
                     console.log("✅ Loaded 2562 data from DB");
                 } else {
                     console.warn("❌ 2562 Data not found in DB");
                 }
            } catch(e) {
                console.warn("DB Load 2562 failed", e);
            }

            if(years.length === 0) {
                throw new Error("No data found in Database. Please seed data first.");
            }

            // Sort years desc
            years.sort((a,b) => b.year - a.year);

            const multiYearData: MultiYearData = {
                years,
                currentYear: 2566
            };

            console.log(`📊 Loaded ${years.length} election year(s):`, years.map(y => y.year).join(', '));
            onDataLoaded(multiYearData);
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
                <p className="text-gray-500 mb-8 text-sm">เชื่อมต่อ Database เพื่อดึงข้อมูลการเลือกตั้ง</p>
                
                {error && <div className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg flex items-center gap-2 justify-center"><AlertTriangle size={16}/> {error}</div>}
                
                <button onClick={fetchData} disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    {isLoading ? <Loader2 className="animate-spin"/> : <Zap size={18} />}
                    {isLoading ? 'Loading from DB...' : 'Connect Database'}
                </button>
            </div>
        </div>
    );
};

const Main: React.FC = () => {
    const [multiYearData, setMultiYearData] = useState<MultiYearData | null>(null);
    return (
        <>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap'); body { font-family: 'Sarabun', sans-serif; }`}</style>
            {!multiYearData ? <DataLoader onDataLoaded={setMultiYearData} /> : <WarRoomDashboard multiYearData={multiYearData} onReset={() => setMultiYearData(null)} />}
        </>
    );
};

export default Main;