import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./client";

/**
 * Gerenciador de Canais Realtime (Singleton)
 * 
 * Resolve o erro "cannot add postgres_changes callbacks after subscribe()"
 * garantindo que apenas uma instância de canal exista por nome e que a
 * inscrição ocorra apenas uma vez.
 */
class RealtimeManager {
  private static instance: RealtimeManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptionStates: Map<string, 'unsubscribed' | 'subscribing' | 'subscribed'> = new Map();
  private listeners: Map<string, Array<{ options: any, callback: (payload: any) => void }>> = new Map();

  private constructor() {}

  public static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  /**
   * Obtém ou cria um canal e se inscreve se necessário.
   * O callback é adicionado ao canal.
   */
  public subscribe(
    channelName: string, 
    options: {
      event: string;
      schema: string;
      table: string;
      filter?: string;
    },
    callback: (payload: any) => void
  ): RealtimeChannel {
    let channel = this.channels.get(channelName);
    const listenerKey = `${channelName}-${options.event}-${options.table}-${options.filter || 'no-filter'}`;

    if (!channel) {
      channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
      this.subscriptionStates.set(channelName, 'unsubscribed');
      this.listeners.set(channelName, []);
    }

    const state = this.subscriptionStates.get(channelName);
    const currentListeners = this.listeners.get(channelName) || [];
    
    // Check if this specific listener already exists to avoid duplicates
    const alreadyRegistered = currentListeners.some(l => 
      JSON.stringify(l.options) === JSON.stringify(options)
    );

    if (!alreadyRegistered) {
      if (state === 'unsubscribed') {
        channel.on(
          'postgres_changes' as any,
          { 
            event: options.event, 
            schema: options.schema, 
            table: options.table, 
            filter: options.filter 
          },
          callback
        );
        currentListeners.push({ options, callback });
        this.listeners.set(channelName, currentListeners);
      } else {
        console.warn(`Canal ${channelName} já está em estado ${state}. O Supabase não permite adicionar ouvintes após o subscribe. Recomenda-se criar o canal com todos os ouvintes necessários ou usar canais diferentes.`);
      }
    }

    if (state === 'unsubscribed') {
      this.subscriptionStates.set(channelName, 'subscribing');
      
      // Executa o subscribe no próximo tick para garantir que todos os .on() síncronos foram registrados
      setTimeout(() => {
        const currentState = this.subscriptionStates.get(channelName);
        if (currentState === 'subscribing') {
          channel?.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.subscriptionStates.set(channelName, 'subscribed');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              this.subscriptionStates.set(channelName, 'unsubscribed');
            }
          });
        }
      }, 10);
    }

    return channel;
  }

  /**
   * Remove um canal e limpa o estado.
   */
  public unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.subscriptionStates.delete(channelName);
      this.listeners.delete(channelName);
    }
  }
}

export const realtimeManager = RealtimeManager.getInstance();
