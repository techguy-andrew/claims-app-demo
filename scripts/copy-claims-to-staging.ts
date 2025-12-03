import { PrismaClient } from '@prisma/client'

// Production DB - source (has the 2 new claims)
const productionUrl = "postgresql://neondb_owner:npg_Ct4isAu3kcwQ@ep-muddy-tooth-aftr8hdp.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

// Staging DB - destination (will become new production)
const stagingUrl = "postgresql://neondb_owner:npg_Ct4isAu3kcwQ@ep-nameless-dew-afjcar14.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

const productionDb = new PrismaClient({ datasources: { db: { url: productionUrl } } })
const stagingDb = new PrismaClient({ datasources: { db: { url: stagingUrl } } })

const CLAIM_NUMBERS_TO_COPY = ['RC3J7428', 'LLA7OR9P']

async function main() {
  console.log('Copying claims from production to staging...')
  console.log('')

  // 1. Get claims with all related data from production
  const claims = await productionDb.claim.findMany({
    where: {
      claimNumber: { in: CLAIM_NUMBERS_TO_COPY }
    },
    include: {
      items: {
        include: {
          attachments: true
        }
      },
      claimant: true
    }
  })

  console.log(`Found ${claims.length} claims to copy`)

  for (const claim of claims) {
    console.log('')
    console.log(`--- Processing claim: ${claim.claimNumber} ---`)

    // 2. Copy User (claimant) if not exists
    const existingUser = await stagingDb.user.findUnique({
      where: { id: claim.claimantId }
    })

    if (!existingUser && claim.claimant) {
      await stagingDb.user.create({
        data: {
          id: claim.claimant.id,
          clerkId: claim.claimant.clerkId,
          email: claim.claimant.email,
          name: claim.claimant.name,
          imageUrl: claim.claimant.imageUrl,
          createdAt: claim.claimant.createdAt,
          updatedAt: claim.claimant.updatedAt,
        }
      })
      console.log(`✓ Created user: ${claim.claimant.email}`)
    } else if (existingUser) {
      console.log(`- User already exists: ${existingUser.email}`)
    }

    // 3. Copy Claim
    const existingClaim = await stagingDb.claim.findUnique({
      where: { id: claim.id }
    })

    if (!existingClaim) {
      await stagingDb.claim.create({
        data: {
          id: claim.id,
          claimNumber: claim.claimNumber,
          description: claim.description,
          amount: claim.amount,
          status: claim.status,
          customer: claim.customer,
          adjustorName: claim.adjustorName,
          adjustorPhone: claim.adjustorPhone,
          adjustorEmail: claim.adjustorEmail,
          claimantName: claim.claimantName,
          claimantPhone: claim.claimantPhone,
          claimantEmail: claim.claimantEmail,
          claimantAddress: claim.claimantAddress,
          createdAt: claim.createdAt,
          updatedAt: claim.updatedAt,
          claimantId: claim.claimantId,
        }
      })
      console.log(`✓ Created claim: ${claim.claimNumber}`)
    } else {
      console.log(`- Claim already exists: ${claim.claimNumber}`)
    }

    // 4. Copy Items and Attachments
    for (const item of claim.items) {
      const existingItem = await stagingDb.item.findUnique({
        where: { id: item.id }
      })

      if (!existingItem) {
        await stagingDb.item.create({
          data: {
            id: item.id,
            title: item.title,
            description: item.description,
            order: item.order,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            claimId: item.claimId,
          }
        })
        console.log(`  ✓ Created item: ${item.title}`)
      } else {
        console.log(`  - Item already exists: ${item.title}`)
      }

      // Copy attachments for this item
      for (const attachment of item.attachments) {
        const existingAttachment = await stagingDb.attachment.findUnique({
          where: { id: attachment.id }
        })

        if (!existingAttachment) {
          await stagingDb.attachment.create({
            data: {
              id: attachment.id,
              itemId: attachment.itemId,
              filename: attachment.filename,
              url: attachment.url,
              thumbnailUrl: attachment.thumbnailUrl,
              mimeType: attachment.mimeType,
              size: attachment.size,
              width: attachment.width,
              height: attachment.height,
              publicId: attachment.publicId,
              version: attachment.version,
              format: attachment.format,
              createdAt: attachment.createdAt,
              updatedAt: attachment.updatedAt,
            }
          })
          console.log(`    ✓ Created attachment: ${attachment.filename}`)
        } else {
          console.log(`    - Attachment already exists: ${attachment.filename}`)
        }
      }
    }
  }

  console.log('')
  console.log('Copy complete!')
}

main()
  .catch(console.error)
  .finally(async () => {
    await productionDb.$disconnect()
    await stagingDb.$disconnect()
  })
