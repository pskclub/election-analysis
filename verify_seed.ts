import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("--- Verification ---")
    
    // Elections
    const elections = await prisma.election.findMany({ orderBy: { year_th: 'asc' }})
    console.log("Elections:", elections.map(e => `${e.id}: ${e.year_th}`))

    // Stats
    for(const e of elections) {
        const pCount = await prisma.candidateParticipation.count({ where: { election_id: e.id } })
        const winnerCount = await prisma.candidateParticipation.count({ where: { election_id: e.id, is_winner: true } })
        console.log(`Election ${e.year_th}: ${pCount} participations, ${winnerCount} winners`)
    }

    // Party Count
    const parties = await prisma.party.count()
    console.log(`Total Parties: ${parties}`)

    // Person Count
    const people = await prisma.person.count()
    console.log(`Total People: ${people}`)

    // Check for duplicates
    // (A person should not participate twice in same election)
    const dups = await prisma.candidateParticipation.groupBy({
        by: ['election_id', 'person_id'],
        _count: { person_id: true },
        having: { person_id: { _count: { gt: 1 } } }
    })
    
    if(dups.length > 0) {
        console.error("Found Duplicates:", dups)
    } else {
        console.log("No duplicate participations found.")
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
