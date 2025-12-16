'use client';

import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { MapPin, TrendingUp, Users, Trophy, Target, Award, Zap } from 'lucide-react';
import { AppData } from './types';
import { fNum, fPercent, analyzeSeatsByCategory, analyzeProvinces } from './utils';

interface EnhancedRegionalAnalysisProps {
    data: AppData;
}

export const EnhancedRegionalAnalysis: React.FC<EnhancedRegionalAnalysisProps> = ({ data }) => {
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

    const provinceAnalysis = useMemo(() => analyzeProvinces(data), [data]);
    const seatAnalysis = useMemo(() => analyzeSeatsByCategory(data), [data]);

    const regionStats = useMemo(() => {
        const stats = data.regions.map(region => {
            const provincesInRegion = data.provinces.filter(p => p.regionId === region.id);
            const provinceIds = provincesInRegion.map(p => p.id);
            
            // Get all seats in this region
            const seatsInRegion = seatAnalysis.all.filter(seat => {
                const area = data.electionAreas.find(a => a.id === seat.id);
                return area && provinceIds.includes(area.provinceId);
            });

            // Calculate total votes
            const totalVotes = seatsInRegion.reduce((sum, seat) => sum + seat.totalVotes, 0);
            
            // Party breakdown
            const partySeats: Record<number, number> = {};
            const partyVotes: Record<number, number> = {};
            
            seatsInRegion.forEach(seat => {
                const partyId = seat.winner.partyId;
                partySeats[partyId] = (partySeats[partyId] || 0) + 1;
                partyVotes[partyId] = (partyVotes[partyId] || 0) + seat.winner.score;
            });

            // Find dominant party
            const dominantPartyId = Object.keys(partySeats).reduce((a, b) => 
                partySeats[parseInt(a)] > partySeats[parseInt(b)] ? a : b, '0'
            );
            const dominantParty = data.parties.find(p => p.id === parseInt(dominantPartyId));

            // Competitive seats
            const competitiveSeats = seatsInRegion.filter(s => 
                s.category === 'competitive' || s.category === 'lost'
            ).length;

            // Top 3 parties in region
            const topParties = Object.entries(partySeats)
                .map(([partyId, seats]) => {
                    const party = data.parties.find(p => p.id === parseInt(partyId));
                    return {
                        partyId: parseInt(partyId),
                        partyName: party?.name || 'Unknown',
                        partyColor: party?.color || '#ccc',
                        seats,
                        votes: partyVotes[parseInt(partyId)] || 0
                    };
                })
                .sort((a, b) => b.seats - a.seats)
                .slice(0, 3);

            return {
                id: region.id,
                name: region.name,
                totalVotes,
                totalSeats: seatsInRegion.length,
                provinces: provincesInRegion.length,
                dominantParty: dominantParty?.name || '-',
                dominantPartyColor: dominantParty?.color || '#ccc',
                dominantPartySeats: partySeats[parseInt(dominantPartyId)] || 0,
                competitiveSeats,
                competitivePercent: (competitiveSeats / seatsInRegion.length) * 100,
                topParties,
                partyBreakdown: partySeats
            };
        });

        return stats;
    }, [data, seatAnalysis]);

    const selectedRegion = useMemo(() => {
        if (!selectedRegionId) return null;
        return regionStats.find(r => r.id === selectedRegionId);
    }, [selectedRegionId, regionStats]);

    // Prepare data for regional comparison chart
    const regionalComparison = useMemo(() => {
        return regionStats.map(region => ({
            name: region.name,
            totalVotes: region.totalVotes,
            seats: region.totalSeats,
            competitive: region.competitiveSeats,
            ...region.topParties.slice(0, 3).reduce((acc, party, idx) => {
                acc[`party${idx + 1}`] = party.seats;
                return acc;
            }, {} as Record<string, number>)
        }));
    }, [regionStats]);

    // Radar chart data for selected region
    const radarData = useMemo(() => {
        if (!selectedRegion) return [];
        
        return selectedRegion.topParties.map(party => ({
            party: party.partyName,
            seats: party.seats,
            votes: party.votes / 10000, // Scale down for visualization
            fullMark: selectedRegion.totalSeats
        }));
    }, [selectedRegion]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Region Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regionStats.map(region => (
                    <button
                        key={region.id}
                        onClick={() => setSelectedRegionId(region.id)}
                        className={`bg-white rounded-xl border-2 shadow-sm p-5 text-left transition-all hover:shadow-md ${
                            selectedRegionId === region.id 
                                ? 'border-blue-500 ring-2 ring-blue-200' 
                                : 'border-gray-200'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-gray-400" />
                                <h3 className="font-bold text-gray-900">{region.name}</h3>
                            </div>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                {region.provinces} จังหวัด
                            </span>
                        </div>

                        <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">คะแนนรวม</span>
                                <span className="font-bold text-gray-900">{fNum(region.totalVotes)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">ที่นั่งทั้งหมด</span>
                                <span className="font-bold text-gray-900">{region.totalSeats}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">เขตดุเดือด</span>
                                <span className="font-bold text-red-600">{region.competitiveSeats}</span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500 mb-1">พรรคนำ</div>
                            <div className="flex items-center justify-between">
                                <span 
                                    className="px-3 py-1 rounded-full text-xs font-bold text-white"
                                    style={{ backgroundColor: region.dominantPartyColor }}
                                >
                                    {region.dominantParty}
                                </span>
                                <span className="text-sm font-bold text-gray-900">
                                    {region.dominantPartySeats} ที่นั่ง
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Regional Comparison Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">เปรียบเทียบรายภาค (Regional Comparison)</h3>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={regionalComparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(val) => fNum(val as number)} />
                            <Legend />
                            <Bar dataKey="seats" name="ที่นั่งทั้งหมด" fill="#3b82f6" />
                            <Bar dataKey="competitive" name="เขตดุเดือด" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Selected Region Details */}
            {selectedRegion && (
                <div className="space-y-6">
                    <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <MapPin className="text-blue-600" />
                                {selectedRegion.name}
                            </h3>
                            <button
                                onClick={() => setSelectedRegionId(null)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                ✕ ปิด
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center gap-2 text-blue-600 mb-2">
                                    <Users size={16} />
                                    <span className="text-xs font-bold uppercase">คะแนนรวม</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{fNum(selectedRegion.totalVotes)}</div>
                            </div>

                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-600 mb-2">
                                    <Trophy size={16} />
                                    <span className="text-xs font-bold uppercase">ที่นั่ง</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{selectedRegion.totalSeats}</div>
                            </div>

                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center gap-2 text-yellow-600 mb-2">
                                    <MapPin size={16} />
                                    <span className="text-xs font-bold uppercase">จังหวัด</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{selectedRegion.provinces}</div>
                            </div>

                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center gap-2 text-red-600 mb-2">
                                    <Target size={16} />
                                    <span className="text-xs font-bold uppercase">ดุเดือด</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{selectedRegion.competitiveSeats}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {fPercent(selectedRegion.competitivePercent)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Parties in Region */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="font-bold text-gray-800 mb-4">พรรคชั้นนำใน{selectedRegion.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {selectedRegion.topParties.map((party, index) => (
                                <div 
                                    key={party.partyId}
                                    className="border-2 rounded-xl p-4"
                                    style={{ borderColor: party.partyColor }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <Award size={18} style={{ color: party.partyColor }} />
                                        <span className="text-xs font-bold text-gray-500">อันดับ {index + 1}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">{party.partyName}</h4>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">ที่นั่ง</span>
                                            <span className="font-bold text-gray-900">{party.seats}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">คะแนน</span>
                                            <span className="font-bold text-gray-900">{fNum(party.votes)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">% ที่นั่ง</span>
                                            <span className="font-bold" style={{ color: party.partyColor }}>
                                                {fPercent((party.seats / selectedRegion.totalSeats) * 100)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Radar Chart */}
                    {radarData.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h3 className="font-bold text-gray-800 mb-4">การเปรียบเทียบพรรค (Party Comparison)</h3>
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="party" />
                                        <PolarRadiusAxis />
                                        <Radar name="ที่นั่ง" dataKey="seats" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                                        <Tooltip />
                                        <Legend />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
