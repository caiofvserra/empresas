import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const css = readFileSync(new URL('../src/enterprise-v11/design-tokens.css', import.meta.url), 'utf8');
const tokens = new Map([...css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]));
function color(name: string, seen = new Set<string>()): string {
  assert(!seen.has(name), `Circular design token: ${name}`); seen.add(name);
  const value = tokens.get(name); assert(value, `Missing design token: ${name}`);
  const alias = value.match(/^var\(--([a-z0-9-]+)\)$/);
  if (alias) return color(alias[1], seen);
  assert.match(value, /^#[a-f0-9]{6}$/i, `Not a six-digit color: ${name}`);
  return value;
}
function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(value => {
    const component = parseInt(value, 16) / 255;
    return component <= .04045 ? component / 12.92 : ((component + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(left: string, right: string) {
  const a = luminance(color(left)), b = luminance(color(right));
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test('V13 approved text pairs resolve from the design-token source and pass WCAG AA', () => {
  const pairs = [
    ['text', 'surface'], ['text', 'surface-raised'], ['text-muted', 'surface'], ['text-muted', 'surface-raised'],
    ['white', 'primary'], ['white', 'primary-dark'], ['gray-300', 'primary'],
    ['gray-900', 'secondary'], ['primary-dark', 'secondary'],
    ['white', 'success-dark'], ['white', 'danger-dark'], ['white', 'info-dark'],
  ];
  for (const [foreground, background] of pairs) assert(contrast(foreground, background) >= 4.5, `${foreground}/${background}: ${contrast(foreground, background).toFixed(2)}:1`);
});

test('V13 yellow with white and low-contrast gray on surface remain rejected for normal text', () => {
  assert(contrast('white', 'secondary') < 4.5);
  assert(contrast('gray-600', 'surface') < 4.5);
  assert(contrast('text-muted', 'surface') > contrast('gray-600', 'surface'));
});

test('V13 self-hosted font files match their licensed source manifest', () => {
  const fontRoot = new URL('../public/fonts/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', fontRoot), 'utf8'));
  assert.deepEqual(manifest.families.Lato, [400, 700]);
  assert.match(manifest.families.Raleway, /variable.*100.*900/);
  for (const asset of manifest.assets) {
    const bytes = readFileSync(new URL(asset.file, fontRoot));
    assert.equal(bytes.length, asset.bytes, asset.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.file);
  }
  for (const name of ['OFL-Lato.txt', 'OFL-Raleway.txt']) assert.match(readFileSync(new URL(name, fontRoot), 'utf8'), /SIL OPEN FONT LICENSE/i);
});
