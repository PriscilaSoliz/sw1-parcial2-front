import { Injectable, NgZone } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private recognition: any;
  public transcript = '';

  constructor(private zone: NgZone) {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES'; // Cambia si deseas otro idioma
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      this.zone.run(() => {
        this.transcript = event.results[0][0].transcript;
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('Error de reconocimiento de voz:', event.error);
    };
  }

  start(): void {
    this.transcript = '';
    this.recognition.start();
  }

  stop(): void {
    this.recognition.stop();
  }

  getTranscript(): string {
    return this.transcript;
  }
}
