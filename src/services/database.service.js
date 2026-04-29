import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Database Service for Supabase operations
 */
export const DatabaseService = {
  /**
   * Log a WhatsApp message to the database
   * @param {Object} messageData - The message data to log
   */
  async logMessage(messageData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('messages') // Assuming a 'messages' table exists
        .insert([
          {
            phone: messageData.phone,
            content: messageData.content,
            type: messageData.type, // 'incoming' or 'outgoing'
            whatsapp_id: messageData.whatsapp_id,
            timestamp: new Date().toISOString(),
            metadata: messageData.metadata || {}
          }
        ]);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Database log error:', error.message);
      // We don't want to crash the app if logging fails, but we should know about it
      return null;
    }
  },

  /**
   * Generic query helper
   */
  async query(table, select = '*') {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select);
    
    if (error) throw error;
    return data;
  }
};
