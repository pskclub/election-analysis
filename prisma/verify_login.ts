import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const username = 'admin';
    const password = 'password123';
    
    console.log(`Checking login for: ${username}`);
    
    const user = await prisma.user.findUnique({
        where: { username }
    });

    if (!user) {
        console.log("User not found!");
        return;
    }

    console.log("User found. ID:", user.id);
    console.log("Stored Hash:", user.password);

    const isValid = await bcrypt.compare(password, user.password);
    console.log("Password Valid?", isValid);
    
    if(!isValid) {
        console.log("Try re-hashing...");
        const newHash = await bcrypt.hash(password, 10);
        console.log("New Hash:", newHash);
        
        await prisma.user.update({
            where: { id: user.id },
            data: { password: newHash }
        });
        console.log("Updated password hash in DB.");
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
