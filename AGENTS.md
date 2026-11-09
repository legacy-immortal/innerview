# AGENTS.md

Project conventions for AI agents working in Innerview.

## Code style

Follow Microsoft's style guide for TypeScript / OOP:

- Use `PascalCase` for classes, interfaces, enums, and components; `camelCase` for
  variables, functions, and methods; `UPPER_SNAKE_CASE` for constants.
- Prefer explicit return types on exported functions and accessibility modifiers
  (`public`/`private`) on class members.
- Prefer `readonly` properties and `const` declarations where values do not change.
- Use `interface` for object shapes, `type` for unions/intersections, `enum` for
  fixed sets. Avoid `any` — use `unknown` and narrow with type guards.
- Keep functions short and single-purpose; extract helpers for complex logic.
- Use `async`/`await` with `try/catch`, and handle errors explicitly rather than
  swallowing them.
- Favor composition over inheritance; prefer small focused classes/modules.
- Encapsulate state with `private` fields and public getters/setters only when needed.
- Write doc comments with `/** */` that describe purpose and parameters.

## References

- [Microsoft TypeScript Handbook](https://www.typescriptlang.org/docs/handbook)
- [TypeScript Coding Guidelines](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev/learn)
- [Chakra UI Docs](https://chakra-ui.com/docs)

## Tooling

- Lint with ESLint (`bun run lint`) and oxlint (`bun run lint:ox`).
- Format with Prettier (`bun run format`) and oxfmt (`bun run format:ox`).
- Typecheck with `tsc --noEmit` before committing.

## Structure

- Components under `src/components/{animations,background,chat,settings}`.
- Hooks under `src/hooks`, utilities under `src/utils` and `src/lib`.
- Keep public APIs stable when refactoring; re-export from original entry points.
