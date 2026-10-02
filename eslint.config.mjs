// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // Règle imposée par le sujet : aucun `any`. Si un type est vraiment
    // inconnu, utiliser `unknown` puis un narrowing.
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
)
