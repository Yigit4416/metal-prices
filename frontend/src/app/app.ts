import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GoldData } from './gold.model';
import { SocketService } from './services/socket';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  goldData = signal<GoldData[]>([]);
  lastUpdate = signal<Date>(new Date());

  constructor(private socketService: SocketService) {}

  ngOnInit() {
    console.log('🚀 Initializing AppComponent and subscribing to socket updates...');
    console.log('⏰ Current time:', new Date().toISOString());

    this.socketService.getGoldUpdates().subscribe({
      next: (data) => {
        console.log('📈 AppComponent received data:', data.length, 'items');
        if (data && data.length > 0) {
          console.log('📊 First item:', data[0]);
          this.goldData.set(data);
          this.lastUpdate.set(new Date());
        } else {
          console.log('⚠️ Received empty or null data');
        }
      },
      error: (error) => {
        console.error('❌ Error in socket subscription:', error);
      },
    });
  }
}
