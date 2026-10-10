/* ============================================================
   ChimCode icon set.
   Clean single-stroke SVG icons on a 24x24 grid, drawn with
   currentColor so they inherit text colour and scale cleanly.
   Replaces emoji so the UI looks consistent on every platform.
   ============================================================ */
(function () {
  const P = {
    // currency + stats
    book: '<path d="M4 5.5A2 2 0 0 1 6 3.5h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z"/><path d="M6 3.5v16"/><path d="M19 16.5v2"/>',
    bolt: '<path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z"/>',
    flame: '<path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.4.6-2.6 1.5-3.6C9 9.6 9.5 10.5 10 10.5c0-2.5 1-5.5 2-7.5z"/>',
    // navigation
    cap: '<path d="M2 8.5 12 4l10 4.5-10 4.5z"/><path d="M6 10.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 5.8"/><path d="M18 14.8c2 .8 3 2.4 3 4.2"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.5A2.5 2.5 0 0 0 8 10"/><path d="M16 5.5h2.5A2.5 2.5 0 0 1 16 10"/><path d="M12 13v3"/><path d="M8.5 20h7l-.7-2.2a2 2 0 0 0-1.9-1.3h-1.8a2 2 0 0 0-1.9 1.3z"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1"/>',
    // achievement categories
    flag: '<path d="M6 21V4"/><path d="M6 4h11l-2 3.5L17 11H6"/>',
    code: '<path d="M9 7 4 12l5 5"/><path d="M15 7l5 5-5 5"/>',
    medal: '<circle cx="12" cy="14" r="5"/><path d="M9 3h6l-1.5 5h-3z"/><path d="M12 11.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"/>',
    handshake: '<path d="M6 12l4-4 4 3 4-4"/><path d="M3 13l3 4 3-2"/><path d="M21 13l-3 4-3-2"/><path d="M8 15l2 2"/>',
    gem: '<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18"/><path d="M9.5 9 12 20l2.5-11z"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9z"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    // states + actions
    check: '<path d="M4.5 12.5 9.5 17.5 19.5 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    alert: '<path d="M12 4 21 19H3z"/><path d="M12 10v4"/><path d="M12 16.6v.4"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 4 10.5V15H8v-1.5A6 6 0 0 1 12 3z"/>',
    eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.7"/>',
    robot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4"/><circle cx="12" cy="3" r="1.3"/><circle cx="9" cy="13" r="1.4"/><circle cx="15" cy="13" r="1.4"/><path d="M10 16.5h4"/>',
    play: '<path d="M8 5.5 19 12 8 18.5z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9.5V13l2.5 1.6"/><path d="M9.5 2.5h5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.6"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    crown: '<path d="M4 17 3 7l5 3 4-6 4 6 5-3-1 10z"/><path d="M4 17h16"/>',
    cart: '<circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/><path d="M3 4h2.2l2.3 11h10.8l2-8H6"/>',
    heart: '<path d="M12 20S3.5 14.6 3.5 9.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 8.5 2c0 5.4-8.5 10.8-8.5 10.8z"/>',
    // shop slots + stats
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.6-1.6-1.7-1.6-3 0-1 .8-1.7 1.9-1.7H16a5 5 0 0 0 5-5c0-3.5-4-6.5-9-6.5z"/><circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3L16 12l3.5 3.5"/>',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M8 5v14M16 5v14M3.5 9.5h17M3.5 14.5h17"/>',
    brush: '<path d="M5 19c3 0 4-2 4-4l6-9 3 2-9 6c-1 2-1 3-3 4-1 .5-2 1-1 1z"/><path d="M5 19c-1 .4-2 1-2 2 1.5 0 3-.5 4-1"/>',
    frame: '<rect x="4" y="4" width="16" height="16" rx="3"/><rect x="8" y="8" width="8" height="8" rx="1.4"/>',
    heartbeat: '<path d="M3 12h4l2-5 3 10 2.5-5H21"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5z"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    rocket: '<path d="M12 3c3 2 4.5 5 4.5 8.5L14 14h-4l-2.5-2.5C7.5 8 9 5 12 3z"/><circle cx="12" cy="9" r="1.6"/><path d="M9.5 14.5 7 20l3.5-2M14.5 14.5 17 20l-3.5-2"/>',
    chart: '<path d="M4 20V5"/><path d="M9 20V11"/><path d="M14 20v-6"/><path d="M19 20V8"/>',
    gamepad: '<rect x="2.5" y="7" width="19" height="10" rx="4.5"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="18.4" cy="13.4" r="1.1" fill="currentColor" stroke="none"/>',
    server: '<rect x="3.5" y="5" width="17" height="6" rx="2"/><rect x="3.5" y="13" width="17" height="6" rx="2"/><path d="M7 8h.01M7 16h.01"/>',
    db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 10l2.5 2L7 14"/><path d="M12.5 14h4"/>',
    puzzle: '<path d="M9.5 4.5a2 2 0 1 1 4 0V6H16a1 1 0 0 1 1 1v2.5h1.5a2 2 0 1 1 0 4H17V16a1 1 0 0 1-1 1h-2.5v1.5a2 2 0 1 1-4 0V17H7a1 1 0 0 1-1-1v-2.5H4.5a2 2 0 1 1 0-4H6V7a1 1 0 0 1 1-1h2.5z"/>',
    wizard: '<path d="M12 3 8 14h8z"/><path d="M7 14h10l1 3H6z"/><path d="M12 6.5 13 9"/>',
    clapper: '<path d="M3.5 8.5 20 6.8V18a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z"/><path d="M3.5 8.5 4.2 5.4l16.4 1.6"/><path d="m8 6.3-.8 2.4M13 6.6l-.8 2.4"/>',
  };

  // Aliases so data can use semantic names.
  const ALIAS = {
    milestone: "flag",
    mastery: "medal",
    social: "handshake",
    collection: "gem",
    superday: "star",
    special: "sparkle",
    basics: "code",
    books: "book",
    xp: "bolt",
    streak: "flame",
    learn: "cap",
    community: "users",
    achievements: "trophy",
    shop: "bag",
    profile: "user",
    python: "code", cpp: "settings", javascript: "bolt", typescript: "code",
    java: "server", csharp: "target", go: "heartbeat", rust: "settings",
    sql: "db", bash: "terminal", htmlcss: "palette",
    avatar: "robot", effect: "sparkle", overlay: "layers", theme: "palette",
    banner: "image",
  };

  function resolve(name) {
    const key = ALIAS[name] || name;
    return P[key] || P.star;
  }

  /**
   * Return an inline SVG string for an icon name.
   * @param {string} name
   * @param {number} size pixel size (default 18)
   */
  function icon(name, size) {
    const s = size || 18;
    return (
      '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + resolve(name) + "</svg>"
    );
  }

  window.ChimIcons = { icon, has: (n) => !!P[ALIAS[n] || n] };
  window.icon = icon;
})();
