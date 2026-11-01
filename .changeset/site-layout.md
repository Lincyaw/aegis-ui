---
'@lincyaw/aegis-ui': minor
---

Add the public site's frame, for sites that are not a console:

- `SiteLayout` holds a skip link, the nav, the page and the footer, with no sidebar and no padding of its own.
- `SiteNav` lies flat at the top of the page and floats as a glass bar once the page scrolls (`variant` pins either look); at 768px and narrower its links fold into a menu.
- `SiteSection` is a band whose background runs the full width and whose content sits in the site's content column; plain neighbours are divided by a hairline, `tone="tint"` fills the band.
- `SiteFooter` shows the brand, link columns, a note and a large outlined wordmark.

New tokens `--site-content-width`, `--site-gutter`, `--site-gutter-mobile`, `--site-nav-height`, `--site-nav-height-mobile`, `--site-nav-float-offset`, `--site-section-padding`, `--site-section-padding-mobile`, `--site-wordmark-size`, `--site-wordmark-tracking`, `--space-16` and `--size-control-lg`. `LinkComponent` gains an optional `aria-current`, which `DefaultLink` passes on; pass it to your router link in your adapter too.
