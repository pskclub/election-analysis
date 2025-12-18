import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("--- Updating Bangkok Region ---");

    // 1. Create or Find New Region "กรุงเทพมหานคร"
    // Using upsert with a known ID (e.g., 5) or by name if schema allows (schema has no unique name).
    // Let's search by name first.
    let bkkRegion = await prisma.region.findFirst({
        where: { name: "กรุงเทพมหานคร" }
    });

    if (!bkkRegion) {
        console.log("Creating new region: กรุงเทพมหานคร");
        bkkRegion = await prisma.region.create({
            data: {
                name: "กรุงเทพมหานคร",
                color_code: "#2DD4BF" // Teal/Greenish distinct from others
            }
        });
    } else {
        console.log("Region 'กรุงเทพมหานคร' already exists.");
    }

    // 2. Find Bangkok Province
    const bkkProvince = await prisma.province.findFirst({
        where: { name: { contains: "กรุงเทพ" } }
    });

    if (!bkkProvince) {
        console.error("Province 'กรุงเทพมหานคร' not found!");
        return;
    }

    // 3. Update Province Region
    if (bkkProvince.region_id !== bkkRegion.id) {
        await prisma.province.update({
            where: { id: bkkProvince.id },
            data: { region_id: bkkRegion.id }
        });
        console.log(`Updated Province '${bkkProvince.name}' to Region '${bkkRegion.name}' (ID: ${bkkRegion.id})`);
    } else {
        console.log("Bangkok is already in the correct region.");
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
