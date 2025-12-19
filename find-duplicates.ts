import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findDuplicates() {
    try {
        console.log('🔍 ค้นหาเขตที่มีผู้สมัครพรรคเพื่อไทยมากกว่า 1 คน (ปี 2566)\n');

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

        // หาเขตที่มีผู้สมัครพรรคเพื่อไทยมากกว่า 1 คน
        const constituencies = await prisma.constituency.findMany({
            include: {
                province: true,
                candidate_participations: {
                    where: {
                        election_id: election.id,
                        party_id: ptParty.id,
                        candidate_type: 'CONSTITUENCY'
                    },
                    include: {
                        person: true
                    }
                }
            }
        });

        let duplicateCount = 0;

        for (const constituency of constituencies) {
            const ptCandidates = constituency.candidate_participations;

            if (ptCandidates.length > 1) {
                duplicateCount++;
                console.log(`⚠️  ${constituency.province.name} เขต ${constituency.district_number}:`);
                console.log(`   มีผู้สมัครพรรคเพื่อไทย ${ptCandidates.length} คน:`);

                ptCandidates.forEach((c, i) => {
                    const name = `${c.person.first_name} ${c.person.last_name}`;
                    console.log(`   ${i + 1}. ${name} - ${c.score.toLocaleString()} คะแนน (is_winner: ${c.is_winner})`);
                });
                console.log('');
            }
        }

        console.log(`\n📊 พบเขตที่มีผู้สมัครพรรคเพื่อไทยมากกว่า 1 คน: ${duplicateCount} เขต`);

        // ตรวจสอบว่ามีเขตไหนที่นับซ้ำใน seatAnalysis หรือไม่
        console.log('\n🔍 ตรวจสอบการนับซ้ำ...\n');

        const allConstituencies = await prisma.constituency.count();
        const constituenciesWithCandidates = await prisma.constituency.count({
            where: {
                candidate_participations: {
                    some: {
                        election_id: election.id,
                        candidate_type: 'CONSTITUENCY'
                    }
                }
            }
        });

        console.log(`จำนวนเขตทั้งหมด: ${allConstituencies}`);
        console.log(`จำนวนเขตที่มีผู้สมัคร: ${constituenciesWithCandidates}`);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findDuplicates();
