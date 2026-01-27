import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { GoldData } from '../gold.model';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;
  // If running locally use localhost:3000
  // If deployed, use your domain (e.g. https://metal.ojrd.space)
  private readonly URL = '';
  // TIP: For production, you usually leave the URL empty to use the current domain

  constructor() {
    console.log('🔌 Initializing socket service, connecting to:', this.URL);
    this.socket = io(this.URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected with ID:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected, reason:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      console.error('🔍 Error details:', error.message);
    });
  }

  // Listen for the 'gold-update' event
  getGoldUpdates(): Observable<GoldData[]> {
    return new Observable((observer) => {
      this.socket.on('gold-update', (data: GoldData[]) => {
        console.log('📊 Received gold data:', data);
        observer.next(data);
      });

      // Cleanup if the component is destroyed
      return () => {
        // Don't disconnect the socket completely, just remove the listener
        this.socket.off('gold-update');
      };
    });
  }
}
