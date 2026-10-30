import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface HackathonDB extends DBSchema {
  offline_events: {
    key: string
    value: {
      id: string
      name: string
      start_date_time: string
      venue_name: string
      venue_address: string
      slug: string
    }
    indexes: { 'by-start': string }
  }
  offline_qr_pass: {
    key: string
    value: {
      userId: string
      eventId: string
      qrData: string
      userName: string
      eventName: string
      cachedAt: number
    }
  }
  offline_teammates: {
    key: string
    value: {
      teamId: string
      members: Array<{
        first_name: string
        phone?: string
        github_url?: string
      }>
      cachedAt: number
    }
  }
  offline_schedule: {
    key: string
    value: {
      eventId: string
      schedule: Array<{ time: string; title: string; location: string }>
      cachedAt: number
    }
  }
  pending_sync: {
    key: string
    value: {
      id: string
      table: string
      action: 'insert' | 'update' | 'delete'
      data: Record<string, unknown>
      createdAt: number
    }
    indexes: { 'by-table': string }
  }
}

let dbPromise: Promise<IDBPDatabase<HackathonDB>> | null = null

function getDB(): Promise<IDBPDatabase<HackathonDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HackathonDB>('sas-hackathon-db', 1, {
      upgrade(db) {
        // Events cache
        const eventStore = db.createObjectStore('offline_events', { keyPath: 'id' })
        eventStore.createIndex('by-start', 'start_date_time')

        // QR pass cache
        db.createObjectStore('offline_qr_pass', { keyPath: 'userId' })

        // Teammate contacts
        db.createObjectStore('offline_teammates', { keyPath: 'teamId' })

        // Event schedule
        db.createObjectStore('offline_schedule', { keyPath: 'eventId' })

        // Pending sync queue
        const syncStore = db.createObjectStore('pending_sync', { keyPath: 'id' })
        syncStore.createIndex('by-table', 'table')
      },
    })
  }
  return dbPromise
}

// ---- Cache event for offline access ----
export async function cacheEvent(event: HackathonDB['offline_events']['value']): Promise<void> {
  const db = await getDB()
  await db.put('offline_events', event)
}

export async function getCachedEvents(): Promise<HackathonDB['offline_events']['value'][]> {
  const db = await getDB()
  return db.getAll('offline_events')
}

// ---- Cache QR pass ----
export async function cacheQRPass(pass: HackathonDB['offline_qr_pass']['value']): Promise<void> {
  const db = await getDB()
  await db.put('offline_qr_pass', pass)
}

export async function getCachedQRPass(userId: string): Promise<HackathonDB['offline_qr_pass']['value'] | undefined> {
  const db = await getDB()
  return db.get('offline_qr_pass', userId)
}

// ---- Cache teammate contacts ----
export async function cacheTeammates(data: HackathonDB['offline_teammates']['value']): Promise<void> {
  const db = await getDB()
  await db.put('offline_teammates', data)
}

export async function getCachedTeammates(teamId: string): Promise<HackathonDB['offline_teammates']['value'] | undefined> {
  const db = await getDB()
  return db.get('offline_teammates', teamId)
}

// ---- Cache schedule ----
export async function cacheSchedule(data: HackathonDB['offline_schedule']['value']): Promise<void> {
  const db = await getDB()
  await db.put('offline_schedule', data)
}

export async function getCachedSchedule(eventId: string): Promise<HackathonDB['offline_schedule']['value'] | undefined> {
  const db = await getDB()
  return db.get('offline_schedule', eventId)
}

// ---- Pending sync queue (last-write-wins) ----
export async function enqueueSync(
  table: string,
  action: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>
): Promise<void> {
  const db = await getDB()
  const id = `${table}:${action}:${data.id || Date.now()}`
  // Last-write-wins: remove any existing entry for same record
  const existing = await db.getAllFromIndex('pending_sync', 'by-table', table)
  for (const item of existing) {
    if (item.data.id === data.id) {
      await db.delete('pending_sync', item.id)
    }
  }
  await db.put('pending_sync', {
    id,
    table,
    action,
    data,
    createdAt: Date.now(),
  })
}

export async function getPendingSyncItems(): Promise<HackathonDB['pending_sync']['value'][]> {
  const db = await getDB()
  return db.getAll('pending_sync')
}

export async function clearSyncItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pending_sync', id)
}

// ---- Clear all cached data ----
export async function clearOfflineCache(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('offline_events'),
    db.clear('offline_qr_pass'),
    db.clear('offline_teammates'),
    db.clear('offline_schedule'),
    db.clear('pending_sync'),
  ])
}
