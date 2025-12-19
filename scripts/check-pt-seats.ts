import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPTSeats() {
    try {
        console.log('🔍 ตรวจสอบข้อมูล ส.ส. เขตของพรรคเพื่อไทย\n');

        // หาพรรคเพื่อไทย
        const ptParty = await prisma.party.findFirst({
            where: {
                OR: [
                    { name: { contains: 'เพื่อไทย' } },
                    { short_name: { contains: 'PT' } },
                    { short_name: { contains: 'เพื่อไทย' } }
                ]
            }
        });

        if (!ptParty) {
            console.log('❌ ไม่พบพรรคเพื่อไทยในฐานข้อมูล');
            return;
        }

        console.log(`✅ พบพรรค: ${ptParty.name} (ID: ${ptParty.id})\n`);

        // หาการเลือกตั้งที่ active
        const activeElection = await prisma.election.findFirst({
            where: { is_active: true },
            orderBy: { year_th: 'desc' }
        });

        if (!activeElection) {
            console.log('❌ ไม่พบการเลือกตั้งที่ active');
            return;
        }

        console.log(`📅 การเลือกตั้ง: ${activeElection.description} (ปี ${activeElection.year_th})\n`);

        // ตรวจสอบข้อมูลจาก PartyElectionStats
        const partyStats = await prisma.partyElectionStats.findFirst({
            where: {
                party_id: ptParty.id,
                election_id: activeElection.id
            }
        });

        console.log('📊 ข้อมูลจาก PartyElectionStats:');
        if (partyStats) {
            console.log(`   - ส.ส. เขต (constituency_seats): ${partyStats.constituency_seats}`);
            console.log(`   - ส.ส. บัญชีรายชื่อ (partylist_seats): ${partyStats.partylist_seats}`);
            console.log(`   - รวม (total_seats): ${partyStats.total_seats}`);
            console.log(`   - คะแนนรวม (total_votes): ${partyStats.total_votes.toLocaleString()}\n`);
        } else {
            console.log('   ❌ ไม่พบข้อมูลใน PartyElectionStats\n');
        }

        // นับจำนวน ส.ส. เขตจริงจาก CandidateParticipation
        const constituencyCandidates = await prisma.candidateParticipation.findMany({
            where: {
                party_id: ptParty.id,
                election_id: activeElection.id,
                candidate_type: 'CONSTITUENCY',
                is_winner: true
            },
            include: {
                constituency: {
                    include: {
                        province: true
                    }
                },
                person: true
            }
        });

        console.log('📋 ข้อมูลจาก CandidateParticipation (ส.ส. เขตที่ชนะ):');
        console.log(`   - จำนวนทั้งหมด: ${constituencyCandidates.length} คน\n`);

        // แสดงรายละเอียดแต่ละคน
        console.log('👥 รายชื่อ ส.ส. เขตที่ชนะ:');
        constituencyCandidates.forEach((candidate, index) => {
            const province = candidate.constituency?.province?.name || 'N/A';
            const district = candidate.constituency?.district_number || 'N/A';
            const name = `${candidate.person.prefix || ''} ${candidate.person.first_name} ${candidate.person.last_name}`.trim();
            const score = candidate.score.toLocaleString();

            console.log(`   ${index + 1}. ${name} - ${province} เขต ${district} (${score} คะแนน)`);
        });

        // สรุปผล
        console.log('\n' + '='.repeat(80));
        console.log('📌 สรุปผลการตรวจสอบ:');
        console.log('='.repeat(80));

        if (partyStats) {
            console.log(`PartyElectionStats บันทึกไว้: ${partyStats.constituency_seats} ที่นั่ง`);
        }
        console.log(`CandidateParticipation นับได้จริง: ${constituencyCandidates.length} ที่นั่ง`);

        if (partyStats && partyStats.constituency_seats !== constituencyCandidates.length) {
            console.log(`\n⚠️  พบความไม่สอดคล้อง! ต่างกัน ${Math.abs(partyStats.constituency_seats - constituencyCandidates.length)} ที่นั่ง`);

            // ตรวจสอบเพิ่มเติม
            const allPTConstituency = await prisma.candidateParticipation.findMany({
                where: {
                    party_id: ptParty.id,
                    election_id: activeElection.id,
                    candidate_type: 'CONSTITUENCY'
                },
                include: {
                    constituency: {
                        include: {
                            province: true
                        }
                    },
                    person: true
                }
            });

            console.log(`\n🔎 ตรวจสอบเพิ่มเติม - ผู้สมัครเขตทั้งหมดของพรรคเพื่อไทย: ${allPTConstituency.length} คน`);

            const winners = allPTConstituency.filter(c => c.is_winner === true);
            const losers = allPTConstituency.filter(c => c.is_winner === false);
            const unknown = allPTConstituency.filter(c => c.is_winner === null);

            console.log(`   - ชนะ (is_winner = true): ${winners.length} คน`);
            console.log(`   - แพ้ (is_winner = false): ${losers.length} คน`);
            console.log(`   - ไม่ระบุ (is_winner = null): ${unknown.length} คน`);

            if (unknown.length > 0) {
                console.log('\n⚠️  พบผู้สมัครที่ยังไม่ได้ระบุผลการเลือกตั้ง (is_winner = null):');
                unknown.forEach((candidate, index) => {
                    const province = candidate.constituency?.province?.name || 'N/A';
                    const district = candidate.constituency?.district_number || 'N/A';
                    const name = `${candidate.person.prefix || ''} ${candidate.person.first_name} ${candidate.person.last_name}`.trim();
                    console.log(`   ${index + 1}. ${name} - ${province} เขต ${district}`);
                });
            }
        } else {
            console.log('\n✅ ข้อมูลสอดคล้องกัน!');
        }

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPTSeats();
