import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllPartyData() {
    try {
        console.log('🔍 ตรวจสอบข้อมูลพรรคเพื่อไทยทั้งหมด\n');

        // หาพรรคเพื่อไทย
        const ptParty = await prisma.party.findFirst({
            where: {
                name: { contains: 'เพื่อไทย' }
            }
        });

        if (!ptParty) {
            console.log('❌ ไม่พบพรรคเพื่อไทย');
            return;
        }

        console.log(`✅ พบพรรค: ${ptParty.name} (ID: ${ptParty.id})\n`);

        // ดึงข้อมูลทุกปี
        const elections = await prisma.election.findMany({
            orderBy: { year_th: 'desc' }
        });

        console.log('📅 ข้อมูลทุกปีการเลือกตั้ง:\n');

        for (const election of elections) {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`ปี ${election.year_th} - ${election.description}`);
            console.log('='.repeat(80));

            // ดึงข้อมูลจาก PartyElectionStats
            const stats = await prisma.partyElectionStats.findFirst({
                where: {
                    party_id: ptParty.id,
                    election_id: election.id
                }
            });

            if (stats) {
                console.log('\n📊 PartyElectionStats:');
                console.log(`   - constituency_seats: ${stats.constituency_seats}`);
                console.log(`   - partylist_seats: ${stats.partylist_seats}`);
                console.log(`   - total_seats: ${stats.total_seats}`);
                console.log(`   - total_votes: ${stats.total_votes.toLocaleString()}`);
            } else {
                console.log('\n❌ ไม่มีข้อมูลใน PartyElectionStats');
            }

            // นับจาก CandidateParticipation
            const constituencyWinners = await prisma.candidateParticipation.count({
                where: {
                    party_id: ptParty.id,
                    election_id: election.id,
                    candidate_type: 'CONSTITUENCY',
                    is_winner: true
                }
            });

            const partyListWinners = await prisma.candidateParticipation.count({
                where: {
                    party_id: ptParty.id,
                    election_id: election.id,
                    candidate_type: 'PARTY_LIST',
                    is_winner: true
                }
            });

            console.log('\n📋 CandidateParticipation (นับจริง):');
            console.log(`   - ส.ส. เขต (is_winner=true): ${constituencyWinners}`);
            console.log(`   - ส.ส. บัญชีรายชื่อ (is_winner=true): ${partyListWinners}`);
            console.log(`   - รวม: ${constituencyWinners + partyListWinners}`);

            // ตรวจสอบความสอดคล้อง
            if (stats) {
                const dbConstituency = stats.constituency_seats;
                const actualConstituency = constituencyWinners;

                if (dbConstituency !== actualConstituency) {
                    console.log(`\n⚠️  ไม่สอดคล้อง!`);
                    console.log(`   PartyElectionStats บันทึก: ${dbConstituency}`);
                    console.log(`   นับได้จริง: ${actualConstituency}`);
                    console.log(`   ต่างกัน: ${Math.abs(dbConstituency - actualConstituency)} ที่นั่ง`);
                } else {
                    console.log(`\n✅ ข้อมูลสอดคล้องกัน`);
                }
            }
        }

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllPartyData();
