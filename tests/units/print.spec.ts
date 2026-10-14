// Casos de prueba del envío a imprimir: el documento va en un iframe oculto y se
// reutiliza el mismo en la siguiente impresión.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { printHtml } from '@/lib/print';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('imprimir un documento HTML', () => {
  it('lo carga en un iframe oculto, lo imprime y reutiliza el iframe', () => {
    const frame: any = {
      style: { cssText: '' },
      setAttribute: vi.fn(),
      isConnected: true,
      contentWindow: { focus: vi.fn(), print: vi.fn() },
    };

    vi.spyOn(document, 'createElement').mockReturnValue(frame);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => frame);

    printHtml('<html>primero</html>');

    expect(document.createElement).toHaveBeenCalledWith('iframe');
    expect(document.body.appendChild).toHaveBeenCalledWith(frame);
    expect(frame.srcdoc).toBe('<html>primero</html>');
    expect(frame.style.cssText).toContain('width:0');

    frame.onload();

    expect(frame.contentWindow.focus).toHaveBeenCalled();
    expect(frame.contentWindow.print).toHaveBeenCalledTimes(1);

    // La segunda impresión reutiliza el iframe (no agrega otro al documento).
    printHtml('<html>segundo</html>');

    expect(document.createElement).toHaveBeenCalledTimes(1);
    expect(frame.srcdoc).toBe('<html>segundo</html>');

    frame.onload();

    expect(frame.contentWindow.print).toHaveBeenCalledTimes(2);
  });
});
