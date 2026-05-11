import Gallery from './Gallery';

// Gallery owns its own `.page-wrapper` root for now. Sub-apps should use
// the exported `<PageWrapper>` instead of the bare class.
export function PlaygroundApp() {
  return <Gallery />;
}
