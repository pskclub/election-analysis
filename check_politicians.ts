import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const searchNames = [
        "สนธยา", "อิทธิพล", // Chonburi
        "สมศักดิ์", "สุริยะ", // Sam Mitr
        "เนวิน", "ศักดิ์สยาม", "อนุทิน", // Buriram
        "ธรรมนัส", // Thamanat
        "สุเทพ", // Suthep
        "ประวิตร", "ประยุทธ์" // Big Pom, Big Tu
    ];

    console.log("Searching for key politicians include 2562 & 2566...");
    
    for (const name of searchNames) {
        const people = await prisma.person.findMany({
            where: {
                first_name: { contains: name }
            },
            select: { id: true, first_name: true, last_name: true }
        });
        if (people.length > 0) {
            console.log(`Found ${name}:`, people.map(p => `${p.first_name} ${p.last_name} (ID: ${p.id})`).join(", "));
        } else {
            console.log(`NOT Found ${name}`);
        }
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
