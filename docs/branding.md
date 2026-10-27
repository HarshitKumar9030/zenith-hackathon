# EcoMitra browser icons

The site uses a pale green leaf on a forest-green rounded square, drawn as an original SVG in `web-app/src/app/icon.svg`. Next.js automatically adds the application icon metadata to every page, including the scan station and quiz.

`favicon.ico` contains 16, 32 and 48 pixel PNG images for browser compatibility. `apple-icon.png` is the 180 pixel touch icon. Both are rendered from the SVG using Sharp; update them together when changing the mark. These small brand assets are committed intentionally. Browsers can cache favicons; a refresh or reopened tab may be needed after deployment.
