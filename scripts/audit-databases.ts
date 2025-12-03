import { PrismaClient } from '@prisma/client'

const productionUrl = 'postgresql://neondb_owner:npg_Ct4isAu3kcwQ@ep-muddy-tooth-aftr8hdp.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require'
const stagingUrl = 'postgresql://neondb_owner:npg_Ct4isAu3kcwQ@ep-nameless-dew-afjcar14.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require'

const prodDb = new PrismaClient({ datasources: { db: { url: productionUrl } } })
const stagingDb = new PrismaClient({ datasources: { db: { url: stagingUrl } } })

interface Difference {
  claimNumber: string
  issue?: string
  field?: string
  prod?: any
  staging?: any
}

async function main() {
  console.log('=== FULL DATABASE AUDIT ===')
  console.log('')

  // Get all claims with full data
  const prodClaims = await prodDb.claim.findMany({
    orderBy: { claimNumber: 'asc' },
    include: {
      items: {
        include: { attachments: true }
      }
    }
  })

  const stagingClaims = await stagingDb.claim.findMany({
    orderBy: { claimNumber: 'asc' },
    include: {
      items: {
        include: { attachments: true }
      }
    }
  })

  // Create maps
  const prodMap = new Map(prodClaims.map(c => [c.claimNumber, c]))
  const stagingMap = new Map(stagingClaims.map(c => [c.claimNumber, c]))

  console.log('Production claims:', prodClaims.length)
  console.log('Staging claims:', stagingClaims.length)
  console.log('')

  const differences: Difference[] = []
  const itemDifferences: string[] = []
  const attachmentDifferences: string[] = []

  // Compare each claim
  for (const [claimNum, prod] of prodMap) {
    const staging = stagingMap.get(claimNum)

    if (!staging) {
      differences.push({ claimNumber: claimNum, issue: 'MISSING in staging' })
      continue
    }

    // Compare claim fields
    const fieldsToCompare = ['customer', 'adjustorName', 'adjustorPhone', 'adjustorEmail']
    for (const field of fieldsToCompare) {
      const prodVal = (prod as any)[field] || ''
      const stagingVal = (staging as any)[field] || ''
      if (prodVal !== stagingVal) {
        differences.push({
          claimNumber: claimNum,
          field,
          prod: prodVal || '(empty)',
          staging: stagingVal || '(empty)'
        })
      }
    }

    // Compare items count
    if (prod.items.length !== staging.items.length) {
      itemDifferences.push(`${claimNum}: prod=${prod.items.length} items, staging=${staging.items.length} items`)
    }

    // Compare attachments count
    const prodAttachments = prod.items.reduce((sum, i) => sum + i.attachments.length, 0)
    const stagingAttachments = staging.items.reduce((sum, i) => sum + i.attachments.length, 0)
    if (prodAttachments !== stagingAttachments) {
      attachmentDifferences.push(`${claimNum}: prod=${prodAttachments} attachments, staging=${stagingAttachments} attachments`)
    }
  }

  // Report differences
  console.log('=== CLAIM FIELD DIFFERENCES ===')
  if (differences.length === 0) {
    console.log('No claim field differences found.')
  } else {
    differences.forEach(d => {
      if (d.issue) {
        console.log(`  ${d.claimNumber}: ${d.issue}`)
      } else {
        console.log(`  ${d.claimNumber}.${d.field}: prod="${d.prod}" vs staging="${d.staging}"`)
      }
    })
  }

  console.log('')
  console.log('=== ITEM COUNT DIFFERENCES ===')
  if (itemDifferences.length === 0) {
    console.log('No item count differences found.')
  } else {
    itemDifferences.forEach(d => console.log(`  ${d}`))
  }

  console.log('')
  console.log('=== ATTACHMENT COUNT DIFFERENCES ===')
  if (attachmentDifferences.length === 0) {
    console.log('No attachment count differences found.')
  } else {
    attachmentDifferences.forEach(d => console.log(`  ${d}`))
  }

  // Summary
  console.log('')
  console.log('=== SUMMARY ===')
  console.log(`Claim differences: ${differences.length}`)
  console.log(`Item count differences: ${itemDifferences.length}`)
  console.log(`Attachment count differences: ${attachmentDifferences.length}`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prodDb.$disconnect()
    await stagingDb.$disconnect()
  })
