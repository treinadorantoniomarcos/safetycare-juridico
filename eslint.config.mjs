export default [
  {
    ignores: [
      ".aiox-core/**",
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**"
    ]
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    }
  }
];
