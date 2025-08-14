import * as React from 'react'
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom'

// Harmonize a Next.js-like Link interface with react-router's Link
// - href mirrors `to`
// - prefetch is accepted but ignored
// - allow standard anchor attributes (className, target, rel, etc.)

type Href = RouterLinkProps['to']

type NextLinkProps = Omit<RouterLinkProps, 'to'> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: Href
    prefetch?: boolean
  }

function isExternalHref(href: Href): href is string {
  return (
    typeof href === 'string' &&
    (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:'))
  )
}

const Link = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  ({ href, children, prefetch: _prefetch, ...rest }: NextLinkProps, ref: React.Ref<HTMLAnchorElement>) => {
    const {
      // react-router props
      replace,
      state,
      relative,
      preventScrollReset,
      reloadDocument,
      // the rest should be safe to spread onto <a>
      ...anchorRest
    } = rest as RouterLinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>

    if (isExternalHref(href)) {
      return (
        <a ref={ref} href={href} {...(anchorRest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {children as React.ReactNode}
        </a>
      )
    }

    return (
      <RouterLink
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={href}
        replace={replace}
        state={state}
        relative={relative}
        preventScrollReset={preventScrollReset}
        reloadDocument={reloadDocument}
        {...(anchorRest as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children as React.ReactNode}
      </RouterLink>
    )
  }
)

export default Link
