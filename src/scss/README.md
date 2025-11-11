# SCSS Organization

This directory contains all styling for the AWS Containers extension.

## Structure

```
scss/
├── _variables.scss        # Global SCSS variables
├── bootstrap.scss         # Bootstrap framework imports
├── main.scss             # Main entry point (imports everything)
├── app.scss              # Legacy entry point (redirects to main.scss)
└── components/           # Component-specific styles
    └── _popup.scss       # Popup component styles
```

## Usage

Import the main stylesheet in your TypeScript/TSX files:

```typescript
import "../scss/app.scss";
```

## Adding New Styles

1. **Component styles**: Create a new file in `components/_component-name.scss`
2. **Variables**: Add to `_variables.scss` for reusability
3. **Import**: Add your component import to `main.scss`

## Best Practices

- Use SCSS variables from `_variables.scss` for consistency
- Keep component styles modular and self-contained
- Follow BEM naming convention for CSS classes
- Prefix partial files with underscore (e.g., `_variables.scss`)
