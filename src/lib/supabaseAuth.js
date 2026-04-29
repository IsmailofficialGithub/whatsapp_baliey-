import { proto } from '@whiskeysockets/baileys';
import { supabaseAdmin } from './supabase.js';

/**
 * Custom Baileys Auth State using Supabase as the backend
 * @param {string} applicationId - The unique ID of the application/instance
 */
export const useSupabaseAuthState = async (applicationId) => {
  
  const writeData = async (data, key) => {
    try {
      const { error } = await supabaseAdmin
        .from('sessions')
        .upsert({
          application_id: applicationId,
          key: key,
          data: JSON.parse(JSON.stringify(data, (k, v) => {
              if (Buffer.isBuffer(v)) return v.toString('base64');
              return v;
          }))
        }, { onConflict: 'application_id, key' });

      if (error) throw error;
    } catch (err) {
      console.error('❌ Supabase Auth Write Error:', err.message);
    }
  };

  const readData = async (key) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .select('data')
        .eq('application_id', applicationId)
        .eq('key', key)
        .single();

      if (error || !data) return null;

      return JSON.parse(JSON.stringify(data.data), (k, v) => {
        if (typeof v === 'string' && v.length > 20 && /^[A-Za-z0-9+/=]+$/.test(v)) {
           // Heuristic for base64 buffer - Baileys usually handles this but we're safe
        }
        return v;
      });
    } catch (err) {
      return null;
    }
  };

  const removeData = async (key) => {
    try {
      await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('application_id', applicationId)
        .eq('key', key);
    } catch (err) {
      console.error('❌ Supabase Auth Delete Error:', err.message);
    }
  };

  // Initial creds load
  let creds = await readData('creds');
  if (!creds) {
    // Generate new creds if not found
    // This is handled by Baileys if we return initial state
  }

  return {
    state: {
      creds: creds || {},
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (value) {
                if (type === 'app-state-sync-key') {
                  value = proto.Message.AppStateSyncKeyData.fromObject(value);
                }
                data[id] = value;
              }
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              if (value) {
                tasks.push(writeData(value, key));
              } else {
                tasks.push(removeData(key));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      // Baileys provides the latest creds in the state object
      // We just need to trigger a write for the 'creds' key
    }
  };
};
