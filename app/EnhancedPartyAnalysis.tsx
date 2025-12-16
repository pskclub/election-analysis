'use client';

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Flag, Trophy, TrendingUp, MapPin, Users, Zap, AlertCircle } from 'lucide-react';
import { AppData } from './types';
import { fNum, fPercent, analyzeCandidates, analyzeSeatsByCategory } from './utils';

interface EnhancedPartyAnalysisProps {
    data: AppData;
}

export const EnhancedPartyAnalysis: React.FC<EnhancedPartyAnalysisProps> = ({ data }) => {
    // Sort parties by impact (totalSeat) in descending order
    const sortedParties = useMemo(() => {
        return [...data.parties].sort((a, b) => {
            const aStats = data.partyStats.find(ps => ps.id === a.id);
            const bStats = data.partyStats.find(ps => ps.id === b.id);
            const aTotalSeat = aStats?.totalSeat || 0;
            const bTotalSeat = bStats?.totalSeat || 0;
            return bTotalSeat - aTotalSeat;
        });
    }, [data.parties, data.partyStats]);

    // Initialize with the party that has the highest impact (totalSeat)
    const [selectedPartyId, setSelectedPartyId] = useState<number | string>(sortedParties[0]?.id || '');
    
    const candidateAnalysis = useMemo(() => analyzeCandidates(data), [data]);
    const seatAnalysis = useMemo(() => analyzeSeatsByCategory(data), [data]);

    const partyStats = useMemo(() => {
        if (!selectedPartyId) return null;
        
        const partyIdNum = typeof selectedPartyId === 'string' ? parseInt(selectedPartyId) : selectedPartyId;
        const party = data.parties.find(p => p.id === partyIdNum);
        const partyStat = data.partyStats.find(p => p.id === partyIdNum);
        
        // Get all candidates from this party
        const candidates = candidateAnalysis.filter(c => c.partyId === partyIdNum);
        const totalVotes = candidates.reduce((sum, c) => sum + c.score, 0);
        
        // Winners and losers
        const winners = candidates.filter(c => c.isWinner);
        const losers = candidates.filter(c => !c.isWinner);
        
        // Seats won by this party
        const seatsWon = seatAnalysis.all.filter(s => s.winner.partyId === partyIdNum);
        const safeSeats = seatsWon.filter(s => s.category === 'safe');
        const marginalSeats = seatsWon.filter(s => s.category === 'marginal');
        const competitiveSeats = seatsWon.filter(s => s.category === 'competitive' || s.category === 'lost');
        
        // Province breakdown
        const provinceScores: Record<number, { votes: number; seats: number; candidates: number }> = {};
        candidates.forEach(c => {
            const area = data.electionAreas.find(a => a.id === c.electionAreaId);
            if (area) {
                if (!provinceScores[area.provinceId]) {
                    provinceScores[area.provinceId] = { votes: 0, seats: 0, candidates: 0 };
                }
                provinceScores[area.provinceId].votes += c.score;
                provinceScores[area.provinceId].candidates += 1;
                if (c.isWinner) provinceScores[area.provinceId].seats += 1;
            }
        });
        
        // Top provinces
        const topProvinces = Object.entries(provinceScores)
            .map(([provinceId, stats]) => {
                const province = data.provinces.find(p => p.id === parseInt(provinceId));
                return {
                    provinceId: parseInt(provinceId),
                    provinceName: province?.name || 'Unknown',
                    ...stats,
                    winRate: stats.candidates > 0 ? (stats.seats / stats.candidates) * 100 : 0
                };
            })
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 10);
        
        // Best province (highest win rate with at least 2 candidates)
        const bestProvince = Object.entries(provinceScores)
            .map(([provinceId, stats]) => {
                const province = data.provinces.find(p => p.id === parseInt(provinceId));
                return {
                    provinceId: parseInt(provinceId),
                    provinceName: province?.name || 'Unknown',
                    ...stats,
                    winRate: stats.candidates > 0 ? (stats.seats / stats.candidates) * 100 : 0
                };
            })
            .filter(p => p.candidates >= 2)
            .sort((a, b) => b.winRate - a.winRate)[0];

        // Top candidates
        const topCandidates = candidates
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        // Regional strength
        const regionalStrength = data.regions.map(region => {
            const provincesInRegion = data.provinces.filter(p => p.regionId === region.id);
            const provinceIds = provincesInRegion.map(p => p.id);
            
            const candidatesInRegion = candidates.filter(c => {
                const area = data.electionAreas.find(a => a.id === c.electionAreaId);
                return area && provinceIds.includes(area.provinceId);
            });
            
            const votes = candidatesInRegion.reduce((sum, c) => sum + c.score, 0);
            const seats = candidatesInRegion.filter(c => c.isWinner).length;
            
            return {
                name: region.name,
                votes,
                seats,
                candidates: candidatesInRegion.length
            };
        });

        // Performance metrics
        const avgVotes = totalVotes / candidates.length;
        const winRate = (winners.length / candidates.length) * 100;
        const avgMargin = winners.reduce((sum, w) => sum + (w.marginPercent || 0), 0) / (winners.length || 1);

        return {
            party,
            partyStat,
            totalVotes,
            totalCandidates: candidates.length,
            winners: winners.length,
            losers: losers.length,
            winRate,
            avgVotes,
            avgMargin,
            seatsWon: seatsWon.length,
            safeSeats: safeSeats.length,
            marginalSeats: marginalSeats.length,
            competitiveSeats: competitiveSeats.length,
            bestProvince,
            topProvinces,
            topCandidates,
            regionalStrength
        };
    }, [selectedPartyId, data, candidateAnalysis, seatAnalysis]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Party Selector */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <Flag className="text-gray-400" />
                <span className="font-bold text-gray-700">เลือกพรรคการเมือง:</span>
                <select 
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-md"
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                >
                    {sortedParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {partyStats && (
                <>
                    {/* Party Header */}
                    <div 
                        className="bg-white rounded-xl border-l-8 shadow-sm p-6"
                        style={{ borderLeftColor: partyStats.party?.color || '#ccc' }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{partyStats.party?.name}</h2>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <Users size={14} />
                                        {partyStats.totalCandidates} ผู้สมัคร
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Trophy size={14} />
                                        {partyStats.seatsWon} ที่นั่ง
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <TrendingUp size={14} />
                                        {fPercent(partyStats.winRate)} Win Rate
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-gray-900">{fNum(partyStats.totalVotes)}</div>
                                <div className="text-sm text-gray-500">คะแนนรวม</div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                            <div>
                                <div className="text-xs text-gray-500 mb-1">เขตปลอดภัย</div>
                                <div className="text-xl font-bold text-green-600">{partyStats.safeSeats}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">เขตห่างน้อย</div>
                                <div className="text-xl font-bold text-yellow-600">{partyStats.marginalSeats}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">เขตดุเดือด</div>
                                <div className="text-xl font-bold text-red-600">{partyStats.competitiveSeats}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Avg Margin</div>
                                <div className="text-xl font-bold text-blue-600">{fPercent(partyStats.avgMargin)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
                            <div className="flex items-center gap-2 text-green-700 mb-3">
                                <Trophy size={20} />
                                <span className="text-sm font-bold uppercase">Performance</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">ชนะ</span>
                                    <span className="text-lg font-bold text-green-700">{partyStats.winners}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">แพ้</span>
                                    <span className="text-lg font-bold text-gray-500">{partyStats.losers}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div 
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${partyStats.winRate}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
                            <div className="flex items-center gap-2 text-blue-700 mb-3">
                                <MapPin size={20} />
                                <span className="text-sm font-bold uppercase">Stronghold</span>
                            </div>
                            {partyStats.bestProvince ? (
                                <div>
                                    <div className="text-lg font-bold text-gray-900 mb-1">
                                        {partyStats.bestProvince.provinceName}
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">ที่นั่ง</span>
                                            <span className="font-bold text-blue-700">
                                                {partyStats.bestProvince.seats}/{partyStats.bestProvince.candidates}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Win Rate</span>
                                            <span className="font-bold text-blue-700">
                                                {fPercent(partyStats.bestProvince.winRate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-400">ไม่มีข้อมูล</div>
                            )}
                        </div>

                        <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-5">
                            <div className="flex items-center gap-2 text-purple-700 mb-3">
                                <Zap size={20} />
                                <span className="text-sm font-bold uppercase">Avg Performance</span>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">คะแนนเฉลี่ย/ผู้สมัคร</div>
                                    <div className="text-lg font-bold text-purple-700">{fNum(Math.round(partyStats.avgVotes))}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Margin เฉลี่ย</div>
                                    <div className="text-lg font-bold text-purple-700">{fPercent(partyStats.avgMargin)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Regional Strength */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4">จุดแข็งรายภาค (Regional Strength)</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={partyStats.regionalStrength}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis />
                                        <Tooltip formatter={(val) => fNum(val as number)} />
                                        <Legend />
                                        <Bar dataKey="seats" name="ที่นั่ง" fill={partyStats.party?.color || '#3b82f6'} />
                                        <Bar dataKey="candidates" name="ผู้สมัคร" fill="#94a3b8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Provinces */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4">Top 10 จังหวัด (By Votes)</h3>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {partyStats.topProvinces.map((province, index) => (
                                    <div 
                                        key={province.provinceId}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                                            <div>
                                                <div className="font-medium text-gray-900">{province.provinceName}</div>
                                                <div className="text-xs text-gray-500">
                                                    {province.seats}/{province.candidates} ที่นั่ง
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-sm text-blue-600">{fNum(province.votes)}</div>
                                            <div className="text-xs text-gray-500">{fPercent(province.winRate)} Win</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Candidates */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-800">Top 10 ขุนพล (Highest Votes)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3 text-left">อันดับ</th>
                                        <th className="px-6 py-3 text-left">ชื่อ</th>
                                        <th className="px-6 py-3 text-left">พื้นที่</th>
                                        <th className="px-6 py-3 text-right">คะแนน</th>
                                        <th className="px-6 py-3 text-right">% เสียง</th>
                                        <th className="px-6 py-3 text-center">สถานะ</th>
                                        <th className="px-6 py-3 text-right">Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {partyStats.topCandidates.map((c, index) => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-bold text-gray-600">#{index + 1}</td>
                                            <td className="px-6 py-3 font-medium text-gray-900">{c.fullName}</td>
                                            <td className="px-6 py-3 text-gray-600">
                                                <div>{c.provinceName}</div>
                                                <div className="text-xs text-gray-400">{c.areaName}</div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono text-blue-600">{fNum(c.score)}</td>
                                            <td className="px-6 py-3 text-right text-gray-600">{fPercent(c.voteShare || 0)}</td>
                                            <td className="px-6 py-3 text-center">
                                                {c.isWinner ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                        ชนะ
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                        แพ้
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className={c.isWinner ? 'text-green-600' : 'text-red-600'}>
                                                    {c.isWinner ? '+' : '-'}{fPercent(c.marginPercent || 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Strategic Recommendations */}
                    <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
                        <div className="flex items-center gap-2 text-amber-800 mb-4">
                            <AlertCircle size={20} />
                            <h3 className="font-bold">คำแนะนำเชิงกลยุทธ์</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4">
                                <div className="text-xs text-gray-500 uppercase font-bold mb-2">ต้องรักษา</div>
                                <div className="text-2xl font-bold text-green-600 mb-1">{partyStats.safeSeats}</div>
                                <div className="text-xs text-gray-600">เขตปลอดภัย - รักษาฐานเสียง</div>
                            </div>
                            <div className="bg-white rounded-lg p-4">
                                <div className="text-xs text-gray-500 uppercase font-bold mb-2">ต้องเสริม</div>
                                <div className="text-2xl font-bold text-yellow-600 mb-1">{partyStats.marginalSeats}</div>
                                <div className="text-xs text-gray-600">เขตห่างน้อย - เพิ่มการรณรงค์</div>
                            </div>
                            <div className="bg-white rounded-lg p-4">
                                <div className="text-xs text-gray-500 uppercase font-bold mb-2">ต้องต่อสู้</div>
                                <div className="text-2xl font-bold text-red-600 mb-1">{partyStats.competitiveSeats}</div>
                                <div className="text-xs text-gray-600">เขตดุเดือด - ใช้ทรัพยากรเต็มที่</div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
