export default {
  Base: '/api',
  Numbers: {
    Get: '/numbers',
    Replace: '/numbers/replace',
    Toggle: '/numbers/:item/toggle',
  },
} as const;
