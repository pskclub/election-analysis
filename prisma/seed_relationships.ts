import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("--- Seeding Political Groups & Relationships ---");

    // 0. Ensure VIPs exist
    const vips = [
         { first: "สนธยา", last: "คุณปลื้ม", partyName: "เพื่อไทย", group: "กลุ่มบ้านใหญ่ชลบุรี (คุณปลื้ม)", role: "หัวหน้ากลุ่ม" }, 
         { first: "สมศักดิ์", last: "เทพสุทิน", partyName: "เพื่อไทย", group: "กลุ่มสามมิตร", role: "หัวหน้ากลุ่ม" },
         { first: "สุริยะ", last: "จึงรุ่งเรืองกิจ", partyName: "เพื่อไทย", group: "กลุ่มสามมิตร", role: "แกนนำ" },
         { first: "อนุทิน", last: "ชาญวีรกูล", partyName: "ภูมิใจไทย", group: "กลุ่มเพื่อนเนวิน (ภูมิใจไทย)", role: "แกนนำ" }, 
         { first: "ศักดิ์สยาม", last: "ชิดชอบ", partyName: "ภูมิใจไทย", group: "กลุ่มเพื่อนเนวิน (ภูมิใจไทย)", role: "แกนนำ" },
         { first: "เนวิน", last: "ชิดชอบ", partyName: "ภูมิใจไทย", group: "กลุ่มเพื่อนเนวิน (ภูมิใจไทย)", role: "หัวหน้ากลุ่ม" }
    ];

    // Get Party IDs map
    const parties = await prisma.party.findMany();
    const pt = parties.find(p => p.name.includes("เพื่อไทย"));
    const bjt = parties.find(p => p.name.includes("ภูมิใจไทย"));
    
    // Fallback IDs if not found by name (Defaults from seed.ts knowledge)
    const ptId = pt?.id || 10;
    const bjtId = bjt?.id || 6;

    for (const v of vips) {
        const pid = v.partyName === "เพื่อไทย" ? ptId : bjtId;
        
        // Find or Create Person
        const existing = await prisma.person.findFirst({
            where: { first_name: v.first, last_name: v.last }
        });

        let personId = existing?.id;

        if (!existing) {
            console.log(`Creating VIP: ${v.first} ${v.last}`);
            const newPerson = await prisma.person.create({
                data: {
                    prefix: "นาย",
                    first_name: v.first,
                    last_name: v.last,
                    gender: "MALE"
                }
            });
            personId = newPerson.id;

            // Also add Participation for 2566 (Party List - Mock)
            await prisma.candidateParticipation.create({
                data: {
                    election_id: 2, 
                    person_id: personId,
                    party_id: pid,
                    candidate_type: 'PARTY_LIST', 
                }
            });
        }
    }

    // 1. Define Groups
    const groups = [
        {
            name: "กลุ่มธรรมนัส (ผู้กองธรรมนัส)",
            influence_area: "พะเยา, ภาคเหนือ",
            members: [
                { first: "ธรรมนัส", last: "พรหมเผ่า", role: "หัวหน้ากลุ่ม" }
            ]
        },
        {
            name: "กลุ่มบ้านใหญ่ชลบุรี (คุณปลื้ม)",
            influence_area: "ชลบุรี, ภาคตะวันออก",
            members: [
                { first: "สนธยา", last: "คุณปลื้ม", role: "หัวหน้ากลุ่ม" },
                { first: "อิทธิพล", last: "คุณปลื้ม", role: "แกนนำ" }
            ]
        },
        {
            name: "กลุ่มสามมิตร",
            influence_area: "สุโขทัย, พิษณุโลก, ภาคเหนือตอนล่าง",
            members: [
                { first: "สมศักดิ์", last: "เทพสุทิน", role: "หัวหน้ากลุ่ม" },
                { first: "สุริยะ", last: "จึงรุ่งเรืองกิจ", role: "แกนนำ" },
                { first: "อนุชา", last: "นาคาศัย", role: "แกนนำ" }
            ]
        },
        {
            name: "กลุ่มเพื่อนเนวิน (ภูมิใจไทย)",
            influence_area: "บุรีรัมย์, อีสานใต้",
            members: [
                { first: "เนวิน", last: "ชิดชอบ", role: "หัวหน้ากลุ่ม" }, 
                { first: "ศักดิ์สยาม", last: "ชิดชอบ", role: "แกนนำ" },
                { first: "อนุทิน", last: "ชาญวีรกูล", role: "แกนนำ" }
            ]
        },
        {
            name: "กลุ่มบ้านใหญ่ปากน้ำ (อัศวเหม)",
            influence_area: "สมุทรปราการ",
            members: [
                { first: "ชนม์สวัสดิ์", last: "อัศวเหม", role: "หัวหน้ากลุ่ม" },
                { first: "อัครวัฒน์", last: "อัศวเหม", role: "สมาชิก" }
            ]
        }
    ];

    for(const g of groups) {
        // Upsert Group
        const group = await prisma.politicalGroup.upsert({
             where: { id: 0 }, 
             update: {},
             create: { name: g.name, influence_area: g.influence_area }
        }).catch(async () => {
             const existing = await prisma.politicalGroup.findFirst({ where: { name: g.name }});
             if(existing) return existing;
             return await prisma.politicalGroup.create({
                 data: { name: g.name, influence_area: g.influence_area }
             });
        });

        if(!group) continue;
        console.log(`Processed Group: ${group.name}`);

        // Link Members
        for(const m of g.members) {
            const persons = await prisma.person.findMany({
                where: {
                    first_name: m.first,
                    last_name: m.last
                }
            });

            if(persons.length === 0) {
                console.log(`  - Person not found: ${m.first} ${m.last}`);
                continue;
            }

            for(const p of persons) {
                const existingRel = await prisma.politicalRelationship.findFirst({
                    where: {
                        person_id: p.id,
                        group_id: group.id
                    }
                });

                if(existingRel) {
                    await prisma.politicalRelationship.update({
                        where: { id: existingRel.id },
                        data: { role: m.role }
                    });
                } else {
                    await prisma.politicalRelationship.create({
                        data: {
                            person_id: p.id,
                            group_id: group.id,
                            role: m.role
                        }
                    });
                    console.log(`  - Created link for ${m.first} ${m.last}`);
                }
            }
        }
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
