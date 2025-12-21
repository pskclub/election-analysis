
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const countWithImage = await prisma.person.count({
        where: {
            image_url: {
                not: null
            }
        }
    });

    const total = await prisma.person.count();

    console.log(`Total people: ${total}`);
    console.log(`People with images: ${countWithImage}`);

    // Fetch a sample of people WITHOUT images to see why
    const noImageSample = await prisma.person.findMany({
        where: {
            image_url: null
        },
        take: 3,
        select: {
            first_name: true,
            last_name: true,
            image_url: true
        }
    });

    console.log('Sample without images:', JSON.stringify(noImageSample, null, 2));
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
