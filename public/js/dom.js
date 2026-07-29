/** Winzige DOM-Helfer – kein Framework, kein Build-Step. */

export const $ = (id) => document.getElementById(id);

/**
 * Erzeugt ein Element.
 * @param {string} tag z. B. 'div.card.is-playable'
 * @param {object} [props] Attribute; `text` setzt textContent, `html` innerHTML
 * @param {Array<Node|string>} [children]
 */
export function el(tag, props = {}, children = []) {
  const [name, ...classes] = tag.split('.');
  const node = document.createElement(name || 'div');
  if (classes.length) node.className = classes.join(' ');

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'class') node.className = [node.className, value].filter(Boolean).join(' ');
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Ersetzt den Inhalt eines Containers. */
export function fill(container, children) {
  container.replaceChildren(...[].concat(children).filter(Boolean));
}

export const show = (node, visible = true) => {
  node.hidden = !visible;
};

/** Kurze Einblendung oben am Bildschirm (höchstens drei gleichzeitig). */
export function toast(message, variant = '', duration = 2800) {
  const host = $('toast-host');
  if (!host) return;
  const node = el(`div.toast${variant ? `.toast--${variant}` : ''}`, { text: message });
  host.append(node);
  while (host.children.length > 3) host.firstElementChild.remove();
  setTimeout(() => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 260);
  }, duration);
}

/**
 * Maskiert Text für die Verwendung in `innerHTML`.
 * Spielernamen kommen von anderen Leuten – sie werden nie roh eingesetzt.
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}

/** Deutsche Aufzählung: "Anna, Ben und Cem". */
export function joinNames(names) {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} und ${names.at(-1)}`;
}
