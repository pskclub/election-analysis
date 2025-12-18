import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("--- Updating Party Successor Lineage ---");

    // 1. Find Future Forward (Anakot Mai)
    const ffp = await prisma.party.findFirst({
        where: { name: { contains: "อนาคตใหม่" } }
    });

    // 2. Find Move Forward (Kao Klai)
    const mfp = await prisma.party.findFirst({
        where: { name: { contains: "ก้าวไกล" } }
    });

    if (!ffp || !mfp) {
        console.error("Could not find both parties.", { ffp: ffp?.name, mfp: mfp?.name });
        return;
    }

    console.log(`Linking ${ffp.name} (ID: ${ffp.id}) -> ${mfp.name} (ID: ${mfp.id})`);

    // 3. Update Future Forward
    // Dissolved on Feb 21, 2020
    await prisma.party.update({
        where: { id: ffp.id },
        data: {
            status: 'DISSOLVED',
            dissolved_date: new Date('2020-02-21T00:00:00Z'),
            successor_party_id: mfp.id
        }
    });

    console.log(`✅ Updated ${ffp.name}: Status=DISSOLVED, Successor=${mfp.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
