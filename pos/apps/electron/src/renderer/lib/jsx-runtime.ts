// Minimal JSX runtime (hyperscript style) to allow authoring .tsx "pages" without React.
// Supports: element, attributes, children (string | number | Node | (string|Node)[]).
// Fragment support via Fragment symbol.

export type Child = Node | string | number | null | undefined | Child[];

export function h(tag: any, props: any, ...children: Child[]): HTMLElement | DocumentFragment {
  if (tag === Fragment) {
    const frag = document.createDocumentFragment();
    appendChildren(frag, children);
    return frag as any;
  }
  const el = typeof tag === 'string' ? document.createElement(tag) : (tag(props, children) as HTMLElement);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'className') {
        el.setAttribute('class', v as string);
      } else if (k.startsWith('on') && typeof v === 'function') {
        (el as any)[k.toLowerCase()] = v;
      } else if (v != null) {
        el.setAttribute(k, String(v));
      }
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(parent: Node, children: Child[]) {
  for (const c of children) {
    if (c == null) continue;
    if (Array.isArray(c)) {
      appendChildren(parent, c);
    } else if (c instanceof Node) {
      parent.appendChild(c);
    } else {
      parent.appendChild(document.createTextNode(String(c)));
    }
  }
}

export const Fragment = Symbol('Fragment');

export default { h, Fragment };
