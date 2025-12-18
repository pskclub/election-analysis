import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const username = 'admin';
    const password = 'password123';
    
    console.log(`Creating user: ${username}`);
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { username },
        update: {
            password: hashedPassword
        },
        create: {
            username,
            password: hashedPassword
        }
    });

    console.log(`User ${user.username} created/updated with ID: ${user.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
