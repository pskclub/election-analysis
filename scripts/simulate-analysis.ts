import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateSeatAnalysis() {
    try {
        console.log('🔍 จำลองการทำงานของ analyzeSeatsByCategory\n');

        const election = await prisma.election.findFirst({
            where: { year_th: 2566 }
        });

        const ptParty = await prisma.party.findFirst({
            where: { name: { contains: 'เพื่อไทย' } }
        });

        if (!election || !ptParty) {
            console.log('❌ ไม่พบข้อมูล');
            return;
        }

        // ดึงข้อมูลผู้สมัครทั้งหมด
        const candidates = await prisma.candidateParticipation.findMany({
            where: {
                election_id: election.id,
                candidate_type: 'CONSTITUENCY'
            },
            include: {
                person: true,
                party: true,
                constituency: {
                    include: {
                        province: true
                    }
                }
            }
        });

        console.log(`📊 จำนวนผู้สมัครทั้งหมด: ${candidates.length}`);

        // Group by electionAreaId (constituency_id)
        const areaGroups = new Map();
        candidates.forEach(c => {
            const areaId = c.constituency_id || 0;
            if (!areaGroups.has(areaId)) {
                areaGroups.set(areaId, []);
            }
            areaGroups.get(areaId).push(c);
        });

        console.log(`📊 จำนวนเขตที่มีผู้สมัคร: ${areaGroups.size}`);

        // นับผู้ชนะแต่ละพรรค
        const winnersByParty = {};
        let ptWins = 0;

        areaGroups.forEach((cands, areaId) => {
            if (areaId === 0) {
                console.log(`\n⚠️  พบผู้สมัครที่ constituency_id = 0 (NULL):`);
                cands.forEach(c => {
                    const name = `${c.person.first_name} ${c.person.last_name}`;
                    console.log(`   - ${name} (${c.party.name})`);
                });
                return;
            }

            const sorted = [...cands].sort((a, b) => b.score - a.score);
            const winner = sorted[0];

            if (!winnersByParty[winner.party_id]) {
                winnersByParty[winner.party_id] = 0;
            }
            winnersByParty[winner.party_id]++;

            if (winner.party_id === ptParty.id) {
                ptWins++;
            }
        });

        console.log('\n📊 ผลการนับ:');
        console.log(`พรรคเพื่อไทยชนะ: ${ptWins} เขต`);
        console.log(`\nTop 5 พรรค:`);

        const sorted = Object.entries(winnersByParty)
            .map(([partyId, seats]) => ({ partyId: parseInt(partyId), seats }))
            .sort((a, b) => b.seats - a.seats)
            .slice(0, 5);

        for (const item of sorted) {
            const party = await prisma.party.findUnique({
                where: { id: item.partyId }
            });
            console.log(`   ${party?.name}: ${item.seats} เขต`);
        }

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    } finally {
        await prisma.$disconnect();
    }
}

simulateSeatAnalysis();
