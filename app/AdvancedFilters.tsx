'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, X, MapPin, Flag, TrendingUp, Users } from 'lucide-react';
import { AppData, CandidateAnalysis, FilterOptions } from './types';
import { analyzeCandidates, fNum, fPercent } from './utils';

interface AdvancedFiltersProps {
    data: AppData;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ data }) => {
    const [filters, setFilters] = useState<FilterOptions>({
        searchQuery: '',
        selectedParties: [],
        selectedProvinces: [],
        selectedRegions: [],
        scoreRange: [0, 1000000],
        status: 'all',
        seatCategory: 'all'
    });

    const analyzedCandidates = useMemo(() => analyzeCandidates(data), [data]);

    const filteredCandidates = useMemo(() => {
        let results = [...analyzedCandidates];

        // Search query
        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            results = results.filter(c =>
                c.fullName.toLowerCase().includes(query) ||
                c.partyName.toLowerCase().includes(query) ||
                c.provinceName?.toLowerCase().includes(query) ||
                c.areaName?.toLowerCase().includes(query)
            );
        }

        // Party filter
        if (filters.selectedParties.length > 0) {
            results = results.filter(c => filters.selectedParties.includes(c.partyId));
        }

        // Province filter
        if (filters.selectedProvinces.length > 0) {
            results = results.filter(c => {
                const area = data.electionAreas.find(a => a.id === c.electionAreaId);
                return area && filters.selectedProvinces.includes(area.provinceId);
            });
        }

        // Region filter
        if (filters.selectedRegions.length > 0) {
            results = results.filter(c => {
                const area = data.electionAreas.find(a => a.id === c.electionAreaId);
                const province = area ? data.provinces.find(p => p.id === area.provinceId) : null;
                return province && filters.selectedRegions.includes(province.regionId);
            });
        }

        // Score range filter
        results = results.filter(c => 
            c.score >= filters.scoreRange[0] && c.score <= filters.scoreRange[1]
        );

        // Status filter
        if (filters.status === 'winner') {
            results = results.filter(c => c.isWinner);
        } else if (filters.status === 'loser') {
            results = results.filter(c => !c.isWinner);
        } else if (filters.status === 'competitive') {
            results = results.filter(c => (c.marginPercent || 0) < 10);
        }

        return results;
    }, [analyzedCandidates, filters, data]);

    const toggleParty = (partyId: number) => {
        setFilters(prev => ({
            ...prev,
            selectedParties: prev.selectedParties.includes(partyId)
                ? prev.selectedParties.filter(id => id !== partyId)
                : [...prev.selectedParties, partyId]
        }));
    };

    const toggleProvince = (provinceId: number) => {
        setFilters(prev => ({
            ...prev,
            selectedProvinces: prev.selectedProvinces.includes(provinceId)
                ? prev.selectedProvinces.filter(id => id !== provinceId)
                : [...prev.selectedProvinces, provinceId]
        }));
    };

    const toggleRegion = (regionId: number) => {
        setFilters(prev => ({
            ...prev,
            selectedRegions: prev.selectedRegions.includes(regionId)
                ? prev.selectedRegions.filter(id => id !== regionId)
                : [...prev.selectedRegions, regionId]
        }));
    };

    const clearFilters = () => {
        setFilters({
            searchQuery: '',
            selectedParties: [],
            selectedProvinces: [],
            selectedRegions: [],
            scoreRange: [0, 1000000],
            status: 'all',
            seatCategory: 'all'
        });
    };

    const activeFilterCount = 
        (filters.searchQuery ? 1 : 0) +
        filters.selectedParties.length +
        filters.selectedProvinces.length +
        filters.selectedRegions.length +
        (filters.status !== 'all' ? 1 : 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <Search className="text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหา (ชื่อผู้สมัคร, พรรค, จังหวัด, เขต)..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.searchQuery}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    />
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                        >
                            <X size={16} />
                            ล้างตัวกรอง ({activeFilterCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Column */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Status Filter */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Filter size={16} />
                            สถานะ
                        </h3>
                        <div className="space-y-2">
                            {[
                                { value: 'all', label: 'ทั้งหมด' },
                                { value: 'winner', label: 'ชนะเลือกตั้ง' },
                                { value: 'loser', label: 'แพ้เลือกตั้ง' },
                                { value: 'competitive', label: 'แข่งขันดุเดือด' }
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setFilters(prev => ({ ...prev, status: option.value as any }))}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                        filters.status === option.value
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Region Filter */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <MapPin size={16} />
                            ภาค ({filters.selectedRegions.length})
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {data.regions.map(region => (
                                <label
                                    key={region.id}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                >
                                    <input
                                        type="checkbox"
                                        checked={filters.selectedRegions.includes(region.id)}
                                        onChange={() => toggleRegion(region.id)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700">{region.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Party Filter */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Flag size={16} />
                            พรรค ({filters.selectedParties.length})
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {data.partyStats
                                .sort((a, b) => b.totalSeat - a.totalSeat)
                                .slice(0, 15)
                                .map(party => (
                                <label
                                    key={party.id}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                >
                                    <input
                                        type="checkbox"
                                        checked={filters.selectedParties.includes(party.id)}
                                        onChange={() => toggleParty(party.id)}
                                        className="rounded border-gray-300"
                                    />
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: party.color }}
                                    />
                                    <span className="text-sm text-gray-700 truncate flex-1">{party.name}</span>
                                    <span className="text-xs text-gray-500 font-medium">{party.totalSeat}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Province Filter */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <MapPin size={16} />
                            จังหวัด ({filters.selectedProvinces.length})
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {data.provinces.map(province => (
                                <label
                                    key={province.id}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                >
                                    <input
                                        type="checkbox"
                                        checked={filters.selectedProvinces.includes(province.id)}
                                        onChange={() => toggleProvince(province.id)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700">{province.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results Column */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800">
                                ผลการค้นหา ({filteredCandidates.length} รายการ)
                            </h3>
                            <div className="text-sm text-gray-500">
                                จากทั้งหมด {analyzedCandidates.length} ผู้สมัคร
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left">ชื่อ</th>
                                        <th className="px-6 py-3 text-left">พรรค</th>
                                        <th className="px-6 py-3 text-left">พื้นที่</th>
                                        <th className="px-6 py-3 text-right">คะแนน</th>
                                        <th className="px-6 py-3 text-right">% เสียง</th>
                                        <th className="px-6 py-3 text-center">สถานะ</th>
                                        <th className="px-6 py-3 text-right">Potential</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredCandidates.map((candidate) => (
                                        <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{candidate.fullName}</div>
                                                <div className="text-xs text-gray-500">อันดับ #{candidate.rank}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className="px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
                                                    style={{ backgroundColor: candidate.partyColor }}
                                                >
                                                    {candidate.partyName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{candidate.provinceName}</div>
                                                <div className="text-xs text-gray-500">{candidate.areaName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-blue-600">
                                                {fNum(candidate.score)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600">
                                                {fPercent(candidate.voteShare || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {candidate.isWinner ? (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                        ชนะ
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                        แพ้
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                                                            style={{ width: `${candidate.potentialScore}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-mono text-xs text-gray-600 w-8">
                                                        {candidate.potentialScore}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredCandidates.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <Search size={48} className="mx-auto mb-4 opacity-30" />
                                <p>ไม่พบผลลัพธ์ที่ตรงกับเงื่อนไขการค้นหา</p>
                                <button
                                    onClick={clearFilters}
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                >
                                    ล้างตัวกรอง
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
