// El zoom en el celular debe seguir funcionando (viewport sin maximum-scale).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('index.html', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

  it('permite hacer zoom (no limita la escala)', () => {
    const viewport = html.match(/<meta\s+name="viewport"[^>]*>/i)?.[0] || '';

    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toContain('maximum-scale');
    expect(viewport).not.toContain('user-scalable=no');
  });
});
