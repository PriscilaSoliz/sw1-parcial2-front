import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class GeminiService {

    private readonly API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';
    private readonly API_KEY = 'AIzaSyDSZmAJIE17Ei-QATNIPXHyFM3Rm9RSDBE';
// AIzaSyByopC8feRWNWImbDqJpi4nXyb49WHyUqQ
    constructor(private http: HttpClient) {}

    enviarPreguntaConImagen(pregunta: string, imagenBase64: string): Observable<any> {
        const body = {
            contents: [{
                parts: [
                    { text: pregunta },
                    { inlineData: { mimeType: 'image/png', data: imagenBase64.split(',')[1] } }
                ]
            }]
        };
        return this.http.post(`${this.API_URL}?key=${this.API_KEY}`, body);
    }

    async enviarPrompt(prompt: string): Promise<string> {
        const body = {
          contents: [{ parts: [{ text: prompt }] }]
        };
        const response: any = await firstValueFrom(
          this.http.post(`${this.API_URL}?key=${this.API_KEY}`, body)
        );
        return response.candidates[0]?.content?.parts[0]?.text || '';
    }
    
  /**
   * Genera un widget Flutter completo a partir de un HTML dado (contenidos del editor).
   */
  generarFlutterDesdeHtml(html: string): Promise<string> {
    const prompt =/*`
Eres un generador de Flutter. A partir de este HTML:

${html}

Devuelve solo código Dart completo, listo para pegar en lib/mi_widget.dart. Debe incluir
import 'package:flutter/material.dart';
y una clase MiWidget que extienda StatelessWidget, con build() que devuelva un Scaffold
con el contenido. No expliques nada.
`;*/
`
Eres un generador de Flutter. A partir del siguiente HTML, interpreta el contenido y genera el código Dart correspondiente:

${html}

Debe incluir:
- import 'package:flutter/material.dart';
- Una clase MiWidget (StatelessWidget o StatefulWidget según sea necesario).
- Si detectas formularios o botones de acción como "crear", "editar", "eliminar", implementa la lógica correspondiente al CRUD usando una lista local simulada (con setState).
- Si no se detecta funcionalidad interactiva, genera solo la interfaz visual estática.
- El código debe ser completo, listo para usarse en lib/mi_widget.dart.

No expliques nada. Solo devuelve el código Dart completo y funcional.
`;
    return firstValueFrom(
      this.http.post(`${this.API_URL}?key=${this.API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      })
    ).then((res: any) => res.candidates[0]?.content?.parts[0]?.text || '');
  }

  /**
   * Genera un widget Flutter completo a partir de una imagen (base64).
   */
  generarFlutterDesdeImagen(imagenBase64: string): Promise<string> {
    const prompt = /*`
Eres un generador de Flutter. A partir de la imagen (representada en base64) crea
un widget completo de Flutter que reproduzca esa interfaz. Devuelve solo código Dart,
importaciones y clase MiWidget. No expliques nada.
`;*/
`
A partir de la siguiente imagen en base64, genera un widget Flutter que reproduzca la interfaz visual interpretada.

- Si la imagen contiene elementos que sugieren acciones (botones de "crear", "editar", "eliminar"), implementa un CRUD funcional usando StatefulWidget y listas locales simuladas.
- Si solo contiene estructura visual, genera el diseño correspondiente sin lógica.
- Usa import 'package:flutter/material.dart' y devuelve una clase MiWidget completa.

No expliques nada, solo responde con el código Dart completo y funcional.
`;
    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: imagenBase64 } }
        ]
      }]
    };
    return firstValueFrom(
      this.http.post(`${this.API_URL}?key=${this.API_KEY}`, body)
    ).then((res: any) => res.candidates[0]?.content?.parts[0]?.text || '');
  }

  /**
   * Genera un widget Flutter completo a partir de un prompt de lenguaje natural.
   */
  generarFlutterDesdePrompt(userPrompt: string): Promise<string> {
    const prompt = /*`
Eres un generador de Flutter. A partir de esta petición en lenguaje natural:
"${userPrompt}"
devuelve solo código Dart completo, listo para pegar en lib/mi_widget.dart,
con import 'package:flutter/material.dart'; y la clase MiWidget.
No expliques nada.
`;*/
`
Eres un generador de Flutter. A partir de esta descripción:

"${userPrompt}"

Interpreta si la descripción implica solo una interfaz visual o una vista funcional (como un CRUD). Genera el código Dart completo según el caso:

- Si se trata de una vista estática (como una landing page o dashboard sin acciones), genera solo la interfaz.
- Si se menciona funcionalidad (como crear, editar, eliminar, listar), genera un CRUD funcional usando StatefulWidget y setState.
- Usa listas locales como fuente de datos simulada.

Devuelve solo el código Dart listo para usarse en lib/mi_widget.dart. No expliques nada.
`;
    return firstValueFrom(
      this.http.post(`${this.API_URL}?key=${this.API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      })
    ).then((res: any) => res.candidates[0]?.content?.parts[0]?.text || '');
  }
}


