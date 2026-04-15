# Godot Games

Godot 4.6 projects using GDScript.

## Testing

Uses GUT (Godot Unit Test) addon. Tests go in `tests/` directory.

```bash
cd games/godot/<name>
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd
```

## Notes

- Not an npm workspace -- no npm scripts apply.
- CI runs in `barichello/godot-ci:4.6` container.
- Excluded from ESLint and Prettier.
