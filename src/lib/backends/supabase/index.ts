import { supabaseStorage } from './storage'
import { supabaseRealtime } from './realtime'
import type { BackendProvider } from '../types'

export const supabaseBackend: BackendProvider = {
  storage: supabaseStorage,
  realtime: supabaseRealtime,
}
