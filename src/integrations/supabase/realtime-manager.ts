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

    if (!channel) {
      channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
      this.subscriptionStates.set(channelName, 'unsubscribed');
    }

    const state = this.subscriptionStates.get(channelName);

    // Só podemos adicionar ouvintes ANTES do subscribe()
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
      
      this.subscriptionStates.set(channelName, 'subscribing');
      
      // Executa o subscribe no próximo tick para garantir que todos os .on() iniciais foram registrados
      setTimeout(() => {
        if (this.subscriptionStates.get(channelName) === 'subscribing') {
          channel?.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.subscriptionStates.set(channelName, 'subscribed');
            }
          });
        }
      }, 0);
    } else {
      // Se já estiver inscrito ou se inscrevendo, não podemos usar .on()
      // O Supabase não permite adicionar ouvintes dinâmicos após subscribe()
      // Por isso usamos o singleton para garantir que o canal seja criado uma vez com seus ouvintes
      console.warn(`Canal ${channelName} já está em estado ${state}. Ouvintes adicionais podem não funcionar.`);
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
    }
  }
}

export const realtimeManager = RealtimeManager.getInstance();
