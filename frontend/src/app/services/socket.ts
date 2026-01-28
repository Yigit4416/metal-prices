import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GoldData } from '../gold.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: WebSocket;
  // Use the URL from the environment file
  private readonly URL = environment.wsUrl;

  constructor() {
    console.log('🔌 Initializing standard WebSocket service, connecting to:', this.URL);
    this.socket = new WebSocket(this.URL);

    this.socket.onopen = () => {
      console.log('✅ WebSocket connection established.');
    };

    this.socket.onclose = (event) => {
      console.log('❌ WebSocket disconnected, reason:', event.reason);
    };

    this.socket.onerror = (error) => {
      console.error('❌ WebSocket connection error:', error);
    };
  }

  getGoldUpdates(): Observable<GoldData[]> {
    return new Observable((observer) => {
      // Listen for messages from the server
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Check the message type to handle different kinds of data
          if (message.type === 'gold-update') {
            observer.next(message.data);
          }
        } catch (e) {
          console.error('Failed to parse incoming socket message', e);
        }
      };

      // Cleanup when the component is destroyed
      return () => {
        // The socket will be closed by the browser, but you can
        // remove the onmessage listener if you want to be tidy.
        this.socket.onmessage = null;
      };
    });
  }
}
