const namedEntities = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: '\u00a0' };

export function decodeHeadline(value) {
  return value.replace(/&(?:amp;)*(#x[0-9a-f]+|#\d+|amp|apos|quot|lt|gt|nbsp);/gi, (entity, code) => {
    if (!code.startsWith('#')) return namedEntities[code.toLowerCase()];
    const number = /^#x/i.test(code) ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
    return number > 0 && number <= 0x10ffff && (number < 0xd800 || number > 0xdfff)
      ? String.fromCodePoint(number) : entity;
  });
}
