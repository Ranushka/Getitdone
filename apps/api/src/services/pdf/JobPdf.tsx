import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

export interface JobPdfItem {
  title: string
  comment: string | null
  status: string
  imageDataUris: string[]
  videoCount: number
}

export interface JobPdfSignOff {
  role: 'technician' | 'manager'
  name: string
  signedAt: Date
}

export interface JobPdfData {
  title: string
  notes: string | null
  status: string
  items: JobPdfItem[]
  signOffs: JobPdfSignOff[]
  generatedAt: Date
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 18, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  meta: { color: '#555', marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  item: { marginBottom: 10, paddingBottom: 10, borderBottom: '1 solid #ddd' },
  itemTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  itemStatus: { color: '#555', marginBottom: 2 },
  itemComment: { marginBottom: 4 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: 90, height: 90, objectFit: 'cover', marginRight: 6, marginBottom: 6 },
  videoNote: { color: '#555', fontStyle: 'italic' },
  signOffRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, color: '#999', fontSize: 8 },
})

export function JobPdf({ data }: { data: JobPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{data.title}</Text>
        <Text style={styles.meta}>Status: {data.status}</Text>
        {data.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist</Text>
          {data.items.map((item, i) => (
            <View key={i} style={styles.item} wrap={false}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemStatus}>{item.status}</Text>
              {item.comment ? <Text style={styles.itemComment}>{item.comment}</Text> : null}
              {item.imageDataUris.length > 0 ? (
                <View style={styles.thumbRow}>
                  {item.imageDataUris.map((uri, j) => (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image key={j} src={uri} style={styles.thumb} />
                  ))}
                </View>
              ) : null}
              {item.videoCount > 0 ? (
                <Text style={styles.videoNote}>
                  {item.videoCount} video{item.videoCount === 1 ? '' : 's'} attached (see job in app)
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sign-off</Text>
          {data.signOffs.length === 0 ? (
            <Text>No sign-offs yet.</Text>
          ) : (
            data.signOffs.map((s, i) => (
              <View key={i} style={styles.signOffRow}>
                <Text>
                  {s.role === 'technician' ? 'Technician' : 'Manager'}: {s.name}
                </Text>
                <Text>{s.signedAt.toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>Generated {data.generatedAt.toLocaleString()}</Text>
      </Page>
    </Document>
  )
}
