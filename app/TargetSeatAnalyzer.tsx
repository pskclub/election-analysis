'use client';

import React, { useMemo, useState } from 'react';
import { Target, TrendingUp, AlertCircle, CheckCircle, Shield, MapPin } from 'lucide-react';
import { AppData, SeatAnalysis } from './types';
import { analyzeSeatsByCategory, fNum, fPercent, getCategoryColor, getCategoryLabel } from './utils';

interface TargetSeatAnalyzerProps {
    data: AppData;
}

export const TargetSeatAnalyzer: React.FC<TargetSeatAnalyzerProps> = ({ data }) => {
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'safe' | 'marginal' | 'competitive' | 'lost'>('all');
    const [selectedPartyId, setSelectedPartyId] = useState<number | 'all'>('all');

    const seatAnalysis = useMemo(() => analyzeSeatsByCategory(data), [data]);

    const sortedParties = useMemo(() => {
        return [...data.parties].sort((a, b) => {
            const aStats = data.partyStats.find(ps => ps.id === a.id);
            const bStats = data.partyStats.find(ps => ps.id === b.id);
            const aTotalSeat = aStats?.totalSeat || 0;
            const bTotalSeat = bStats?.totalSeat || 0;
            return bTotalSeat - aTotalSeat;
        });
    }, [data.parties, data.partyStats]);

    const filteredSeats = useMemo(() => {
        let seats = selectedCategory === 'all' ? seatAnalysis.all : seatAnalysis[selectedCategory];
        
        if (selectedPartyId !== 'all') {
            seats = seats.filter(s => s.winner.partyId === selectedPartyId);
        }

        return seats.sort((a, b) => a.marginPercent - b.marginPercent);
    }, [seatAnalysis, selectedCategory, selectedPartyId]);

    const stats = useMemo(() => ({
        total: seatAnalysis.all.length,
        safe: seatAnalysis.safe.length,
        marginal: seatAnalysis.marginal.length,
        competitive: seatAnalysis.competitive.length,
        lost: seatAnalysis.lost.length
    }), [seatAnalysis]);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'safe': return CheckCircle;
            case 'marginal': return TrendingUp;
            case 'competitive': return AlertCircle;
            case 'lost': return Target;
            default: return Shield;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`bg-white p-4 rounded-xl border-2 transition-all ${
                        selectedCategory === 'all' 
                            ? 'border-blue-500 shadow-lg shadow-blue-100' 
                            : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">ทั้งหมด</div>
                    <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-400 mt-1">เขตเลือกตั้ง</div>
                </button>

                {(['safe', 'marginal', 'competitive', 'lost'] as const).map((category) => {
                    const Icon = getCategoryIcon(category);
                    const count = stats[category];
                    const color = getCategoryColor(category);

                    return (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`bg-white p-4 rounded-xl border-2 transition-all ${
                                selectedCategory === category 
                                    ? 'border-blue-500 shadow-lg shadow-blue-100' 
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={16} style={{ color }} />
                                <div className="text-xs uppercase font-bold" style={{ color }}>
                                    {getCategoryLabel(category)}
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{count}</div>
                            <div className="text-xs text-gray-400 mt-1">
                                {fPercent((count / stats.total) * 100, 0)}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Target className="text-gray-400" size={18} />
                    <span className="text-sm font-bold text-gray-700">กรองตามพรรค:</span>
                    <select
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedPartyId}
                        onChange={(e) => setSelectedPartyId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    >
                        <option value="all">ทุกพรรค</option>
                        {sortedParties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="ml-auto text-sm text-gray-500">
                    แสดง {filteredSeats.length} เขต
                </div>
            </div>

            {/* Seat List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">
                        รายละเอียดเขตเลือกตั้ง - {getCategoryLabel(selectedCategory)}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left">เขต</th>
                                <th className="px-6 py-3 text-left">ผู้ชนะ</th>
                                <th className="px-6 py-3 text-left">พรรค</th>
                                <th className="px-6 py-3 text-right">คะแนน</th>
                                <th className="px-6 py-3 text-right">Margin</th>
                                <th className="px-6 py-3 text-right">% Margin</th>
                                <th className="px-6 py-3 text-center">ประเภท</th>
                                <th className="px-6 py-3 text-right">Competitive Index</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSeats.map((seat) => (
                                <tr key={seat.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            <MapPin size={14} className="text-gray-400" />
                                            {seat.provinceName}
                                        </div>
                                        <div className="text-xs text-gray-500">{seat.areaName}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                                {seat.winner.image_url ? (
                                                    <img src={seat.winner.image_url} alt={seat.winner.fullName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200" />
                                                )}
                                            </div>
                                            {seat.winner.fullName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className="px-2 py-1 rounded text-xs font-medium text-white"
                                            style={{ backgroundColor: seat.winner.partyColor }}
                                        >
                                            {seat.winner.partyName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-blue-600">
                                        {fNum(seat.winner.score)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-green-600">
                                        +{fNum(seat.margin)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-bold ${
                                            seat.marginPercent < 5 ? 'text-red-600' :
                                            seat.marginPercent < 10 ? 'text-yellow-600' :
                                            'text-green-600'
                                        }`}>
                                            {fPercent(seat.marginPercent)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className="px-3 py-1 rounded-full text-xs font-bold text-white"
                                            style={{ backgroundColor: getCategoryColor(seat.category) }}
                                        >
                                            {getCategoryLabel(seat.category)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-green-500 to-red-500"
                                                    style={{ width: `${seat.competitiveIndex}%` }}
                                                />
                                            </div>
                                            <span className="font-mono text-xs text-gray-600 w-8">
                                                {seat.competitiveIndex}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredSeats.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <Target size={48} className="mx-auto mb-4 opacity-30" />
                        <p>ไม่พบข้อมูลเขตเลือกตั้งที่ตรงกับเงื่อนไข</p>
                    </div>
                )}
            </div>

            {/* Strategic Insights */}
            {selectedPartyId !== 'all' && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-blue-600" />
                        Strategic Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">เขตที่ต้องรักษา</div>
                            <div className="text-2xl font-bold text-green-600">
                                {filteredSeats.filter(s => s.category === 'safe').length}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Safe Seats</div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">เขตที่ต้องเสริม</div>
                            <div className="text-2xl font-bold text-yellow-600">
                                {filteredSeats.filter(s => s.category === 'marginal').length}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Marginal Seats</div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">เขตที่ต้องต่อสู้</div>
                            <div className="text-2xl font-bold text-red-600">
                                {filteredSeats.filter(s => s.category === 'competitive' || s.category === 'lost').length}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Battleground Seats</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
