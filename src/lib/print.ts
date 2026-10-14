// Imprime un documento HTML completo usando un iframe oculto.
// Se usa un iframe (y no la página actual) para que la app no aparezca en el PDF
// y no dependa de los estilos de impresión del sitio. El navegador muestra su
// diálogo, donde se puede elegir "Guardar como PDF".
let printFrame: HTMLIFrameElement | null = null;

export function printHtml(html: string): void {
  if (typeof document === 'undefined') return;

  if (!printFrame || !printFrame.isConnected) {
    printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.setAttribute('tabindex', '-1');
    printFrame.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;border:0;';
    document.body.appendChild(printFrame);
  }

  const frame = printFrame;
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };
  frame.srcdoc = html;
}
