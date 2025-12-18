'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Users, Trophy, Activity, Target, MapPin, Percent, Award } from 'lucide-react';
import { AppData } from './types';
import { fNum, fPercent, analyzeSeatsByCategory } from './utils';

interface EnhancedOverviewProps {
    data: AppData;
}

export const EnhancedOverview: React.FC<EnhancedOverviewProps> = ({ data }) => {
    const seatAnalysis = useMemo(() => analyzeSeatsByCategory(data), [data]);
    
    const stats = useMemo(() => {
        // Use ID 0 (Nationwide) if available, otherwise fallback to 1 or default
        const totalVotes = data.electionScores?.[0]?.totalVotes || data.electionScores?.[1]?.totalVotes || 0;
        const turnout = data.electionScores?.[0]?.percentVoter || data.electionScores?.[1]?.percentVoter || 0;
        
        const totalSeats = data.electionAreas.length;
        const totalCandidates = data.candidates.length;
        
        // Calculate winners by party
        const winnersByParty: Record<number, number> = {};
        seatAnalysis.all.forEach(seat => {
            if (!winnersByParty[seat.winner.partyId]) {
                winnersByParty[seat.winner.partyId] = 0;
            }
            winnersByParty[seat.winner.partyId]++;
        });

        // Top 3 parties
        const topParties = Object.entries(winnersByParty)
            .map(([partyId, seats]) => {
                const party = data.parties.find(p => p.id === parseInt(partyId));
                return {
                    partyId: parseInt(partyId),
                    partyName: party?.name || 'Unknown',
                    partyColor: party?.color || '#ccc',
                    seats
                };
            })
            .sort((a, b) => b.seats - a.seats)
            .slice(0, 3);

        // Competitive seats stats
        const competitiveCount = seatAnalysis.competitive.length + seatAnalysis.lost.length;
        const competitivePercent = (competitiveCount / totalSeats) * 100;

        return {
            totalVotes,
            turnout,
            totalSeats,
            totalCandidates,
            topParties,
            competitiveCount,
            competitivePercent,
            safeSeats: seatAnalysis.safe.length,
            marginalSeats: seatAnalysis.marginal.length
        };
    }, [data, seatAnalysis]);

    // Prepare data for party composition chart
    const partyComposition = useMemo(() => {
        return data.partyStats.slice(0, 10).map(p => ({
            name: p.name,
            seats: p.totalSeat,
            color: p.color,
            areaSeats: p.areaSeats || 0,
            partyListSeats: p.partyListSeats || 0
        }));
    }, [data]);

    // Prepare data for seat distribution pie chart
    const seatDistribution = useMemo(() => {
        return [
            { name: 'ชนะแน่นอน', value: seatAnalysis.safe.length, color: '#10b981' },
            { name: 'ชนะห่างน้อย', value: seatAnalysis.marginal.length, color: '#f59e0b' },
            { name: 'ดุเดือด', value: seatAnalysis.competitive.length, color: '#ef4444' },
            { name: 'ไม่แน่นอน', value: seatAnalysis.lost.length, color: '#6b7280' }
        ];
    }, [seatAnalysis]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="text-blue-600" size={20} />
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold">Total Votes</div>
                            <div className="text-2xl font-bold text-gray-900">{fNum(stats.totalVotes)}</div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        จาก {fNum(stats.totalCandidates)} ผู้สมัคร
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Activity className="text-green-600" size={20} />
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold">Turnout</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.turnout}%</div>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${stats.turnout}%` }}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <Trophy className="text-yellow-600" size={20} />
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold">Total Seats</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.totalSeats}</div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        {stats.topParties[0]?.partyName} นำ ({stats.topParties[0]?.seats} ที่นั่ง)
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <Target className="text-red-600" size={20} />
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold">Competitive</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.competitiveCount}</div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        {fPercent(stats.competitivePercent, 1)} ของทั้งหมด
                    </div>
                </div>
            </div>

            {/* Top 3 Parties Highlight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.topParties.map((party, index) => (
                    <div 
                        key={party.partyId}
                        className="bg-white rounded-xl border-2 shadow-sm p-5 relative overflow-hidden"
                        style={{ borderColor: party.partyColor }}
                    >
                        <div 
                            className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full -mr-8 -mt-8"
                            style={{ backgroundColor: party.partyColor }}
                        />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Award size={20} style={{ color: party.partyColor }} />
                                    <span className="text-xs font-bold text-gray-500">อันดับ {index + 1}</span>
                                </div>
                                <div 
                                    className="px-3 py-1 rounded-full text-xs font-bold text-white"
                                    style={{ backgroundColor: party.partyColor }}
                                >
                                    {party.seats} ที่นั่ง
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{party.partyName}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Percent size={14} />
                                <span>{fPercent((party.seats / stats.totalSeats) * 100)} ของทั้งหมด</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Parliament Composition */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">องค์ประกอบสภา (Parliament Composition)</h3>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={partyComposition} layout="vertical" margin={{left: 20, right: 20}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} style={{fontSize: 11}} />
                                <Tooltip formatter={(val) => fNum(val as number)} />
                                <Legend />
                                <Bar dataKey="areaSeats" name="เขต" stackId="a" fill="#3b82f6" />
                                <Bar dataKey="partyListSeats" name="บัญชีรายชื่อ" stackId="a" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Seat Distribution */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">การกระจายตัวของเขต (Seat Distribution)</h3>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={seatDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {seatDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Stats Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">สถิติรายพรรค (Party Statistics)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-3 text-left">อันดับ</th>
                                <th className="px-6 py-3 text-left">พรรค</th>
                                <th className="px-6 py-3 text-right">ที่นั่งรวม</th>
                                <th className="px-6 py-3 text-right">เขต</th>
                                <th className="px-6 py-3 text-right">บัญชีรายชื่อ</th>
                                <th className="px-6 py-3 text-right">% ของทั้งหมด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {partyComposition.map((party, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-600">#{index + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: party.color }}
                                            />
                                            <span className="font-medium text-gray-900">{party.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-blue-600">{party.seats}</td>
                                    <td className="px-6 py-4 text-right text-gray-600">{party.areaSeats}</td>
                                    <td className="px-6 py-4 text-right text-gray-600">{party.partyListSeats}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-medium text-gray-900">
                                            {fPercent((party.seats / stats.totalSeats) * 100)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
