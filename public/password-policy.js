/* Pothik password policy, shared by the browser (window.PothikPassword) and the server (require).
   Follows NIST SP 800-63B: length plus a check against common, personal and patterned passwords —
   no forced "one capital, one symbol" rules. The meter estimates strength to guide, not to gatekeep. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PothikPassword = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const MIN_LENGTH = 12;
  const MAX_LENGTH = 72; // bcrypt only reads the first 72 bytes
  const MIN_BITS = 45;

  // Cores of the most-used passwords (after lower-casing, undoing 0→o style swaps and dropping digits/symbols).
  const COMMON = new Set(('password passwd qwerty qwertyuiop asdfgh asdfghjkl zxcvbnm letmein welcome admin administrator login iloveyou loveyou love lovely '
    + 'monkey dragon football baseball cricket soccer sunshine princess shadow master superman batman trustno whatever freedom starwars hello '
    + 'secret changeme default computer internet samsung google facebook instagram whatsapp apple iphone android abc abcdef abcdefgh '
    + 'bangladesh dhaka chittagong chattogram sylhet pothik student university college school ielts toefl study abroad visa scholarship '
    + 'india pakistan allah bismillah myname mypassword newpassword test testing guest user qazwsx michael jennifer jordan ashley killer '
    + 'charlie thomas hunter ranger buster tigger flower summer winter spring autumn money family friends forever').split(' '));
  const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'qazwsxedc'];
  const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l', '+': 't' };

  // Strength levels, named for how well they would keep a door shut.
  const LEVELS = [
    { name: 'Open gate', hint: 'Anyone could walk right in.' },
    { name: 'Garden fence', hint: 'Keeps out the curious, not the determined.' },
    { name: 'Sturdy door', hint: 'Good — a little longer makes it great.' },
    { name: 'Bank vault', hint: 'Strong. Attackers would give up long before this opens.' },
    { name: 'Fortress', hint: 'Excellent. This one would outlast your degree.' }
  ];

  const lettersOf = s => s.toLowerCase().split('').map(c => LEET[c] || c).join('').replace(/[^a-zঀ-৿]/g, '');
  const reverse = s => s.split('').reverse().join('');

  function hasEasyPattern(pw) {
    const lower = pw.toLowerCase();
    if (/(.)\1{3,}/u.test(pw)) return true; // aaaa, 1111
    for (let i = 0; i + 3 < lower.length; i++) { // abcd, 1234, dcba, 4321
      const d = lower.charCodeAt(i + 1) - lower.charCodeAt(i);
      if ((d === 1 || d === -1) && lower.charCodeAt(i + 2) - lower.charCodeAt(i + 1) === d && lower.charCodeAt(i + 3) - lower.charCodeAt(i + 2) === d) return true;
    }
    for (const row of KEYBOARD_ROWS) for (const r of [row, reverse(row)]) for (let i = 0; i + 4 <= r.length; i++) if (lower.includes(r.slice(i, i + 4))) return true;
    return new Set(pw).size < 5; // "abababababab"
  }

  function isCommon(pw) {
    // Two readings: look-alikes decoded (p@ssw0rd → password) and plain letters only (Password@2024! → password).
    const cores = [...new Set([lettersOf(pw), pw.toLowerCase().replace(/[^a-zঀ-৿]/g, '')])].filter(Boolean);
    if (!cores.length) return /^\d+$/.test(pw) || new Set(pw).size < 5; // only digits or symbols
    return cores.some(core => {
      if (COMMON.has(core)) return true;
      for (const word of COMMON) {
        if (word.length < 4) continue;
        if (core === word.repeat(Math.round(core.length / word.length))) return true; // passwordpassword
        if (core.includes(word) && core.length - word.length <= 4) return true; // Summer2024!xx, iloveyou99
      }
      return false;
    });
  }

  function personalParts({ name = '', email = '' } = {}) {
    const local = String(email).toLowerCase().split('@')[0] || '';
    return [...String(name).toLowerCase().split(/\s+/), local, ...local.split(/[^a-zঀ-৿]+/)].filter(p => p.length >= 3);
  }

  // Rough guessing-cost estimate in bits: character pool × effective length, minus known patterns.
  function estimateBits(pw) {
    if (!pw) return 0;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/\d/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
    if (/[^\x00-\x7f]/.test(pw)) pool += 60; // Bangla and other scripts
    const chars = [...pw]; const unique = new Set(chars).size;
    const effective = unique + (chars.length - unique) * 0.5;
    let bits = effective * Math.log2(Math.max(pool, 10));
    if (/^[A-Z][a-z]+\d+[^a-zA-Z0-9]?$/.test(pw)) bits *= 0.6; // "Summer2024!" — the most predictable shape
    if (isCommon(pw)) bits = Math.min(bits, 20);
    if (hasEasyPattern(pw)) bits *= 0.6;
    return Math.round(bits);
  }

  function assess(password = '', context = {}) {
    const pw = String(password); const length = [...pw].length;
    const lower = pw.toLowerCase(); const letters = lettersOf(pw);
    const personal = personalParts(context).some(p => lower.includes(p) || (lettersOf(p).length >= 3 && letters.includes(lettersOf(p))));
    const checks = [
      { id: 'length', ok: length >= MIN_LENGTH && length <= MAX_LENGTH, label: `At least ${MIN_LENGTH} characters`, progress: `${Math.min(length, 99)}/${MIN_LENGTH}`,
        message: length > MAX_LENGTH ? `That's a novel! Keep it under ${MAX_LENGTH} characters.` : `Add ${MIN_LENGTH - length} more character${MIN_LENGTH - length === 1 ? '' : 's'} — ${MIN_LENGTH} is the minimum. A short sentence works well.` },
      { id: 'common', ok: length > 0 && !isCommon(pw), label: 'Not a common password or a single word',
        message: 'That one is on every hacker’s list. Try a few unrelated words, like a sentence only you would say.' },
      { id: 'personal', ok: length > 0 && !personal, label: 'Doesn’t include your name or email',
        message: 'Your name or email is the first thing an attacker tries. Leave them out.' },
      { id: 'pattern', ok: length > 0 && !hasEasyPattern(pw), label: 'No easy runs or repeats (1234, qwerty, aaaa)',
        message: 'Runs like 1234, qwerty or aaaa are guessed in seconds. Break the pattern.' }
    ];
    const bits = estimateBits(pw);
    const failing = checks.find(c => !c.ok);
    const strongEnough = bits >= MIN_BITS;
    const level = !length ? 0 : failing ? Math.min(1, bits >= 30 ? 1 : 0) : bits >= 85 ? 4 : bits >= 65 ? 3 : strongEnough ? 2 : 1;
    const message = failing ? failing.message : strongEnough ? '' : 'Almost there — make it a little longer, or mix in numbers, symbols or spaces.';
    return { ok: !failing && strongEnough, checks, bits, level, ...LEVELS[level], message };
  }

  // Four random words plus a number, e.g. "Monsoon-Lantern-Harbor-Saffron-482" (~42 bits from a CSPRNG).
  const WORDS = [...new Set(('anchor atlas autumn bamboo banyan beacon bridge brook cactus camel canal canoe canyon caravan cargo cedar chalk cinnamon '
    + 'cliff clover cobalt comet compass copper coral cotton crater crimson crystal cypress delta desert dolphin dune eagle ember emerald falcon '
    + 'fern ferry fjord forest fossil fountain galaxy garden geyser ginger glacier globe granite grove guava harbor hazel heron horizon island ivory '
    + 'jasmine jungle kayak kestrel kite lagoon lantern lava lemon lighthouse lilac lotus lynx magnet mango maple marble meadow meteor mint '
    + 'monsoon moss mountain nectar nomad nutmeg oasis ocean olive orbit orchid otter paddle palm papaya parrot pebble pepper pilot pine '
    + 'planet plateau pollen prairie quartz quill rain rapids raven reef ridge river robin rocket saffron sail sapphire savanna scarlet '
    + 'sequoia shell sierra silver skyline slate snow sparrow spice spruce star stone storm summit sunrise swallow tamarind teak temple '
    + 'thunder tide tiger timber topaz trail tulip tundra turtle valley velvet violet volcano voyage walnut waterfall wave willow wind '
    + 'winter yak zebra zephyr amber arrow aurora basil birch blossom breeze cabin candle cascade cello cherry cloud cocoa coffee '
    + 'cricket daisy dawn drum dusk echo feather fiddle firefly flute frost harp hammock honey indigo jade juniper lark lemonade '
    + 'linen marigold melody mirror moon morning mosaic music nebula noodle oak opal paper peach pearl penguin piano plum poppy '
    + 'puzzle radish rainbow ribbon saddle sandal shadow shore sketch sky sloth soup spark spiral sprout squash sugar sun tangerine '
    + 'tea thistle thyme toffee tomato torch tower train trumpet tunnel umbrella vanilla vapor wagon walrus wheat whistle yarn').split(' '))];
  function randomInt(max) { // unbiased, via rejection sampling
    const buf = new Uint32Array(1); const limit = Math.floor(0x100000000 / max) * max;
    do globalThis.crypto.getRandomValues(buf); while (buf[0] >= limit);
    return buf[0] % max;
  }
  function suggestPassphrase() {
    const pick = () => { const w = WORDS[randomInt(WORDS.length)]; return w[0].toUpperCase() + w.slice(1); };
    return `${pick()}-${pick()}-${pick()}-${pick()}-${100 + randomInt(900)}`;
  }

  return { MIN_LENGTH, MAX_LENGTH, LEVELS, assess, suggestPassphrase, WORD_COUNT: WORDS.length };
});
