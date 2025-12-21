'use client';

import React, { useState, useMemo } from 'react';
import { 
    User, Trophy, TrendingUp, Target, ArrowUpRight, ArrowDownRight,
    Award, MapPin, Flag, BarChart3, Zap, Shield
} from 'lucide-react';
import { AppData, CandidateAnalysis } from './types';
import { analyzeCandidates, fNum, fPercent } from './utils';

interface CandidateDeepDiveProps {
    data: AppData;
}

export const CandidateDeepDive: React.FC<CandidateDeepDiveProps> = ({ data }) => {
    const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const analyzedCandidates = useMemo(() => analyzeCandidates(data), [data]);

    const filteredCandidates = useMemo(() => {
        if (!searchQuery.trim()) return analyzedCandidates;
        const query = searchQuery.toLowerCase();
        return analyzedCandidates.filter(c =>
            c.fullName.toLowerCase().includes(query) ||
            c.partyName.toLowerCase().includes(query) ||
            c.provinceName?.toLowerCase().includes(query)
        );
    }, [analyzedCandidates, searchQuery]);

    const selectedCandidate = useMemo(() => {
        if (!selectedCandidateId) return null;
        return analyzedCandidates.find(c => c.id === selectedCandidateId);
    }, [selectedCandidateId, analyzedCandidates]);

    // Get competitors in the same area
    const competitors = useMemo(() => {
        if (!selectedCandidate) return [];
        return analyzedCandidates
            .filter(c => c.electionAreaId === selectedCandidate.electionAreaId && c.id !== selectedCandidate.id)
            .sort((a, b) => b.score - a.score);
    }, [selectedCandidate, analyzedCandidates]);

    const getPotentialColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50';
        if (score >= 60) return 'text-blue-600 bg-blue-50';
        if (score >= 40) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <User className="text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาผู้สมัคร (ชื่อ, พรรค, จังหวัด)..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="text-sm text-gray-500">
                        {filteredCandidates.length} ผลลัพธ์
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Candidate List */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 font-bold text-sm sticky top-0">
                        รายชื่อผู้สมัคร ({filteredCandidates.length})
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                        {filteredCandidates.map((candidate) => (
                            <button
                                key={candidate.id}
                                onClick={() => setSelectedCandidateId(candidate.id)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                                    selectedCandidateId === candidate.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                                        {candidate.image_url ? (
                                            <img src={candidate.image_url} alt={candidate.fullName} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-full h-full p-2 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                                            {candidate.fullName}
                                            {candidate.isWinner && (
                                                <Trophy size={14} className="text-yellow-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {candidate.partyName}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate">
                                            {candidate.provinceName} - {candidate.areaName}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-xs font-mono text-blue-600">
                                            {fNum(candidate.score)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            #{candidate.rank}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Candidate Details */}
                <div className="lg:col-span-2">
                    {selectedCandidate ? (
                        <div className="space-y-6">
                            {/* Header Card */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div 
                                    className="h-3"
                                    style={{ backgroundColor: selectedCandidate.partyColor }}
                                />
                                <div className="p-6">
                                    <div className="flex items-start gap-6 mb-4">
                                        <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden shrink-0">
                                            {selectedCandidate.image_url ? (
                                                <img src={selectedCandidate.image_url} alt={selectedCandidate.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-full h-full p-4 text-gray-300" />
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                                        {selectedCandidate.fullName}
                                                        {selectedCandidate.isWinner && (
                                                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full font-medium flex items-center gap-1">
                                                                <Trophy size={14} />
                                                                ชนะ
                                                            </span>
                                                        )}
                                                    </h2>
                                                    <p className="text-gray-600 mt-1 text-lg">{selectedCandidate.partyName}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-3xl font-bold text-gray-900">
                                                        {fNum(selectedCandidate.score)}
                                                    </div>
                                                    <div className="text-sm text-gray-500">คะแนนเสียง</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">พื้นที่</div>
                                            <div className="font-medium text-gray-900 flex items-center gap-1">
                                                <MapPin size={14} className="text-gray-400" />
                                                {selectedCandidate.provinceName}
                                            </div>
                                            <div className="text-xs text-gray-500">{selectedCandidate.areaName}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">ภาค</div>
                                            <div className="font-medium text-gray-900">{selectedCandidate.regionName}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">อันดับ</div>
                                            <div className="font-medium text-gray-900">#{selectedCandidate.rank}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                                        <BarChart3 size={18} />
                                        <span className="text-xs font-bold uppercase">Vote Share</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {fPercent(selectedCandidate.voteShare || 0)}
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-green-600 mb-2">
                                        <Target size={18} />
                                        <span className="text-xs font-bold uppercase">Margin</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {selectedCandidate.isWinner ? '+' : '-'}{fNum(selectedCandidate.marginVotes || 0)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {fPercent(selectedCandidate.marginPercent || 0)}
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-purple-600 mb-2">
                                        <Zap size={18} />
                                        <span className="text-xs font-bold uppercase">Potential</span>
                                    </div>
                                    <div className={`text-2xl font-bold ${getPotentialColor(selectedCandidate.potentialScore || 0)}`}>
                                        {selectedCandidate.potentialScore || 0}/100
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                                        <Shield size={18} />
                                        <span className="text-xs font-bold uppercase">Competitive</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {selectedCandidate.competitiveIndex || 0}/100
                                    </div>
                                </div>
                            </div>

                            {/* Competitors */}
                            {competitors.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-800">
                                        คู่แข่งในเขตเดียวกัน ({competitors.length})
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3 text-left">อันดับ</th>
                                                    <th className="px-6 py-3 text-left">ชื่อ</th>
                                                    <th className="px-6 py-3 text-left">พรรค</th>
                                                    <th className="px-6 py-3 text-right">คะแนน</th>
                                                    <th className="px-6 py-3 text-right">% ของเสียง</th>
                                                    <th className="px-6 py-3 text-right">ห่างจากผู้ชนะ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {competitors.map((comp) => (
                                                    <tr key={comp.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3">
                                                            <span className="font-bold text-gray-600">#{comp.rank}</span>
                                                        </td>
                                                        <td className="px-6 py-3 font-medium text-gray-900">
                                                            {comp.fullName}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span 
                                                                className="px-2 py-1 rounded text-xs font-medium text-white"
                                                                style={{ backgroundColor: comp.partyColor }}
                                                            >
                                                                {comp.partyName}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right font-mono text-blue-600">
                                                            {fNum(comp.score)}
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-gray-600">
                                                            {fPercent(comp.voteShare || 0)}
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-red-600">
                                                            -{fNum(comp.marginVotes || 0)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-20 text-center">
                            <User size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-400 text-lg">เลือกผู้สมัครเพื่อดูรายละเอียด</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
