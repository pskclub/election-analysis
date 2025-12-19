import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findMismatch() {
    try {
        console.log('🔍 ค้นหาเขตที่มีข้อมูลไม่ตรงกัน (ปี 2566)\n');

        const election = await prisma.election.findFirst({
            where: { year_th: 2566 }
        });

        if (!election) {
            console.log('❌ ไม่พบข้อมูลการเลือกตั้งปี 2566');
            return;
        }

        const ptParty = await prisma.party.findFirst({
            where: { name: { contains: 'เพื่อไทย' } }
        });

        if (!ptParty) {
            console.log('❌ ไม่พบพรรคเพื่อไทย');
            return;
        }

        console.log(`✅ พรรคเพื่อไทย ID: ${ptParty.id}\n`);

        // ดึงข้อมูลทุกเขต
        const constituencies = await prisma.constituency.findMany({
            orderBy: [
                { province_id: 'asc' },
                { district_number: 'asc' }
            ],
            include: {
                province: true
            }
        });

        let mismatchCount = 0;
        let ptWinsByScore = 0;
        let ptWinsByFlag = 0;

        for (const constituency of constituencies) {
            // ดึงผู้สมัครทั้งหมดในเขตนี้
            const candidates = await prisma.candidateParticipation.findMany({
                where: {
                    election_id: election.id,
                    constituency_id: constituency.id,
                    candidate_type: 'CONSTITUENCY'
                },
                include: {
                    person: true,
                    party: true
                },
                orderBy: {
                    score: 'desc'
                }
            });

            if (candidates.length === 0) continue;

            const topCandidate = candidates[0]; // ผู้ที่ได้คะแนนสูงสุด
            const markedWinner = candidates.find(c => c.is_winner === true); // ผู้ที่ถูกทำเครื่องหมายว่าชนะ

            // นับว่าพรรคเพื่อไทยชนะกี่เขตตามคะแนน
            if (topCandidate.party_id === ptParty.id) {
                ptWinsByScore++;
            }

            // นับว่าพรรคเพื่อไทยชนะกี่เขตตาม is_winner flag
            if (markedWinner && markedWinner.party_id === ptParty.id) {
                ptWinsByFlag++;
            }

            // ตรวจสอบความไม่สอดคล้อง
            if (!markedWinner || markedWinner.id !== topCandidate.id) {
                mismatchCount++;

                const topName = `${topCandidate.person.first_name} ${topCandidate.person.last_name}`;
                const markedName = markedWinner
                    ? `${markedWinner.person.first_name} ${markedWinner.person.last_name}`
                    : 'ไม่มี';

                console.log(`⚠️  ${constituency.province.name} เขต ${constituency.district_number}:`);
                console.log(`   คะแนนสูงสุด: ${topName} (${topCandidate.party.name}) - ${topCandidate.score.toLocaleString()} คะแนน`);
                console.log(`   is_winner=true: ${markedName} ${markedWinner ? `(${markedWinner.party.name})` : ''}`);

                // ตรวจสอบว่าเป็นพรรคเพื่อไทยหรือไม่
                if (topCandidate.party_id === ptParty.id && (!markedWinner || markedWinner.party_id !== ptParty.id)) {
                    console.log(`   🎯 พรรคเพื่อไทยควรชนะแต่ไม่ได้ถูกทำเครื่องหมาย!`);
                } else if (markedWinner && markedWinner.party_id === ptParty.id && topCandidate.party_id !== ptParty.id) {
                    console.log(`   🎯 พรรคเพื่อไทยถูกทำเครื่องหมายว่าชนะแต่ไม่ได้คะแนนสูงสุด!`);
                }
                console.log('');
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 สรุปผล:');
        console.log('='.repeat(80));
        console.log(`เขตที่มีความไม่สอดคล้อง: ${mismatchCount} เขต`);
        console.log(`พรรคเพื่อไทยชนะตามคะแนน: ${ptWinsByScore} เขต`);
        console.log(`พรรคเพื่อไทยชนะตาม is_winner flag: ${ptWinsByFlag} เขต`);
        console.log(`ต่างกัน: ${Math.abs(ptWinsByScore - ptWinsByFlag)} เขต`);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findMismatch();
