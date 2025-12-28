export default {
  '**/*.{js,jsx,ts,tsx}': () => ['pnpm test'],
  '*': () => ['pnpm ts'],
}
