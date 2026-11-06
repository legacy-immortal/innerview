<command>
<task>Your task is to fix the attached modules to restore them to their intended functionality.</task>
<guidelines>
- Resolve the linting and typing errors in the attached modules
- Ensure there are no unused imports
- Ensure there are no unused variables
- Ensure there are no placeholder functions and that everything is properly implemented
- Ensure that the module works as intended
- If the module is particularly complex, write a `pytest` module to test the module in the case of `.py` modules or a `jest` test module in the case of `.ts` modules. Ensure that these modules are properly namespaced and placed in the appropriate directories.
- if necessary, run the module if it is a script or compile the module if it is a python module. You can also run `make lint` or `make lint:fix` to check for residual linting and typing errors. In the case of `.tsx` or `.ts` modules you do not need to run them or run any yarn commands, since the dev server is probably already running. You can, however, run `eslint` or `tsc` to check for residual linting and typing errors.
- If, in order to fix the target module, you need to modify another module, do so and ensure that the target module is properly updated.
- **Important**: For Chakra UI component errors related to props or migration, use the Chakra-UI MCP tool to assist with analysis and fixing the errors.
- **Important**: ABSOLUTELY DO **NOT** use `git` commands to restore or reset modules if the module is particularly hard to fix. Instead ask the user for help.
- Fix any regressions from v2 chakra-ui to v3, known pain points are the `Select`, `NumberInput`, `Slider`, `Popover`, `IconButton`, `Button`,
</guidelines>
</command>
