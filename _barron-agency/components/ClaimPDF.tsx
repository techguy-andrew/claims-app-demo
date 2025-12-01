import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from '@react-pdf/renderer'
import type { Claim, Item, Attachment, ClaimStatus } from '@prisma/client'

// Extended attachment type with pre-fetched base64 URL
interface ProcessedAttachment extends Attachment {
  base64Url?: string | null
}

// Props interface
interface ClaimPDFProps {
  claim: Claim & {
    items: (Item & {
      attachments: ProcessedAttachment[]
    })[]
  }
  shareUrl: string
}

// Color palette matching globals.css design tokens (converted to hex)
const colors = {
  background: '#ffffff',
  foreground: '#0a0a1a',
  card: '#ffffff',
  cardForeground: '#0a0a1a',
  muted: '#f4f4f8',
  mutedForeground: '#6b7280',
  border: '#e4e4e9',
  primary: '#1a1a2e',
  success: '#16a34a',
  destructive: '#dc2626',
  warning: '#f59e0b',
}

// Status colors
const statusColors: Record<ClaimStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  UNDER_REVIEW: { bg: '#dbeafe', text: '#1e40af' },
  APPROVED: { bg: '#dcfce7', text: '#166534' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
  CLOSED: { bg: '#f3f4f6', text: '#374151' },
}

// Status display names
const statusNames: Record<ClaimStatus, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
}

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  fieldLabel: {
    width: 100,
    color: colors.mutedForeground,
    fontSize: 10,
  },
  fieldValue: {
    flex: 1,
    fontSize: 10,
    color: colors.foreground,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  infoColumn: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.foreground,
  },
  itemDescription: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  attachmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  attachmentItem: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  pdfPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfText: {
    fontSize: 8,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  attachmentLink: {
    fontSize: 7,
    color: colors.primary,
    textDecoration: 'underline',
    marginTop: 2,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 8,
    color: colors.mutedForeground,
  },
  footerLink: {
    fontSize: 8,
    color: colors.primary,
    textDecoration: 'underline',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
})

// Helper to check if URL is an image
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

// Helper to check if URL is a PDF
function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

export function ClaimPDF({ claim, shareUrl }: ClaimPDFProps) {
  const statusStyle = statusColors[claim.status]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Claim #{claim.claimNumber}</Text>
              {claim.customer && (
                <Text style={styles.subtitle}>Customer: {claim.customer}</Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusStyle.bg, color: statusStyle.text },
              ]}
            >
              <Text>{statusNames[claim.status]}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            View online:{' '}
            <Link src={shareUrl} style={{ color: colors.primary }}>
              {shareUrl}
            </Link>
          </Text>
        </View>

        {/* Claim Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Claim Details</Text>
          <View style={styles.infoGrid}>
            {/* Adjustor Column */}
            <View style={styles.infoColumn}>
              <Text style={styles.infoTitle}>Adjustor</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Name:</Text>
                <Text style={styles.fieldValue}>
                  {claim.adjustorName || 'N/A'}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone:</Text>
                <Text style={styles.fieldValue}>
                  {claim.adjustorPhone || 'N/A'}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Email:</Text>
                <Text style={styles.fieldValue}>
                  {claim.adjustorEmail || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Claimant Column */}
            <View style={styles.infoColumn}>
              <Text style={styles.infoTitle}>Claimant</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Name:</Text>
                <Text style={styles.fieldValue}>
                  {claim.claimantName || 'N/A'}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone:</Text>
                <Text style={styles.fieldValue}>
                  {claim.claimantPhone || 'N/A'}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Email:</Text>
                <Text style={styles.fieldValue}>
                  {claim.claimantEmail || 'N/A'}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Address:</Text>
                <Text style={styles.fieldValue}>
                  {claim.claimantAddress || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Items ({claim.items.length})
          </Text>

          {claim.items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items in this claim</Text>
            </View>
          ) : (
            claim.items.map((item, index) => (
              <View key={item.id} style={styles.itemCard} wrap={false}>
                <Text style={styles.itemTitle}>
                  {index + 1}. {item.title || 'Untitled Item'}
                </Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}

                {/* Attachments */}
                {item.attachments.length > 0 && (
                  <View>
                    <Text
                      style={{
                        fontSize: 9,
                        color: colors.mutedForeground,
                        marginBottom: 6,
                      }}
                    >
                      Attachments ({item.attachments.length}):
                    </Text>
                    <View style={styles.attachmentsGrid}>
                      {item.attachments.map((attachment) => (
                        <View key={attachment.id}>
                          <Link src={shareUrl}>
                            <View style={styles.attachmentItem}>
                              {isImage(attachment.mimeType) && attachment.base64Url ? (
                                <Image
                                  src={attachment.base64Url}
                                  style={styles.attachmentImage}
                                />
                              ) : isImage(attachment.mimeType) ? (
                                <View style={styles.pdfPlaceholder}>
                                  <Text style={styles.pdfText}>IMAGE</Text>
                                  <Text style={styles.pdfText}>
                                    {attachment.filename.slice(0, 10)}...
                                  </Text>
                                </View>
                              ) : isPdf(attachment.mimeType) ? (
                                <View style={styles.pdfPlaceholder}>
                                  <Text style={styles.pdfText}>PDF</Text>
                                  <Text style={styles.pdfText}>
                                    {attachment.filename.slice(0, 10)}...
                                  </Text>
                                </View>
                              ) : (
                                <View style={styles.pdfPlaceholder}>
                                  <Text style={styles.pdfText}>FILE</Text>
                                  <Text style={styles.pdfText}>
                                    {attachment.filename.slice(0, 10)}...
                                  </Text>
                                </View>
                              )}
                            </View>
                          </Link>
                          <Text style={styles.attachmentLink}>View online</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated: {new Date().toLocaleDateString()}
          </Text>
          <Link src={shareUrl} style={styles.footerLink}>
            View online: {shareUrl}
          </Link>
        </View>
      </Page>
    </Document>
  )
}
