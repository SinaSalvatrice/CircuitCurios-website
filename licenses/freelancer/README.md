# Freelancer sources and licenses

Adapted from https://github.com/jeromelachaud/freelancer-theme at commit
`c55d62393545418bbca9ad8fa11552d5df16486c`.

- `css/vendor/bootstrap-flatly.min.css`: original `_includes/css/bootstrap.min.css`, retaining its Bootswatch, Bootstrap and Normalize notices.
- `css/vendor/freelancer.css`: original `_includes/css/main.css`; Jekyll color expressions replaced with the theme defaults. The upstream `primary-rgb` typo is corrected to `24,188,156`.
- `index.html`: adapted navigation, header, portfolio, about and footer structure from the theme's `_includes` files. CircuitCurios content and its existing native dialog replace sample content and Bootstrap modal scripts.
- `css/freelancer-custom.css`: local adaptations, responsive sizing, keyboard focus, Unicode stars instead of external icon fonts, and native dialog styles.

The upstream repository's MIT license is included in `MIT.txt`. Its theme CSS also carries an Apache 2.0 notice; that license is included in `Apache-2.0.txt`. Original notices remain in the CSS files.

No upstream PHP contact handler, jQuery, external fonts, tracking, or Jekyll runtime is loaded.
