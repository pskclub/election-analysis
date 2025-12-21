
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking for person images...');
    const peopleWithImages = await prisma.person.findMany({
        where: {
            image_url: {
                not: null
            }
        },
        take: 5
    });

    console.log(`Found ${peopleWithImages.length} people with images.`);
    if (peopleWithImages.length > 0) {
        console.log('Sample:', peopleWithImages[0]);
    } else {
        const allPeople = await prisma.person.findMany({ take: 5 });
        console.log('Sample of people without images:', allPeople[0]);
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
