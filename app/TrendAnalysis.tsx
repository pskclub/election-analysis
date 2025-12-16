'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Award, Users, Target } from 'lucide-react';
import { MultiYearData, TrendData, PartyTrend } from './types';
import { fNum } from './utils';

interface TrendAnalysisProps {
    multiYearData: MultiYearData;
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ multiYearData }) => {
    // Calculate overall trends across years
    const overallTrends = useMemo((): TrendData[] => {
        return multiYearData.years.map(yearData => {
            const data = yearData.data;
            const totalVotes = data.electionScores?.[1]?.totalVotes || 0;
            const turnout = data.electionScores?.[1]?.percentVoter || 0;
            const totalSeats = data.electionAreas.length;
            
            const partySeats: Record<number, number> = {};
            data.partyStats.forEach(p => {
                partySeats[p.id] = p.totalSeat;
            });

            return {
                year: yearData.year,
                label: yearData.label,
                totalVotes,
                turnout,
                totalSeats,
                partySeats
            };
        }).sort((a, b) => a.year - b.year);
    }, [multiYearData]);

    // Calculate party-specific trends
    const partyTrends = useMemo((): PartyTrend[] => {
        const partyMap = new Map<number, PartyTrend>();

        multiYearData.years.forEach(yearData => {
            yearData.data.partyStats.forEach(partyStat => {
                if (!partyMap.has(partyStat.id)) {
                    partyMap.set(partyStat.id, {
                        partyId: partyStat.id,
                        partyName: partyStat.name,
                        partyColor: partyStat.color,
                        yearlyData: []
                    });
                }

                const trend = partyMap.get(partyStat.id)!;
                const totalVotes = yearData.data.candidates
                    .filter(c => c.partyId === partyStat.id)
                    .reduce((sum, c) => sum + c.score, 0);

                trend.yearlyData.push({
                    year: yearData.year,
                    seats: partyStat.totalSeat,
                    votes: totalVotes
                });
            });
        });

        // Calculate changes
        partyMap.forEach(trend => {
            trend.yearlyData.sort((a, b) => a.year - b.year);
            for (let i = 1; i < trend.yearlyData.length; i++) {
                const current = trend.yearlyData[i];
                const previous = trend.yearlyData[i - 1];
                current.seatChange = current.seats - previous.seats;
                current.voteChange = current.votes - previous.votes;
            }
        });

        return Array.from(partyMap.values())
            .filter(t => t.yearlyData.length > 0)
            .sort((a, b) => {
                const aLatest = a.yearlyData[a.yearlyData.length - 1].seats;
                const bLatest = b.yearlyData[b.yearlyData.length - 1].seats;
                return bLatest - aLatest;
            })
            .slice(0, 10); // Top 10 parties
    }, [multiYearData]);

    // Calculate key insights
    const insights = useMemo(() => {
        if (overallTrends.length < 2) return null;

        const latest = overallTrends[overallTrends.length - 1];
        const previous = overallTrends[overallTrends.length - 2];

        const turnoutChange = latest.turnout - previous.turnout;
        const voteChange = latest.totalVotes - previous.totalVotes;

        // Find biggest gainers and losers
        const partyChanges = partyTrends.map(p => {
            const latestData = p.yearlyData[p.yearlyData.length - 1];
            return {
                partyName: p.partyName,
                partyColor: p.partyColor,
                seatChange: latestData.seatChange || 0
            };
        }).sort((a, b) => Math.abs(b.seatChange) - Math.abs(a.seatChange));

        const biggestGainer = partyChanges.find(p => p.seatChange > 0);
        const biggestLoser = partyChanges.find(p => p.seatChange < 0);

        return {
            turnoutChange,
            voteChange,
            biggestGainer,
            biggestLoser
        };
    }, [overallTrends, partyTrends]);

    // Prepare data for charts
    const turnoutChartData = useMemo(() => {
        return overallTrends.map(t => ({
            year: t.label,
            'อัตราการลงคะแนน (%)': t.turnout,
            'คะแนนเสียงรวม (ล้าน)': t.totalVotes / 1000000
        }));
    }, [overallTrends]);

    const partySeatsChartData = useMemo(() => {
        return overallTrends.map(trend => {
            const data: Record<string, string | number> = { year: trend.label };
            partyTrends.slice(0, 5).forEach(party => {
                const yearData = party.yearlyData.find(y => y.year === trend.year);
                data[party.partyName] = yearData?.seats || 0;
            });
            return data;
        });
    }, [overallTrends, partyTrends]);

    if (multiYearData.years.length < 2) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <Activity className="mx-auto mb-3 text-yellow-600" size={32} />
                <h3 className="font-bold text-yellow-800 mb-2">ยังไม่มีข้อมูลเพียงพอสำหรับวิเคราะห์แนวโน้ม</h3>
                <p className="text-sm text-yellow-700">
                    ต้องมีข้อมูลอย่างน้อย 2 ปีเพื่อแสดงการวิเคราะห์แนวโน้ม
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Activity size={28} />
                    <h2 className="text-2xl font-bold">การวิเคราะห์แนวโน้ม (Trend Analysis)</h2>
                </div>
                <p className="text-blue-100">
                    เปรียบเทียบผลการเลือกตั้งข้ามปี {overallTrends.length} ครั้ง 
                    ({overallTrends[0].label} - {overallTrends[overallTrends.length - 1].label})
                </p>
            </div>

            {/* Key Insights */}
            {insights && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Users className="text-blue-600" size={20} />
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-bold ${insights.turnoutChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {insights.turnoutChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {insights.turnoutChange >= 0 ? '+' : ''}{insights.turnoutChange.toFixed(2)}%
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Turnout Change</div>
                        <div className="text-lg font-bold text-gray-900 mt-1">
                            {overallTrends[overallTrends.length - 1].turnout}%
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Target className="text-green-600" size={20} />
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-bold ${insights.voteChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {insights.voteChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {fNum(Math.abs(insights.voteChange))}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Vote Change</div>
                        <div className="text-lg font-bold text-gray-900 mt-1">
                            {fNum(overallTrends[overallTrends.length - 1].totalVotes)}
                        </div>
                    </div>

                    {insights.biggestGainer && (
                        <div className="bg-white rounded-xl border-2 border-green-200 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <Award className="text-green-600" size={20} />
                                </div>
                                <div className="flex items-center gap-1 text-sm font-bold text-green-600">
                                    <TrendingUp size={16} />
                                    +{insights.biggestGainer.seatChange}
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Biggest Gainer</div>
                            <div className="text-sm font-bold text-gray-900 mt-1 truncate">
                                {insights.biggestGainer.partyName}
                            </div>
                        </div>
                    )}

                    {insights.biggestLoser && (
                        <div className="bg-white rounded-xl border-2 border-red-200 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-red-50 rounded-lg">
                                    <Award className="text-red-600" size={20} />
                                </div>
                                <div className="flex items-center gap-1 text-sm font-bold text-red-600">
                                    <TrendingDown size={16} />
                                    {insights.biggestLoser.seatChange}
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Biggest Loser</div>
                            <div className="text-sm font-bold text-gray-900 mt-1 truncate">
                                {insights.biggestLoser.partyName}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Turnout & Votes Trend */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">แนวโน้มการลงคะแนน (Turnout & Votes Trend)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={turnoutChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Line 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="อัตราการลงคะแนน (%)" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    dot={{ r: 6 }}
                                />
                                <Line 
                                    yAxisId="right"
                                    type="monotone" 
                                    dataKey="คะแนนเสียงรวม (ล้าน)" 
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    dot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Party Seats Comparison */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">เปรียบเทียบที่นั่งรายพรรค (Party Seats Comparison)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={partySeatsChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {partyTrends.slice(0, 5).map(party => (
                                    <Bar 
                                        key={party.partyId}
                                        dataKey={party.partyName} 
                                        fill={party.partyColor}
                                        radius={[4, 4, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Party Trends Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">รายละเอียดแนวโน้มรายพรรค (Detailed Party Trends)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-3 text-left">พรรค</th>
                                {overallTrends.map(t => (
                                    <th key={t.year} className="px-6 py-3 text-center">{t.label}</th>
                                ))}
                                <th className="px-6 py-3 text-center">การเปลี่ยนแปลง</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {partyTrends.map(party => {
                                const latestData = party.yearlyData[party.yearlyData.length - 1];
                                const change = latestData.seatChange || 0;
                                
                                return (
                                    <tr key={party.partyId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: party.partyColor }}
                                                />
                                                <span className="font-medium text-gray-900">{party.partyName}</span>
                                            </div>
                                        </td>
                                        {overallTrends.map(trend => {
                                            const yearData = party.yearlyData.find(y => y.year === trend.year);
                                            const seats = yearData?.seats || 0;
                                            const seatChange = yearData?.seatChange;
                                            
                                            return (
                                                <td key={trend.year} className="px-6 py-4 text-center">
                                                    <div className="font-bold text-gray-900">{seats}</div>
                                                    {seatChange !== undefined && seatChange !== 0 && (
                                                        <div className={`text-xs font-medium ${seatChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {seatChange > 0 ? '+' : ''}{seatChange}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                                change > 0 ? 'bg-green-100 text-green-700' :
                                                change < 0 ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {change > 0 ? <TrendingUp size={12} /> : change < 0 ? <TrendingDown size={12} /> : null}
                                                {change > 0 ? '+' : ''}{change}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
