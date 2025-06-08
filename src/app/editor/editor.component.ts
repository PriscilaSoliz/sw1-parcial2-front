import { Component, AfterViewInit, ViewChild } from '@angular/core';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjs from 'grapesjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SalaService } from '../services/sala.service';
import { WebSocketService } from '../services/websocket.service';
import { ChatGeminiComponent } from '../components/chat-gemini/chat-gemini.component';
import { SqlGenerateComponent } from '../components/sql-generate/sql-generate.component';
import { NavbarComponent } from '../components/navbar/navbar.component';
import { loadBlocks } from './blocks';
import { GeminiService } from '../services/gemini.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import JSZip from 'jszip';

@Component({
  selector: 'app-editor',
  standalone: true,
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css'],
  imports: [CommonModule, ChatGeminiComponent, SqlGenerateComponent, NavbarComponent, FormsModule],
})
export class EditorComponent implements AfterViewInit {
  @ViewChild(ChatGeminiComponent) chatGeminiComponent!: ChatGeminiComponent;
  @ViewChild(SqlGenerateComponent) sqlGenerateComponent!: SqlGenerateComponent;

  editor: any;
  idSala!: number;
  static editorInstance: any;

  htmlExportado = '';
  cssExportado = '';
  tsExportado = '';
   // ⇨ DONDE SE VA A GUARDAR EL DART COMPLETO
  dartExportado = '';
  modalExportarAbierto = false;

  modalXmiAbierto = false;
  cargandoGeminiXMI = false;
  mensajeGemini = '';

  // ⇨ NUEVO: estados para exportar desde imagen
  cargandoImagen = false;
  mensajeImagen = '';

  promptText='';

  // ⇨ VARIABLE USADA EN EL HTML
cargando = false;

  constructor(
    private route: ActivatedRoute,
    private salaService: SalaService,
    private webSocketService: WebSocketService,
    private geminiService: GeminiService,
    private http: HttpClient
  ) {}

  ngAfterViewInit(): void {
    this.route.params.subscribe(params => {
      this.idSala = +params['id'];

      this.editor = grapesjs.init({
        container: '#gjs',
        height: '100vh',
        width: 'auto',
        fromElement: false,
        storageManager: false,
        plugins: ['gjs-preset-webpage'],
        pluginsOpts: {
          'gjs-preset-webpage': {
            blocksBasic: false,
            forms: false,
            navbar: false,
            countdown: false,
            export: false,
            flexGrid: false,
          },
        },
        blockManager: { appendTo: '#blocks' },
        styleManager: { appendTo: '#styles' },
        traitManager: { appendTo: '#traits' },
        layerManager: { appendTo: '#layers' },
        selectorManager: { appendTo: '#selectors' },
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Tablet', width: '768px' },
            { name: 'Mobile', width: '375px' },
          ],
        },
      });

      loadBlocks(this.editor.BlockManager);
      (window as any).grapesEditorInstance = this.editor;

      this.cargarContenido();
      this.webSocketService.joinSala(this.idSala);

      this.editor.on('component:update', (model: any) => {
        this.enviarActualizacion(model);
      });
  
      this.editor.on('component:drag:end', (model: any) => {
        this.enviarActualizacion(model);
      });
  
      this.editor.on('component:remove', (model: any) => {
        this.enviarEliminacion(model);
      });
  
      // 🔵 Escuchar cambios remotos
      this.webSocketService.escucharContenido((cambio: any) => {
        if (!cambio) return;
        if (cambio.tipo === 'update') {
          this.actualizarComponenteRemoto(cambio.data);
        } else if (cambio.tipo === 'delete') {
          this.eliminarComponenteRemoto(cambio.data);
        }
      });
    });
  }

  cargarContenido() {
    this.salaService.obtenerContenido(this.idSala).subscribe(
      (res) => {
        if (res.contenido) {
          this.editor.loadProjectData(JSON.parse(res.contenido));
        }
      },
      (err) => console.error('Error al cargar contenido:', err)
    );
  }

  guardarContenido() {
    const projectData = this.editor.getProjectData();
    this.salaService.guardarContenido(this.idSala, JSON.stringify(projectData)).subscribe(
      () => window.alert('✅ Guardado exitosamente'),
      (err) => console.error('Error al guardar contenido:', err)
    );
  }

  abrirModalGemini() {
    this.chatGeminiComponent?.abrirModal();
  }

  abrirModalSql() {
    this.sqlGenerateComponent?.abrirModal();
  }

  /*-------- 🔵 SOCKET.IO Funciones ---------*/

  enviarActualizacion(model: any) {
    const id = typeof model.getId === 'function' ? model.getId() : model.id;
    const attributes = typeof model.getAttributes === 'function' ? model.getAttributes() : model.attributes || {};
    const style = typeof model.getStyle === 'function' ? model.getStyle() : model.style || {};
    const content = typeof model.toHTML === 'function' ? model.toHTML() : model.content || '';
  
    if (!id) {
      console.warn('⚠️ No se pudo obtener ID válido del componente:', model);
      return;
    }
  
    const rawContent = model.toHTML ? model.toHTML() : model.content || '';
    const cleanContent = rawContent
      .replace(/<\/?body[^>]*>/g, '')  // Elimina <body> y </body>
      .replace(/<\/?html[^>]*>/g, '')  // Elimina <html>
      .replace(/<\/?head[^>]*>/g, ''); // Elimina <head>

    const data = {
      tipo: 'update',
      data: {
        id,
        attributes: model.getAttributes ? model.getAttributes() : model.attributes || {},
        style: model.getStyle ? model.getStyle() : model.style || {},
        content: cleanContent,
      }
    };
  
    console.log('📤 Enviando actualización:', data);
    this.webSocketService.enviarContenido(this.idSala, JSON.stringify(data));
  }
   
  enviarEliminacion(model: any) {
    const data = {
      tipo: 'delete',
      data: {
        id: model.getId(),
      }
    };
    console.log('📤 Enviando eliminación:', data);
    this.webSocketService.enviarContenido(this.idSala, JSON.stringify(data));
  }
  
  actualizarComponenteRemoto(data: any) {
    console.log('🔵 Aplicando cambio remoto:', data);
    const wrapper = this.editor.getWrapper();
    
    if (data.id === 'wrapper' || !data.id) {
        // 🔵 Si no hay id o es el canvas raíz => actualiza TODO
        wrapper.components([]);
        wrapper.append(data.content);
    } else {
        // 🔵 Si tiene id, buscar y actualizar ese componente específico
        const target = wrapper.find(`#${data.id}`)[0];
        
        if (target) {
            console.log('🎯 Componente encontrado:', target);
            if (data.attributes) {
                target.setAttributes(data.attributes);
            }
            if (data.style) {
                target.setStyle(data.style);
            }
            if (data.content !== undefined) {
                target.components([]);
                target.append(data.content);
            }
        } else {
            console.warn('⚠️ No se encontró el componente, se crea uno nuevo');
            wrapper.append({
                type: 'default',
                id: data.id,
                attributes: data.attributes || {},
                style: data.style || {},
                content: data.content || '',
            });
        }
    }

    this.editor.refresh();
  }

  
  eliminarComponenteRemoto(data: any) {
    const component = this.editor.getWrapper().find(`#${data.id}`)[0];
    if (component) {
      component.remove();
    }
  }

  /* -------- 🛠 Exportar a Flutter --------- */

  abrirModalExportar() {
    this.modalExportarAbierto = true;
  }

  cerrarModalExportar() {
    this.modalExportarAbierto = false;
  }

descargarArchivos() {
  // 1) Comprobar que hay algo que descargar
  if (!this.dartExportado || !this.dartExportado.trim()) {
    console.warn('Nada para descargar: dartExportado está vacío');
    return;
  }

  const nombreComponente = 'mi_widget.dart';
  const blob = new Blob([this.dartExportado], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  // 2) Crear elemento <a>, añadirlo al body, disparar click y luego limpiarlo
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreComponente;
  document.body.appendChild(link);   // Necesario en algunos navegadores
  link.click();
  document.body.removeChild(link);   // Limpieza

  // 3) Liberar URL
  URL.revokeObjectURL(url);
}


 /* ====== EXPORTACIÓN A ZIP DE PROYECTO FLUTTER ===// ⇨ NUEVO: genera Flutter desde el HTML actual del editor=== */

  /** 1) Desde el HTML actual del editor */
  exportarFlutterDesdeEditor() {
    this.cargando = true;
    const html = this.editor.getHtml();
    this.geminiService.generarFlutterDesdeHtml(html)
      .then(code => this.generarYDescargarZip(code))
      .catch(err => console.error('Error generando Flutter desde HTML', err))
      .finally(() => this.cargando = false);
  }

  /** 2) Desde una imagen cargada */
  onImagenChange(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.cargandoImagen = true;
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const base64 = e.target.result.split(',')[1];
      try {
        const code = await this.geminiService.generarFlutterDesdeImagen(base64);
        this.generarYDescargarZip(code);
      } catch (err) {
        console.error('Error generando Flutter desde imagen', err);
      } finally {
        this.cargandoImagen = false;
      }
    };
    reader.readAsDataURL(file);
  }

  /** 3) Desde un prompt de texto */
  exportarFlutterDesdePrompt() {
    if (!this.promptText.trim()) return;
    this.cargando = true;
    this.geminiService.generarFlutterDesdePrompt(this.promptText)
      .then(code => this.generarYDescargarZip(code))
      .catch(err => console.error('Error generando Flutter desde prompt', err))
      .finally(() => this.cargando = false);
  }

  /**
   * Empaqueta en ZIP un proyecto Flutter mínimo con el código Dart generado,
   * dispara la descarga y limpia el blob.
   */
  private generarYDescargarZip(dartCode: string) {
    const zip = new JSZip();

    // Archivo lib/mi_widget.dart
    //  CORREGIMOS: limpiamos markdown
  const cleanCode = dartCode
    .replace(/```dart/g, '')
    .replace(/```/g, '')
    .trim();

  zip.file('flutter_project/lib/mi_widget.dart', cleanCode);

    // Archivo lib/main.dart
    zip.file('flutter_project/lib/main.dart', `
import 'package:flutter/material.dart';
import 'mi_widget.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Interfaz Generada',
      home: MiWidget(),
    );
  }
}
    `.trim());

    // Archivo pubspec.yaml
    zip.file('flutter_project/pubspec.yaml', `
name: interfaz_flutter
description: Interfaz generada automáticamente
publish_to: 'none'

environment:
  sdk: '>=2.17.0 <3.0.0'

dependencies:
  flutter:
    sdk: flutter

flutter:
  uses-material-design: true
    `.trim());

    // Generar y descargar ZIP
    zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flutter_project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  /* ⇨ MODIFICADO: Exportar desde prompt */

    //PROMT
  cargandoPrompt = false;
  mostrarPrompt = false;
  prompt = ''; 

  abrirModalPrompt() {
    this.mostrarPrompt = true;
  }

  enviarPrompt() {
    if (!this.prompt.trim()) return;
    this.cargandoPrompt = true;
    const API_KEY ='AIzaSyDSZmAJIE17Ei-QATNIPXHyFM3Rm9RSDBE';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

      const body = {
      contents: [
        {
          parts: [
            {
              text: `
Eres un generador de interfaces visuales solo para vistas moviles. A partir de la siguiente petición en lenguaje natural:

"${this.prompt}"

Genera el HTML estructurado listo para GrapesJS (sin <html> ni <body>) y el CSS dentro de una etiqueta <style>. Importante:
- Los formularios deben usar <form>.
- Los botones deben ser <button type="submit">Guardar</button>.
- Cada <input> debe tener un atributo name correspondiente.
- No expliques nada, solo responde con el código HTML y CSS limpio directamente.
`
            }
          ]
        }
      ]
    };

    this.http.post<any>(url, body).subscribe({
      next: (res) => {
        const respuesta = res?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        this.editor.setComponents('');              // Limpia lienzo
        this.editor.addComponents(respuesta);       // Añade resultado
        this.abrirModalExportar();                  // Abre modal Flutter
        this.cargandoPrompt = false;
        this.cerrarModalPrompt();
      },
      error: (err) => {
        console.error('Error al enviar prompt:', err);
        this.cargandoPrompt = false;
      }
    });
  }

  cerrarModalPrompt() {
    this.mostrarPrompt = false;
    this.prompt = '';
  }


  /*---------EXPORTAR A XMI O XML */
  procesarXMI(event: any) {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const contenidoXML = e.target.result;
      this.cargandoGeminiXMI = true;
      this.mensajeGemini = 'Enviando archivo a Gemini...';
  
      try {
        const prompt = `
          Eres un experto en front-end y estás ayudando a convertir diagramas XMI en diseños web.
          Eres un asistente experto en Angular. Se te proporciona un archivo XMI que representa un modelo de base de datos generado en Enterprise Architect. Quiero que generes a partir de ese XMI un diseño web CRUD funcional utilizando HTML y CSS compatible con Angular. Este diseño debe contener formularios, inputs, botones y estructura visual editable en un editor como GrapesJS. No generes el diseño como un diagrama UML, sino como una interfaz visual de formulario web moderna, con estilo limpio y organizado.
          
          <xml>
          ${contenidoXML}
          </xml>
          Solo responde con el contenido de <body> y <style> para que sea fácil insertarlo al canvas. No incluyas etiquetas <html> ni <head>.
          No expliques nada, solo da el HTML y CSS limpio.  
          `;
        // 👉 Suponiendo que tienes GeminiService ya configurado:
        const respuesta = await this.geminiService.enviarPrompt(prompt);
        const { html, css } = this.extraerHtmlCss(respuesta);
        console.log('📦 Respuesta de Gemini:', respuesta); /*---- */
        this.editor.addComponents(`
          <style>${css}</style>
          ${html}
        `);
        this.mensajeGemini = '✅ Diseño generado con éxito.';
      } catch (err) {
        console.error('Error al procesar con Gemini:', err);
        this.mensajeGemini = '❌ Error al procesar el archivo.';
      } finally {
        this.cargandoGeminiXMI = false;
        this.cerrarModalXMI();
      }
    };
    reader.readAsText(file);
  }
  

  convertirXMIaEditor(xmlString: string) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
  
    const tablas = Array.from(xml.getElementsByTagName('table'));
  
    tablas.forEach((tabla: any) => {
      const nombreTabla = tabla.getAttribute('name');
      const columnas = Array.from(tabla.getElementsByTagName('column')).map((col: any) =>
        col.getAttribute('name')
      );
  
      // Crear bloque visual simulado 
      const html = `
        <div class="tabla-sql">
          <h3>${nombreTabla}</h3>
          <ul>${columnas.map(col => `<li>${col}</li>`).join('')}</ul>
        </div>
      `;
  
      this.editor.addComponents(html);
    });
  }

  extraerHtmlCss(respuesta: string): { html: string, css: string } {
    const bodyMatch = respuesta.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const cssMatch = respuesta.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  
    return {
      html: bodyMatch ? bodyMatch[1].trim() : '',
      css: cssMatch ? cssMatch[1].trim() : ''
    };
  }
  
  abrirModalXMI() {
    this.modalXmiAbierto = true;
  }
  
  cerrarModalXMI() {
    this.modalXmiAbierto = false;
  }

}
