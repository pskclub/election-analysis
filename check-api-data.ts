const API_RESULT_2566 = "https://storage.googleapis.com/voicetv-election-data-prod/result/result.json";
const API_MASTER_2566 = "https://storage.googleapis.com/voicetv-election-data-prod/result/master-data.json";

async function checkAPI() {
    try {
        const [resResult, resMaster] = await Promise.all([
            fetch(API_RESULT_2566),
            fetch(API_MASTER_2566)
        ]);

        const r = await resResult.json();
        const m = await resMaster.json();

        const partyScores = r.partyScores || {};
        const apiParties = m.parties || {};

        // Find เพื่อไทย
        console.log('🔍 ค้นหาพรรคเพื่อไทยใน API...\n');

        for (const [partyId, party] of Object.entries(apiParties)) {
            if (party.name.includes('เพื่อไทย')) {
                console.log(`พบพรรค: ${party.name} (API ID: ${partyId})`);

                const stats = partyScores[partyId];
                if (stats) {
                    console.log('📊 สถิติจาก API:');
                    console.log(`   - areaSeats (ส.ส. เขต): ${stats.areaSeats}`);
                    console.log(`   - partyListSeats (ส.ส. บัญชีรายชื่อ): ${stats.partyListSeats}`);
                    console.log(`   - totalVotes: ${stats.totalVotes?.toLocaleString()}`);
                    console.log(`   - รวม: ${(stats.areaSeats || 0) + (stats.partyListSeats || 0)} ที่นั่ง`);
                }
                console.log('');
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkAPI();
