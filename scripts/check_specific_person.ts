
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const names = ['พิธา', 'ประยุทธ์', 'แพทองธาร', 'เศรษฐา'];

    for (const name of names) {
        const people = await prisma.person.findMany({
            where: {
                first_name: {
                    contains: name
                }
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                image_url: true
            }
        });

        if (people.length > 0) {
            console.log(`Results for ${name}:`);
            people.forEach(p => console.log(JSON.stringify(p, null, 2)));
        } else {
            console.log(`No results for ${name}`);
        }
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
