import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

const WS_URL = import.meta.env.VITE_WS_URL;

let client: Client | null = null;

const getClient = (): Client => {
  if (!client) {
    client = new Client({
      brokerURL: `${WS_URL}/ws`,
      connectHeaders: { login: 'guest', passcode: 'guest' },
      heartbeatOutgoing: 20000,
      heartbeatIncoming: 0,
      reconnectDelay: 200,
    });
    client.activate();
  }
  return client;
};

export const useStomp = <T>(
  topic: string | null,
  onMessage: (data: T) => void
) => {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!topic) return;
    const stompClient = getClient();

    const subscribe = () => {
      const sub = stompClient.subscribe(topic, (frame) => {
        try {
          const data: T = JSON.parse(frame.body);
          onMessageRef.current(data);
        } catch {
          // ignore malformed frames
        }
      });
      return sub;
    };

    let sub: ReturnType<typeof stompClient.subscribe> | null = null;

    if (stompClient.connected) {
      sub = subscribe();
    } else {
      const originalOnConnect = stompClient.onConnect;
      stompClient.onConnect = (frame) => {
        originalOnConnect?.call(stompClient, frame);
        sub = subscribe();
      };
    }

    return () => {
      sub?.unsubscribe();
    };
  }, [topic]);
};
