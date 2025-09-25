// Global JSX namespace for custom runtime so TSX compiles without React types.
import { Fragment as KGolfFragment, h as kgolfH } from '../lib/jsx-runtime';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any; // permissive for quick iteration
    }
    interface Element extends HTMLElement {}
    interface ElementClass { }
    interface ElementAttributesProperty { }
    interface ElementChildrenAttribute { children: {}; }
  }
}

export { KGolfFragment as Fragment, kgolfH as h };
