# React shell visual references

Unit 3 was manually inspected in the collaborative browser at these viewports:

- landing page: 1280 × 800 desktop;
- signed-in shell: iPad Air tablet and 390 × 844 phone;
- video conversation with denied media permission: 390 × 844 phone;
- report dialog and focus restoration: 390 × 844 phone;
- admin shell: 1280 × 800 desktop.

The executable browser smoke paths are recorded in `tests/e2e/shells.spec.ts`. Future visual-regression tooling should capture its baselines from deterministic fixture data rather than treating these placeholder shells as final product screenshots.
